import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_ORIGIN = (process.env.APIPLAYER_API_URL || "https://www.apiplayer.online").replace(/\/$/, "");
const API_DOMAIN = normalizeDomain(process.env.APIPLAYER_CLIENT_DOMAIN || "real2free.online");
const API_TIMEOUT_MS = 10_000;
const MAX_TEST_EPISODES = 120;

const BUILTIN_CLIENTS = [
  { id: "real2free", label: "REAL2FREE", domain: "real2free.online" },
  { id: "doodee", label: "DOODEE", domain: "doodee.online" },
  { id: "nung24", label: "NUNG24", domain: "nung24.online" },
  { id: "dodeedee", label: "ดูดีดี", domain: "xn--l3caa5kbu.online" },
] as const;

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};

type ApiCallResult = {
  ok: boolean;
  status: number;
  ms: number;
  path: string;
  payload: any;
  error: string | null;
  errorCode: string | null;
  clientDomain: string;
  credentialMode: "CLIENT_SPECIFIC_KEY" | "REFERENCE_KEY" | "MISSING_KEY";
};

type ClientPreset = {
  id: string;
  label: string;
  domain: string;
  credentialMode: "CLIENT_SPECIFIC_KEY" | "REFERENCE_KEY" | "MISSING_KEY";
};

function normalizeDomain(value: unknown) {
  const input = String(value || "").trim().toLowerCase();
  if (!input) return "";
  try {
    const parsed = new URL(input.includes("://") ? input : `https://${input}`);
    return parsed.hostname.replace(/^\*\./, "").replace(/\.$/, "");
  } catch {
    return input
      .replace(/^https?:\/\//, "")
      .replace(/^\*\./, "")
      .split("/")[0]
      .split(":")[0]
      .replace(/\.$/, "");
  }
}

function configuredClientKeys() {
  const raw = process.env.APIPLAYER_TEST_CLIENT_KEYS_JSON?.trim();
  if (!raw) return new Map<string, string>();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed)
      .map(([domain, key]) => [normalizeDomain(domain), String(key || "").trim()] as const)
      .filter(([domain, key]) => Boolean(domain && key));
    return new Map(entries);
  } catch {
    console.error("[apiplayer-reference-test] APIPLAYER_TEST_CLIENT_KEYS_JSON is invalid JSON");
    return new Map<string, string>();
  }
}

function resolveCredential(clientDomain: string) {
  const domain = normalizeDomain(clientDomain) || API_DOMAIN;
  const specificKey = configuredClientKeys().get(domain);
  if (specificKey) {
    return { domain, key: specificKey, credentialMode: "CLIENT_SPECIFIC_KEY" as const };
  }
  const referenceKey = process.env.APIPLAYER_API_KEY?.trim() || "";
  if (referenceKey) {
    return { domain, key: referenceKey, credentialMode: "REFERENCE_KEY" as const };
  }
  return { domain, key: "", credentialMode: "MISSING_KEY" as const };
}

function presetClients(): ClientPreset[] {
  const seen = new Set<string>();
  const presets: ClientPreset[] = [];
  const configuredDomains = String(process.env.APIPLAYER_TEST_CLIENT_DOMAINS || "")
    .split(",")
    .map(normalizeDomain)
    .filter(Boolean);

  for (const client of [...BUILTIN_CLIENTS, ...configuredDomains.map((domain) => ({ id: domain, label: domain, domain }))]) {
    const domain = normalizeDomain(client.domain);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    presets.push({
      id: client.id,
      label: client.label,
      domain,
      credentialMode: resolveCredential(domain).credentialMode,
    });
  }
  return presets;
}

function extractError(payload: any, status: number) {
  const raw = payload?.error;
  if (raw && typeof raw === "object") {
    const code = String(raw.code || payload?.code || `HTTP_${status}`);
    const message = String(raw.message || payload?.message || code);
    return { code, message };
  }
  if (typeof raw === "string" && raw) {
    return { code: raw, message: String(payload?.message || raw) };
  }
  const code = String(payload?.code || `HTTP_${status}`);
  return { code, message: String(payload?.message || code) };
}

function diagnosticConfig(clientDomain = API_DOMAIN) {
  const credential = resolveCredential(clientDomain);
  return {
    mode: "APIPLAYER_ONLY",
    origin: API_ORIGIN,
    clientDomain: credential.domain,
    apiKeyConfigured: Boolean(credential.key),
    credentialMode: credential.credentialMode,
    supportsClientSpecificKeys: Boolean(process.env.APIPLAYER_TEST_CLIENT_KEYS_JSON?.trim()),
  };
}

