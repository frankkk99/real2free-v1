import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "jose";

const TEAM_SLUG = "dev2u";
const TEAM_ID = "team_lZ0lAYrRy4KqgupCAuTiNMDD";
const PROJECT_ID = "prj_GzUmZY7KJlNqmO5AWgwOk0wvca5X";
const PROJECT_NAME = "real2free-v1";
const AUDIENCE = `https://vercel.com/${TEAM_SLUG}`;
const TEAM_ISSUER = `https://oidc.vercel.com/${TEAM_SLUG}`;
const GLOBAL_ISSUER = "https://oidc.vercel.com";
const TEAM_JWKS = createRemoteJWKSet(new URL(`${TEAM_ISSUER}/.well-known/jwks`));
const GLOBAL_JWKS = createRemoteJWKSet(new URL(`${GLOBAL_ISSUER}/.well-known/jwks`));

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SHA256_RE = /^[a-f0-9]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set(["engaged_visit", "play_clicked", "player_started", "watch_30s", "watch_2m"]);
const DEVICES = new Set(["mobile", "tablet", "desktop", "unknown"]);
const SOURCE_KINDS = new Set(["video", "embed", "external", "unknown"]);
const VERIFICATIONS = new Set(["interaction", "media_playback", "media_time", "embed_loaded", "embed_visible", "external_click", "unknown"]);

type JsonRecord = Record<string, unknown>;

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    },
  });
}

function validClaims(payload: Record<string, unknown>): boolean {
  return payload.owner_id === TEAM_ID
    && payload.project_id === PROJECT_ID
    && payload.project === PROJECT_NAME
    && (payload.environment === "production" || payload.environment === "preview");
}

async function verifyVercel(request: Request): Promise<boolean> {
  if (request.headers.get("x-real2free-analytics-server") !== "1") return false;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, TEAM_JWKS, {
      issuer: TEAM_ISSUER,
      audience: AUDIENCE,
    });
    return validClaims(payload as Record<string, unknown>);
  } catch {
    try {
      const { payload } = await jwtVerify(token, GLOBAL_JWKS, {
        issuer: GLOBAL_ISSUER,
        audience: AUDIENCE,
      });
      return validClaims(payload as Record<string, unknown>);
    } catch (error) {
      console.error("[real2free-analytics] OIDC verification failed", String(error));
      return false;
    }
  }
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : null;
}

function eventRow(raw: unknown): JsonRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const event = raw as JsonRecord;
  if (typeof event.eventId !== "string" || !UUID_RE.test(event.eventId)) return null;
  if (typeof event.visitorHash !== "string" || !SHA256_RE.test(event.visitorHash)) return null;
  if (typeof event.sessionHash !== "string" || !SHA256_RE.test(event.sessionHash)) return null;
  if (event.userAgentHash != null && (typeof event.userAgentHash !== "string" || !SHA256_RE.test(event.userAgentHash))) return null;
  if (typeof event.eventType !== "string" || !EVENT_TYPES.has(event.eventType)) return null;

  const path = cleanText(event.path, 500);
  if (!path?.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api/")) return null;

  const country = typeof event.country === "string" && /^[A-Z]{2}$/.test(event.country) ? event.country : null;
  const device = typeof event.device === "string" && DEVICES.has(event.device) ? event.device : "unknown";
  const sourceKind = typeof event.sourceKind === "string" && SOURCE_KINDS.has(event.sourceKind) ? event.sourceKind : "unknown";
  const verification = typeof event.verification === "string" && VERIFICATIONS.has(event.verification) ? event.verification : "unknown";

  return {
    event_id: event.eventId,
    visitor_hash: event.visitorHash,
    session_hash: event.sessionHash,
    user_agent_hash: event.userAgentHash ?? null,
    event_type: event.eventType,
    path,
    title_label: cleanText(event.titleLabel, 200),
    referrer_host: cleanText(event.referrerHost, 255),
    country,
    device,
    source_kind: sourceKind,
    verification,
    likely_bot: event.likelyBot === true,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  if (!serviceRoleKey || !supabaseUrl) return response({ error: "gateway_not_configured" }, 503);
  if (!await verifyVercel(request)) return response({ error: "unauthorized" }, 401);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32768) return response({ error: "request_too_large" }, 413);

  let body: JsonRecord;
  try {
    body = await request.json();
  } catch {
    return response({ error: "invalid_json" }, 400);
  }
  if (body.action !== "event") return response({ error: "unknown_action" }, 400);

  const row = eventRow(body.event);
  if (!row) return response({ error: "invalid_event" }, 400);

  const { error } = await db
    .from("real2free_viewer_events")
    .upsert(row, { onConflict: "event_id", ignoreDuplicates: true });
  if (error) {
    console.error("[real2free-analytics] event write failed", String(error));
    return response({ error: "gateway_error" }, 500);
  }

  return response({ ok: true }, 202);
});
