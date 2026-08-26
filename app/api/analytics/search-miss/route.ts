import { NextRequest, NextResponse } from "next/server";
import { sendSearchMissAnalytics } from "@/lib/viewer-analytics-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SearchMissBody = {
  eventId?: unknown;
  query?: unknown;
  path?: unknown;
  resultCount?: unknown;
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : null;
}

function containsObviousPersonalData(value: string) {
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)) return true;
  return value.replace(/\D/g, "").length >= 8;
}

function sameOriginBrowserRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === request.nextUrl.host.toLowerCase();
  } catch {
    return false;
  }
}

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  };
}

export async function POST(request: NextRequest) {
  if (!sameOriginBrowserRequest(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStoreHeaders() });
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (length > 2048) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413, headers: noStoreHeaders() });
  }

  let body: SearchMissBody;
  try {
    body = await request.json() as SearchMissBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: noStoreHeaders() });
  }

  if (typeof body.eventId !== "string" || !UUID_RE.test(body.eventId)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400, headers: noStoreHeaders() });
  }

  const query = cleanText(body.query, 120);
  const path = cleanText(body.path, 500);
  const resultCount = typeof body.resultCount === "number" && Number.isInteger(body.resultCount) ? body.resultCount : -1;

  if (!query || query.length < 2 || !path?.startsWith("/") || path.startsWith("/api/") || path.startsWith("/admin") || resultCount !== 0) {
    return NextResponse.json({ error: "invalid_search_miss" }, { status: 400, headers: noStoreHeaders() });
  }

  if (containsObviousPersonalData(query)) {
    return NextResponse.json({ ok: true, dropped: true }, { status: 202, headers: noStoreHeaders() });
  }

  try {
    await sendSearchMissAnalytics({
      eventId: body.eventId,
      query,
      path,
      resultCount: 0,
    });
  } catch (error) {
    console.error("[search-miss-analytics] write failed", error);
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503, headers: noStoreHeaders() });
  }

  return NextResponse.json({ ok: true }, { status: 202, headers: noStoreHeaders() });
}
