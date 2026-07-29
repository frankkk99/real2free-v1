import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "jose";

const TEAM_SLUG = "autoxplus8am4";
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

function response(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "pragma": "no-cache",
      "x-content-type-options": "nosniff",
      "cross-origin-resource-policy": "same-site",
      ...extraHeaders,
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
  if (request.headers.get("x-real2free-server") !== "1") return false;
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
      console.error("[real2free-gateway] OIDC verification failed", String(error));
      return false;
    }
  }
}

async function enforceRateLimit(clientHash: string, action: "metadata" | "playback") {
  const limit = action === "playback" ? 20 : 120;
  const bucketStart = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();

  const { data, error } = await db
    .from("real2free_gateway_rate_limits")
    .select("request_count")
    .eq("client_hash", clientHash)
    .eq("action", action)
    .eq("bucket_start", bucketStart)
    .maybeSingle();

  if (error) throw error;
  const current = Number(data?.request_count ?? 0);
  if (current >= limit) return { allowed: false, retryAfter: 60 };

  const { error: upsertError } = await db
    .from("real2free_gateway_rate_limits")
    .upsert({
      client_hash: clientHash,
      action,
      bucket_start: bucketStart,
      request_count: current + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: "client_hash,action,bucket_start" });

  if (upsertError) throw upsertError;
  return { allowed: true, retryAfter: 0 };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  if (!await verifyVercel(request)) return response({ error: "unauthorized" }, 401);
  if (!serviceRoleKey || !supabaseUrl) return response({ error: "gateway_not_configured" }, 503);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return response({ error: "request_too_large" }, 413);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response({ error: "invalid_json" }, 400);
  }

  const action = body.action === "playback" ? "playback" : body.action === "metadata" ? "metadata" : null;
  const titleId = typeof body.titleId === "string" ? body.titleId : "";
  const episodeId = typeof body.episodeId === "string" && body.episodeId ? body.episodeId : null;
  const index = Number.isInteger(body.index) ? Math.min(100, Math.max(0, Number(body.index))) : 0;
  const clientHash = typeof body.clientHash === "string" ? body.clientHash.toLowerCase() : "";

  if (!action || !/^[0-9a-f-]{36}$/i.test(titleId) || !/^[a-f0-9]{64}$/.test(clientHash)) {
    return response({ error: "invalid_request" }, 400);
  }
  if (episodeId && !/^[0-9a-f-]{36}$/i.test(episodeId)) return response({ error: "invalid_episode" }, 400);

  try {
    const rate = await enforceRateLimit(clientHash, action);
    if (!rate.allowed) return response({ error: "rate_limited" }, 429, { "retry-after": String(rate.retryAfter) });

    if (action === "metadata") {
      const { data, error } = await db.rpc("real2free_internal_metadata", { p_title_id: titleId });
      if (error) throw error;
      if (!data) return response({ error: "not_found" }, 404);
      return response(data);
    }

    const { data, error } = await db.rpc("real2free_internal_player", {
      p_title_id: titleId,
      p_episode_id: episodeId,
      p_index: index,
    });
    if (error) throw error;
    if (!data) return response({ error: "not_found" }, 404);
    return response(data);
  } catch (error) {
    console.error("[real2free-gateway] request failed", String(error));
    return response({ error: "gateway_error" }, 500);
  }
});
