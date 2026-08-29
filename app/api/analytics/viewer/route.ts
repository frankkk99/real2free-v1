import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendViewerAnalyticsEvent } from "@/lib/viewer-analytics-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set(["page_view", "engaged_visit", "play_clicked", "player_started", "watch_30s", "watch_2m", "ad_impression", "ad_click"]);
const SOURCE_KINDS = new Set(["video", "embed", "external", "ad", "unknown"]);
const VERIFICATIONS = new Set(["page_load", "interaction", "media_playback", "media_time", "embed_loaded", "embed_visible", "external_click", "intersection", "unknown"]);
const BOT_RE = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pagespeed|uptime|monitor|curl|wget|python-requests|httpclient)/i;

type ViewerBody = { eventId?: unknown; visitorId?: unknown; sessionId?: unknown; eventType?: unknown; path?: unknown; titleLabel?: unknown; referrer?: unknown; sourceKind?: unknown; verification?: unknown; adCode?: unknown; automationHint?: unknown; };
function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
function cleanText(value: unknown, max: number): string | null { if (typeof value !== "string") return null; const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim(); return clean ? clean.slice(0, max) : null; }
function requestCountry(request: NextRequest): string | null { const value = (request.headers.get("x-vercel-ip-country") || "").trim().toUpperCase(); return /^[A-Z]{2}$/.test(value) ? value : null; }
function requestDevice(userAgent: string): "mobile" | "tablet" | "desktop" | "unknown" { if (!userAgent) return "unknown"; if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet"; if (/mobi|iphone|ipod|android/i.test(userAgent)) return "mobile"; return "desktop"; }
function referrerHost(raw: unknown, request: NextRequest): string | null { if (typeof raw !== "string" || !raw || raw.length > 2048) return null; try { const url = new URL(raw); const hostname = url.hostname.toLowerCase().slice(0, 255); return hostname && hostname !== request.nextUrl.hostname.toLowerCase() ? hostname : null; } catch { return null; } }
function sameOriginBrowserRequest(request: NextRequest): boolean { const fetchSite = request.headers.get("sec-fetch-site"); if (fetchSite && fetchSite !== "same-origin") return false; const origin = request.headers.get("origin"); if (!origin) return true; try { return new URL(origin).host.toLowerCase() === request.nextUrl.host.toLowerCase(); } catch { return false; } }
function noStoreHeaders() { return { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" }; }

export async function POST(request: NextRequest) {
  if (!sameOriginBrowserRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStoreHeaders() });
  if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ error: "request_too_large" }, { status: 413, headers: noStoreHeaders() });
  let body: ViewerBody; try { body = await request.json() as ViewerBody; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: noStoreHeaders() }); }
  if (typeof body.eventId !== "string" || !UUID_RE.test(body.eventId) || typeof body.visitorId !== "string" || !UUID_RE.test(body.visitorId) || typeof body.sessionId !== "string" || !UUID_RE.test(body.sessionId) || typeof body.eventType !== "string" || !EVENT_TYPES.has(body.eventType)) return NextResponse.json({ error: "invalid_event" }, { status: 400, headers: noStoreHeaders() });
  const path = cleanText(body.path, 500);
  if (!path?.startsWith("/") || path.startsWith("/api/") || path.startsWith("/admin")) return NextResponse.json({ error: "invalid_path" }, { status: 400, headers: noStoreHeaders() });
  const sourceKind = typeof body.sourceKind === "string" && SOURCE_KINDS.has(body.sourceKind) ? body.sourceKind : "unknown";
  const verification = typeof body.verification === "string" && VERIFICATIONS.has(body.verification) ? body.verification : "unknown";
  const userAgent = request.headers.get("user-agent") || "";
  const likelyBot = body.automationHint === true || BOT_RE.test(userAgent);
  try {
    await sendViewerAnalyticsEvent({
      eventId: body.eventId,
      visitorHash: sha256(`viewer-visitor|${body.visitorId}`),
      sessionHash: sha256(`viewer-session|${body.visitorId}|${body.sessionId}`),
      userAgentHash: userAgent ? sha256(`viewer-ua|${userAgent}`) : null,
      eventType: body.eventType,
      path,
      titleLabel: cleanText(body.titleLabel, 200),
      referrerHost: referrerHost(body.referrer, request),
      country: requestCountry(request),
      device: requestDevice(userAgent),
      sourceKind,
      verification,
      adCode: cleanText(body.adCode, 100),
      likelyBot,
    });
  } catch (error) {
    console.error("[viewer-analytics] event write failed", error);
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503, headers: noStoreHeaders() });
  }
  return NextResponse.json({ ok: true }, { status: 202, headers: noStoreHeaders() });
}
