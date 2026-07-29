import { NextRequest, NextResponse } from "next/server";
import type { PlaybackSource } from "@/lib/public-catalog";
import {
  callReal2freeGateway,
  hashGatewayClient,
  Real2freeGatewayError,
} from "@/lib/real2free-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function forbiddenRequest(request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (requestOrigin && requestOrigin !== request.nextUrl.origin)
    || fetchSite === "cross-site";
}

export async function POST(request: NextRequest) {
  if (forbiddenRequest(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: noStoreHeaders() });
  }
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

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const clientHash = hashGatewayClient("playback", ip, userAgent);

  try {
    const result = await callReal2freeGateway<PlaybackResponse>({
      action: "playback",
      titleId,
      episodeId,
      index,
    }, clientHash);

    if (!result.found || !result.url || !result.id || !result.kind) {
      return NextResponse.json({
        source: null,
        index: result.index,
        total: result.total,
        hasNext: false,
      }, { headers: noStoreHeaders() });
    }

    const source: PlaybackSource = {
      id: result.id,
      label: result.label || (result.index === 0 ? "ตัวหลัก" : `สำรอง ${result.index}`),
      url: result.url,
      kind: result.kind,
      groupKey: result.group_key || "default",
      role: result.role || (result.index === 0 ? "primary" : "backup"),
      backupIndex: Number(result.backup_index || result.index),
      order: Number(result.order || result.index),
    };

    return NextResponse.json({
      source,
      index: result.index,
      total: result.total,
      hasNext: result.has_next,
    }, { headers: noStoreHeaders() });
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
