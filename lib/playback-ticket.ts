import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getVercelOidcToken } from "@vercel/oidc";

const TEAM_ID = "team_lZ0lAYrRy4KqgupCAuTiNMDD";
const PROJECT_ID = "prj_GzUmZY7KJlNqmO5AWgwOk0wvca5X";
const TICKET_VERSION = 1;
const TICKET_TTL_SECONDS = 120;

export const PLAYBACK_DEVICE_COOKIE = "r2f_playback_device";
export const PLAYBACK_TICKET_COOKIE = "r2f_playback_ticket";

export type PlaybackTicket = {
  v: number;
  titleId: string;
  episodeId: string | null;
  expectedIndex: number;
  clientHash: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function parseBase64UrlJson(value: string): PlaybackTicket | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PlaybackTicket;
  } catch {
    return null;
  }
}

async function signingKey(): Promise<Buffer> {
  const configured = process.env.REAL2FREE_PLAYBACK_SECRET?.trim();
  if (configured && configured.length >= 32) {
    return createHash("sha256").update(`real2free-ticket-v1|${configured}`).digest();
  }

  const oidcToken = await getVercelOidcToken({ project: PROJECT_ID, team: TEAM_ID });
  return createHash("sha256").update(`real2free-ticket-v1|${oidcToken}`).digest();
}

async function signature(encodedPayload: string): Promise<string> {
  return createHmac("sha256", await signingKey()).update(encodedPayload).digest("base64url");
}

export function newPlaybackDeviceId(): string {
  return randomBytes(24).toString("base64url");
}

export function validPlaybackDeviceId(value: string | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{24,64}$/.test(value));
}

export function playbackClientHash(ip: string, deviceId: string): string {
  return createHash("sha256")
    .update(`real2free-client-v1|${ip}|${deviceId}`)
    .digest("hex");
}

export async function issuePlaybackTicket(input: {
  titleId: string;
  episodeId: string | null;
  expectedIndex: number;
  clientHash: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: PlaybackTicket = {
    v: TICKET_VERSION,
    titleId: input.titleId,
    episodeId: input.episodeId,
    expectedIndex: input.expectedIndex,
    clientHash: input.clientHash,
    issuedAt: now,
    expiresAt: now + TICKET_TTL_SECONDS,
    nonce: randomBytes(18).toString("base64url"),
  };
  const encoded = base64UrlJson(payload);
  return `${encoded}.${await signature(encoded)}`;
}

export async function verifyPlaybackTicket(
  token: string | undefined,
  expected: {
    titleId: string;
    episodeId: string | null;
    expectedIndex: number;
    clientHash: string;
  },
): Promise<PlaybackTicket | null> {
  if (!token || token.length > 4096) return null;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;

  const expectedSignature = await signature(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const calculated = Buffer.from(expectedSignature);
  if (supplied.length !== calculated.length || !timingSafeEqual(supplied, calculated)) return null;

  const payload = parseBase64UrlJson(encoded);
  const now = Math.floor(Date.now() / 1000);
  if (!payload || payload.v !== TICKET_VERSION) return null;
  if (payload.expiresAt < now || payload.issuedAt > now + 15) return null;
  if (payload.expiresAt - payload.issuedAt > TICKET_TTL_SECONDS + 5) return null;
  if (payload.titleId !== expected.titleId) return null;
  if ((payload.episodeId || null) !== expected.episodeId) return null;
  if (payload.expectedIndex !== expected.expectedIndex) return null;
  if (payload.clientHash !== expected.clientHash) return null;
  return payload;
}

export function playbackCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/playback",
    maxAge,
    priority: "high" as const,
  };
}
