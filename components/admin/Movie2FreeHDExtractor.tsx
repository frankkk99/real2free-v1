"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  Eye,
  Film,
  Filter,
  Link2,
  LoaderCircle,
  LogOut,
  Menu,
  Pause,
  Play,
  RefreshCw,
  Save,
  Search,
  Server,
  ShieldCheck,
  Square,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status =
  | "discovered"
  | "extracting"
  | "tested"
  | "matching"
  | "matched"
  | "review"
  | "saving"
  | "saved"
  | "error";

type Validation = {
  ok: boolean;
  status: number;
  contentType: string;
  cors: string;
  noReferer: boolean;
  resolution: string | null;
  bandwidth: number | null;
  variantUrl: string | null;
  audioUrl: string | null;
  error: string;
};

type PlayerItem = {
  label: string;
  embedUrl: string;
  hash: string;
  hlsUrl: string;
  posterUrl: string | null;
  subtitleUrl: string | null;
  validation: Validation;
};

type MatchItem = {
  tmdb_id: number;
  media_type: string;
  title: string;
  title_en: string | null;
  release_year: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string | null;
  rating: number | null;
  genres: string[];
  score: number;
};

type Row = {
  id: string;
  url: string;
  title: string;
  poster: string | null;
  detailPoster: string | null;
  year: string | null;
  rating: string | null;
  quality: string | null;
  postId: string | null;
  page: number;
  selected: boolean;
  status: Status;
  message: string;
  players: PlayerItem[];
  best: PlayerItem | null;
  matches: MatchItem[];
  chosen: MatchItem | null;
  originalTitle: string | null;
  overview: string | null;
  releaseDate: string | null;
  sourceReleaseDate: string | null;
  runtime: number | null;
  contentRating: string | null;
  language: string | null;
  genres: string[];
  imdbId: string | null;
  imdbRating: number | null;
  imdbVoteCount: number | null;
  tmdbRating: number | null;
  tmdbVoteCount: number | null;
};

type ApiPayload = Record<string, unknown> & { ok?: boolean; error?: string };
type FilterKey = "all" | "selected" | "ready" | "review" | "saved" | "error";

const STORAGE_KEY = "real2free:movie2freehd:v1";
const DEFAULT_URL = "https://movie2freehd.com/movies/";

function emptyValidation(): Validation {
  return {
    ok: false,
    status: 0,
    contentType: "",
    cors: "",
    noReferer: true,
    resolution: null,
    bandwidth: null,
    variantUrl: null,
    audioUrl: null,
    error: "",
  };
}

function toRow(value: Partial<Row> & Pick<Row, "id" | "url" | "title">): Row {
  return {
    id: value.id,
    url: value.url,
    title: value.title,
    poster: value.detailPoster || value.poster || null,
    detailPoster: value.detailPoster || null,
    year: value.year || value.title.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || null,
    rating: value.rating || null,
    quality: value.quality || null,
    postId: value.postId || null,
    page: Number(value.page || 1),
    selected: value.selected ?? true,
    status: value.status || "discovered",
    message: value.message || "รอ Extract",
    players: Array.isArray(value.players) ? value.players : [],
    best: value.best || null,
    matches: Array.isArray(value.matches) ? value.matches : [],
    chosen: value.chosen || null,
    originalTitle: value.originalTitle || null,
    overview: value.overview || null,
    releaseDate: value.releaseDate || null,
    sourceReleaseDate: value.sourceReleaseDate || null,
    runtime: Number.isFinite(Number(value.runtime)) ? Number(value.runtime) : null,
    contentRating: value.contentRating || null,
    language: value.language || null,
    genres: Array.isArray(value.genres) ? value.genres : [],
    imdbId: value.imdbId || null,
    imdbRating: Number.isFinite(Number(value.imdbRating)) ? Number(value.imdbRating) : null,
    imdbVoteCount: Number.isFinite(Number(value.imdbVoteCount)) ? Number(value.imdbVoteCount) : null,
    tmdbRating: Number.isFinite(Number(value.tmdbRating)) ? Number(value.tmdbRating) : null,
    tmdbVoteCount: Number.isFinite(Number(value.tmdbVoteCount)) ? Number(value.tmdbVoteCount) : null,
  };
}

