import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import type { PlaybackSource } from "@/lib/public-catalog";
import {
  callReal2freeGateway,
  hashGatewayClient,
  Real2freeGatewayError,
} from "@/lib/real2free-gateway";
import {
  issuePlaybackTicket,
  playbackClientHash,
  playbackCookieOptions,
  PLAYBACK_DEVICE_COOKIE,
  PLAYBACK_TICKET_COOKIE,
  validPlaybackDeviceId,
  verifyPlaybackTicket,
} from "@/lib/playback-ticket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAYER_PROBE_TIMEOUT_MS = 3200;
const MAX_PROBE_REDIRECTS = 3;
const HARD_BLOCK_STATUSES = new Set([401, 403, 404, 410, 451]);
const PLAYER_PROBE_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

const configuredPlayerHosts = (process.env.REAL2FREE_PLAYER_HOSTS || "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

type PlaybackReferrerPolicy = "no-referrer" | "origin";
type PlaybackSourceWithPolicy = PlaybackSource & {
  referrerPolicy: PlaybackReferrerPolicy;
};

type PlaybackResponse = {
  found: boolean;
  id?: string;
  label?: string;
  url?: string;
  kind?: "hls" | "embed";
  group_key?: "dub_th" | "sub_th" | "default";
  role?: "primary" | "backup";
  backup_index?: number;
  order?: number;
  index: number;
  total: number;
  has_next: boolean;
};

type ProbeAttempt = {
  status: number | null;
  unsafe: boolean;
};

type ProbeDecision = {
  policy: PlaybackReferrerPolicy;
  blocked: boolean;
  status: number | null;
};

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Vary": "Cookie",
  };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function requestIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function trustedWatchRequest(request: NextRequest, titleId: string): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const referer = request.headers.get("referer");
  if (origin !== request.nextUrl.origin || !referer) return false;
  if (fetchSite && fetchSite !== "same-origin") return false;

  try {
    const refererUrl = new URL(referer);
    return refererUrl.origin === request.nextUrl.origin
      && refererUrl.pathname.startsWith("/watch/")
      && refererUrl.pathname.includes(titleId);
  } catch {
    return false;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10
    || a === 127
    || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || a >= 224;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().split("%")[0];
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/u.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;
  if (normalized.startsWith("2001:db8")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mappedIpv4 = normalized.slice(7);
    return isIP(mappedIpv4) === 4 && isPrivateIpv4(mappedIpv4);
  }
  return false;
}

function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return !isPrivateIpv4(address);
  if (version === 6) return !isPrivateIpv6(address);
  return false;
}

function allowedPlayerHost(hostname: string): boolean {
  if (!configuredPlayerHosts.length) return true;
  return configuredPlayerHosts.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

async function publicPlayerHost(hostname: string): Promise<boolean> {
  const ipVersion = isIP(hostname);
  if (ipVersion) return isPublicIp(hostname);

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((entry) => isPublicIp(entry.address));
  } catch {
    return false;
  }
}

