"use client";

import {
  Bookmark,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Film,
  Flame,
  Heart,
  History,
  Home,
  Info,
  LoaderCircle,
  Menu,
  Moon,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Tv,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./MovieHome.module.css";

type Theme = "dark" | "light";
type ViewMode = "home" | "movie" | "series" | "anime" | "new" | "popular" | "favorites" | "history";
type PlayerKind = "hls" | "embed";

type PlayerItem = {
  id: string;
  label: string;
  url: string;
  kind: PlayerKind;
  order: number;
};

type CatalogItem = {
  id: string;
  contentType: "movie" | "series";
  thaiTitle: string;
  title: string;
  overview: string;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  rawGenres: string[];
  genres: string[];
  rating: number;
  voteCount: number;
  updatedAt: string;
  players: PlayerItem[];
};

type PublicCatalogRow = {
  id: string;
  content_type: "movie" | "series";
  title_th: string | null;
  title_en: string | null;
  overview: string | null;
  release_date: string | null;
  year: number | null;
  runtime: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  rating: number | string | null;
  vote_count: number | null;
  updated_at: string;
  players: unknown;
};

const PAGE_SIZE = 72;
const FAVORITES_KEY = "real2free-favorites";
const HISTORY_KEY = "real2free-history";

const genreLabels: Record<string, string> = {
  Action: "แอ็กชัน",
  Adventure: "ผจญภัย",
  Animation: "แอนิเมชัน",
  Anime: "อนิเมะ",
  Comedy: "ตลก",
  Crime: "อาชญากรรม",
  Documentary: "สารคดี",
  Drama: "ดราม่า",
  Family: "ครอบครัว",
  Fantasy: "แฟนตาซี",
  History: "ประวัติศาสตร์",
  Horror: "สยองขวัญ",
  Music: "ดนตรี",
  Mystery: "ลึกลับ",
  Romance: "โรแมนติก",
  "Science Fiction": "ไซไฟ",
  Thriller: "ระทึกขวัญ",
  War: "สงคราม",
  Western: "ตะวันตก",
  "TV Movie": "ภาพยนตร์โทรทัศน์",
};

const genreFilters = [
  { value: "ทั้งหมด", label: "ทั้งหมด" },
  { value: "Action", label: "แอ็กชัน" },
  { value: "Adventure", label: "ผจญภัย" },
  { value: "Comedy", label: "ตลก" },
  { value: "Drama", label: "ดราม่า" },
  { value: "Fantasy", label: "แฟนตาซี" },
  { value: "Horror", label: "สยองขวัญ" },
  { value: "Romance", label: "โรแมนติก" },
  { value: "Science Fiction", label: "ไซไฟ" },
  { value: "Animation", label: "แอนิเมชัน" },
];

const yearFilters = ["ทั้งหมด", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "ก่อน 2020"];

const viewLabels: Record<ViewMode, string> = {
  home: "หน้าแรก",
  movie: "ภาพยนตร์",
  series: "ซีรีส์",
  anime: "อนิเมะ",
  new: "มาใหม่",
  popular: "ยอดนิยม",
  favorites: "รายการโปรด",
  history: "ประวัติการดู",
};

const mainNav: Array<{ mode: ViewMode; label: string }> = [
  { mode: "home", label: "หน้าแรก" },
  { mode: "movie", label: "ภาพยนตร์" },
  { mode: "series", label: "ซีรีส์" },
  { mode: "anime", label: "อนิเมะ" },
  { mode: "new", label: "มาใหม่" },
  { mode: "popular", label: "ยอดนิยม" },
];

const sideNav: Array<{ mode: ViewMode; label: string; icon: ReactNode }> = [
  { mode: "home", label: "หน้าแรก", icon: <Home /> },
  { mode: "movie", label: "ภาพยนตร์", icon: <Film /> },
  { mode: "series", label: "ซีรีส์", icon: <Tv /> },
  { mode: "anime", label: "อนิเมะ", icon: <Sparkles /> },
  { mode: "new", label: "มาใหม่", icon: <Calendar /> },
  { mode: "popular", label: "ยอดนิยม", icon: <Flame /> },
  { mode: "favorites", label: "รายการโปรด", icon: <Heart /> },
  { mode: "history", label: "ประวัติการดู", icon: <History /> },
];

function Brand() {
  return (
    <div className="brand" aria-label="REAL2FREE">
      <span className="brandMark" aria-hidden="true"><span /><span /></span>
      <span className="brandWord">REAL<span>2</span>FREE</span>
    </div>
  );
}

function parsePlayers(value: unknown): PlayerItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): PlayerItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? "");
    const url = String(row.url ?? "");
    if (!id || !url) return [];
    return [{
      id,
      label: String(row.label ?? "รับชม"),
      url,
      kind: row.kind === "embed" ? "embed" : "hls",
      order: Number(row.order ?? 0),
    }];
  }).sort((a, b) => a.order - b.order);
}