function rowFromUnknown(value: unknown): Row | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = String(raw.id || raw.url || "");
  const url = String(raw.url || "");
  const title = String(raw.title || "");
  if (!id || !url || !title) return null;
  return toRow(raw as unknown as Partial<Row> & Pick<Row, "id" | "url" | "title">);
}

function mergeRows(current: Row[], incoming: Row[]) {
  const map = new Map(current.map((row) => [row.url, row]));
  for (const row of incoming) {
    const old = map.get(row.url);
    map.set(row.url, old ? toRow({ ...old, ...row, selected: old.selected }) : row);
  }
  return [...map.values()].sort((a, b) => a.page - b.page || a.title.localeCompare(b.title, "th"));
}

function statusLabel(status: Status) {
  const labels: Record<Status, string> = {
    discovered: "พบรายการ",
    extracting: "กำลังดึง",
    tested: "HLS ผ่าน",
    matching: "กำลังแมตช์",
    matched: "แมตช์แล้ว",
    review: "รอตรวจ",
    saving: "กำลังบันทึก",
    saved: "บันทึกแล้ว",
    error: "ผิดพลาด",
  };
  return labels[status];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value || 0);
}

async function postApi(body: Record<string, unknown>) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  const response = await fetch("/api/admin/movie2freehd", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ApiPayload | null;
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
  return payload;
}

function HlsPreview({ player, poster }: { player: PlayerItem; poster?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !player.hlsUrl) return;
    let disposed = false;
    let instance: { destroy: () => void } | null = null;
    setError("");

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = player.hlsUrl;
      video.load();
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (disposed || !Hls.isSupported()) {
          if (!disposed) setError("Browser นี้ไม่รองรับ HLS");
          return;
        }
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 60 });
        instance = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !disposed) setError(`HLS: ${data.details}`);
        });
        hls.loadSource(player.hlsUrl);
        hls.attachMedia(video);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "เปิด HLS ไม่สำเร็จ"));

    return () => {
      disposed = true;
      instance?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [player.hlsUrl]);

  return (
    <div className="extractorVideoBox">
      <video ref={videoRef} controls playsInline preload="metadata" crossOrigin="anonymous" poster={poster || player.posterUrl || undefined} />
      {error ? <p>{error}</p> : null}
    </div>
  );
}

function Poster({ row }: { row: Row }) {
  const sources = [row.detailPoster, row.poster, row.best?.posterUrl].filter(Boolean) as string[];
  const [index, setIndex] = useState(0);
  const source = sources[index] || "";
  return (
    <div className="extractorPoster">
      <span>{source ? "กำลังโหลด..." : "ไม่มีภาพ"}</span>
      {source ? <img src={source} alt={row.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setIndex((value) => value + 1)} /> : null}
    </div>
  );
}

