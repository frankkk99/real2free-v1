"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const ADMIN_EMAIL = "dofree2026@gmail.com";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/admin");
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    });

    if (signInError || !data.user) {
      setError("รหัสผู้ดูแลไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,admin_access_expires_at,admin_access_revoked_at")
      .eq("id", data.user.id)
      .maybeSingle();
    const expired = profile?.admin_access_expires_at
      ? new Date(profile.admin_access_expires_at).getTime() <= Date.now()
      : false;

    if (
      !profile ||
      !["admin", "owner"].includes(String(profile.role)) ||
      profile.admin_access_revoked_at ||
      expired
    ) {
      await supabase.auth.signOut();
      setError("บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน REAL2FREE");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="adminLoginPage">
      <section className="adminLoginVisual" aria-hidden="true">
        <div className="adminLoginGlow" />
        <div className="adminLoginBrand">
          <span className="adminBrandMark"><Play fill="currentColor" /></span>
          <strong>REAL<span>2</span>FREE</strong>
        </div>
        <div className="adminLoginCopy">
          <p>CONTENT OPERATIONS</p>
          <h1>จัดการหนัง ลิงก์ และ Extractor จากศูนย์ควบคุมเดียว</h1>
          <span>เชื่อม Supabase แล้ว พร้อมระบบสิทธิ์ Admin และบันทึกประวัติงาน</span>
        </div>
      </section>

      <section className="adminLoginPanel">
        <form className="adminLoginForm" onSubmit={submit}>
          <div className="adminLoginHeading">
            <span>REAL2FREE BACK OFFICE</span>
            <h2>เข้าสู่ระบบผู้ดูแล</h2>
            <p>ใส่รหัสผู้ดูแลเพียงอย่างเดียว</p>
          </div>

          <label className="adminField">
            <span>รหัสผู้ดูแล</span>
            <div>
              <LockKeyhole />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                required
                placeholder="กรอกรหัสผู้ดูแล"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="แสดงหรือซ่อนรหัสผ่าน">
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          {error ? <p className="adminFormError">{error}</p> : null}

          <button className="adminPrimaryButton adminLoginButton" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="adminSpin" /> : <LockKeyhole />}
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่หลังบ้าน"}
          </button>

          <Link className="adminBackLink" href="/">← กลับหน้าเว็บไซต์</Link>
        </form>
      </section>
    </main>
  );
}