function mapCatalogRow(row: PublicCatalogRow): CatalogItem | null {
  const players = parsePlayers(row.players);
  if (!row.id || !players.length) return null;
  const rawGenres = Array.isArray(row.genres) ? row.genres.filter(Boolean) : [];
  return {
    id: row.id,
    contentType: row.content_type === "series" ? "series" : "movie",
    thaiTitle: String(row.title_th || row.title_en || "ไม่ระบุชื่อ"),
    title: String(row.title_en || row.title_th || "ไม่ระบุชื่อ"),
    overview: String(row.overview || ""),
    releaseDate: row.release_date || null,
    year: Number.isFinite(Number(row.year)) ? Number(row.year) : null,
    runtime: Number.isFinite(Number(row.runtime)) ? Number(row.runtime) : null,
    posterUrl: row.poster_url || null,
    backdropUrl: row.backdrop_url || row.poster_url || null,
    rawGenres,
    genres: rawGenres.map((genre) => genreLabels[genre] || genre),
    rating: Number.isFinite(Number(row.rating)) ? Number(row.rating) : 0,
    voteCount: Number(row.vote_count || 0),
    updatedAt: row.updated_at,
    players,
  };
}

function cleanSearch(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}\s.-]/gu, " ").replace(/\s+/g, " ").slice(0, 80);
}

function runtimeLabel(minutes: number | null) {
  if (!minutes || minutes < 1) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} นาที`;
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`;
}

function releaseTimestamp(item: CatalogItem) {
  const value = item.releaseDate || item.updatedAt;
  return new Date(value).getTime() || 0;
}

