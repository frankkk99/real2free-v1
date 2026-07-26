"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  Database,
  Film,
  Gauge,
  LogOut,
  Menu,
  PlaySquare,
  RefreshCw,
  SearchCode,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Stats = {
  titles_total: number;
  titles_movie2freehd: number;
  players_active: number;
  players_movie2freehd: number;
  jobs_total: number;
  jobs_running: number;
  jobs_failed: number;
  updated_at: string;
};

type Job = {
  id: string;
  source: string;
  status: string;
  total_detected: number;
  total_saved: number;
  total_failed: number;
  created_at: string;
  input_urls: string[];
};

const emptyStats: Stats = {
  titles_total: 0,
  titles_movie2freehd: 0,
  players_active: 0,
  players_movie2freehd: 0,
  jobs_total: 0,
  jobs_running: 0,
  jobs_failed: 0,
  updated_at: "",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value || 0);
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "รอเริ่ม",
    previewing: "กำลังสำรวจ",
    waiting_for_tmdb_review: "รอตรวจ TMDB",
    ready_to_save: "พร้อมบันทึก",
    saving: "กำลังบันทึก",
    completed: "สำเร็จ",
    partial_failed: "สำเร็จบางส่วน",
    failed: "ล้มเหลว",
  };
  return labels[status] ?? status;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/stats", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      setError(payload?.error || "โหลดข้อมูลหลังบ้านไม่สำเร็จ");
      setLoading(false);
      return;
    }
    setStats({ ...emptyStats, ...(payload.stats ?? {}) });
    setJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const successRate = useMemo(() => {
    const saved = jobs.reduce((sum, job) => sum + Number(job.total_saved || 0), 0);
    const failed = jobs.reduce((sum, job) => sum + Number(job.total_failed || 0), 0);
    const total = saved + failed;
    return total ? Math.round((saved / total) * 100) : 100;
  }, [jobs]);

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.href = "/admin/login";
  }

  const nav = (
    <>
      <div className="adminSideBrand">
        <span className="adminBrandMark"><PlaySquare fill="currentColor" /></span>
        <strong>REAL<span>2</span>FREE</strong>
      </div>
      <nav className="adminSideNav">
        <Link className="active" href="/admin"><Gauge /><span>ภาพรวม</span></Link>
        <Link href="/admin/content"><Film /><span>คลังหนัง</span></Link>
        <Link href="/admin/extractors/movie2freehd"><SearchCode /><span>Movie2FreeHD</span></Link>
        <button type="button" disabled><PlaySquare /><span>Player Center</span><small>เร็ว ๆ นี้</small></button>
        <button type="button" disabled><Settings /><span>ตั้งค่าเว็บไซต์</span><small>เร็ว ๆ นี้</small></button>
      </nav>
      <div className="adminSideStatus">
        <Database />
        <div><strong>Supabase Connected</strong><span>Tokyo · ACTIVE HEALTHY</span></div>
      </div>
      <button className="adminSignOut" type="button" onClick={signOut}><LogOut /> ออกจากระบบ</button>
    </>
  );

  return (
    <div className="adminShell">
      <aside className="adminSidebar">{nav}</aside>
      {menuOpen ? (
        <div className="adminDrawerBackdrop" onMouseDown={() => setMenuOpen(false)}>
          <aside className="adminDrawer" onMouseDown={(event) => event.stopPropagation()}>
            <button className="adminDrawerClose" type="button" onClick={() => setMenuOpen(false)}><X /></button>
            {nav}
          </aside>
        </div>
      ) : null}

      <main className="adminMain">
        <header className="adminTopbar">
          <div>
            <button className="adminMobileMenu" type="button" onClick={() => setMenuOpen(true)}><Menu /></button>
            <span className="adminEyebrow">REAL2FREE CONTROL ROOM</span>
            <h1>ระบบหลังบ้าน</h1>
          </div>
          <button className="adminIconButton" type="button" onClick={() => void load()} disabled={loading} aria-label="รีเฟรช">
            <RefreshCw className={loading ? "adminSpin" : ""} />
          </button>
        </header>

        {error ? <div className="adminAlert error"><CircleAlert /><span>{error}</span></div> : null}

        <section className="adminMetricGrid">
          <article><span><Clapperboard /></span><div><small>หนังทั้งหมด</small><strong>{formatNumber(stats.titles_total)}</strong><p>ใน Content Catalog</p></div></article>
          <article><span><SearchCode /></span><div><small>Movie2FreeHD</small><strong>{formatNumber(stats.titles_movie2freehd)}</strong><p>รายการที่ดึงแล้ว</p></div></article>
          <article><span><PlaySquare /></span><div><small>Player พร้อมใช้</small><strong>{formatNumber(stats.players_active)}</strong><p>{formatNumber(stats.players_movie2freehd)} จาก Movie2FreeHD</p></div></article>
          <article><span><Activity /></span><div><small>งานกำลังทำ</small><strong>{formatNumber(stats.jobs_running)}</strong><p>ล้มเหลว {formatNumber(stats.jobs_failed)} งาน</p></div></article>
        </section>

        <section className="adminDashboardGrid">
          <article className="adminFeatureCard adminExtractorFeature">
            <div className="adminFeatureIcon"><SearchCode /></div>
            <div>
              <span className="adminEyebrow">EXTRACTOR READY</span>
              <h2>Movie2FreeHD Extractor</h2>
              <p>ดึงหลายหน้าแบบแบ่ง Batch, แสดงการ์ดปกทันที, ตรวจ HLS แบบ No-Referer ก่อน, แมตช์ TMDB และบันทึกเข้า Supabase</p>
              <div className="adminFeatureBadges"><span>Resume ได้</span><span>ไม่ชน Timeout</span><span>หลาย Player</span><span>Admin Only</span></div>
            </div>
            <Link className="adminPrimaryButton" href="/admin/extractors/movie2freehd">เปิด Extractor <ArrowRight /></Link>
          </article>

          <article className="adminHealthCard">
            <div className="adminCardHeading"><div><span className="adminEyebrow">SYSTEM HEALTH</span><h2>ความพร้อมระบบ</h2></div><ShieldCheck /></div>
            <div className="adminHealthScore"><strong>{successRate}%</strong><span>อัตราบันทึกสำเร็จจากงานล่าสุด</span></div>
            <div className="adminHealthRows">
              <p><CheckCircle2 /> Supabase Auth และ RLS พร้อม</p>
              <p><CheckCircle2 /> Auto Deploy ถูกปิด</p>
              <p><CheckCircle2 /> Extractor จำกัด Concurrency</p>
            </div>
          </article>
        </section>

        <section className="adminTableCard">
          <div className="adminCardHeading">
            <div><span className="adminEyebrow">RECENT ACTIVITY</span><h2>งาน Extractor ล่าสุด</h2></div>
            <span>{formatNumber(stats.jobs_total)} งานทั้งหมด</span>
          </div>
          <div className="adminJobList">
            {jobs.length ? jobs.map((job) => (
              <article key={job.id}>
                <span className={`adminJobStatus status-${job.status}`}>{statusLabel(job.status)}</span>
                <div><strong>Movie2FreeHD</strong><p>{job.input_urls?.[0] || "ไม่พบ URL ต้นทาง"}</p></div>
                <div className="adminJobCounts"><span>พบ {formatNumber(job.total_detected)}</span><span>บันทึก {formatNumber(job.total_saved)}</span><span>พลาด {formatNumber(job.total_failed)}</span></div>
                <time>{formatDate(job.created_at)}</time>
              </article>
            )) : (
              <div className="adminEmpty"><Database /><h3>ยังไม่มีประวัติงาน</h3><p>เปิด Movie2FreeHD Extractor เพื่อเริ่มดึงรายการแรก</p></div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
