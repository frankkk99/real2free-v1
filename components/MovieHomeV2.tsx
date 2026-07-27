"use client";

import {
  Bookmark,
  Calendar,
  CalendarDays,
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
  Languages,
  LoaderCircle,
  Menu,
  Moon,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Tv,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  cleanCatalogSearch,
  contentTypeLabel,
  FAVORITES_KEY,
  HISTORY_KEY,
  mapPublicCatalogRow,
  PUBLIC_CATALOG_FIELDS,
  runtimeLabel,
  type PublicCatalogItem,
  type PublicCatalogRow,
} from "@/lib/public-catalog";
import HomeQuickFilters, { type HomeQuickView } from "./HomeQuickFilters";
import styles from "./MovieHomeV2.module.css";

type Theme = "dark" | "light";
type ViewMode = HomeQuickView;
type CatalogCache = {
  savedAt: number;
  items: PublicCatalogItem[];
  total: number;
  hasMore: boolean;
};

const PAGE_SIZE = 30;
const CACHE_MS = 3 * 60 * 1000;

const mainNav: Array<{ mode: ViewMode; label: string; icon: typeof Home }> = [
  { mode: "home", label: "หน้าแรก", icon: Home },
  { mode: "movie", label: "ภาพยนตร์", icon: Film },
  { mode: "series", label: "ซีรีส์", icon: Tv },
  { mode: "anime", label: "อนิเมะ", icon: Sparkles },
  { mode: "new", label: "มาใหม่", icon: Calendar },
  { mode: "popular", label: "ยอดนิยม", icon: Flame },
];

const genreFilters = [
  { value: "ทั้งหมด", label: "ทุกแนว" },
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
  home: "เลือกเรื่องที่อยากดู",
  movie: "ภาพยนตร์",
  series: "ซีรีส์",
  anime: "อนิเมะ",
  new: "มาใหม่",
  popular: "ยอดนิยม",
  favorites: "รายการโปรด",
  history: "ดูล่าสุด",
};

function Brand() {
  return (
    <span className={styles.brand} aria-label="REAL2FREE">
      <span className={styles.brandMark}><i /><i /></span>
      <strong>REAL<span>2</span>FREE</strong>
    </span>
  );
}

function releaseTimestamp(item: PublicCatalogItem) {
  return new Date(item.releaseDate || item.updatedAt).getTime() || 0;
}

function releaseLabel(value: string | null, year: number | null) {
  if (!value) return year ? String(year) : "ไม่ระบุ";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return year ? String(year) : "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function isRecentlyAdded(item: PublicCatalogItem) {
  const updated = new Date(item.updatedAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated <= 30 * 24 * 60 * 60 * 1000;
}

function SkeletonGrid() {
  return (
    <div className={styles.skeletonGrid} aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => <span key={index}><i /><b /><em /></span>)}
    </div>
  );
}

