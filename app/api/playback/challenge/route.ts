import { NextRequest, NextResponse } from "next/server";
import {
  issuePlaybackTicket,
  newPlaybackDeviceId,
  playbackClientHash,
  playbackCookieOptions,
  PLAYBACK_DEVICE_COOKIE,
  PLAYBACK_TICKET_COOKIE,
  validPlaybackDeviceId,
} from "@/lib/playback-ticket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Vary": "Cookie",
  };
}

function trustedWatchRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const referer = request.headers.get("referer");
  if (origin !== request.nextUrl.origin || fetchSite !== "same-origin" || !referer) return false;

  try {
    const refererUrl = new URL(referer);
    return refererUrl.origin === request.nextUrl.origin && refererUrl.pathname.startsWith("/watch/");
  } catch {
    return false;
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function requestIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export async function POST(request: NextRequest) {
  if (!trustedWatchRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: noStoreHeaders() });
  }
  if (request.headers.get("x-real2free-challenge") !== "1") {
    return NextResponse.json({ error: "missing_challenge_header" }, { status: 403, headers: noStoreHeaders() });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2048) {
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
  if (!isUuid(titleId) || (episodeId !== null && !isUuid(episodeId))) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders() });
  }

  const currentDeviceId = request.cookies.get(PLAYBACK_DEVICE_COOKIE)?.value;
  const deviceId = validPlaybackDeviceId(currentDeviceId) ? currentDeviceId : newPlaybackDeviceId();
  const clientHash = playbackClientHash(requestIp(request), deviceId);

  try {
    const ticket = await issuePlaybackTicket({
      titleId,
      episodeId,
      expectedIndex: 0,
      clientHash,
    });

    const response = NextResponse.json({ ready: true }, { headers: noStoreHeaders() });
    response.cookies.set(PLAYBACK_DEVICE_COOKIE, deviceId, playbackCookieOptions(30 * 24 * 60 * 60));
    response.cookies.set(PLAYBACK_TICKET_COOKIE, ticket, playbackCookieOptions(120));
    return response;
  } catch (error) {
    console.error("[api/playback/challenge] failed", error);
    return NextResponse.json({ error: "challenge_unavailable" }, { status: 503, headers: noStoreHeaders() });
  }
}
