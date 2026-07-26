"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  Eye,
  EyeOff,
  Film,
  Link2,
  LoaderCircle,
  LogOut,
  Menu,
  Play,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type PlayerRow = {
  id: string;
  label: string | null;
  stream_url: string | null;
  iframe_url: string | null;
  status: "active" | "broken" | "expired" | "unchecked";
  last_checked_at: string | null;
  sort_order: number;
};

type ContentRow = {
  id: string;
  content_type: "movie" | "series";
  source: string;
  source_url: string;
  tmdb_id: number | null;
  imdb_id: string | null;
  title_th: string;
  title_en: string;
  original_title: string | null;
  overview: string | null;
  release_date: string | null;
  year: number | null;
  runtime: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[];
  rating: number | null;
  vote_count: number | null;
  status: "active" | "draft" | "broken" | "hidden";
  metadata: Record<string, unknown> | null;
  last_synced_at: string | null;
  updated_at: string;
  players: PlayerRow[];
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  items?: ContentRow[];
  page?: number;
  total?: number;
  totalPages?: number;
};

const statusOptions = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "active", label: "แสดงผล" },
  { value: "hidden", label: "ซ่อน" },
  { value: "broken", label: "ลิงก์มีปัญหา" },
  { value: "draft", label: "ฉบับร่าง" },
];

const sourceOptions = [
  { value: "all", label: "ทุกแหล่ง" },
  { value: "movie2freehd", label: "Movie2FreeHD" },
  { value: "movies2free", label: "Movies2Free" },
  { value: "nunghd4k", label: "NungHD4K" },
  { value: "series_fulls", label: "Series Fulls" },
  { value: "dofree", label: "Dofree" },
  { value: "manual", label: "Manual" },
];

function number(value: number | null | undefined) {
  return new Intl.NumberFormat("th-TH").format(Number(value || 0));
}

function date(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleStatusLabel(status: ContentRow["status"]) {
  return status === "active"
    ? "แสดงผล"
    : status === "hidden"
      ? "ซ่อน"
      : status === "broken"
        ? "มีปัญหา"
        : "ฉบับร่าง";
}

function playerStatusLabel(status: PlayerRow["status"]) {
  return status === "active"
    ? "พร้อมใช้"
    : status === "broken"
      ? "เสีย"
      : status === "expired"
        ? "หมดอายุ"
        : "ยังไม่ตรวจ";
}

async function adminFetch(path: string, init?: RequestInit) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = (await response.json().catch(() => null)) as ApiResult | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

function Poster({ item }: { item: ContentRow }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="contentPoster">
      {item.poster_url && !failed ? (
        <img
          src={item.poster_url}
          alt={item.title_th || item.title_en}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span><Film /></span>
      )}
    </div>
  );
}