async function safePlaybackUrl(rawUrl: string): Promise<string | null> {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) return null;
    if (!allowedPlayerHost(hostname)) return null;
    if (!(await publicPlayerHost(hostname))) return null;

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function probeOnce(
  rawUrl: string,
  kind: "hls" | "embed",
  policy: PlaybackReferrerPolicy,
  siteOrigin: string,
): Promise<ProbeAttempt> {
  let currentUrl = rawUrl;

  for (let redirectCount = 0; redirectCount <= MAX_PROBE_REDIRECTS; redirectCount += 1) {
    const validatedUrl = await safePlaybackUrl(currentUrl);
    if (!validatedUrl) return { status: null, unsafe: true };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PLAYER_PROBE_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = {
        Accept: kind === "hls"
          ? "application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream;q=0.9, */*;q=0.8"
          : "text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "User-Agent": PLAYER_PROBE_USER_AGENT,
      };

      if (policy === "origin") {
        headers.Referer = `${siteOrigin}/`;
        if (kind === "hls") headers.Origin = siteOrigin;
      }

      const response = await fetch(validatedUrl, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers,
        signal: controller.signal,
      });

      const status = response.status;
      const location = response.headers.get("location");
      if (response.body) await response.body.cancel().catch(() => undefined);

      if (status >= 300 && status < 400 && location) {
        currentUrl = new URL(location, validatedUrl).toString();
        continue;
      }

      return { status, unsafe: false };
    } catch {
      return { status: null, unsafe: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { status: null, unsafe: false };
}

async function chooseReferrerPolicy(
  url: string,
  kind: "hls" | "embed",
  siteOrigin: string,
): Promise<ProbeDecision> {
  const policies: PlaybackReferrerPolicy[] = kind === "embed"
    ? ["origin", "no-referrer"]
    : ["no-referrer", "origin"];

  let lastHardBlock: number | null = null;

  for (const policy of policies) {
    const result = await probeOnce(url, kind, policy, siteOrigin);
    if (result.unsafe) return { policy, blocked: true, status: null };
    if (result.status == null) return { policy: policies[0], blocked: false, status: null };
    if (result.status >= 200 && result.status < 400) {
      return { policy, blocked: false, status: result.status };
    }
    if (HARD_BLOCK_STATUSES.has(result.status)) {
      lastHardBlock = result.status;
      continue;
    }

    return { policy: policies[0], blocked: false, status: result.status };
  }

  return { policy: policies[0], blocked: lastHardBlock != null, status: lastHardBlock };
}

function clearTicket(response: NextResponse) {
  response.cookies.set(PLAYBACK_TICKET_COOKIE, "", playbackCookieOptions(0));
}

async function rotateTicket(
  response: NextResponse,
  input: {
    titleId: string;
    episodeId: string | null;
    nextIndex: number;
    clientHash: string;
  },
) {
  const ticket = await issuePlaybackTicket({
    titleId: input.titleId,
    episodeId: input.episodeId,
    expectedIndex: input.nextIndex,
    clientHash: input.clientHash,
  });
  response.cookies.set(PLAYBACK_TICKET_COOKIE, ticket, playbackCookieOptions(120));
}

export async function POST(request: NextRequest) {
  if (request.headers.get("x-real2free-playback") !== "1") {
    return NextResponse.json({ error: "missing_playback_header" }, { status: 403, headers: noStoreHeaders() });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413, headers: noStoreHeaders() });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: noStoreHeaders() });
  }

  const titleId = body.titleId;
  const episodeId = body.episodeId || null;
  const index = Number.isInteger(body.index) ? Math.min(100, Math.max(0, Number(body.index))) : 0;
  if (!isUuid(titleId) || (episodeId !== null && !isUuid(episodeId))) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders() });
  }
  if (!trustedWatchRequest(request, titleId)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: noStoreHeaders() });
  }

  const deviceId = request.cookies.get(PLAYBACK_DEVICE_COOKIE)?.value;
  const ticketToken = request.cookies.get(PLAYBACK_TICKET_COOKIE)?.value;
  if (!validPlaybackDeviceId(deviceId)) {
    return NextResponse.json({ error: "playback_ticket_required" }, { status: 401, headers: noStoreHeaders() });
  }

  const ip = requestIp(request);
  const clientHash = playbackClientHash(ip, deviceId);
  const ticket = await verifyPlaybackTicket(ticketToken, {
    titleId,
    episodeId,
    expectedIndex: index,
    clientHash,
  }).catch(() => null);

  if (!ticket) {
    const response = NextResponse.json({ error: "invalid_playback_ticket" }, { status: 401, headers: noStoreHeaders() });
    clearTicket(response);
    return response;
  }

  try {
    const result = await callReal2freeGateway<PlaybackResponse>({
      action: "playback",
      titleId,
      episodeId,
      index,
    }, hashGatewayClient("playback", ip));

    if (!result.found || !result.url || !result.id || !result.kind) {
      const response = NextResponse.json({
        source: null,
        index: result.index,
        total: result.total,
        hasNext: false,
      }, { headers: noStoreHeaders() });
      clearTicket(response);
      return response;
    }

    const validatedUrl = await safePlaybackUrl(result.url);
    if (!validatedUrl) {
      console.warn("[api/playback/session] blocked unsafe player URL", { playerId: result.id, index: result.index });
      const response = NextResponse.json({
        source: null,
        index: result.index,
        total: result.total,
        hasNext: result.has_next,
        error: "unsafe_source",
      }, { headers: noStoreHeaders() });
      if (result.has_next) {
        await rotateTicket(response, { titleId, episodeId, nextIndex: result.index + 1, clientHash });
      } else {
        clearTicket(response);
      }
      return response;
    }

    const probe = await chooseReferrerPolicy(validatedUrl, result.kind, request.nextUrl.origin);
    if (probe.blocked) {
      console.warn("[api/playback/session] upstream player denied access", {
        host: new URL(validatedUrl).hostname,
        playerId: result.id,
        index: result.index,
        status: probe.status,
      });
      const response = NextResponse.json({
        source: null,
        index: result.index,
        total: result.total,
        hasNext: result.has_next,
        error: "upstream_forbidden",
      }, { headers: noStoreHeaders() });
      if (result.has_next) {
        await rotateTicket(response, { titleId, episodeId, nextIndex: result.index + 1, clientHash });
      } else {
        clearTicket(response);
      }
      return response;
    }

    const source: PlaybackSourceWithPolicy = {
      id: result.id,
      label: result.label || (result.index === 0 ? "ตัวหลัก" : `สำรอง ${result.index}`),
      url: validatedUrl,
      kind: result.kind,
      groupKey: result.group_key || "default",
      role: result.role || (result.index === 0 ? "primary" : "backup"),
      backupIndex: Number(result.backup_index || result.index),
      order: Number(result.order || result.index),
      referrerPolicy: probe.policy,
    };

    const response = NextResponse.json({
      source,
      index: result.index,
      total: result.total,
      hasNext: result.has_next,
    }, { headers: noStoreHeaders() });

    if (result.has_next) {
      await rotateTicket(response, { titleId, episodeId, nextIndex: result.index + 1, clientHash });
    } else {
      clearTicket(response);
    }
    return response;
  } catch (error) {
    if (error instanceof Real2freeGatewayError) {
      const status = error.code === "rate_limited" ? 429 : error.status;
      const headers = noStoreHeaders();
      return NextResponse.json({ error: error.code }, {
        status,
        headers: status === 429 ? { ...headers, "Retry-After": "60" } : headers,
      });
    }

    console.error("[api/playback/session] failed", error);
    return NextResponse.json({ error: "playback_unavailable" }, { status: 503, headers: noStoreHeaders() });
  }
}
