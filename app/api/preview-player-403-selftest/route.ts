import { NextRequest, NextResponse } from "next/server";
import { POST as challengePost } from "@/app/api/playback/challenge/route";
import { POST as sessionPost } from "@/app/api/playback/session/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TITLE_ID = "aac31dd3-530d-4b4f-96bd-454bf585c985";
const EPISODE_ID = "d68ae5e5-3e34-4c45-be67-ab3d4a57bbe2";
const TEST_IP = "198.51.100.24";

function cookieHeaderFrom(response: Response): string {
  const rawHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  const values = rawHeaders.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  return values
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const referer = `${origin}/watch/${TITLE_ID}?episode=${EPISODE_ID}`;
  const sharedHeaders = {
    "content-type": "application/json",
    origin,
    referer,
    "sec-fetch-site": "same-origin",
    "x-forwarded-for": TEST_IP,
  };

  const challengeRequest = new NextRequest(`${origin}/api/playback/challenge`, {
    method: "POST",
    headers: {
      ...sharedHeaders,
      "x-real2free-challenge": "1",
    },
    body: JSON.stringify({ titleId: TITLE_ID, episodeId: EPISODE_ID }),
  });
  const challenge = await challengePost(challengeRequest);
  const challengeBody = await challenge.clone().json().catch(() => null);
  const cookie = cookieHeaderFrom(challenge);

  if (!challenge.ok || !cookie) {
    return NextResponse.json({
      challenge: { status: challenge.status, body: challengeBody, hasCookie: Boolean(cookie) },
      session: null,
    }, { status: 500 });
  }

  const sessionRequest = new NextRequest(`${origin}/api/playback/session`, {
    method: "POST",
    headers: {
      ...sharedHeaders,
      cookie,
      "x-real2free-playback": "1",
    },
    body: JSON.stringify({ titleId: TITLE_ID, episodeId: EPISODE_ID, index: 0 }),
  });
  const session = await sessionPost(sessionRequest);
  const sessionBody = await session.clone().json().catch(() => null) as {
    source?: { url?: string; kind?: string; referrerPolicy?: string } | null;
    index?: number;
    total?: number;
    hasNext?: boolean;
    error?: string;
  } | null;

  let host: string | null = null;
  try {
    host = sessionBody?.source?.url ? new URL(sessionBody.source.url).hostname : null;
  } catch {
    host = null;
  }

  return NextResponse.json({
    challenge: { status: challenge.status, ready: challengeBody?.ready === true, hasCookie: true },
    session: {
      status: session.status,
      hasSource: Boolean(sessionBody?.source?.url),
      kind: sessionBody?.source?.kind || null,
      referrerPolicy: sessionBody?.source?.referrerPolicy || null,
      host,
      index: sessionBody?.index ?? null,
      total: sessionBody?.total ?? null,
      hasNext: sessionBody?.hasNext ?? null,
      error: sessionBody?.error || null,
    },
  }, { status: session.ok ? 200 : 500 });
}