export default function AdminContentManager() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [activeId, items],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        q: query,
        status,
        source,
      });
      const payload = await adminFetch(`/api/admin/content?${params.toString()}`);
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setTotal(Number(payload.total || 0));
      setTotalPages(Math.max(1, Number(payload.totalPages || 1)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "โหลดคลังหนังไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [page, query, source, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setQuery(queryInput.trim());
    }, 420);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  function patchItem(id: string, patch: Partial<ContentRow>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function updateTitleStatus(item: ContentRow, nextStatus: ContentRow["status"]) {
    const key = `title:${item.id}`;
    setChanging(key);
    setError("");
    setMessage("");
    try {
      await adminFetch("/api/admin/content", {
        method: "PATCH",
        body: JSON.stringify({ action: "title-status", id: item.id, status: nextStatus }),
      });
      patchItem(item.id, { status: nextStatus, updated_at: new Date().toISOString() });
      setMessage(`${nextStatus === "hidden" ? "ซ่อน" : "อัปเดต"} “${item.title_th || item.title_en}” แล้ว`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setChanging("");
    }
  }

  async function updatePlayerStatus(itemId: string, player: PlayerRow, nextStatus: PlayerRow["status"]) {
    const key = `player:${player.id}`;
    setChanging(key);
    setError("");
    setMessage("");
    try {
      await adminFetch("/api/admin/content", {
        method: "PATCH",
        body: JSON.stringify({ action: "player-status", id: player.id, status: nextStatus }),
      });
      setItems((current) => current.map((item) => item.id === itemId ? {
        ...item,
        players: item.players.map((entry) => entry.id === player.id ? { ...entry, status: nextStatus } : entry),
      } : item));
      setMessage(`อัปเดต Player “${player.label || "ไม่ระบุชื่อ"}” แล้ว`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "อัปเดต Player ไม่สำเร็จ");
    } finally {
      setChanging("");
    }
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.href = "/admin/login";
  }

  return (
    <div className="contentAdminPage">
      <aside className={`contentAdminSidebar ${menuOpen ? "open" : ""}`}>
        <div className="contentSideBrand">
          <strong>REAL<span>2</span>FREE</strong>
          <button type="button" onClick={() => setMenuOpen(false)}><X /></button>
        </div>
        <nav>
          <Link href="/admin"><ArrowLeft /> ภาพรวม</Link>
          <span className="active"><Film /> คลังหนัง</span>
          <Link href="/admin/extractors/movie2freehd"><Database /> Movie2FreeHD</Link>
        </nav>
        <div className="contentSideStatus"><ShieldCheck /><div><strong>ADMIN DATABASE</strong><span>RLS PROTECTED</span></div></div>
        <button className="contentSignOut" type="button" onClick={signOut}><LogOut /> ออกจากระบบ</button>
      </aside>
      {menuOpen ? <div className="contentMenuBackdrop" onClick={() => setMenuOpen(false)} /> : null}

      <main className="contentAdminMain">
        <header className="contentAdminHeader">
          <div>
            <button className="contentMobileMenu" type="button" onClick={() => setMenuOpen(true)}><Menu /></button>
            <span>CONTENT & PLAYER CONTROL</span>
            <h1>คลังหนัง</h1>
            <p>ค้นหา ตรวจ Player ซ่อนหนัง และแก้สถานะลิงก์จากหลังบ้าน</p>
          </div>
          <div>
            <Link href="/admin/extractors/movie2freehd"><Database /> เปิด Extractor</Link>
            <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "adminSpin" : ""} /> รีเฟรช</button>
          </div>
        </header>

        <section className="contentAdminControls">
          <label className="contentSearch"><Search /><input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="ค้นชื่อไทย ชื่ออังกฤษ IMDb..." />{queryInput ? <button type="button" onClick={() => setQueryInput("")}><X /></button> : null}</label>
          <select value={source} onChange={(event) => { setPage(1); setSource(event.target.value); }}>
            {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="contentTotal"><Database /><span>พบทั้งหมด</span><strong>{number(total)}</strong></div>
        </section>

        {message ? <div className="contentNotice success"><CheckCircle2 /> {message}</div> : null}
        {error ? <div className="contentNotice error"><CircleAlert /> {error}</div> : null}

        {loading ? (
          <section className="contentLoading"><LoaderCircle className="adminSpin" /><p>กำลังอ่านข้อมูลจาก Supabase...</p></section>
        ) : items.length ? (
          <section className="contentCardGrid">
            {items.map((item) => {
              const activePlayers = item.players.filter((player) => player.status === "active").length;
              return (
                <article key={item.id} className={`contentCard content-status-${item.status}`}>
                  <button className="contentCardMain" type="button" onClick={() => setActiveId(item.id)}>
                    <Poster item={item} />
                    <span className={`contentStatus content-status-${item.status}`}>{titleStatusLabel(item.status)}</span>
                    <span className="contentSource">{item.source}</span>
                    {item.rating ? <span className="contentRating">★ {Number(item.rating).toFixed(1)}</span> : null}
                    <span className="contentPlayerCount"><Server /> {activePlayers}/{item.players.length}</span>
                  </button>
                  <div className="contentCardCopy">
                    <h2>{item.title_th || item.title_en}</h2>
                    <p>{item.title_en && item.title_en !== item.title_th ? item.title_en : item.original_title || "ไม่มีชื่ออังกฤษ"}</p>
                    <div><span>{item.year || "-"}</span><span>{item.tmdb_id ? `TMDB ${item.tmdb_id}` : "ไม่ผูก TMDB"}</span></div>
                  </div>
                  <footer>
                    <button type="button" onClick={() => setActiveId(item.id)}><Eye /> ตรวจ</button>
                    <button type="button" disabled={changing === `title:${item.id}`} onClick={() => void updateTitleStatus(item, item.status === "hidden" ? "active" : "hidden")}>
                      {changing === `title:${item.id}` ? <LoaderCircle className="adminSpin" /> : item.status === "hidden" ? <Eye /> : <EyeOff />}
                      {item.status === "hidden" ? "แสดง" : "ซ่อน"}
                    </button>
                  </footer>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="contentEmpty"><Film /><h2>ไม่พบรายการ</h2><p>ลองเปลี่ยนคำค้นหา แหล่งข้อมูล หรือสถานะ</p></section>
        )}

        <nav className="contentPagination" aria-label="แบ่งหน้า">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft /> ก่อนหน้า</button>
          <span>หน้า <strong>{number(page)}</strong> / {number(totalPages)}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>ถัดไป <ChevronRight /></button>
        </nav>
      </main>

      {activeItem ? (
        <div className="contentModalBackdrop" onMouseDown={() => setActiveId(null)}>
          <section className="contentModal" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>{activeItem.source} · {titleStatusLabel(activeItem.status)}</span><h2>{activeItem.title_th || activeItem.title_en}</h2><p>{activeItem.title_en || activeItem.original_title || ""}</p></div>
              <button type="button" onClick={() => setActiveId(null)}><X /></button>
            </header>
            <div className="contentModalBody">
              <aside>
                <Poster item={activeItem} />
                <div className="contentModalFacts"><span><b>ปี</b>{activeItem.year || "-"}</span><span><b>TMDB</b>{activeItem.tmdb_id || "-"}</span><span><b>IMDb</b>{activeItem.imdb_id || "-"}</span><span><b>เรตติ้ง</b>{activeItem.rating ? Number(activeItem.rating).toFixed(1) : "-"}</span></div>
                <a href={activeItem.source_url} target="_blank" rel="noreferrer noopener"><Link2 /> เปิดหน้าต้นทาง</a>
              </aside>
              <div className="contentModalSections">
                <section>
                  <h3>ข้อมูลหนัง</h3>
                  <p>{activeItem.overview || "ไม่มีเรื่องย่อ"}</p>
                  <div className="contentTags">{(activeItem.genres || []).map((genre) => <span key={genre}>{genre}</span>)}</div>
                  <div className="contentUpdated">อัปเดตล่าสุด {date(activeItem.updated_at)}</div>
                </section>
                <section>
                  <div className="contentSectionHead"><h3>Player ทั้งหมด</h3><span>{number(activeItem.players.length)} รายการ</span></div>
                  {activeItem.players.length ? (
                    <div className="contentPlayerList">
                      {[...activeItem.players].sort((a, b) => a.sort_order - b.sort_order).map((player) => {
                        const playUrl = player.stream_url || player.iframe_url || "";
                        return (
                          <article key={player.id}>
                            <div className={`contentPlayerIcon player-${player.status}`}><Server /></div>
                            <div><strong>{player.label || "Player"}</strong><p>{playerStatusLabel(player.status)} · ตรวจล่าสุด {date(player.last_checked_at)}</p><small>{playUrl || "ไม่พบ URL"}</small></div>
                            <div className="contentPlayerActions">
                              {playUrl ? <a href={playUrl} target="_blank" rel="noreferrer noopener"><Play /> ทดสอบ</a> : null}
                              <select value={player.status} disabled={changing === `player:${player.id}`} onChange={(event) => void updatePlayerStatus(activeItem.id, player, event.target.value as PlayerRow["status"])}>
                                <option value="active">พร้อมใช้</option>
                                <option value="unchecked">ยังไม่ตรวจ</option>
                                <option value="broken">เสีย</option>
                                <option value="expired">หมดอายุ</option>
                              </select>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : <div className="contentNoPlayers"><Server /><p>เรื่องนี้ยังไม่มี Player</p></div>}
                </section>
              </div>
            </div>
            <footer>
              <button type="button" onClick={() => setActiveId(null)}>ปิด</button>
              <button type="button" disabled={changing === `title:${activeItem.id}`} onClick={() => void updateTitleStatus(activeItem, activeItem.status === "hidden" ? "active" : "hidden")}>
                {activeItem.status === "hidden" ? <Eye /> : <EyeOff />}{activeItem.status === "hidden" ? "นำกลับมาแสดง" : "ซ่อนจากหน้าเว็บ"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
