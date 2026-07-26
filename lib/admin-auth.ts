import { createRequestSupabase, bearerToken } from "@/lib/supabase/request";

export type AdminRequestContext = {
  ok: true;
  token: string;
  userId: string;
  role: string;
  supabase: ReturnType<typeof createRequestSupabase>;
};

export type AdminRequestFailure = {
  ok: false;
  status: number;
  error: string;
};

export async function requireAdminRequest(
  request: Request,
): Promise<AdminRequestContext | AdminRequestFailure> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "กรุณาเข้าสู่ระบบหลังบ้าน" };
  }

  const supabase = createRequestSupabase(token);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return { ok: false, status: 401, error: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,admin_access_expires_at,admin_access_revoked_at")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, status: 403, error: "ไม่พบสิทธิ์ผู้ดูแลระบบ" };
  }

  const expired = profile.admin_access_expires_at
    ? new Date(profile.admin_access_expires_at).getTime() <= Date.now()
    : false;
  const revoked = Boolean(profile.admin_access_revoked_at);
  const role = String(profile.role ?? "viewer");
  if (!["admin", "owner"].includes(role) || expired || revoked) {
    return { ok: false, status: 403, error: "บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน" };
  }

  return {
    ok: true,
    token,
    userId: authData.user.id,
    role,
    supabase,
  };
}
