import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GETPLAY_ORIGIN = "https://getplay-cdn.com";
const RELAY_PREFIX = "/api/getplay-relay";
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "range",
  "user-agent",
  "x-requested-with",
];

const FORWARDED_RESPONSE_HEADERS = [
  "accept-ranges",
  "content-disposition",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
  "vary",
];

function relayPath(path: string) {
  return `${RELAY_PREFIX}/${path.replace(/^\/+/, "")}`;
}

function rewriteGetplayHtml(value: string) {
  return value
    .replace(/(\s(?:src|href)=)(["']?)\/(?!\/)/gi, `$1$2${RELAY_PREFIX}/`)
    .replace(/(url\(["']?)\/(?!\/)/gi, `$1${RELAY_PREFIX}/`);
}

function rewriteGetplayScript(value: string) {
  return value.replace(
    /(["'`])\/(api|assets|img|m|artplayer)(?=\/|["'`])/g,
    `$1${RELAY_PREFIX}/$2`,
  );
}

function upstreamHeaders(request: NextRequest, upstreamPath: string) {
  const headers = new Headers();

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  headers.set("origin", GETPLAY_ORIGIN);
  headers.set("referer", `${GETPLAY_ORIGIN}${upstreamPath}`);
  return headers;
}

function responseHeaders(upstream: Response) {
  const headers = new Headers({
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff",
  });

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  const setCookies = upstream.headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    headers.append(
      "set-cookie",
      cookie.replace(/;?\s*domain=[^;]+/gi, ""),
    );
  }

  return headers;
}

function allowedGetplayUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && (hostname === "getplay-cdn.com" || hostname.endsWith(".getplay-cdn.com"));
  } catch {
    return false;
  }
}

async function fetchGetplay(
  request: NextRequest,
  initialUrl: URL,
  upstreamPath: string,
  body: ArrayBuffer | undefined,
) {
  let currentUrl = initialUrl;

  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const upstream = await fetch(currentUrl, {
      method: request.method,
      headers: upstreamHeaders(request, upstreamPath),
      body,
      redirect: "manual",
      cache: "no-store",
    });

    if (upstream.status < 300 || upstream.status >= 400) return upstream;
    const location = upstream.headers.get("location");
    if (!location) return upstream;
    const nextUrl = new URL(location, currentUrl);
    if (!allowedGetplayUrl(nextUrl.toString())) return upstream;
    currentUrl = nextUrl;
    await upstream.body?.cancel().catch(() => undefined);
  }

  return new Response("Too many redirects", { status: 502 });
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstreamPath = `/${path.join("/")}`;
  const upstreamUrl = new URL(upstreamPath, GETPLAY_ORIGIN);
  request.nextUrl.searchParams.forEach((value, key) => upstreamUrl.searchParams.append(key, value));

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const requestBody = await request.arrayBuffer();
    if (requestBody.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "request_too_large" }, { status: 413 });
    }
    body = requestBody;
  }

  let upstream: Response;
  try {
    upstream = await fetchGetplay(request, upstreamUrl, upstreamPath, body);
  } catch {
    return NextResponse.json({ error: "getplay_unavailable" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type")?.toLowerCase() || "";
  const headers = responseHeaders(upstream);

  // These headers belong to getplay-cdn.com and can prevent the relayed page
  // from being embedded under our own origin.
  headers.delete("content-security-policy");
  headers.delete("content-security-policy-report-only");
  headers.delete("cross-origin-resource-policy");
  headers.delete("x-frame-options");

  if (contentType.includes("text/html")) {
    const html = rewriteGetplayHtml(await upstream.text());
    headers.set("content-type", "text/html; charset=utf-8");
    return new NextResponse(html, { status: upstream.status, headers });
  }

  if (contentType.includes("javascript") || contentType.includes("ecmascript")) {
    const script = rewriteGetplayScript(await upstream.text());
    headers.set("content-type", upstream.headers.get("content-type") || "application/javascript");
    return new NextResponse(script, { status: upstream.status, headers });
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}
