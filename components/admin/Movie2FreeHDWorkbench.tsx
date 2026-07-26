"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  Database,
  Film,
  Filter,
  Link2,
  LoaderCircle,
  Play,
  RefreshCw,
  Save,
  Search,
  Server,
  Square,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

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
  overview: string | null;
  score: number;
};

type RowStatus = "discovered" | "extracting" | "tested" | "matching" | "matched" | "review" | "saving" | "saved" | "error";
type FilterKey = "all" | "selected" | "ready" | "review" | "saved" | "error";

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
  status: RowStatus;
  message: string;
  players: PlayerItem[];
  best: PlayerItem | null;
  matches: MatchItem[];
  chosen: MatchItem | null;
  originalTitle: string | null;
  overview: string | null;
  runtime: number | null;
  contentRating: string | null;
  language: string | null;
  genres: string[];
  imdbId: string | null;
  imdbRating: number | null;
};

type ApiPayload = Record<string, unknown> & { ok?: boolean; error?: string };

const DEFAULT_URL = "https://movie2freehd.com/movies/";
const STORAGE_KEY = "real2free:movie2freehd:v2";

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

function normalizePlayer(value: unknown): PlayerItem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const hlsUrl = String(raw.hlsUrl || "");
  if (!hlsUrl) return null;
  const validationRaw = raw.validation && typeof raw.validation === "object"
    ? raw.validation as Partial<Validation>
    : {};
  return {
    label: String(raw.label || "Movie2FreeHD HLS"),
    embedUrl: String(raw.embedUrl || ""),
    hash: String(raw.hash || ""),
    hlsUrl,
    posterUrl: typeof raw.posterUrl === "string" ? raw.posterUrl : null,
    subtitleUrl: typeof raw.subtitleUrl === "string" ? raw.subtitleUrl : null,
    validation: { ...emptyValidation(), ...validationRaw },
  };
}

function normalizeRow(value: unknown): Row | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = String(raw.id || raw.url || "");
  const url = String(raw.url || "");
  const title = String(raw.title || "");
  if (!id || !url || !title) return null;
  const players = Array.isArray(raw.players)
    ? raw.players.map(normalizePlayer).filter((player): player is PlayerItem => Boolean(player))
    : [];
  const best = normalizePlayer(raw.best);
  return {
    id,
    url,
    title,
    poster: typeof raw.poster === "string" ? raw.poster : null,
    detailPoster: typeof raw.detailPoster === "string" ? raw.detailPoster : null,
    year: typeof raw.year === "string" ? raw.year : title.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || null,
    rating: raw.rating == null ? null : String(raw.rating),
    quality: typeof raw.quality === "string" ? raw.quality : null,
    postId: typeof raw.postId === "string" ? raw.postId : null,
    page: Number(raw.page || 1),
    selected: raw.selected !== false,
    status: (raw.status as RowStatus) || "discovered",
    message: String(raw.message || "รอ Extract"),
    players,
    best,
    matches: Array.isArray(raw.matches) ? raw.matches as MatchItem[] : [],
    chosen: raw.chosen && typeof raw.chosen === "object" ? raw.chosen as MatchItem : null,
    originalTitle: typeof raw.originalTitle === "string" ? raw.originalTitle : null,
    overview: typeof raw.overview === "string" ? raw.overview : null,
    runtime: Number.isFinite(Number(raw.runtime)) ? Number(raw.runtime) : null,
    contentRating: typeof raw.contentRating === "string" ? raw.contentRating : null,
    language: typeof raw.language === "string" ? raw.language : null,
    genres: Array.isArray(raw.genres) ? raw.genres.map(String) : [],
    imdbId: typeof raw.imdbId === "string" ? raw.imdbId : null,
    imdbRating: Number.isFinite(Number(raw.imdbRating)) ? Number(raw.imdbRating) : null,
  };
}

