import "server-only";

import { createHash } from "node:crypto";
import { getVercelOidcToken } from "@vercel/oidc";

const TEAM_ID = "team_lZ0lAYrRy4KqgupCAuTiNMDD";
const PROJECT_ID = "prj_GzUmZY7KJlNqmO5AWgwOk0wvca5X";
const DEFAULT_SUPABASE_URL = "https://xzlfrpamifzpexfajdlg.supabase.co";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const GATEWAY_URL = `${SUPABASE_URL}/functions/v1/real2free-playback-gateway`;

export type GatewayErrorCode =
  | "unauthorized"
  | "rate_limited"
  | "not_found"
  | "gateway_error"
  | "gateway_unavailable"
  | "invalid_request";

export class Real2freeGatewayError extends Error {
  readonly status: number;
  readonly code: GatewayErrorCode;

  constructor(code: GatewayErrorCode, status: number, message?: string) {
    super(message || code);
    this.name = "Real2freeGatewayError";
    this.code = code;
    this.status = status;
  }
}

export function hashGatewayClient(...parts: Array<string | null | undefined>): string {
  return createHash("sha256").update(parts.filter(Boolean).join("|")).digest("hex");
}

export async function callReal2freeGateway<T>(
  payload: Record<string, unknown>,
  clientHash: string,
): Promise<T> {
  let token: string;
  try {
    token = await getVercelOidcToken({ project: PROJECT_ID, team: TEAM_ID });
  } catch (error) {
    console.error("[real2free-gateway] unable to obtain Vercel OIDC token", error);
    throw new Real2freeGatewayError("gateway_unavailable", 503, "ไม่สามารถยืนยันเซิร์ฟเวอร์ได้");
  }

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-real2free-server": "1",
    },
    body: JSON.stringify({ ...payload, clientHash }),
  });

  const result = await response.json().catch(() => ({ error: "gateway_error" })) as Record<string, unknown>;
  if (!response.ok) {
    const rawCode = typeof result.error === "string" ? result.error : "gateway_error";
    const code: GatewayErrorCode = [
      "unauthorized",
      "rate_limited",
      "not_found",
      "gateway_error",
      "invalid_request",
    ].includes(rawCode)
      ? rawCode as GatewayErrorCode
      : "gateway_error";
    throw new Real2freeGatewayError(code, response.status);
  }

  return result as T;
}
