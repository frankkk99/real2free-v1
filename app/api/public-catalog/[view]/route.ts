import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const ALLOWED_VIEWS = new Set([
  "real2free_public_titles",
  "real2free_public_episodes",
  "real2free_public_series_summary",
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ view: string }> },
) {
  const { view } = await context.params;

  if (!ALLOWED_VIEWS.has(view)) {
    return NextResponse.json({ message: "Public catalog resource not allowed" }, { status: 404 });
  }

  const upstream = new URL(`/rest/v1/${view}`, SUPABASE_URL);
  request.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));

  const upstreamHeaders = new Headers({
    apikey: SUPABASE_PUBLISHABLE_KEY,
    authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
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

    const responseHeaders = new Headers({
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
    });

    FORWARDED_RESPONSE_HEADERS.forEach((name) => {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    });

    return new NextResponse(response.body, {
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
