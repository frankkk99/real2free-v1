import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const ALLOWED_VIEWS = new Set([
  "real2free_public_cards",
  "real2free_public_smart_cards",
  "real2free_public_home_sections",
  "real2free_public_heroes",
  "real2free_public_titles",
  "real2free_public_episodes",
  "real2free_public_series_summary",
  "real2free_public_trailers",
]);

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-profile",
  "content-profile",
  "prefer",
  "range",
  "range-unit",
];

const FORWARDED_RESPONSE_HEADERS = [
  "content-profile",
  "content-range",
  "content-type",
  "preference-applied",
  "range-unit",
];

function isInternalPlatformParam(key: string) {
  const normalized = key.toLocaleLowerCase("en-US");
  return normalized === "view"
    || normalized.startsWith("_")
    || normalized.startsWith("x-vercel-");
}

function publicCacheControl(view: string) {
  if (view === "real2free_public_heroes") {
    return "public, max-age=300, s-maxage=600, stale-while-revalidate=3600";
  }
  if (view === "real2free_public_trailers") {
    return "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";
  }
  if (view === "real2free_public_titles" || view === "real2free_public_episodes") {
    return "public, max-age=120, s-maxage=300, stale-while-revalidate=1800";
  }
  if (view === "real2free_public_cards" || view === "real2free_public_smart_cards" || view === "real2free_public_home_sections" || view === "real2free_public_series_summary") {
    return "public, max-age=120, s-maxage=300, stale-while-revalidate=1800";
  }
  return "public, max-age=60, s-maxage=120, stale-while-revalidate=600";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ view: string }> },
) {
  const { view } = await context.params;

  if (!ALLOWED_VIEWS.has(view)) {
    return NextResponse.json({ message: "Public catalog resource not allowed" }, { status: 404 });
  }

  const upstream = new URL(`/rest/v1/${view}`, SUPABASE_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (!isInternalPlatformParam(key)) upstream.searchParams.append(key, value);
  });

  const upstreamHeaders = new Headers({
    apikey: SUPABASE_PUBLISHABLE_KEY,
  });

  FORWARDED_REQUEST_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) upstreamHeaders.set(name, value);
  });

  try {
    const response = await fetch(upstream, {
      method: "GET",
      headers: upstreamHeaders,
      cache: "no-store",
    });
    const body = await response.arrayBuffer();

    if (!response.ok) {
      const errorText = new TextDecoder().decode(body).slice(0, 1200);
      console.error("Public catalog upstream error", {
        status: response.status,
        view,
        query: upstream.search,
        error: errorText,
      });
    }

    const responseHeaders = new Headers({
      "cache-control": publicCacheControl(view),
    });

    FORWARDED_RESPONSE_HEADERS.forEach((name) => {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    });

    return new NextResponse(body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Public catalog proxy failed", error);
    return NextResponse.json(
      { message: "Unable to load public catalog" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