async function callApiPlayer(
  path: string,
  params?: URLSearchParams,
  clientDomain = API_DOMAIN,
): Promise<ApiCallResult> {
  const startedAt = Date.now();
  const credential = resolveCredential(clientDomain);
  if (!credential.key) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      path,
      payload: null,
      error: "APIPlayer API key is not configured",
      errorCode: "MISSING_APIPLAYER_API_KEY",
      clientDomain: credential.domain,
      credentialMode: credential.credentialMode,
    };
  }

  const url = new URL(path, API_ORIGIN);
  if (params) url.search = params.toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-api-key": credential.key,
        "x-client-domain": credential.domain,
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    const ok = response.ok && payload?.ok !== false;
    const apiError = ok ? null : extractError(payload, response.status);
    return {
      ok,
      status: response.status,
      ms: Date.now() - startedAt,
      path: `${url.pathname}${url.search}`,
      payload,
      error: apiError?.message || null,
      errorCode: apiError?.code || null,
      clientDomain: credential.domain,
      credentialMode: credential.credentialMode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "request_failed";
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      path: `${url.pathname}${url.search}`,
      payload: null,
      error: timedOut ? "APIPlayer request timed out" : message,
      errorCode: timedOut ? "TIMEOUT" : "REQUEST_FAILED",
      clientDomain: credential.domain,
      credentialMode: credential.credentialMode,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function playerCount(payload: any) {
  const players = payload?.data?.players;
  return Array.isArray(players) ? players.length : 0;
}

function playerSummary(payload: any) {
  const players = Array.isArray(payload?.data?.players) ? payload.data.players : [];
  return players.map((player: any, index: number) => ({
    id: String(player?.id || ""),
    label: String(player?.label || (index === 0 ? "ตัวหลัก" : `สำรอง ${index}`)),
    kind: String(player?.kind || player?.type || "embed"),
    role: String(player?.role || (index === 0 ? "primary" : "backup")),
    groupKey: String(player?.group_key || "default"),
    url: String(player?.url || ""),
    host: (() => {
      try { return new URL(String(player?.url || "")).hostname; } catch { return ""; }
    })(),
  }));
}

function catalogItems(payload: any) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item: any) => ({
    id: String(item?.id || ""),
    contentType: String(item?.content_type || "movie"),
    titleTh: String(item?.title_th || ""),
    titleEn: String(item?.title_en || item?.original_title || ""),
    year: item?.year ?? null,
    posterUrl: item?.poster_url || null,
    readiness: item?.readiness || null,
    playerCount: Number(item?.player_count || item?.active_player_count || 0),
    totalEpisodeCount: Number(item?.total_episode_count || 0),
    readyEpisodeCount: Number(item?.ready_episode_count || 0),
    missingEpisodeCount: Number(item?.missing_episode_count || 0),
  }));
}

function detailSummary(payload: any) {
  const item = payload?.item || null;
  const seasons = Array.isArray(payload?.seasons) ? payload.seasons : [];
  const episodes = seasons.flatMap((season: any) => {
    const rows = Array.isArray(season?.episodes) ? season.episodes : [];
    return rows.map((episode: any) => ({
      id: String(episode?.id || ""),
      seasonNumber: Number(season?.seasonNumber || 0),
      episodeNumber: Number(episode?.episodeNumber || 0),
      title: String(episode?.title || ""),
      playerCount: Array.isArray(episode?.players) ? episode.players.length : 0,
    }));
  });
  return {
    item: item ? {
      id: String(item.id || ""),
      contentType: String(item.content_type || "movie"),
      titleTh: String(item.title_th || ""),
      titleEn: String(item.title_en || item.original_title || ""),
      year: item.year ?? null,
      playerCount: Number(item.player_count || item.active_player_count || 0),
      totalEpisodeCount: Number(item.total_episode_count || episodes.length || 0),
    } : null,
    episodes,
  };
}

async function authenticate(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) {
    return {
      auth: null,
      response: NextResponse.json({ ok: false, error: auth.error }, {
        status: auth.status,
        headers: noStoreHeaders,
      }),
    };
  }
  return { auth, response: null };
}

function pingParams() {
  return new URLSearchParams({
    page: "1",
    limit: "1",
    type: "all",
    player: "all",
    sort: "newest",
  });
}

function callMeta(result: ApiCallResult) {
  return {
    ok: result.ok,
    status: result.status,
    ms: result.ms,
    path: result.path,
    error: result.error,
    errorCode: result.errorCode,
    clientDomain: result.clientDomain,
    credentialMode: result.credentialMode,
  };
}