function PosterCard({
  movie,
  favorite,
  rank,
  onOpen,
  onPlay,
  onFavorite,
  onPrefetch,
}: {
  movie: PublicCatalogItem;
  favorite: boolean;
  rank?: number;
  onOpen: () => void;
  onPlay: () => void;
  onFavorite: () => void;
  onPrefetch: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const firstLabel = movie.players.find((player) => player.label)?.label || "";

  return (
    <article className={styles.card} onPointerEnter={onPrefetch}>
      <button className={styles.posterButton} type="button" onClick={onOpen} aria-label={`ดูข้อมูล ${movie.thaiTitle}`}>
        <span className={styles.poster}>
          {movie.posterUrl && !imageFailed ? (
            <img
              src={movie.posterUrl}
              alt={movie.thaiTitle}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 560px) 31vw, (max-width: 900px) 22vw, 13vw"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className={styles.posterFallback}><Film /><strong>{movie.thaiTitle}</strong></span>
          )}
          <span className={styles.posterShade} />
          {rank ? <span className={styles.rank}>{rank}</span> : null}
          {isRecentlyAdded(movie) ? <span className={styles.newBadge}>ใหม่</span> : null}
          {firstLabel ? <span className={styles.audioBadge}>{firstLabel}</span> : null}
          <span className={styles.playHover} onClick={(event) => { event.stopPropagation(); onPlay(); }}>
            <Play fill="currentColor" />
            <small>รับชม</small>
          </span>
        </span>
      </button>

      <button
        className={`${styles.cardFavorite} ${favorite ? styles.cardFavoriteActive : ""}`}
        type="button"
        onClick={onFavorite}
        aria-label={favorite ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
      >
        <Heart fill={favorite ? "currentColor" : "none"} />
      </button>

      <button className={styles.cardTitle} type="button" onClick={onOpen}>{movie.thaiTitle}</button>
      <div className={styles.cardMeta}>
        <span>{movie.year || contentTypeLabel(movie.contentType)}</span>
        <span><Star fill="currentColor" /> {movie.rating ? movie.rating.toFixed(1) : "-"}</span>
      </div>
    </article>
  );
}

function DetailModal({
  movie,
  favorite,
  onClose,
  onWatch,
  onFavorite,
}: {
  movie: PublicCatalogItem;
  favorite: boolean;
  onClose: () => void;
  onWatch: () => void;
  onFavorite: () => void;
}) {
  const labels = [...new Set(movie.players.map((player) => player.label).filter(Boolean))].slice(0, 4);
  const meta = [contentTypeLabel(movie.contentType), movie.year ? String(movie.year) : "", runtimeLabel(movie.runtime)].filter(Boolean);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label={`ข้อมูล ${movie.thaiTitle}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.modalHero}>
          {movie.backdropUrl ? <img src={movie.backdropUrl} alt="" referrerPolicy="no-referrer" /> : null}
          <span className={styles.modalHeroShade} />
          <button className={styles.modalClose} type="button" onClick={onClose} aria-label="ปิด"><X /></button>

          <div className={styles.modalHeroContent}>
            <span className={styles.modalEyebrow}><Play fill="currentColor" /> พร้อมรับชม</span>
            <h2>{movie.thaiTitle}</h2>
            {movie.title !== movie.thaiTitle ? <h3>{movie.title}</h3> : null}
            <div className={styles.modalMeta}>{meta.map((entry) => <span key={entry}>{entry}</span>)}</div>
          </div>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.modalPoster}>
            {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.thaiTitle} referrerPolicy="no-referrer" /> : <Film />}
          </div>

          <div className={styles.modalBody}>
            <div className={styles.modalTopline}>
              <div className={styles.modalRating}><Star fill="currentColor" /><strong>{movie.rating ? movie.rating.toFixed(1) : "-"}</strong><span>คะแนน</span></div>
              <div className={styles.modalReady}><ShieldCheck /><strong>{movie.players.length}</strong><span>ตัวเลือกรับชม</span></div>
            </div>

            <section className={styles.modalOverview}>
              <span><Info /> เรื่องย่อ</span>
              <p>{movie.overview || "เรื่องนี้พร้อมให้คุณรับชมแล้ว"}</p>
            </section>

            <div className={styles.modalFacts}>
              <div><CalendarDays /><span><small>วันที่เข้าฉาย</small><strong>{releaseLabel(movie.releaseDate, movie.year)}</strong></span></div>
              <div><Clock3 /><span><small>ความยาว</small><strong>{runtimeLabel(movie.runtime) || "ไม่ระบุ"}</strong></span></div>
              <div><Languages /><span><small>รูปแบบ</small><strong>{labels[0] || "พร้อมรับชม"}</strong></span></div>
            </div>

            <div className={styles.modalTags}>
              {movie.genres.slice(0, 6).map((genre) => <span key={genre}>{genre}</span>)}
              {labels.map((label) => <span key={label} className={styles.languageTag}>{label}</span>)}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.watchButton} type="button" onClick={onWatch}>
                <span><Play fill="currentColor" /></span>
                <span><strong>ไปหน้ารับชม</strong><small>กดเล่นครั้งเดียว ระบบจะเลือกตัวรับชมให้อัตโนมัติ</small></span>
                <ChevronRight />
              </button>
              <button className={`${styles.favoriteAction} ${favorite ? styles.favoriteActionActive : ""}`} type="button" onClick={onFavorite}>
                <Heart fill={favorite ? "currentColor" : "none"} /> {favorite ? "บันทึกแล้ว" : "เพิ่มรายการโปรด"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MovieHomeV2() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("dark");
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("ทั้งหมด");
  const [year, setYear] = useState("ทั้งหมด");
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<PublicCatalogItem | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

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
    const timer = window.setTimeout(() => setQuery(cleanCatalogSearch(queryInput)), 280);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    document.body.style.overflow = selectedMovie || mobileMenuOpen || filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen, mobileMenuOpen, selectedMovie]);

  const cacheKey = useMemo(
    () => `real2free-catalog:${viewMode}:${query}:${genre}:${year}`,
    [genre, query, viewMode, year],
  );

  const fetchCatalog = useCallback(async (targetPage: number, append: boolean) => {
    const requestId = ++requestRef.current;

    if (!append) {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
    } else {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    setLoadFailed(false);

    try {
      if (!append && targetPage === 0) {
        try {
          const cached = JSON.parse(window.sessionStorage.getItem(cacheKey) || "null") as CatalogCache | null;
          if (cached && Date.now() - cached.savedAt < CACHE_MS) {
            setItems(cached.items);
            setTotal(cached.total);
            setHasMore(cached.hasMore);
            setPage(0);
            setHeroIndex(0);
            setLoading(false);
            return;
          }
        } catch {
          window.sessionStorage.removeItem(cacheKey);
        }
      }

      const supabase = getSupabaseBrowserClient();
      const countOptions = targetPage === 0 ? { count: "exact" as const } : undefined;
      let builder = supabase.from("real2free_public_titles").select(PUBLIC_CATALOG_FIELDS, countOptions);

      if (query) builder = builder.or(`title_th.ilike.%${query}%,title_en.ilike.%${query}%`);
      if (genre !== "ทั้งหมด") builder = builder.contains("genres", [genre]);
      if (year !== "ทั้งหมด") builder = year === "ก่อน 2020" ? builder.lt("year", 2020) : builder.eq("year", Number(year));
      if (viewMode === "movie" || viewMode === "series") builder = builder.eq("content_type", viewMode);
      if (viewMode === "anime") builder = builder.overlaps("genres", ["Animation", "Anime"]);

      if (viewMode === "favorites") {
        const ids = [...favorites];
        if (!ids.length) {
          if (requestId === requestRef.current) {
            setItems([]);
            setTotal(0);
            setHasMore(false);
            setLoading(false);
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
            setLoading(false);
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
      let ranged = builder.range(from, to);
      if (abortRef.current && !append) ranged = ranged.abortSignal(abortRef.current.signal);

      const { data, error, count } = await ranged;
      if (error) throw error;
      if (requestId !== requestRef.current) return;

      let mapped = ((data || []) as unknown as PublicCatalogRow[])
        .map(mapPublicCatalogRow)
        .filter((item): item is PublicCatalogItem => Boolean(item));

      if (viewMode === "history") {
        const order = new Map(history.map((entryId, index): [string, number] => [entryId, index]));
        mapped = mapped.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
      }

      const nextHasMore = mapped.length === PAGE_SIZE && (count == null || to + 1 < count);
      const nextTotal = count ?? (append ? from + mapped.length + (nextHasMore ? 1 : 0) : mapped.length);

      setItems((current) => {
        if (!append) return mapped;
        const merged = new Map(current.map((item) => [item.id, item]));
        mapped.forEach((item) => merged.set(item.id, item));
        return [...merged.values()];
      });
      setPage(targetPage);
      setTotal((current) => count ?? (append ? Math.max(current, nextTotal) : nextTotal));
      setHasMore(nextHasMore);
      setHeroIndex(0);

      if (!append && targetPage === 0) {
        try {
          const payload: CatalogCache = { savedAt: Date.now(), items: mapped, total: nextTotal, hasMore: nextHasMore };
          window.sessionStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch {
          window.sessionStorage.removeItem(cacheKey);
        }
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      if (requestId === requestRef.current) setLoadFailed(true);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [cacheKey, favorites, genre, history, query, viewMode, year]);

  useEffect(() => {
    void fetchCatalog(0, false);
    return () => abortRef.current?.abort();
  }, [fetchCatalog]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMoreRef.current) void fetchCatalog(page + 1, true);
      },
      { rootMargin: "650px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchCatalog, hasMore, loading, loadingMore, page]);

  const heroItems = useMemo(() => items.filter((item) => item.backdropUrl).slice(0, 5), [items]);
  const heroMovie = heroItems[heroIndex] || items[0] || null;
  const freshItems = useMemo(() => [...items].sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a)).slice(0, 18), [items]);
  const popularItems = useMemo(() => [...items].sort((a, b) => b.rating - a.rating || b.voteCount - a.voteCount).slice(0, 18), [items]);

  useEffect(() => {
    if (heroItems.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroItems.length), 7500);
    return () => window.clearInterval(timer);
  }, [heroItems.length]);

  const chooseMode = (mode: ViewMode) => {
    setViewMode(mode);
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("real2free-theme", next);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const prefetchWatch = useCallback((id: string) => {
    router.prefetch(`/watch/${id}`);
  }, [router]);

  const goWatch = (movie: PublicCatalogItem) => {
    const nextHistory = [movie.id, ...history.filter((entryId) => entryId !== movie.id)].slice(0, 100);
    setHistory(nextHistory);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setSelectedMovie(null);
    router.push(`/watch/${movie.id}`);
  };

  const clearAll = () => {
    setQueryInput("");
    setQuery("");
    setGenre("ทั้งหมด");
    setYear("ทั้งหมด");
    setViewMode("home");
  };

  const hasFilters = Boolean(query || genre !== "ทั้งหมด" || year !== "ทั้งหมด" || viewMode !== "home");

  const renderCards = (movies: PublicCatalogItem[], ranked = false) => (
    <div className={styles.grid}>
      {movies.map((movie, index) => (
        <PosterCard
          key={movie.id}
          movie={movie}
          rank={ranked ? index + 1 : undefined}
          favorite={favorites.has(movie.id)}
          onOpen={() => {
            prefetchWatch(movie.id);
            setSelectedMovie(movie);
          }}
          onPlay={() => goWatch(movie)}
          onFavorite={() => toggleFavorite(movie.id)}
          onPrefetch={() => prefetchWatch(movie.id)}
        />
      ))}
    </div>
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.mobileMenuButton} type="button" onClick={() => setMobileMenuOpen(true)} aria-label="เปิดเมนู"><Menu /></button>
        <button className={styles.brandButton} type="button" onClick={() => chooseMode("home")}><Brand /></button>

        <nav className={styles.nav} aria-label="เมนูหลัก">
          {mainNav.map((item) => (
            <button key={item.mode} className={viewMode === item.mode ? styles.navActive : ""} type="button" onClick={() => chooseMode(item.mode)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <label className={styles.searchBox}>
            <Search />
            <input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="ค้นหาหนังหรือซีรีส์" />
            {queryInput ? <button type="button" onClick={() => setQueryInput("")} aria-label="ล้างคำค้น"><X /></button> : null}
          </label>
          <button className={styles.iconButton} type="button" onClick={() => setFilterOpen(true)} aria-label="ตัวกรอง"><SlidersHorizontal /></button>
          <button className={styles.iconButton} type="button" onClick={toggleTheme} aria-label="สลับโหมดสี">{theme === "dark" ? <Sun /> : <Moon />}</button>
        </div>
      </header>

      {heroMovie && viewMode === "home" && !query ? (
        <section className={styles.hero}>
          {heroMovie.backdropUrl ? <img src={heroMovie.backdropUrl} alt="" fetchPriority="high" referrerPolicy="no-referrer" /> : null}
          <span className={styles.heroShade} />
          <div className={styles.heroContent}>
            <span className={styles.heroEyebrow}>เรื่องเด่นวันนี้</span>
            <h1>{heroMovie.thaiTitle}</h1>
            {heroMovie.title !== heroMovie.thaiTitle ? <h2>{heroMovie.title}</h2> : null}
            <div className={styles.heroMeta}>
              <span><Star fill="currentColor" /> {heroMovie.rating ? heroMovie.rating.toFixed(1) : "-"}</span>
              <span>{heroMovie.year || ""}</span>
              <span>{runtimeLabel(heroMovie.runtime)}</span>
              <span>{heroMovie.genres.slice(0, 2).join(" • ")}</span>
            </div>
            <p>{heroMovie.overview || "เลือกเรื่องที่ชอบแล้วไปยังหน้ารับชมได้ทันที"}</p>
            <div className={styles.heroActions}>
              <button type="button" onClick={() => goWatch(heroMovie)}><Play fill="currentColor" /> รับชมตอนนี้</button>
              <button type="button" onClick={() => setSelectedMovie(heroMovie)}>รายละเอียด</button>
            </div>
          </div>

          {heroItems.length > 1 ? (
            <>
              <button className={`${styles.heroArrow} ${styles.heroArrowLeft}`} type="button" onClick={() => setHeroIndex((heroIndex - 1 + heroItems.length) % heroItems.length)} aria-label="เรื่องก่อนหน้า"><ChevronLeft /></button>
              <button className={`${styles.heroArrow} ${styles.heroArrowRight}`} type="button" onClick={() => setHeroIndex((heroIndex + 1) % heroItems.length)} aria-label="เรื่องถัดไป"><ChevronRight /></button>
              <div className={styles.heroDots}>
                {heroItems.map((item, index) => <button key={item.id} className={index === heroIndex ? styles.heroDotActive : ""} type="button" onClick={() => setHeroIndex(index)} aria-label={`เรื่องที่ ${index + 1}`} />)}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <HomeQuickFilters
        viewMode={viewMode}
        year={year}
        genre={genre}
        onViewChange={chooseMode}
        onYearChange={setYear}
        onGenreChange={setGenre}
        onOpenMore={() => setFilterOpen(true)}
        onClear={clearAll}
      />

      <section id="catalog" className={styles.catalog}>
        <div className={styles.catalogHeading}>
          <div>
            <span>{viewLabels[viewMode]}</span>
            <h2>{loading && !items.length ? "กำลังเตรียมรายการ" : `${total.toLocaleString("th-TH")} รายการ`}</h2>
          </div>
          <div className={styles.activeFilters}>
            {genre !== "ทั้งหมด" ? <button type="button" onClick={() => setGenre("ทั้งหมด")}>{genreFilters.find((item) => item.value === genre)?.label}<X /></button> : null}
            {year !== "ทั้งหมด" ? <button type="button" onClick={() => setYear("ทั้งหมด")}>{year}<X /></button> : null}
            {hasFilters ? <button className={styles.clearButton} type="button" onClick={clearAll}>ล้างทั้งหมด</button> : null}
          </div>
        </div>

        {loadFailed && !items.length ? (
          <div className={styles.empty}><RotateCcw /><h3>ยังเปิดรายการไม่ได้</h3><p>แตะลองใหม่เพื่อโหลดรายการอีกครั้ง</p><button type="button" onClick={() => void fetchCatalog(0, false)}>ลองใหม่</button></div>
        ) : loading && !items.length ? (
          <SkeletonGrid />
        ) : !items.length ? (
          <div className={styles.empty}><Search /><h3>ยังไม่พบรายการ</h3><p>ลองเปลี่ยนคำค้นหรือหมวดที่เลือก</p><button type="button" onClick={clearAll}>แสดงทั้งหมด</button></div>
        ) : viewMode === "home" && !query && genre === "ทั้งหมด" && year === "ทั้งหมด" ? (
          <>
            <div className={styles.sectionTitle}>
              <div><Clock3 /><span><strong>มาใหม่</strong><small>รายการที่เพิ่งอัปเดต</small></span></div>
              <button type="button" onClick={() => chooseMode("new")}>ดูทั้งหมด <ChevronRight /></button>
            </div>
            {renderCards(freshItems)}

            <div className={styles.sectionTitle}>
              <div><Flame /><span><strong>น่าดูตอนนี้</strong><small>คะแนนดีและได้รับความนิยม</small></span></div>
              <button type="button" onClick={() => chooseMode("popular")}>ดูทั้งหมด <ChevronRight /></button>
            </div>
            {renderCards(popularItems, true)}
          </>
        ) : (
          renderCards(items, viewMode === "popular")
        )}

        {hasMore && items.length ? (
          <div ref={loadMoreRef} className={styles.loadMoreArea}>
            {loadingMore ? <span><LoaderCircle /> กำลังแสดงรายการเพิ่ม...</span> : <button type="button" onClick={() => void fetchCatalog(page + 1, true)}>แสดงเพิ่มเติม</button>}
          </div>
        ) : null}
      </section>

      <nav className={styles.mobileBottomNav} aria-label="เมนูด้านล่าง">
        <button className={viewMode === "home" ? styles.mobileActive : ""} type="button" onClick={() => chooseMode("home")}><Home /><span>หน้าแรก</span></button>
        <button type="button" onClick={() => document.querySelector<HTMLInputElement>(`.${styles.searchBox} input`)?.focus()}><Search /><span>ค้นหา</span></button>
        <button className={viewMode === "favorites" ? styles.mobileActive : ""} type="button" onClick={() => chooseMode("favorites")}><Bookmark /><span>รายการโปรด</span></button>
        <button className={viewMode === "history" ? styles.mobileActive : ""} type="button" onClick={() => chooseMode("history")}><History /><span>ดูล่าสุด</span></button>
      </nav>

      {filterOpen ? (
        <div className={styles.sheetBackdrop} role="presentation" onMouseDown={() => setFilterOpen(false)}>
          <aside className={styles.filterSheet} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div><SlidersHorizontal /><span><strong>ตัวกรอง</strong><small>เลือกได้ตามที่ต้องการ</small></span></div>
              <button type="button" onClick={() => setFilterOpen(false)}><X /></button>
            </div>
            <div className={styles.filterGroup}>
              <strong>ประเภทเนื้อหา</strong>
              <div>
                {[{ value: "home", label: "ทั้งหมด" }, { value: "movie", label: "ภาพยนตร์" }, { value: "series", label: "ซีรีส์" }, { value: "anime", label: "อนิเมะ" }].map((item) => (
                  <button key={item.value} className={viewMode === item.value ? styles.filterSelected : ""} type="button" onClick={() => setViewMode(item.value as ViewMode)}>
                    {item.label}{viewMode === item.value ? <Check /> : null}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.filterGroup}>
              <strong>แนว</strong>
              <div>{genreFilters.map((item) => <button key={item.value} className={genre === item.value ? styles.filterSelected : ""} type="button" onClick={() => setGenre(item.value)}>{item.label}{genre === item.value ? <Check /> : null}</button>)}</div>
            </div>
            <div className={styles.filterGroup}>
              <strong>ปีที่ฉาย</strong>
              <div>{yearFilters.map((item) => <button key={item} className={year === item ? styles.filterSelected : ""} type="button" onClick={() => setYear(item)}>{item}{year === item ? <Check /> : null}</button>)}</div>
            </div>
            <button className={styles.applyFilters} type="button" onClick={() => setFilterOpen(false)}>แสดงรายการ</button>
          </aside>
        </div>
      ) : null}

      {mobileMenuOpen ? (
        <div className={styles.sheetBackdrop} role="presentation" onMouseDown={() => setMobileMenuOpen(false)}>
          <aside className={styles.mobileMenu} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.mobileMenuHeader}><Brand /><button type="button" onClick={() => setMobileMenuOpen(false)}><X /></button></div>
            <nav>
              {[...mainNav, { mode: "favorites" as ViewMode, label: "รายการโปรด", icon: Bookmark }, { mode: "history" as ViewMode, label: "ดูล่าสุด", icon: History }].map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.mode} className={viewMode === item.mode ? styles.mobileMenuActive : ""} type="button" onClick={() => chooseMode(item.mode)}>
                    <Icon /><span>{item.label}</span><ChevronRight />
                  </button>
                );
              })}
            </nav>
            <button className={styles.mobileTheme} type="button" onClick={toggleTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>{theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}</span>
            </button>
          </aside>
        </div>
      ) : null}

      {selectedMovie ? (
        <DetailModal
          movie={selectedMovie}
          favorite={favorites.has(selectedMovie.id)}
          onClose={() => setSelectedMovie(null)}
          onWatch={() => goWatch(selectedMovie)}
          onFavorite={() => toggleFavorite(selectedMovie.id)}
        />
      ) : null}
    </main>
  );
}
