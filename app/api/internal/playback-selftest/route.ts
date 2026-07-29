import { NextRequest, NextResponse } from "next/server";
import { POST as challengePost } from "@/app/api/playback/challenge/route";
import { POST as sessionPost } from "@/app/api/playback/session/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TITLE_ID = "aac31dd3-530d-4b4f-96bd-454bf585c985";
const EPISODE_ID = "d68ae5e5-3e34-4c45-be67-ab3d4a57bbe2";

function browserHeaders(origin: string, extra: Record<string, string>) {
  return {
    origin,
    referer: `${origin}/watch/${TITLE_ID}`,
    "sec-fetch-site": "same-origin",
    "content-type": "application/json",
    ...extra,
  };
}

function setCookieLines(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const values = headers.getSetCookie?.();
  if (values?.length) return values;
  const combined = response.headers.get("set-cookie");
  return combined ? [combined] : [];
}

function cookieHeader(lines: string[]): string {
  const found = new Map<string, string>();
  const pattern = /(r2f_playback_device|r2f_playback_ticket)=([^;,\s]+)/g;
  for (const line of lines) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line))) found.set(match[1], match[2]);
  }
  return [...found.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const body = JSON.stringify({ titleId: TITLE_ID, episodeId: EPISODE_ID });

  const challenge = await challengePost(new NextRequest(`${origin}/api/playback/challenge`, {
    method: "POST",
    headers: browserHeaders(origin, { "x-real2free-challenge": "1" }),
    body,
  }));
  const challengeCookies = setCookieLines(challenge);
  const cookies = cookieHeader(challengeCookies);

  const unauthorized = await sessionPost(new NextRequest(`${origin}/api/playback/session`, {
    method: "POST",
    headers: browserHeaders(origin, { "x-real2free-playback": "1" }),
    body: JSON.stringify({ titleId: TITLE_ID, episodeId: EPISODE_ID, index: 0 }),
  }));

  const session = await sessionPost(new NextRequest(`${origin}/api/playback/session`, {
    method: "POST",
    headers: browserHeaders(origin, {
      "x-real2free-playback": "1",
      cookie: cookies,
    }),
    body: JSON.stringify({ titleId: TITLE_ID, episodeId: EPISODE_ID, index: 0 }),
  }));

  const payload = await session.json().catch(() => null) as {
    source?: { url?: string; kind?: string } | null;
    index?: number;
    total?: number;
    hasNext?: boolean;
    error?: string;
  } | null;

  let safeProtocol = false;
  try {
    const parsed = new URL(payload?.source?.url || "");
    safeProtocol = parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    safeProtocol = false;
  }

  const rotatedCookies = setCookieLines(session);
  const checks = {
    challengeStatus: challenge.status,
    hasDeviceCookie: cookies.includes("r2f_playback_device="),
    hasTicketCookie: cookies.includes("r2f_playback_ticket="),
    cookiesHttpOnly: challengeCookies.every((value) => /;\s*HttpOnly/i.test(value)),
    cookiesSameSiteStrict: challengeCookies.every((value) => /;\s*SameSite=Strict/i.test(value)),
    missingTicketRejected: unauthorized.status === 401,
    sessionStatus: session.status,
    sourceFound: Boolean(payload?.source?.url),
    safeProtocol,
    playerKind: payload?.source?.kind || null,
    index: payload?.index ?? null,
    total: payload?.total ?? null,
    ticketRotatedOrCleared: rotatedCookies.some((value) => value.includes("r2f_playback_ticket=")),
  };

  const passed = checks.challengeStatus === 200
    && checks.hasDeviceCookie
    && checks.hasTicketCookie
    && checks.cookiesHttpOnly
    && checks.cookiesSameSiteStrict
    && checks.missingTicketRejected
    && checks.sessionStatus === 200
    && checks.sourceFound
    && checks.safeProtocol
    && checks.ticketRotatedOrCleared;

  return NextResponse.json({ passed, checks }, {
    status: passed ? 200 : 500,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