export default function Movie2FreeHDExtractor() {
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_URL);
  const [rows, setRows] = useState<Row[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [stopping, setStopping] = useState(false);
  const stopRef = useRef(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as {
        sourceUrl?: string;
        rows?: Row[];
        jobId?: string | null;
        totalPages?: number;
        fromPage?: number;
        toPage?: number;
      } | null;
      if (!saved) return;
      if (saved.sourceUrl) setSourceUrl(saved.sourceUrl);
      if (Array.isArray(saved.rows)) setRows(saved.rows.map((row) => toRow(row)));
      if (saved.jobId) setJobId(saved.jobId);
      if (saved.totalPages) setTotalPages(saved.totalPages);
      if (saved.fromPage) setFromPage(saved.fromPage);
      if (saved.toPage) setToPage(saved.toPage);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sourceUrl, rows, jobId, totalPages, fromPage, toPage }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [sourceUrl, rows, jobId, totalPages, fromPage, toPage]);

  const activeRow = rows.find((row) => row.id === activeRowId) || null;
  const counts = useMemo(() => ({
    all: rows.length,
    selected: rows.filter((row) => row.selected).length,
    ready: rows.filter((row) => row.players.some((player) => player.validation.ok)).length,
    review: rows.filter((row) => row.status === "review").length,
    saved: rows.filter((row) => row.status === "saved").length,
    error: rows.filter((row) => row.status === "error").length,
  }), [rows]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !`${row.title} ${row.originalTitle || ""} ${row.year || ""}`.toLowerCase().includes(needle)) return false;
      if (filter === "selected" && !row.selected) return false;
      if (filter === "ready" && !row.players.some((player) => player.validation.ok)) return false;
      if (filter === "review" && row.status !== "review") return false;
      if (filter === "saved" && row.status !== "saved") return false;
      if (filter === "error" && row.status !== "error") return false;
      return true;
    });
  }, [rows, filter, query]);

  function patchRow(id: string, patch: Partial<Row> | ((row: Row) => Partial<Row>)) {
    setRows((current) => current.map((row) => row.id === id ? toRow({ ...row, ...(typeof patch === "function" ? patch(row) : patch) }) : row));
  }

  async function ensureJob(mode: "category_url" | "single_url") {
    if (jobId) return jobId;
    const payload = await postApi({ action: "create-job", sourceUrl, mode });
    const nextId = String(payload.jobId || "");
    if (nextId) setJobId(nextId);
    return nextId || null;
  }

  async function preview() {
    setBusy("preview");
    setError("");
    setMessage("กำลังตรวจโครงสร้างต้นทาง...");
    try {
      const payload = await postApi({ action: "preview", sourceUrl });
      const cards = (Array.isArray(payload.cards) ? payload.cards : []).map(rowFromUnknown).filter((row): row is Row => Boolean(row));
      const pages = Math.max(1, Number(payload.totalPages || 1));
      setRows((current) => mergeRows(current, cards));
      setTotalPages(pages);
      setFromPage(1);
      setToPage(Math.min(pages, 10));
      await ensureJob(payload.scope === "single" ? "single_url" : "category_url");
      setMessage(`พบ ${formatNumber(cards.length)} รายการในหน้าแรก และตรวจพบสูงสุด ${formatNumber(pages)} หน้า`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ตรวจต้นทางไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function discoverPages() {
    const start = Math.max(1, Math.min(fromPage, totalPages));
    const end = Math.max(start, Math.min(toPage, totalPages));
    const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
    setBusy("discover");
    setError("");
    stopRef.current = false;
    setStopping(false);
    setProgress({ current: 0, total: pages.length, label: "กำลังดึงหน้ารายการ" });
    let completed = 0;
    try {
      await ensureJob("category_url");
      for (let index = 0; index < pages.length; index += 6) {
        if (stopRef.current) break;
        const chunk = pages.slice(index, index + 6);
        const payload = await postApi({ action: "discover", sourceUrl, pages: chunk });
        const results = Array.isArray(payload.results) ? payload.results as Array<Record<string, unknown>> : [];
        const cards = results.flatMap((result) => Array.isArray(result.cards) ? result.cards : []).map(rowFromUnknown).filter((row): row is Row => Boolean(row));
        setRows((current) => mergeRows(current, cards));
        completed += chunk.length;
        setProgress({ current: completed, total: pages.length, label: `ดึงถึงหน้า ${chunk.at(-1)}` });
      }
      setMessage(stopRef.current ? "หยุดการดึงแล้ว สามารถกดต่อได้จากช่วงหน้าที่ยังไม่ดึง" : `ดึงหน้ารายการครบ ${formatNumber(completed)} หน้า`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ดึงรายการไม่สำเร็จ");
    } finally {
      setBusy("");
      setStopping(false);
    }
  }

  async function matchRow(row: Row) {
    patchRow(row.id, { status: "matching", message: "กำลังค้น TMDB" });
    try {
      const payload = await postApi({ action: "match", title: row.originalTitle || row.title, year: row.year });
      const matches = Array.isArray(payload.matches) ? payload.matches as MatchItem[] : [];
      const chosen = matches[0] && Number(matches[0].score) >= 58 ? matches[0] : null;
      patchRow(row.id, {
        matches,
        chosen,
        status: chosen ? "matched" : "review",
        message: chosen ? `TMDB ${chosen.tmdb_id} · ${Number(chosen.score).toFixed(1)}%` : "กรุณาตรวจผลแมตช์",
      });
    } catch (reason) {
      patchRow(row.id, { status: "review", message: reason instanceof Error ? reason.message : "แมตช์ไม่สำเร็จ" });
    }
  }

  async function extractSelected() {
    const targets = rows.filter((row) => row.selected && row.status !== "saved");
    if (!targets.length) {
      setError("ยังไม่ได้เลือกรายการสำหรับ Extract");
      return;
    }
    setBusy("extract");
    setError("");
    stopRef.current = false;
    setStopping(false);
    setProgress({ current: 0, total: targets.length, label: "กำลัง Extract Player" });
    let completed = 0;
    try {
      await ensureJob(targets.length === 1 ? "single_url" : "category_url");
      for (let index = 0; index < targets.length; index += 3) {
        if (stopRef.current) break;
        const chunk = targets.slice(index, index + 3);
        chunk.forEach((row) => patchRow(row.id, { status: "extracting", message: "กำลังค้น Player และ HLS" }));
        const payload = await postApi({ action: "extract", items: chunk });
        const results = Array.isArray(payload.results) ? payload.results as Array<Record<string, unknown>> : [];
        const matchedRows: Row[] = [];
        for (const raw of results) {
          const id = String(raw.id || "");
          const old = rows.find((row) => row.id === id) || chunk.find((row) => row.id === id);
          if (!old) continue;
          const players = Array.isArray(raw.players) ? raw.players as PlayerItem[] : [];
          const ok = Boolean(raw.ok) && players.some((player) => player.validation?.ok);
          const next = toRow({
            ...old,
            ...(raw as unknown as Partial<Row>),
            players,
            best: raw.best as PlayerItem | null,
            status: ok ? "tested" : "error",
            message: ok ? `${players.length} Player · HLS ผ่าน` : String(raw.error || "ไม่พบลิงก์ที่เล่นได้"),
          });
          patchRow(id, next);
          if (ok) matchedRows.push(next);
        }
        await Promise.all(matchedRows.map((row) => matchRow(row)));
        completed += chunk.length;
        setProgress({ current: completed, total: targets.length, label: `ตรวจแล้ว ${completed}/${targets.length}` });
      }
      setMessage(stopRef.current ? "หยุด Extract แล้ว ข้อมูลที่ทำสำเร็จยังถูกเก็บไว้" : "Extract และตรวจ HLS เสร็จแล้ว");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Extract ไม่สำเร็จ");
    } finally {
      setBusy("");
      setStopping(false);
    }
  }

  async function saveRow(row: Row) {
    if (!row.players.some((player) => player.validation.ok)) throw new Error(`${row.title}: ไม่มี HLS ที่ผ่านการทดสอบ`);
    patchRow(row.id, { status: "saving", message: "กำลังบันทึก Supabase" });
    try {
      const payload = await postApi({ action: "save", jobId, item: row });
      const saved = payload.saved as Record<string, unknown> | undefined;
      patchRow(row.id, {
        status: "saved",
        message: `บันทึกแล้ว · Player ใหม่ ${Number(saved?.inserted_players || 0)} · อัปเดต ${Number(saved?.updated_players || 0)}`,
      });
    } catch (reason) {
      patchRow(row.id, { status: "error", message: reason instanceof Error ? reason.message : "บันทึกไม่สำเร็จ" });
      throw reason;
    }
  }

  async function saveSelected() {
    const targets = rows.filter((row) => row.selected && row.status !== "saved" && row.players.some((player) => player.validation.ok));
    if (!targets.length) {
      setError("ไม่มีรายการที่พร้อมบันทึก");
      return;
    }
    setBusy("save");
    setError("");
    stopRef.current = false;
    setProgress({ current: 0, total: targets.length, label: "กำลังบันทึก Supabase" });
    let saved = 0;
    let failed = 0;
    for (const row of targets) {
      if (stopRef.current) break;
      try {
        await saveRow(row);
        saved += 1;
      } catch {
        failed += 1;
      }
      setProgress({ current: saved + failed, total: targets.length, label: `สำเร็จ ${saved} · พลาด ${failed}` });
    }
    try {
      if (jobId) {
        await postApi({
          action: "finish-job",
          jobId,
          status: failed ? "partial_failed" : "completed",
          totalDetected: rows.length,
          totalSaved: counts.saved + saved,
          totalSkipped: rows.filter((row) => !row.selected).length,
          totalFailed: counts.error + failed,
          summary: { sourceUrl, stopped: stopRef.current },
        });
      }
    } catch {
      // Saving the titles is more important than closing the job summary.
    }
    setMessage(`บันทึกสำเร็จ ${formatNumber(saved)} รายการ${failed ? ` · พลาด ${formatNumber(failed)}` : ""}`);
    setBusy("");
  }

  function stopWork() {
    stopRef.current = true;
    setStopping(true);
  }

  function reset() {
    if (!window.confirm("ล้างรายการและสถานะงานในหน้านี้หรือไม่? ข้อมูลที่บันทึกลง Supabase แล้วจะไม่ถูกลบ")) return;
    setRows([]);
    setJobId(null);
    setTotalPages(1);
    setFromPage(1);
    setToPage(1);
    setProgress({ current: 0, total: 0, label: "" });
    setMessage("");
    setError("");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.href = "/admin/login";
  }

  const progressPercent = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="extractorPage">
      <aside className={`extractorSidebar ${menuOpen ? "open" : ""}`}>
        <div className="extractorSideHead"><strong>REAL<span>2</span>FREE</strong><button type="button" onClick={() => setMenuOpen(false)}><X /></button></div>
        <nav>
          <Link href="/admin"><ArrowLeft /> กลับภาพรวม</Link>
          <span className="active"><Zap /> Movie2FreeHD</span>
        </nav>
        <div className="extractorSourceStatus"><ShieldCheck /><div><strong>Admin Only</strong><span>Supabase RLS ทำงาน</span></div></div>
        <button className="extractorSignOut" type="button" onClick={signOut}><LogOut /> ออกจากระบบ</button>
      </aside>
      {menuOpen ? <div className="extractorMenuBackdrop" onClick={() => setMenuOpen(false)} /> : null}

      <main className="extractorMain">
        <header className="extractorHeader">
          <div>
            <button className="extractorMobileMenu" type="button" onClick={() => setMenuOpen(true)}><Menu /></button>
            <span>MOVIE2FREEHD · MEEPLAYER HLS</span>
            <h1>Extractor Workbench</h1>
            <p>ดึงหลายหน้า → เห็นการ์ด → ตรวจ No-Referer → แมตช์ TMDB → บันทึก Supabase</p>
          </div>
          <div className="extractorHeaderActions"><Link href="/admin"><ArrowLeft /> หลังบ้าน</Link><button type="button" onClick={reset}><Trash2 /> ล้างงาน</button></div>
        </header>

        <section className="extractorControlCard">
          <div className="extractorUrlRow">
            <label><Link2 /><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder={DEFAULT_URL} disabled={Boolean(busy)} /></label>
            <button className="adminPrimaryButton" type="button" onClick={() => void preview()} disabled={Boolean(busy)}>{busy === "preview" ? <LoaderCircle className="adminSpin" /> : <Search />} ตรวจต้นทาง</button>
          </div>
          <div className="extractorRangeRow">
            <div><label>จากหน้า<input type="number" min={1} max={totalPages} value={fromPage} onChange={(event) => setFromPage(Number(event.target.value))} /></label><label>ถึงหน้า<input type="number" min={1} max={totalPages} value={toPage} onChange={(event) => setToPage(Number(event.target.value))} /></label><span>สูงสุด {formatNumber(totalPages)} หน้า</span></div>
            <div className="extractorActionGroup">
              <button type="button" onClick={() => void discoverPages()} disabled={Boolean(busy)}><RefreshCw /> ดึงช่วงหน้า</button>
              <button type="button" onClick={() => void extractSelected()} disabled={Boolean(busy)}><Zap /> Extract ที่เลือก</button>
              <button className="save" type="button" onClick={() => void saveSelected()} disabled={Boolean(busy)}><Save /> บันทึกที่พร้อม</button>
              {busy ? <button className="stop" type="button" onClick={stopWork} disabled={stopping}><Square fill="currentColor" /> {stopping ? "กำลังหยุด" : "หยุด"}</button> : null}
            </div>
          </div>
          {progress.total ? <div className="extractorProgress"><div><span>{progress.label}</span><strong>{progressPercent}%</strong></div><i><b style={{ width: `${progressPercent}%` }} /></i></div> : null}
          {message ? <div className="extractorNotice success"><CheckCircle2 /> {message}</div> : null}
          {error ? <div className="extractorNotice error"><CircleAlert /> {error}</div> : null}
        </section>

        <section className="extractorMetrics">
          <article><Film /><div><span>ทั้งหมด</span><strong>{formatNumber(counts.all)}</strong></div></article>
          <article><Check /><div><span>เลือกไว้</span><strong>{formatNumber(counts.selected)}</strong></div></article>
          <article><Server /><div><span>HLS พร้อม</span><strong>{formatNumber(counts.ready)}</strong></div></article>
          <article><Eye /><div><span>รอตรวจ</span><strong>{formatNumber(counts.review)}</strong></div></article>
          <article><Database /><div><span>บันทึกแล้ว</span><strong>{formatNumber(counts.saved)}</strong></div></article>
          <article><CircleAlert /><div><span>ผิดพลาด</span><strong>{formatNumber(counts.error)}</strong></div></article>
        </section>

        <section className="extractorToolbar">
          <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อหนัง ปี หรือชื่อเดิม..." />{query ? <button type="button" onClick={() => setQuery("")}><X /></button> : null}</label>
          <div className="extractorFilters"><Filter />{(["all", "selected", "ready", "review", "saved", "error"] as FilterKey[]).map((item) => <button key={item} className={filter === item ? "active" : ""} type="button" onClick={() => setFilter(item)}>{item === "all" ? "ทั้งหมด" : item === "selected" ? "เลือกไว้" : item === "ready" ? "HLS พร้อม" : item === "review" ? "รอตรวจ" : item === "saved" ? "บันทึกแล้ว" : "ผิดพลาด"}</button>)}</div>
          <div className="extractorBulk"><button type="button" onClick={() => setRows((current) => current.map((row) => ({ ...row, selected: true }))}>เลือกทั้งหมด</button><button type="button" onClick={() => setRows((current) => current.map((row) => ({ ...row, selected: false }))}>ไม่เลือกทั้งหมด</button><button type="button" onClick={() => setRows((current) => current.filter((row) => row.players.length || row.status !== "error"))}>ตัดรายการไม่มีลิงก์</button></div>
        </section>

        {visibleRows.length ? (
          <section className="extractorGrid">
            {visibleRows.map((row) => (
              <article key={row.id} className={`extractorCard status-${row.status} ${row.selected ? "selected" : ""}`}>
                <button className="extractorCardOpen" type="button" onClick={() => setActiveRowId(row.id)}>
                  <Poster row={row} />
                  <span className={`extractorStatus status-${row.status}`}>{statusLabel(row.status)}</span>
                  <span className="extractorQuality">{row.quality || row.year || `P${row.page}`}</span>
                  {row.rating ? <span className="extractorRating">★ {row.rating}</span> : null}
                  {row.best?.validation.resolution ? <span className="extractorResolution">{row.best.validation.resolution}</span> : null}
                </button>
                <div className="extractorCardBody"><h3>{row.title}</h3><p>{row.message}</p><div><span>{row.players.length} Player</span><span>{row.chosen ? `TMDB ${row.chosen.tmdb_id}` : "ยังไม่ผูก TMDB"}</span></div></div>
                <footer><label><input type="checkbox" checked={row.selected} onChange={() => patchRow(row.id, (current) => ({ selected: !current.selected }))} /> เลือก</label><button type="button" onClick={() => setActiveRowId(row.id)}>ตรวจ / เล่น</button></footer>
              </article>
            ))}
          </section>
        ) : (
          <section className="extractorEmpty"><Film /><h2>ยังไม่มีรายการในหน้าจอ</h2><p>ใส่ URL Movie2FreeHD แล้วกด “ตรวจต้นทาง” เพื่อเริ่มงาน</p></section>
        )}
      </main>

      {activeRow ? (
        <div className="extractorModalBackdrop" onMouseDown={() => setActiveRowId(null)}>
          <section className="extractorModal" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>{statusLabel(activeRow.status)}</span><h2>{activeRow.title}</h2><p>{activeRow.url}</p></div><button type="button" onClick={() => setActiveRowId(null)}><X /></button></header>
            <div className="extractorModalBody">
              <aside className="extractorModalPoster"><Poster row={activeRow} /><div><span>{activeRow.year || "ไม่ทราบปี"}</span><span>{activeRow.quality || "ไม่ระบุคุณภาพ"}</span><span>{activeRow.language || "ไม่ระบุภาษา"}</span></div></aside>
              <div className="extractorModalContent">
                <section><h3>ข้อมูลต้นทาง</h3><p>{activeRow.overview || "ไม่มีเรื่องย่อจากต้นทาง"}</p><div className="extractorMetaGrid"><span><b>ชื่อเดิม</b>{activeRow.originalTitle || "-"}</span><span><b>IMDb</b>{activeRow.imdbRating ?? activeRow.rating ?? "-"}</span><span><b>ความยาว</b>{activeRow.runtime ? `${activeRow.runtime} นาที` : "-"}</span><span><b>เรต</b>{activeRow.contentRating || "-"}</span></div>{activeRow.genres.length ? <div className="extractorTags">{activeRow.genres.map((genre) => <span key={genre}>{genre}</span>)}</div> : null}</section>

                <section><div className="extractorSectionHead"><h3>Player และการทดสอบ</h3>{activeRow.players.length ? <span>{activeRow.players.length} รายการ</span> : null}</div>{activeRow.players.length ? <div className="extractorPlayers">{activeRow.players.map((player) => <article key={`${player.hash}-${player.label}`}><HlsPreview player={player} poster={activeRow.poster} /><div><strong>{player.label}</strong><p><span className={player.validation.ok ? "ok" : "bad"}>{player.validation.ok ? "HLS ผ่าน" : "HLS ไม่ผ่าน"}</span><span>{player.validation.noReferer ? "No-Referer ผ่าน" : "ใช้ Referer Fallback"}</span><span>{player.validation.resolution || "ไม่ทราบความละเอียด"}</span></p><a href={player.hlsUrl} target="_blank" rel="noreferrer noopener"><Play /> เปิดแท็บใหม่</a></div></article>)}</div> : <div className="extractorInlineEmpty"><Server /><p>ยังไม่มี Player กด Extract รายการนี้ก่อน</p></div>}</section>

                <section><div className="extractorSectionHead"><h3>จับคู่ TMDB</h3><button type="button" onClick={() => void matchRow(activeRow)} disabled={activeRow.status === "matching"}>{activeRow.status === "matching" ? <LoaderCircle className="adminSpin" /> : <RefreshCw />} ค้นใหม่</button></div>{activeRow.matches.length ? <div className="extractorMatches">{activeRow.matches.map((match) => <button type="button" key={match.tmdb_id} className={activeRow.chosen?.tmdb_id === match.tmdb_id ? "active" : ""} onClick={() => patchRow(activeRow.id, { chosen: match, status: "matched", message: `เลือก TMDB ${match.tmdb_id}` })}>{match.poster_url ? <img src={match.poster_url} alt="" referrerPolicy="no-referrer" /> : <span className="noPoster">TMDB</span>}<div><strong>{match.title}</strong><p>{match.title_en || ""}</p><small>{match.release_year || "-"} · คะแนนจับคู่ {Number(match.score).toFixed(1)}%</small></div>{activeRow.chosen?.tmdb_id === match.tmdb_id ? <CheckCircle2 /> : null}</button>)}</div> : <div className="extractorInlineEmpty"><Search /><p>ยังไม่มีผล TMDB สามารถบันทึกเป็นเรื่องใหม่โดยไม่ผูก TMDB ได้</p></div>}<button className="extractorManualMatch" type="button" onClick={() => patchRow(activeRow.id, { chosen: null, status: "review", message: "บันทึกข้อมูลต้นทางโดยไม่ผูก TMDB" })}>ไม่ผูก TMDB · ใช้ข้อมูลต้นทาง</button></section>
              </div>
            </div>
            <footer><button type="button" onClick={() => setActiveRowId(null)}>ปิด</button><button type="button" onClick={() => void extractSelected()} disabled={Boolean(busy)}><Zap /> Extract ที่เลือก</button><button className="save" type="button" onClick={() => void saveRow(activeRow)} disabled={Boolean(busy) || !activeRow.players.some((player) => player.validation.ok)}><Save /> บันทึกเรื่องนี้</button></footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