function isRecentlyAdded(item: CatalogItem) {
  const updated = new Date(item.updatedAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated <= 30 * 24 * 60 * 60 * 1000;
}

function PosterCard({
  movie,
  favorite,
  rank,
  onFavorite,
  onOpen,
  onPlay,
}: {
  movie: CatalogItem;
  favorite: boolean;
  rank?: number;
  onFavorite: () => void;
  onOpen: () => void;
  onPlay: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="movieCard">
      <button className="posterButton" type="button" onClick={onOpen} aria-label={`ดูข้อมูล ${movie.thaiTitle}`}>
        <span className={`posterArtwork ${styles.posterFrame}`}>
          {movie.posterUrl && !imageFailed ? (
            <img
              className={styles.posterImage}
              src={movie.posterUrl}
              alt={movie.thaiTitle}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className={styles.posterFallback}><Film /><strong>{movie.thaiTitle}</strong></span>
          )}
          <span className={styles.posterShade} />
          <span className="qualityBadge">HD</span>
          {rank ? <span className="rankBadge">{rank}</span> : null}
          {isRecentlyAdded(movie) ? <span className="newCorner">ใหม่</span> : null}
          <span className="posterHover" onClick={(event) => { event.stopPropagation(); onPlay(); }}>
            <span className="roundPlay"><Play fill="currentColor" /></span>
            <span>รับชม</span>
          </span>
        </span>
      </button>
      <div className="movieMeta">
        <button className="movieTitle" type="button" onClick={onOpen}>{movie.thaiTitle}</button>
        <div className="movieStats">
          <span>{movie.year || ""}</span>
          <span><Star fill="currentColor" /> {movie.rating ? movie.rating.toFixed(1) : "-"}</span>
        </div>
      </div>
      <button
        className={`favoriteButton ${favorite ? "isFavorite" : ""}`}
        type="button"
        onClick={onFavorite}
        aria-label={favorite ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
      >
        <Heart fill={favorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}

function Hero({
  movie,
  index,
  count,
  onNext,
  onPrevious,
  onSelect,
  onOpen,
  onPlay,
}: {
  movie: CatalogItem;
  index: number;
  count: number;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
  onOpen: () => void;
  onPlay: () => void;
}) {
  return (
    <section className={`hero ${styles.heroFrame}`} aria-label="ภาพยนตร์แนะนำ">
      {movie.backdropUrl ? (
        <img className={styles.heroImage} src={movie.backdropUrl} alt="" referrerPolicy="no-referrer" />
      ) : null}
      <div className={styles.heroColorWash} />
      <div className="heroShade" />
      <div className="heroContent">
        <span className="heroEyebrow">แนะนำสำหรับคุณ</span>
        <h1 className={styles.heroTitle}>{movie.title}</h1>
        <h2>{movie.thaiTitle}</h2>
        <p>{movie.overview || "เลือกเรื่องที่ชอบ แล้วเริ่มรับชมได้ทันที"}</p>
        <div className="heroMeta">
          {[movie.year, runtimeLabel(movie.runtime), movie.genres.slice(0, 2).join(" • ")].filter(Boolean).join(" • ")}
        </div>
        <div className="heroActions">
          <button className="primaryButton" type="button" onClick={onPlay}><Play fill="currentColor" /> ดูเลย</button>
          <button className="secondaryButton" type="button" onClick={onOpen}><Info /> ข้อมูลเพิ่มเติม</button>
        </div>
      </div>
      {count > 1 ? (
        <>
          <button className="heroArrow heroArrowLeft" type="button" onClick={onPrevious} aria-label="เรื่องก่อนหน้า"><ChevronLeft /></button>
          <button className="heroArrow heroArrowRight" type="button" onClick={onNext} aria-label="เรื่องถัดไป"><ChevronRight /></button>
          <div className="heroDots" aria-label="เลือกเรื่องแนะนำ">
            {Array.from({ length: count }, (_, dotIndex) => (
              <button key={dotIndex} className={dotIndex === index ? "active" : ""} type="button" onClick={() => onSelect(dotIndex)} aria-label={`เรื่องที่ ${dotIndex + 1}`} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function FilterRail({
  genre,
  year,
  contentType,
  onGenre,
  onYear,
  onContentType,
}: {
  genre: string;
  year: string;
  contentType: string;
  onGenre: (value: string) => void;
  onYear: (value: string) => void;
  onContentType: (value: string) => void;
}) {
  return (
    <aside className="rightRail">
      <div className="filterPanel">
        <div className="panelHeading"><span>ประเภท</span><SlidersHorizontal /></div>
        <div className="genreList">
          {genreFilters.map((item) => (
            <button key={item.value} className={genre === item.value ? "active" : ""} type="button" onClick={() => onGenre(item.value)}>
              <span>{item.label}</span>{genre === item.value ? <Check /> : <ChevronRight />}
            </button>
          ))}
        </div>
      </div>
      <div className="filterPanel">
        <div className="panelHeading"><span>ปีที่ฉาย</span><Calendar /></div>
        <div className="chipGrid">
          {yearFilters.map((item) => (
            <button key={item} className={year === item ? "active" : ""} type="button" onClick={() => onYear(item)}>{item}</button>
          ))}
        </div>
      </div>
      <div className="filterPanel">
        <div className="panelHeading"><span>รูปแบบ</span><Film /></div>
        <div className="chipGrid twoColumns">
          {[
            { value: "ทั้งหมด", label: "ทั้งหมด" },
            { value: "movie", label: "ภาพยนตร์" },
            { value: "series", label: "ซีรีส์" },
            { value: "anime", label: "อนิเมะ" },
          ].map((item) => (
            <button key={item.value} className={contentType === item.value ? "active" : ""} type="button" onClick={() => onContentType(item.value)}>{item.label}</button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function HlsPlayer({ url, poster }: { url: string; poster: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    let disposed = false;
    let instance: { destroy: () => void } | null = null;
    setFailed(false);

    const fail = () => {
      if (!disposed) setFailed(true);
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.load();
      video.play().catch(() => undefined);
      video.addEventListener("error", fail);
      return () => {
        disposed = true;
        video.removeEventListener("error", fail);
        video.removeAttribute("src");
        video.load();
      };
    }

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (disposed || !Hls.isSupported()) {
          fail();
          return;
        }
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 60 });
        instance = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) fail();
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => undefined));
      })
      .catch(fail);

    return () => {
      disposed = true;
      instance?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);

  if (failed) {
    return <FriendlyPlaybackError url={url} />;
  }

  return <video ref={videoRef} className={styles.video} controls playsInline preload="metadata" poster={poster || undefined} />;
}

function FriendlyPlaybackError({ url }: { url: string }) {
  return (
    <div className={styles.playbackError}>
      <RotateCcw />
      <strong>เปิดเรื่องนี้ไม่สำเร็จ</strong>
      <span>ลองเปิดหน้ารับชมอีกครั้ง</span>
      <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">เปิดหน้ารับชม</a>
    </div>
  );
}

function MovieDialog({
  movie,
  watching,
  activePlayerIndex,
  favorite,
  onClose,
  onWatch,
  onPlayer,
  onFavorite,
}: {
  movie: CatalogItem;
  watching: boolean;
  activePlayerIndex: number;
  favorite: boolean;
  onClose: () => void;
  onWatch: () => void;
  onPlayer: (index: number) => void;
  onFavorite: () => void;
}) {
  const player = movie.players[Math.min(activePlayerIndex, movie.players.length - 1)];
  if (watching && player) {
    return (
      <div className="modalBackdrop" role="presentation" onMouseDown={onClose}>
        <section className={styles.watchModal} role="dialog" aria-modal="true" aria-label={`รับชม ${movie.thaiTitle}`} onMouseDown={(event) => event.stopPropagation()}>
          <button className={styles.watchClose} type="button" onClick={onClose} aria-label="ปิด"><X /></button>
          <div className={styles.watchHeader}>
            <div><span>กำลังรับชม</span><h2>{movie.thaiTitle}</h2></div>
            {movie.players.length > 1 ? (
              <div className={styles.playerTabs}>
                {movie.players.map((entry, index) => (
                  <button key={entry.id} className={index === activePlayerIndex ? styles.playerActive : ""} type="button" onClick={() => onPlayer(index)}>{entry.label || `ตัวเลือก ${index + 1}`}</button>
                ))}
              </div>
            ) : <span className={styles.singlePlayerLabel}>{player.label}</span>}
          </div>
          <div className={styles.playerFrame}>
            {player.kind === "hls" ? (
              <HlsPlayer key={player.id} url={player.url} poster={movie.backdropUrl} />
            ) : (
              <iframe
                key={player.id}
                className={styles.iframe}
                src={player.url}
                title={movie.thaiTitle}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          <div className={styles.watchFooter}>
            <span>{movie.year || ""}{movie.genres.length ? ` • ${movie.genres.slice(0, 2).join(" • ")}` : ""}</span>
            <a href={player.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">เปิดหน้ารับชม</a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={onClose}>
      <section className="movieModal" role="dialog" aria-modal="true" aria-label={`ข้อมูล ${movie.thaiTitle}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modalClose" type="button" onClick={onClose} aria-label="ปิด"><X /></button>
        <div className={`modalVisual ${styles.modalVisual}`}>
          {movie.posterUrl ? <img className={styles.modalPoster} src={movie.posterUrl} alt={movie.thaiTitle} referrerPolicy="no-referrer" /> : <Film />}
          <span className={styles.modalPosterShade} />
        </div>
        <div className="modalContent">
          <span className="modalEyebrow">{movie.contentType === "series" ? "ซีรีส์" : "ภาพยนตร์"}{movie.year ? ` • ${movie.year}` : ""}</span>
          <h2>{movie.thaiTitle}</h2>
          {movie.title !== movie.thaiTitle ? <h3>{movie.title}</h3> : null}
          <div className="modalRating"><Star fill="currentColor" /> {movie.rating ? movie.rating.toFixed(1) : "-"}<span>{movie.players.map((entry) => entry.label).filter(Boolean).join(" / ")}</span></div>
          <p>{movie.overview || "เรื่องนี้พร้อมให้คุณรับชมแล้ว"}</p>
          <div className="modalGenres">{movie.genres.map((item) => <span key={item}>{item}</span>)}</div>
          <div className="modalActions">
            <button className="primaryButton" type="button" onClick={onWatch}><Play fill="currentColor" /> ดูเลย</button>
            <button className="secondaryButton" type="button" onClick={onFavorite}><Heart fill={favorite ? "currentColor" : "none"} /> {favorite ? "บันทึกแล้ว" : "รายการโปรด"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MovieHome() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("ทั้งหมด");
  const [selectedYear, setSelectedYear] = useState("ทั้งหมด");
  const [selectedContentType, setSelectedContentType] = useState("ทั้งหมด");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<CatalogItem | null>(null);
  const [watching, setWatching] = useState(false);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("real2free-theme") as Theme | null;
    const nextTheme = savedTheme ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try {
      setFavorites(new Set(JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as string[]));
      setHistory(JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]") as string[]);
    } catch {
      window.localStorage.removeItem(FAVORITES_KEY);
      window.localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(cleanSearch(queryInput)), 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    document.body.style.overflow = selectedMovie || mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedMovie, mobileMenuOpen]);

  const fetchCatalog = useCallback(async (targetPage: number, append: boolean) => {
    const requestId = ++requestRef.current;
    append ? setLoadingMore(true) : setLoading(true);
    setLoadFailed(false);

    try {
      const supabase = getSupabaseBrowserClient();
      const fields = "id,content_type,title_th,title_en,overview,release_date,year,runtime,poster_url,backdrop_url,genres,rating,vote_count,updated_at,players";
      let builder = supabase
        .from("real2free_public_titles")
        .select(fields, { count: "exact" });

      if (query) {
        builder = builder.or(`title_th.ilike.%${query}%,title_en.ilike.%${query}%`);
      }
      if (selectedGenre !== "ทั้งหมด") {
        builder = builder.contains("genres", [selectedGenre]);
      }
      if (selectedYear !== "ทั้งหมด") {
        if (selectedYear === "ก่อน 2020") builder = builder.lt("year", 2020);
        else builder = builder.eq("year", Number(selectedYear));
      }

      const effectiveType = selectedContentType !== "ทั้งหมด"
        ? selectedContentType
        : viewMode === "movie" || viewMode === "series"
          ? viewMode
          : "ทั้งหมด";
      if (effectiveType === "movie" || effectiveType === "series") {
        builder = builder.eq("content_type", effectiveType);
      }
      if (selectedContentType === "anime" || viewMode === "anime") {
        builder = builder.overlaps("genres", ["Animation", "Anime"]);
      }

      if (viewMode === "favorites") {
        const ids = [...favorites];
        if (!ids.length) {
          if (requestId === requestRef.current) {
            setItems([]);
            setTotal(0);
            setHasMore(false);
          }
          return;
        }
        builder = builder.in("id", ids.slice(0, 300));
      }
      if (viewMode === "history") {
        if (!history.length) {
          if (requestId === requestRef.current) {
            setItems([]);
            setTotal(0);
            setHasMore(false);
          }
          return;
        }
        builder = builder.in("id", history.slice(0, 300));
      }

      if (viewMode === "popular") {
        builder = builder.order("rating", { ascending: false, nullsFirst: false }).order("vote_count", { ascending: false, nullsFirst: false });
      } else if (viewMode === "new") {
        builder = builder.order("release_date", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false });
      } else {
        builder = builder.order("updated_at", { ascending: false });
      }

      const from = targetPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await builder.range(from, to);
      if (error) throw error;
      if (requestId !== requestRef.current) return;

      let mapped = ((data || []) as unknown as PublicCatalogRow[])
        .map(mapCatalogRow)
        .filter((item): item is CatalogItem => Boolean(item));

      if (viewMode === "history") {
        const order = new Map<string, number>(history.map((id, index): [string, number] => [id, index]));
        mapped = mapped.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
      }

      setItems((current) => {
        if (!append) return mapped;
        const merged = new Map(current.map((item) => [item.id, item]));
        mapped.forEach((item) => merged.set(item.id, item));
        return [...merged.values()];
      });
      setPage(targetPage);
      setTotal(count || 0);
      setHasMore(to + 1 < (count || 0));
      setHeroIndex(0);
    } catch (reason) {
      console.error("Catalog load failed", reason);
      if (requestId === requestRef.current) setLoadFailed(true);
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [favorites, history, query, selectedContentType, selectedGenre, selectedYear, viewMode]);

  useEffect(() => {
    void fetchCatalog(0, false);
  }, [fetchCatalog]);

  const heroItems = useMemo(() => items.filter((item) => item.backdropUrl).slice(0, 5), [items]);
  const heroMovie = heroItems[heroIndex] || items[0] || null;
  const newMovies = useMemo(() => [...items].sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a)).slice(0, 18), [items]);
  const trendingMovies = useMemo(() => [...items].sort((a, b) => b.rating - a.rating || b.voteCount - a.voteCount).slice(0, 18), [items]);

  useEffect(() => {
    if (heroItems.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroItems.length), 7000);
    return () => window.clearInterval(timer);
  }, [heroItems.length]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("real2free-theme", nextTheme);
  };

  const chooseMode = (mode: ViewMode) => {
    setViewMode(mode);
    setMobileMenuOpen(false);
    setSelectedContentType("ทั้งหมด");
    window.requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const openDetails = (movie: CatalogItem) => {
    setSelectedMovie(movie);
    setWatching(false);
    setActivePlayerIndex(0);
  };

  const openWatch = (movie: CatalogItem) => {
    setSelectedMovie(movie);
    setWatching(true);
    setActivePlayerIndex(0);
    setHistory((current) => {
      const next = [movie.id, ...current.filter((id) => id !== movie.id)].slice(0, 100);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const closeDialog = () => {
    setSelectedMovie(null);
    setWatching(false);
    setActivePlayerIndex(0);
  };

  const clearFilters = () => {
    setQueryInput("");
    setQuery("");
    setSelectedGenre("ทั้งหมด");
    setSelectedYear("ทั้งหมด");
    setSelectedContentType("ทั้งหมด");
    setViewMode("home");
  };

  const hasFilters = query || selectedGenre !== "ทั้งหมด" || selectedYear !== "ทั้งหมด" || selectedContentType !== "ทั้งหมด" || viewMode !== "home";
  const resultTitle = viewMode === "home" ? "รายการทั้งหมด" : viewLabels[viewMode];

  return (
    <div className="siteShell">
      <aside className="desktopSidebar">
        <Brand />
        <nav className="sidebarNav" aria-label="เมนูหลัก">
          {sideNav.map((item) => (
            <button key={item.mode} className={viewMode === item.mode ? "active" : ""} type="button" onClick={() => chooseMode(item.mode)}>{item.icon}<span>{item.label}</span></button>
          ))}
        </nav>
        <div className={styles.sidebarNote}><Play /><div><strong>พร้อมรับชม</strong><p>เลือกเรื่องที่ชอบแล้วกดดูได้ทันที</p></div></div>
        <div className="sidebarFooter">© 2026 REAL2FREE</div>
      </aside>

      <div className="mainColumn">
        <header className="topHeader">
          <button className="mobileIconButton menuButton" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="เปิดเมนู"><Menu /></button>
          <div className="mobileBrand"><Brand /></div>
          <nav className="desktopTopNav" aria-label="หมวดหมู่หลัก">
            {mainNav.map((item) => <button key={item.mode} className={viewMode === item.mode ? "active" : ""} type="button" onClick={() => chooseMode(item.mode)}>{item.label}</button>)}
          </nav>
          <div className="headerActions">
            <label className="desktopSearch"><Search /><input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="ค้นหาหนังหรือซีรีส์..." />{queryInput ? <button type="button" onClick={() => setQueryInput("")} aria-label="ล้างคำค้น"><X /></button> : null}</label>
            <button className="mobileIconButton searchButton" type="button" onClick={() => setMobileSearchOpen((value) => !value)} aria-label="ค้นหา"><Search /></button>
            <button className="iconButton themeButton" type="button" onClick={toggleTheme} aria-label="สลับโหมดสี">{theme === "dark" ? <Sun /> : <Moon />}</button>
          </div>
        </header>

        {mobileSearchOpen ? (
          <div className="mobileSearchPanel"><Search /><input autoFocus value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="ค้นหาหนังหรือซีรีส์..." /><button type="button" onClick={() => setMobileSearchOpen(false)}><X /></button></div>
        ) : null}

        <nav className="mobileCategoryTabs" aria-label="หมวดหมู่บนมือถือ">
          {mainNav.slice(0, 5).map((item) => <button key={item.mode} className={viewMode === item.mode ? "active" : ""} type="button" onClick={() => chooseMode(item.mode)}>{item.label}</button>)}
        </nav>

        <div className="contentLayout">
          <main className="contentMain">
            {loading && !items.length ? (
              <div className={styles.loadingHero}><LoaderCircle /><span>กำลังเตรียมรายการ...</span></div>
            ) : heroMovie && viewMode === "home" && !query ? (
              <Hero
                movie={heroMovie}
                index={heroIndex}
                count={heroItems.length}
                onNext={() => setHeroIndex((heroIndex + 1) % Math.max(heroItems.length, 1))}
                onPrevious={() => setHeroIndex((heroIndex - 1 + Math.max(heroItems.length, 1)) % Math.max(heroItems.length, 1))}
                onSelect={setHeroIndex}
                onOpen={() => openDetails(heroMovie)}
                onPlay={() => openWatch(heroMovie)}
              />
            ) : null}

            <section className="quickGrid" aria-label="ทางลัด">
              {[
                { mode: "movie" as ViewMode, label: "ภาพยนตร์", caption: "ดูทั้งหมด", icon: <Film /> },
                { mode: "series" as ViewMode, label: "ซีรีส์", caption: "ดูทั้งหมด", icon: <Tv /> },
                { mode: "anime" as ViewMode, label: "อนิเมะ", caption: "ดูทั้งหมด", icon: <Sparkles /> },
                { mode: "popular" as ViewMode, label: "ยอดนิยม", caption: "น่าดู", icon: <Flame /> },
                { mode: "new" as ViewMode, label: "ล่าสุด", caption: "อัปเดตใหม่", icon: <Clock3 /> },
              ].map((item) => (
                <button key={item.mode} type="button" onClick={() => chooseMode(item.mode)}><span className="quickIcon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.caption}</small></span></button>
              ))}
            </section>

            <div className="mobileFilterBar">
              <button type="button" onClick={() => setSelectedContentType(selectedContentType === "ทั้งหมด" ? "movie" : "ทั้งหมด")}><SlidersHorizontal /> ตัวกรอง</button>
              <div className="mobileFilterChips">
                {[{ value: "ทั้งหมด", label: "ทั้งหมด" }, { value: "Action", label: "แอ็กชัน" }, { value: "Drama", label: "ดราม่า" }, { value: "Science Fiction", label: "ไซไฟ" }].map((item) => (
                  <button key={item.value} className={selectedGenre === item.value ? "active" : ""} type="button" onClick={() => setSelectedGenre(item.value)}>{item.label}</button>
                ))}
              </div>
            </div>

            <div id="catalog" className={styles.catalogAnchor} />
            {loadFailed && !items.length ? (
              <div className="emptyState"><RotateCcw /><h3>ยังเปิดรายการไม่ได้</h3><p>กรุณาลองอีกครั้ง</p><button type="button" onClick={() => void fetchCatalog(0, false)}>ลองใหม่</button></div>
            ) : hasFilters ? (
              <section className="movieSection searchResultsSection">
                <div className="sectionHeading"><div><span className="sectionKicker">{resultTitle}</span><h2>พบ {total.toLocaleString("th-TH")} รายการ</h2></div><button className="textButton" type="button" onClick={clearFilters}>ล้างตัวกรอง <X /></button></div>
                {loading && !items.length ? (
                  <div className={styles.listLoading}><LoaderCircle /><span>กำลังค้นหา...</span></div>
                ) : items.length ? (
                  <>
                    <div className="movieGrid resultsGrid">
                      {items.map((movie, index) => <PosterCard key={movie.id} movie={movie} rank={viewMode === "popular" ? index + 1 : undefined} favorite={favorites.has(movie.id)} onFavorite={() => toggleFavorite(movie.id)} onOpen={() => openDetails(movie)} onPlay={() => openWatch(movie)} />)}
                    </div>
                    {hasMore ? <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void fetchCatalog(page + 1, true)}>{loadingMore ? <><LoaderCircle /> กำลังโหลด...</> : "แสดงเพิ่มเติม"}</button> : null}
                  </>
                ) : (
                  <div className="emptyState"><Search /><h3>ยังไม่พบเรื่องที่ค้นหา</h3><p>ลองเปลี่ยนคำค้นหรือเลือกหมวดอื่น</p><button type="button" onClick={clearFilters}>แสดงทั้งหมด</button></div>
                )}
              </section>
            ) : (
              <>
                <section className="movieSection">
                  <div className="sectionHeading"><h2>มาใหม่</h2><button className="textButton" type="button" onClick={() => chooseMode("new")}>ดูทั้งหมด <ChevronRight /></button></div>
                  <div className="movieGrid horizontalOnMobile">{newMovies.map((movie) => <PosterCard key={movie.id} movie={movie} favorite={favorites.has(movie.id)} onFavorite={() => toggleFavorite(movie.id)} onOpen={() => openDetails(movie)} onPlay={() => openWatch(movie)} />)}</div>
                </section>
                <section className="movieSection">
                  <div className="sectionHeading"><h2>ยอดนิยม</h2><button className="textButton" type="button" onClick={() => chooseMode("popular")}>ดูทั้งหมด <ChevronRight /></button></div>
                  <div className="movieGrid horizontalOnMobile trendingGrid">{trendingMovies.map((movie, index) => <PosterCard key={movie.id} movie={movie} rank={index + 1} favorite={favorites.has(movie.id)} onFavorite={() => toggleFavorite(movie.id)} onOpen={() => openDetails(movie)} onPlay={() => openWatch(movie)} />)}</div>
                </section>
                {hasMore ? <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void fetchCatalog(page + 1, true)}>{loadingMore ? <><LoaderCircle /> กำลังโหลด...</> : "ดูเพิ่มเติม"}</button> : null}
              </>
            )}
          </main>

          <FilterRail genre={selectedGenre} year={selectedYear} contentType={selectedContentType} onGenre={setSelectedGenre} onYear={setSelectedYear} onContentType={setSelectedContentType} />
        </div>
      </div>

      <nav className="mobileBottomNav" aria-label="เมนูด้านล่าง">
        <button className={viewMode === "home" ? "active" : ""} type="button" onClick={() => chooseMode("home")}><Home /><span>หน้าแรก</span></button>
        <button type="button" onClick={() => setMobileSearchOpen(true)}><Search /><span>ค้นหา</span></button>
        <button className={viewMode === "favorites" ? "active" : ""} type="button" onClick={() => chooseMode("favorites")}><Bookmark /><span>รายการโปรด</span></button>
        <button className={viewMode === "history" ? "active" : ""} type="button" onClick={() => chooseMode("history")}><History /><span>ดูล่าสุด</span></button>
        <button type="button" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}<span>โหมดสี</span></button>
      </nav>

      {mobileMenuOpen ? (
        <div className="drawerBackdrop" role="presentation" onMouseDown={() => setMobileMenuOpen(false)}>
          <aside className="mobileDrawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader"><Brand /><button type="button" onClick={() => setMobileMenuOpen(false)}><X /></button></div>
            <nav>{sideNav.map((item) => <button key={item.mode} className={viewMode === item.mode ? "active" : ""} type="button" onClick={() => chooseMode(item.mode)}>{item.icon}<span>{item.label}</span></button>)}</nav>
            <div className="drawerTheme"><span>{theme === "dark" ? "โหมดมืด" : "โหมดสว่าง"}</span><button type="button" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}</button></div>
          </aside>
        </div>
      ) : null}

      {selectedMovie ? (
        <MovieDialog movie={selectedMovie} watching={watching} activePlayerIndex={activePlayerIndex} favorite={favorites.has(selectedMovie.id)} onClose={closeDialog} onWatch={() => openWatch(selectedMovie)} onPlayer={setActivePlayerIndex} onFavorite={() => toggleFavorite(selectedMovie.id)} />
      ) : null}
    </div>
  );
}
