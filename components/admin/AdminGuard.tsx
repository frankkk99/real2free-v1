"use client";

import { LoaderCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type GuardState = "checking" | "allowed" | "denied";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");
  const [message, setMessage] = useState("กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ");

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function check() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role,admin_access_expires_at,admin_access_revoked_at")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;
      const expired = profile?.admin_access_expires_at
        ? new Date(profile.admin_access_expires_at).getTime() <= Date.now()
        : false;
      const allowed =
        !error &&
        profile &&
        ["admin", "owner"].includes(String(profile.role)) &&
        !profile.admin_access_revoked_at &&
        !expired;

      if (allowed) {
        setState("allowed");
        return;
      }

      setState("denied");
      setMessage("บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน REAL2FREE");
    }

    void check();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/admin/login");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (state === "allowed") return children;

  return (
    <main className="adminGate">
      <div className="adminGateCard">
        {state === "checking" ? (
          <LoaderCircle className="adminSpin" />
        ) : (
          <ShieldAlert />
        )}
        <h1>{state === "checking" ? "REAL2FREE ADMIN" : "ACCESS DENIED"}</h1>
        <p>{message}</p>
        {state === "denied" ? (
          <button type="button" onClick={() => router.replace("/admin/login")}>
            กลับหน้าเข้าสู่ระบบ
          </button>
        ) : null}
      </div>
    </main>
  );
}