function statusLabel(status: RowStatus) {
  const labels: Record<RowStatus, string> = {
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
  const payload = await response.json().catch(() => null) as ApiPayload | null;
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
  return payload;
}

function Poster({ row }: { row: Row }) {
  const [failed, setFailed] = useState(false);
  const source = row.detailPoster || row.poster || row.best?.posterUrl || "";
  return (
    <div className="extractorPoster">
      {source && !failed ? (
        <img src={source} alt={row.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span><Film /></span>
      )}
    </div>
  );
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
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        instance = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !disposed) setError(`HLS: ${data.details}`);
        });
        hls.loadSource(player.hlsUrl);
        hls.attachMedia(video);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : "เปิด HLS ไม่สำเร็จ");
      });

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

export default function Movie2FreeHDWorkbench() {
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_URL);
  const [rows, setRows] = useState<Row[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const stopRef = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as { sourceUrl?: string; rows?: unknown[]; jobId?: string | null } | null;
      if (!saved) return;
      if (saved.sourceUrl) setSourceUrl(saved.sourceUrl);
      if (Array.isArray(saved.rows)) setRows(saved.rows.map(normalizeRow).filter((row): row is Row => Boolean(row)));
      if (saved.jobId) setJobId(saved.jobId);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sourceUrl, rows, jobId }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [sourceUrl, rows, jobId]);

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
  }, [filter, query, rows]);

  const activeRow = rows.find((row) => row.id === activeId) || null;

  function patchRow(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function mergeRows(incoming: Row[]) {
    setRows((current) => {
      const map = new Map(current.map((row) => [row.url, row]));
      for (const row of incoming) {
        const previous = map.get(row.url);
        map.set(row.url, previous ? { ...previous, ...row, selected: previous.selected } : row);
      }
      return [...map.values()].sort((a, b) => a.page - b.page || a.title.localeCompare(b.title, "th"));
    });
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
    setMessage("กำลังตรวจต้นทาง...");
    try {
      const payload = await postApi({ action: "preview", sourceUrl });
      const cards = (Array.isArray(payload.cards) ? payload.cards : []).map(normalizeRow).filter((row): row is Row => Boolean(row));
      const pages = Math.max(1, Number(payload.totalPages || 1));
      mergeRows(cards);
      setTotalPages(pages);
      setFromPage(1);
      setToPage(Math.min(pages, 10));
      await ensureJob(payload.scope === "single" ? "single_url" : "category_url");
      setMessage(`พบ ${cards.length} รายการ และตรวจพบสูงสุด ${pages} หน้า`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ตรวจต้นทางไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function discover() {
    const start = Math.max(1, Math.min(fromPage, totalPages));
    const end = Math.max(start, Math.min(toPage, totalPages));
    const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
    setBusy("discover");
    setError("");
    stopRef.current = false;
    try {
      await ensureJob("category_url");
      for (let index = 0; index < pages.length; index += 6) {
        if (stopRef.current) break;
        const chunk = pages.slice(index, index + 6);
        const payload = await postApi({ action: "discover", sourceUrl, pages: chunk });
        const results = Array.isArray(payload.results) ? payload.results as Array<Record<string, unknown>> : [];
        const cards = results
          .flatMap((result) => Array.isArray(result.cards) ? result.cards : [])
          .map(normalizeRow)
          .filter((row): row is Row => Boolean(row));
        mergeRows(cards);
        setMessage(`ดึงถึงหน้า ${chunk.at(-1)} แล้ว`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ดึงรายการไม่สำเร็จ");
    } finally {
      setBusy("");
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
    try {
      await ensureJob(targets.length === 1 ? "single_url" : "category_url");
      for (let index = 0; index < targets.length; index += 3) {
        if (stopRef.current) break;
        const chunk = targets.slice(index, index + 3);
        chunk.forEach((row) => patchRow(row.id, { status: "extracting", message: "กำลังค้น Player" }));
        const payload = await postApi({ action: "extract", items: chunk });
        const results = Array.isArray(payload.results) ? payload.results : [];
        const ready: Row[] = [];
        for (const result of results) {
          const normalized = normalizeRow(result);
          if (!normalized) continue;
          const previous = rows.find((row) => row.id === normalized.id) || chunk.find((row) => row.id === normalized.id);
          if (!previous) continue;
          const merged = { ...previous, ...normalized };
          const ok = merged.players.some((player) => player.validation.ok);
          merged.status = ok ? "tested" : "error";
          merged.message = ok ? `${merged.players.length} Player · HLS ผ่าน` : String((result as Record<string, unknown>).error || "ไม่พบลิงก์ที่เล่นได้");
          patchRow(merged.id, merged);
          if (ok) ready.push(merged);
        }
        await Promise.all(ready.map(matchRow));
        setMessage(`ตรวจแล้ว ${Math.min(index + chunk.length, targets.length)}/${targets.length}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Extract ไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function saveOne(row: Row) {
    if (!row.players.some((player) => player.validation.ok)) throw new Error("ไม่มี HLS ที่ผ่านการทดสอบ");
    patchRow(row.id, { status: "saving", message: "กำลังบันทึก Supabase" });
    try {
      const payload = await postApi({ action: "save", jobId, item: row });
      const saved = payload.saved as Record<string, unknown> | undefined;
      patchRow(row.id, {
        status: "saved",
        message: `บันทึกแล้ว · ใหม่ ${Number(saved?.inserted_players || 0)} · อัปเดต ${Number(saved?.updated_players || 0)}`,
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
    let saved = 0;
    let failed = 0;
    for (const row of targets) {
      if (stopRef.current) break;
      try {
        await saveOne(row);
        saved += 1;
      } catch {
        failed += 1;
      }
    }
    if (jobId) {
      await postApi({
        action: "finish-job",
        jobId,
        status: failed ? "partial_failed" : "completed",
        totalDetected: rows.length,
        totalSaved: saved,
        totalSkipped: rows.filter((row) => !row.selected).length,
        totalFailed: failed,
        summary: { sourceUrl },
      }).catch(() => null);
    }
    setMessage(`บันทึกสำเร็จ ${saved} รายการ${failed ? ` · พลาด ${failed}` : ""}`);
    setBusy("");
  }

  function reset() {
    if (!window.confirm("ล้างรายการในหน้านี้หรือไม่? ข้อมูลใน Supabase จะไม่ถูกลบ")) return;
    setRows([]);
    setJobId(null);
    setTotalPages(1);
    setFromPage(1);
    setToPage(1);
    setMessage("");
    setError("");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const filterLabels: Record<FilterKey, string> = {
    all: "ทั้งหมด",
    selected: "เลือกไว้",
    ready: "HLS พร้อม",
    review: "รอตรวจ",
    saved: "บันทึกแล้ว",
    error: "ผิดพลาด",
  };

  return (
    <div className="extractorPage">
      <aside className="extractorSidebar">
        <div className="extractorSideHead"><strong>REAL<span>2</span>FREE</strong></div>
        <nav><Link href="/admin"><ArrowLeft /> กลับภาพรวม</Link><span className="active"><Zap /> Movie2FreeHD</span></nav>
        <div className="extractorSourceStatus"><Database /><div><strong>Supabase Connected</strong><span>ADMIN RLS</span></div></div>
      </aside>

      <main className="extractorMain">
        <header className="extractorHeader">
          <div><span>MOVIE2FREEHD · MEEPLAYER HLS</span><h1>Extractor Workbench</h1><p>ดึงหลายหน้า ตรวจ HLS แมตช์ TMDB และบันทึกเข้า Supabase</p></div>
          <div className="extractorHeaderActions"><Link href="/admin"><ArrowLeft /> หลังบ้าน</Link><button type="button" onClick={reset}><Trash2 /> ล้างงาน</button></div>
        </header>

        <section className="extractorControlCard">
          <div className="extractorUrlRow">
            <label><Link2 /><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder={DEFAULT_URL} disabled={Boolean(busy)} /></label>
            <button className="adminPrimaryButton" type="button" onClick={() => void preview()} disabled={Boolean(busy)}>{busy === "preview" ? <LoaderCircle className="adminSpin" /> : <Search />} ตรวจต้นทาง</button>
          </div>
          <div className="extractorRangeRow">
            <div><label>จากหน้า<input type="number" min={1} max={totalPages} value={fromPage} onChange={(event) => setFromPage(Number(event.target.value))} /></label><label>ถึงหน้า<input type="number" min={1} max={totalPages} value={toPage} onChange={(event) => setToPage(Number(event.target.value))} /></label><span>สูงสุด {totalPages} หน้า</span></div>
            <div className="extractorActionGroup">
              <button type="button" onClick={() => void discover()} disabled={Boolean(busy)}><RefreshCw /> ดึงช่วงหน้า</button>
              <button type="button" onClick={() => void extractSelected()} disabled={Boolean(busy)}><Zap /> Extract ที่เลือก</button>
              <button className="save" type="button" onClick={() => void saveSelected()} disabled={Boolean(busy)}><Save /> บันทึกที่พร้อม</button>
              {busy ? <button className="stop" type="button" onClick={() => { stopRef.current = true; }}><Square fill="currentColor" /> หยุด</button> : null}
            </div>
          </div>
          {message ? <div className="extractorNotice success"><CheckCircle2 /> {message}</div> : null}
          {error ? <div className="extractorNotice error"><CircleAlert /> {error}</div> : null}
        </section>

        <section className="extractorMetrics">
          <article><Film /><div><span>ทั้งหมด</span><strong>{counts.all}</strong></div></article>
          <article><Check /><div><span>เลือกไว้</span><strong>{counts.selected}</strong></div></article>
          <article><Server /><div><span>HLS พร้อม</span><strong>{counts.ready}</strong></div></article>
          <article><Search /><div><span>รอตรวจ</span><strong>{counts.review}</strong></div></article>
          <article><Database /><div><span>บันทึกแล้ว</span><strong>{counts.saved}</strong></div></article>
          <article><CircleAlert /><div><span>ผิดพลาด</span><strong>{counts.error}</strong></div></article>
        </section>

        <section className="extractorToolbar">
          <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อหนังหรือปี..." />{query ? <button type="button" onClick={() => setQuery("")}><X /></button> : null}</label>
          <div className="extractorFilters"><Filter />{(Object.keys(filterLabels) as FilterKey[]).map((key) => <button key={key} className={filter === key ? "active" : ""} type="button" onClick={() => setFilter(key)}>{filterLabels[key]}</button>)}</div>
          <div className="extractorBulk">
            <button type="button" onClick={() => setRows((current) => current.map((row) => ({ ...row, selected: true })))}>เลือกทั้งหมด</button>
            <button type="button" onClick={() => setRows((current) => current.map((row) => ({ ...row, selected: false })))}>ไม่เลือกทั้งหมด</button>
            <button type="button" onClick={() => setRows((current) => current.filter((row) => row.players.length > 0 || row.status !== "error"))}>ตัดรายการไม่มีลิงก์</button>
          </div>
        </section>

        {visibleRows.length ? (
          <section className="extractorGrid">
            {visibleRows.map((row) => (
              <article key={row.id} className={`extractorCard status-${row.status} ${row.selected ? "selected" : ""}`}>
                <button className="extractorCardOpen" type="button" onClick={() => setActiveId(row.id)}><Poster row={row} /><span className={`extractorStatus status-${row.status}`}>{statusLabel(row.status)}</span><span className="extractorQuality">{row.quality || row.year || `P${row.page}`}</span></button>
                <div className="extractorCardBody"><h3>{row.title}</h3><p>{row.message}</p><div><span>{row.players.length} Player</span><span>{row.chosen ? `TMDB ${row.chosen.tmdb_id}` : "ยังไม่ผูก TMDB"}</span></div></div>
                <footer><label><input type="checkbox" checked={row.selected} onChange={() => patchRow(row.id, { selected: !row.selected })} /> เลือก</label><button type="button" onClick={() => setActiveId(row.id)}>ตรวจ / เล่น</button></footer>
              </article>
            ))}
          </section>
        ) : (
          <section className="extractorEmpty"><Film /><h2>ยังไม่มีรายการ</h2><p>ใส่ URL แล้วกด “ตรวจต้นทาง” เพื่อเริ่มงาน</p></section>
        )}
      </main>

      {activeRow ? (
        <div className="extractorModalBackdrop" onMouseDown={() => setActiveId(null)}>
          <section className="extractorModal" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>{statusLabel(activeRow.status)}</span><h2>{activeRow.title}</h2><p>{activeRow.url}</p></div><button type="button" onClick={() => setActiveId(null)}><X /></button></header>
            <div className="extractorModalBody">
              <aside className="extractorModalPoster"><Poster row={activeRow} /></aside>
              <div className="extractorModalContent">
                <section><h3>ข้อมูลต้นทาง</h3><p>{activeRow.overview || "ไม่มีเรื่องย่อจากต้นทาง"}</p><div className="extractorMetaGrid"><span><b>ปี</b>{activeRow.year || "-"}</span><span><b>IMDb</b>{activeRow.imdbRating ?? activeRow.rating ?? "-"}</span><span><b>ความยาว</b>{activeRow.runtime ? `${activeRow.runtime} นาที` : "-"}</span><span><b>ภาษา</b>{activeRow.language || "-"}</span></div></section>
                <section><div className="extractorSectionHead"><h3>Player</h3><span>{activeRow.players.length} รายการ</span></div>{activeRow.players.length ? <div className="extractorPlayers">{activeRow.players.map((player) => <article key={`${player.hash}-${player.hlsUrl}`}><HlsPreview player={player} poster={activeRow.poster} /><div><strong>{player.label}</strong><p><span className={player.validation.ok ? "ok" : "bad"}>{player.validation.ok ? "HLS ผ่าน" : "HLS ไม่ผ่าน"}</span><span>{player.validation.noReferer ? "No-Referer" : "Referer Fallback"}</span></p><a href={player.hlsUrl} target="_blank" rel="noreferrer noopener"><Play /> เปิดแท็บใหม่</a></div></article>)}</div> : <div className="extractorInlineEmpty"><Server /><p>ยังไม่มี Player</p></div>}</section>
                <section><div className="extractorSectionHead"><h3>จับคู่ TMDB</h3><button type="button" onClick={() => void matchRow(activeRow)} disabled={activeRow.status === "matching"}><RefreshCw /> ค้นใหม่</button></div>{activeRow.matches.length ? <div className="extractorMatches">{activeRow.matches.map((match) => <button type="button" key={match.tmdb_id} className={activeRow.chosen?.tmdb_id === match.tmdb_id ? "active" : ""} onClick={() => patchRow(activeRow.id, { chosen: match, status: "matched", message: `เลือก TMDB ${match.tmdb_id}` })}>{match.poster_url ? <img src={match.poster_url} alt="" referrerPolicy="no-referrer" /> : <span className="noPoster">TMDB</span>}<div><strong>{match.title}</strong><p>{match.title_en || ""}</p><small>{match.release_year || "-"} · {Number(match.score).toFixed(1)}%</small></div></button>)}</div> : <div className="extractorInlineEmpty"><Search /><p>ยังไม่มีผล TMDB</p></div>}</section>
              </div>
            </div>
            <footer><button type="button" onClick={() => setActiveId(null)}>ปิด</button><button type="button" onClick={() => void matchRow(activeRow)}><Search /> แมตช์ TMDB</button><button className="save" type="button" onClick={() => void saveOne(activeRow)} disabled={Boolean(busy) || !activeRow.players.some((player) => player.validation.ok)}><Save /> บันทึกเรื่องนี้</button></footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
