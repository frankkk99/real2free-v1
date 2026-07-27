import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

let adminBrowserClient: SupabaseClient | null = null;
let publicBrowserClient: SupabaseClient | null = null;

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
    });
  }

  return publicBrowserClient;
}

export function getSupabaseBrowserClient() {
  const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  return isAdminRoute ? getAdminBrowserClient() : getPublicBrowserClient();
}
