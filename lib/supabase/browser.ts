import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

let adminBrowserClient: SupabaseClient | null = null;
let publicBrowserClient: SupabaseClient | null = null;

const PUBLIC_CATALOG_RESOURCES = new Set([
  "real2free_public_cards",
  "real2free_public_home_sections",
  "real2free_public_heroes",
  "real2free_public_titles",
  "real2free_public_episodes",
  "real2free_public_series_summary",
]);

const CACHEABLE_PUBLIC_RESOURCES = new Set([
  "real2free_public_cards",
  "real2free_public_heroes",
  "real2free_public_home_sections",
]);

async function sameOriginPublicFetch(input: RequestInfo | URL, init?: RequestInit) {
  const request = input instanceof Request ? input : new Request(input, init);

  try {
    const url = new URL(request.url);
    const supabaseOrigin = new URL(SUPABASE_URL).origin;
    const restPrefix = "/rest/v1/";

    if (url.origin === supabaseOrigin && url.pathname.startsWith(restPrefix)) {
      const resource = decodeURIComponent(url.pathname.slice(restPrefix.length));

      if (PUBLIC_CATALOG_RESOURCES.has(resource) && request.method === "GET") {
        const proxyUrl = `/api/public-catalog/${encodeURIComponent(resource)}${url.search}`;
        const headers = new Headers(request.headers);
        headers.delete("apikey");
        headers.delete("authorization");

        return fetch(proxyUrl, {
          method: "GET",
          headers,
          signal: request.signal,
          cache: CACHEABLE_PUBLIC_RESOURCES.has(resource) ? "default" : "no-store",
          credentials: "same-origin",
        });
      }
    }
  } catch {
    // Fall through to the original request for anything outside the public catalog.
  }

  return fetch(request);
}

function getAdminBrowserClient() {
  if (!adminBrowserClient) {
    adminBrowserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "real2free-admin-session",
      },
    });
  }

  return adminBrowserClient;
}

function getPublicBrowserClient() {
  if (!publicBrowserClient) {
    publicBrowserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: sameOriginPublicFetch,
      },
    });
  }

  return publicBrowserClient;
}

export function getSupabaseBrowserClient() {
  const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  return isAdminRoute ? getAdminBrowserClient() : getPublicBrowserClient();
}