export async function GET(request: Request) {
  const checked = await authenticate(request);
  if (checked.response) return checked.response;

  const ping = await callApiPlayer("/api/v1/vip/catalog", pingParams(), API_DOMAIN);
  return NextResponse.json({
    ok: ping.ok,
    config: diagnosticConfig(),
    presets: presetClients(),
    ping: {
      ...callMeta(ping),
      sampleCount: catalogItems(ping.payload).length,
    },
  }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const checked = await authenticate(request);
  if (checked.response) return checked.response;

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const action = String(body.action || "");
  const clientDomain = normalizeDomain(body.clientDomain) || API_DOMAIN;

  if (action === "domain-check") {
    const result = await callApiPlayer("/api/v1/vip/catalog", pingParams(), clientDomain);
    return NextResponse.json({
      ok: result.ok,
      config: diagnosticConfig(clientDomain),
      result: { ...callMeta(result), sampleCount: catalogItems(result.payload).length },
    }, { headers: noStoreHeaders });
  }

  if (action === "domain-matrix") {
    const requested = Array.isArray(body.domains) ? body.domains : presetClients().map((client) => client.domain);
    const domains = [...new Set(requested.map(normalizeDomain).filter(Boolean))].slice(0, 12);
    const rows = await Promise.all(domains.map(async (domain) => {
      const result = await callApiPlayer("/api/v1/vip/catalog", pingParams(), domain);
      return { ...callMeta(result), sampleCount: catalogItems(result.payload).length };
    }));
    return NextResponse.json({
      ok: rows.every((row) => row.ok),
      rows,
    }, { headers: noStoreHeaders });
  }

  if (action === "search") {
    const q = String(body.q || "").trim().slice(0, 100);
    if (!q) {
      return NextResponse.json({ ok: false, error: "missing_query" }, { status: 400, headers: noStoreHeaders });
    }
    const params = new URLSearchParams({
      page: "1",
      limit: "20",
      type: "all",
      player: "all",
      sort: "newest",
      q,
    });
    const result = await callApiPlayer("/api/v1/vip/catalog", params, clientDomain);
    return NextResponse.json({
      ...callMeta(result),
      items: catalogItems(result.payload),
    }, { headers: noStoreHeaders });
  }

  if (action === "detail") {
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400, headers: noStoreHeaders });
    }
    const result = await callApiPlayer(`/api/v1/catalog/${encodeURIComponent(id)}`, undefined, clientDomain);
    return NextResponse.json({
      ...callMeta(result),
      detail: result.ok ? detailSummary(result.payload) : null,
    }, { headers: noStoreHeaders });
  }

  if (action === "playback") {
    const titleId = String(body.titleId || "").trim();
    const episodeId = body.episodeId ? String(body.episodeId).trim() : "";
    const index = Number.isInteger(body.index) ? Math.max(0, Math.min(50, Number(body.index))) : 0;
    if (!titleId) {
      return NextResponse.json({ ok: false, error: "missing_title_id" }, { status: 400, headers: noStoreHeaders });
    }
    const path = episodeId
      ? `/api/v1/player/${encodeURIComponent(titleId)}/episode/${encodeURIComponent(episodeId)}`
      : `/api/v1/player/${encodeURIComponent(titleId)}`;
    const result = await callApiPlayer(path, undefined, clientDomain);
    const players = playerSummary(result.payload);
    return NextResponse.json({
      ...callMeta(result),
      playerCount: players.length,
      players,
      selected: players[index] || null,
    }, { headers: noStoreHeaders });
  }

  if (action === "test-all") {
    const titleId = String(body.titleId || "").trim();
    if (!titleId) {
      return NextResponse.json({ ok: false, error: "missing_title_id" }, { status: 400, headers: noStoreHeaders });
    }

    const detailCall = await callApiPlayer(`/api/v1/catalog/${encodeURIComponent(titleId)}`, undefined, clientDomain);
    if (!detailCall.ok) {
      return NextResponse.json({
        ...callMeta(detailCall),
        results: [],
      }, { headers: noStoreHeaders });
    }

    const detail = detailSummary(detailCall.payload);
    const episodes = detail.episodes.slice(0, MAX_TEST_EPISODES);
    if (!episodes.length) {
      const result = await callApiPlayer(`/api/v1/player/${encodeURIComponent(titleId)}`, undefined, clientDomain);
      const count = playerCount(result.payload);
      const passed = result.ok && count > 0 ? 1 : 0;
      return NextResponse.json({
        ok: passed === 1,
        clientDomain: result.clientDomain,
        credentialMode: result.credentialMode,
        truncated: false,
        total: 1,
        passed,
        failed: 1 - passed,
        results: [{
          episodeId: null,
          seasonNumber: null,
          episodeNumber: null,
          ok: passed === 1,
          status: result.status,
          ms: result.ms,
          playerCount: count,
          error: result.error || (count ? null : "No active players returned"),
          errorCode: result.errorCode || (count ? null : "NO_PLAYERS"),
        }],
      }, { headers: noStoreHeaders });
    }

    const results = new Array<any>(episodes.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < episodes.length) {
        const current = cursor;
        cursor += 1;
        const episode = episodes[current];
        const result = await callApiPlayer(
          `/api/v1/player/${encodeURIComponent(titleId)}/episode/${encodeURIComponent(episode.id)}`,
          undefined,
          clientDomain,
        );
        const count = playerCount(result.payload);
        results[current] = {
          episodeId: episode.id,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          ok: result.ok && count > 0,
          status: result.status,
          ms: result.ms,
          playerCount: count,
          error: result.error || (count ? null : "No active players returned"),
          errorCode: result.errorCode || (count ? null : "NO_PLAYERS"),
        };
      }
    };

    await Promise.all([worker(), worker(), worker()]);
    const passed = results.filter((row) => row?.ok).length;
    return NextResponse.json({
      ok: passed === results.length,
      clientDomain,
      credentialMode: resolveCredential(clientDomain).credentialMode,
      truncated: detail.episodes.length > episodes.length,
      total: results.length,
      passed,
      failed: results.length - passed,
      results,
    }, { headers: noStoreHeaders });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, {
    status: 400,
    headers: noStoreHeaders,
  });
}
