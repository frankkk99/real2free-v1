"use client";

import {
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Film,
  Flame,
  History,
  Home,
  LoaderCircle,
  Moon,
  Play,
  RotateCcw,
  Search,
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
  FAVORITES_KEY,
  HISTORY_KEY,
  mapPublicCatalogCardRow,
  mapPublicCatalogRow,
  PUBLIC_CATALOG_CARD_FIELDS,
  PUBLIC_CATALOG_FIELDS,
  runtimeLabel,
  type PublicCatalogCardRow,
  type PublicCatalogItem,
  type PublicCatalogRow,
} from "@/lib/public-catalog";
import {
  heroReleaseLabel,
  mapPublicHeroRow,
  PUBLIC_HERO_FIELDS,
  type PublicHeroItem,
  type PublicHeroRow,
} from "@/lib/public-hero";
import {
  languageFilterOptions,
  parseSmartCatalogSearch,
  sortModeOptions,
  type CatalogLanguageFilter,
  type CatalogSortMode,
} from "@/lib/smart-catalog-search";
import CatalogDetailModal from "./CatalogDetailModal";
import CatalogPosterCard from "./CatalogPosterCard";
import HomeQuickFilters, { type HomeQuickView } from "./HomeQuickFilters";
import SmartCatalogHeader from "./SmartCatalogHeader";
import styles from "./MovieHomeV2.module.css";

type Theme = "dark" | "light";
type ViewMode = HomeQuickView;
type CatalogCache = {
  savedAt: number;
  items: PublicCatalogItem[];
  total: number;
  hasMore: boolean;
};

const PAGE_SIZE = 24;
const CACHE_MS = 5 * 60 * 1000;
const CURRENT_RELEASE_YEAR = 2026;

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
  { value: "Crime", label: "อาชญากรรม" },
  { value: "Drama", label: "ดราม่า" },
  { value: "Family", label: "ครอบครัว" },
  { value: "Fantasy", label: "แฟนตาซี" },
  { value: "Horror", label: "สยองขวัญ" },
  { value: "Mystery", label: "ลึกลับ" },
  { value: "Romance", label: "โรแมนติก" },
  { value: "Science Fiction", label: "ไซไฟ" },
  { value: "Thriller", label: "ระทึกขวัญ" },
  { value: "Animation", label: "แอนิเมชัน" },
];

const yearFilters = ["ทั้งหมด", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "ก่อน 2020"];

const viewLabels: Record<ViewMode, string> = {
  home: "เลือกเรื่องที่อยากดู",
  movie: "ภาพยนตร์",
  series: "ซีรีส์",
  anime: "อนิเมะ",
  new: "มาใหม่ปี 2026",
  popular: "ใหม่และคะแนนดี",
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

function newestRatedCompare(a: PublicCatalogItem, b: PublicCatalogItem) {
  const yearDifference = (b.year || 0) - (a.year || 0);
  if (yearDifference) return yearDifference;
  const releaseDifference = releaseTimestamp(b) - releaseTimestamp(a);
  if (releaseDifference) return releaseDifference;
  const ratingDifference = b.rating - a.rating;
  if (ratingDifference) return ratingDifference;
  const voteDifference = b.voteCount - a.voteCount;
  if (voteDifference) return voteDifference;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function SkeletonGrid() {
  return (
    <div className={styles.skeletonGrid} aria-hidden="true">
      {Array.from({ length: 16 }).map((_, index) => <span key={index}><i /><b /><em /></span>)}
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
  const [language, setLanguage] = useState<CatalogLanguageFilter>("ทั้งหมด");
  const [sortMode, setSortMode] = useState<CatalogSortMode>("updated");
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [featuredHeroes, setFeaturedHeroes] = useState<PublicHeroItem[]>([]);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const detailCacheRef = useRef(new Map<string, PublicCatalogItem>());
  const detailRequestsRef = useRef(new Map<string, Promise<PublicCatalogItem | null>>());

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
    const timer = window.setTimeout(() => setQuery(cleanCatalogSearch(queryInput)), 260);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    document.body.style.overflow = selectedMovie || mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen, selectedMovie]);

  useEffect(() => {
    let disposed = false;

    async function loadHeroes() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("real2free_public_heroes")
          .select(PUBLIC_HERO_FIELDS)
          .order("priority", { ascending: false })
          .order("release_date", { ascending: true, nullsFirst: false })
          .limit(6);

        if (error) throw error;
        if (disposed) return;
        const mapped = ((data || []) as unknown as PublicHeroRow[])
          .map(mapPublicHeroRow)
          .filter((item): item is PublicHeroItem => Boolean(item?.backdropUrl));
        setFeaturedHeroes(mapped);
      } catch {
        if (!disposed) setFeaturedHeroes([]);
      }
    }

    void loadHeroes();
    return () => { disposed = true; };
  }, []);

  const parsedSearch = useMemo(() => parseSmartCatalogSearch(query), [query]);
  const titleQuery = parsedSearch.text;
  const effectiveViewMode: ViewMode = viewMode === "home" && parsedSearch.viewMode ? parsedSearch.viewMode : viewMode;
  const effectiveGenre = genre === "ทั้งหมด" ? parsedSearch.genre || "ทั้งหมด" : genre;
  const effectiveYear = year === "ทั้งหมด" ? parsedSearch.year || "ทั้งหมด" : year;
  const effectiveLanguage: CatalogLanguageFilter = language === "ทั้งหมด" ? parsedSearch.language || "ทั้งหมด" : language;
  const effectiveSort: CatalogSortMode = viewMode === "new" ? "release" : sortMode;

  const cacheKey = useMemo(
    () => `real2free-cards-v2:${effectiveViewMode}:${titleQuery}:${effectiveGenre}:${effectiveYear}:${effectiveLanguage}:${effectiveSort}`,
    [effectiveGenre, effectiveLanguage, effectiveSort, effectiveViewMode, effectiveYear, titleQuery],
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
      let builder = supabase.from("real2free_public_cards").select(PUBLIC_CATALOG_CARD_FIELDS, countOptions);

      if (titleQuery) builder = builder.or(`title_th.ilike.%${titleQuery}%,title_en.ilike.%${titleQuery}%`);
      if (effectiveGenre !== "ทั้งหมด") builder = builder.contains("genres", [effectiveGenre]);
      if (effectiveYear !== "ทั้งหมด") {
        builder = effectiveYear === "ก่อน 2020" ? builder.lt("year", 2020) : builder.eq("year", Number(effectiveYear));
      } else if (effectiveViewMode === "new") {
        builder = builder.eq("year", CURRENT_RELEASE_YEAR);
      }
      if (effectiveViewMode === "movie" || effectiveViewMode === "series") builder = builder.eq("content_type", effectiveViewMode);
      if (effectiveViewMode === "anime") builder = builder.overlaps("genres", ["Animation", "Anime"]);
      if (effectiveViewMode === "popular") builder = builder.gte("rating", 6);
      if (effectiveLanguage === "dub_th") builder = builder.eq("has_dub_th", true);
      if (effectiveLanguage === "sub_th") builder = builder.eq("has_sub_th", true);
      if (effectiveLanguage === "backup") builder = builder.eq("has_backup", true);

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

      if (effectiveSort === "title") {
        builder = builder.order("title_th", { ascending: true, nullsFirst: false });
      } else if (effectiveSort === "rating") {
        builder = builder
          .order("rating", { ascending: false, nullsFirst: false })
          .order("year", { ascending: false, nullsFirst: false })
          .order("release_date", { ascending: false, nullsFirst: false })
          .order("vote_count", { ascending: false, nullsFirst: false });
      } else {
        builder = builder
          .order("year", { ascending: false, nullsFirst: false })
          .order("release_date", { ascending: false, nullsFirst: false })
          .order("rating", { ascending: false, nullsFirst: false })
          .order("vote_count", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false });
      }

      const from = targetPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let ranged = builder.range(from, to);
      if (abortRef.current && !append) ranged = ranged.abortSignal(abortRef.current.signal);

      const { data, error, count } = await ranged;
      if (error) throw error;
      if (requestId !== requestRef.current) return;

      let mapped = ((data || []) as unknown as PublicCatalogCardRow[])
        .map(mapPublicCatalogCardRow)
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
  }, [cacheKey, effectiveGenre, effectiveLanguage, effectiveSort, effectiveViewMode, effectiveYear, favorites, history, titleQuery, viewMode]);

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
      { rootMargin: "520px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchCatalog, hasMore, loading, loadingMore, page]);

  const fallbackHeroItems = useMemo(() => items.filter((item) => item.backdropUrl).slice(0, 4), [items]);
  const featuredHero = featuredHeroes[heroIndex] || null;
  const fallbackHero = fallbackHeroItems[heroIndex] || fallbackHeroItems[0] || null;
  const activeHeroCount = featuredHeroes.length || fallbackHeroItems.length;
  const freshItems = useMemo(
    () => items.filter((item) => item.year === CURRENT_RELEASE_YEAR).sort(newestRatedCompare).slice(0, 18),
    [items],
  );
  const popularItems = useMemo(
    () => [...items].filter((item) => item.rating >= 6).sort(newestRatedCompare).slice(0, 18),
    [items],
  );

  useEffect(() => {
    if (activeHeroCount < 2) return;
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % activeHeroCount), 7500);
    return () => window.clearInterval(timer);
  }, [activeHeroCount]);

  useEffect(() => {
    if (heroIndex >= activeHeroCount && activeHeroCount > 0) setHeroIndex(0);
  }, [activeHeroCount, heroIndex]);

  const loadMovieDetail = useCallback(async (id: string) => {
    const cached = detailCacheRef.current.get(id);
    if (cached) return cached;
    const pending = detailRequestsRef.current.get(id);
    if (pending) return pending;

    const request = (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("real2free_public_titles")
          .select(PUBLIC_CATALOG_FIELDS)
          .eq("id", id)
          .limit(1);
        if (error) throw error;
        const detail = mapPublicCatalogRow(((data || [])[0] || null) as unknown as PublicCatalogRow);
        if (detail) detailCacheRef.current.set(id, detail);
        return detail;
      } catch {
        return null;
      } finally {
        detailRequestsRef.current.delete(id);
      }
    })();

    detailRequestsRef.current.set(id, request);
    return request;
  }, []);

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

  const prefetchMovie = useCallback((id: string) => {
    router.prefetch(`/watch/${id}`);
    void loadMovieDetail(id);
  }, [loadMovieDetail, router]);

  const openMovie = useCallback(async (movie: PublicCatalogItem) => {
    prefetchMovie(movie.id);
    const detail = await loadMovieDetail(movie.id);
    setSelectedMovie(detail || movie);
  }, [loadMovieDetail, prefetchMovie]);

  const goWatch = (movie: PublicCatalogItem) => {
    const nextHistory = [movie.id, ...history.filter((entryId) => entryId !== movie.id)].slice(0, 100);
    setHistory(nextHistory);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setSelectedMovie(null);
    router.push(`/watch/${movie.id}`);
  };

  const goWatchById = (id: string) => {
    setSelectedMovie(null);
    router.push(`/watch/${id}`);
  };

  const openExternal = (url: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const clearAll = () => {
    setQueryInput("");
    setQuery("");
    setGenre("ทั้งหมด");
    setYear("ทั้งหมด");
    setLanguage("ทั้งหมด");
    setSortMode("updated");
    setViewMode("home");
  };

  const hasFilters = Boolean(
    query
    || genre !== "ทั้งหมด"
    || year !== "ทั้งหมด"
    || language !== "ทั้งหมด"
    || sortMode !== "updated"
    || viewMode !== "home",
  );

  const renderCards = (movies: PublicCatalogItem[], ranked = false) => (
    <div className={styles.grid}>
      {movies.map((movie, index) => (
        <CatalogPosterCard
          key={movie.id}
          movie={movie}
          rank={ranked ? index + 1 : undefined}
          favorite={favorites.has(movie.id)}
          onOpen={() => void openMovie(movie)}
          onPlay={() => goWatch(movie)}
          onFavorite={() => toggleFavorite(movie.id)}
          onPrefetch={() => prefetchMovie(movie.id)}
        />
      ))}
    </div>
  );

  const languageLabel = languageFilterOptions.find((option) => option.value === language)?.label;
  const sortLabel = sortModeOptions.find((option) => option.value === sortMode)?.label;
  const isDefaultHome = viewMode === "home"
    && !query
    && genre === "ทั้งหมด"
    && year === "ทั้งหมด"
    && language === "ทั้งหมด"
    && sortMode === "updated";

  return (
    <main className={styles.page}>
      <SmartCatalogHeader
        theme={theme}
        viewMode={viewMode}
        queryInput={queryInput}
        genre={genre}
        year={year}
        language={language}
        sortMode={sortMode}
        items={items}
        genreOptions={genreFilters}
        yearOptions={yearFilters}
        onViewChange={chooseMode}
        onQueryChange={setQueryInput}
        onGenreChange={setGenre}
        onYearChange={setYear}
        onLanguageChange={setLanguage}
        onSortChange={setSortMode}
        onClearFilters={clearAll}
        onToggleTheme={toggleTheme}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />

      {isDefaultHome && (featuredHero || fallbackHero) ? (
        <section className={styles.hero}>
          {(featuredHero?.backdropUrl || fallbackHero?.backdropUrl) ? (
            <img
              src={featuredHero?.backdropUrl || fallbackHero?.backdropUrl || ""}
              alt=""
              fetchPriority="high"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span className={styles.heroShade} />

          {featuredHero ? (
            <div className={styles.heroContent}>
              <span className={styles.heroEyebrow}>เร็ว ๆ นี้ • {heroReleaseLabel(featuredHero.releaseDate)}</span>
              <h1>{featuredHero.thaiTitle}</h1>
              {featuredHero.title !== featuredHero.thaiTitle ? <h2>{featuredHero.title}</h2> : null}
              <div className={styles.heroMeta}>
                <span>{featuredHero.year || CURRENT_RELEASE_YEAR}</span>
                <span>{featuredHero.genres.slice(0, 3).join(" • ")}</span>
              </div>
              <p>{featuredHero.overview || "หนังฟอร์มใหญ่ที่กำลังจะเข้าฉาย"}</p>
              <div className={styles.heroActions}>
                {featuredHero.isWatchReady && featuredHero.catalogId ? (
                  <button type="button" onClick={() => goWatchById(featuredHero.catalogId || "")}><Play fill="currentColor" /> รับชมตอนนี้</button>
                ) : (
                  <button type="button" onClick={() => openExternal(featuredHero.trailerUrl)}><Play fill="currentColor" /> ดูตัวอย่าง</button>
                )}
                {featuredHero.detailUrl ? <button type="button" onClick={() => openExternal(featuredHero.detailUrl)}>ข้อมูลเพิ่มเติม</button> : null}
              </div>
            </div>
          ) : fallbackHero ? (
            <div className={styles.heroContent}>
              <span className={styles.heroEyebrow}>เรื่องเด่นวันนี้</span>
              <h1>{fallbackHero.thaiTitle}</h1>
              {fallbackHero.title !== fallbackHero.thaiTitle ? <h2>{fallbackHero.title}</h2> : null}
              <div className={styles.heroMeta}>
                <span><Star fill="currentColor" /> {fallbackHero.rating ? fallbackHero.rating.toFixed(1) : "-"}</span>
                <span>{fallbackHero.year || ""}</span>
                <span>{runtimeLabel(fallbackHero.runtime)}</span>
                <span>{fallbackHero.genres.slice(0, 2).join(" • ")}</span>
              </div>
              <p>{fallbackHero.overview || "เลือกเรื่องที่ชอบแล้วไปยังหน้ารับชมได้ทันที"}</p>
              <div className={styles.heroActions}>
                <button type="button" onClick={() => goWatch(fallbackHero)}><Play fill="currentColor" /> รับชมตอนนี้</button>
                <button type="button" onClick={() => void openMovie(fallbackHero)}>รายละเอียด</button>
              </div>
            </div>
          ) : null}

          {activeHeroCount > 1 ? (
            <>
              <button className={`${styles.heroArrow} ${styles.heroArrowLeft}`} type="button" onClick={() => setHeroIndex((heroIndex - 1 + activeHeroCount) % activeHeroCount)} aria-label="เรื่องก่อนหน้า"><ChevronLeft /></button>
              <button className={`${styles.heroArrow} ${styles.heroArrowRight}`} type="button" onClick={() => setHeroIndex((heroIndex + 1) % activeHeroCount)} aria-label="เรื่องถัดไป"><ChevronRight /></button>
              <div className={styles.heroDots}>
                {Array.from({ length: activeHeroCount }).map((_, index) => <button key={index} className={index === heroIndex ? styles.heroDotActive : ""} type="button" onClick={() => setHeroIndex(index)} aria-label={`เรื่องที่ ${index + 1}`} />)}
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
        onOpenMore={() => document.querySelector<HTMLButtonElement>('[aria-label="เปิดตัวกรองละเอียด"]')?.click()}
        onClear={clearAll}
      />

      <section id="catalog" className={styles.catalog}>
        <div className={styles.catalogHeading}>
          <div>
            <span>{viewLabels[viewMode]}</span>
            <h2>{loading && !items.length ? "กำลังเตรียมรายการ" : `${total.toLocaleString("th-TH")} รายการ`}</h2>
          </div>
          <div className={styles.activeFilters}>
            {parsedSearch.labels.length ? <button type="button" onClick={() => setQueryInput("")}>{parsedSearch.labels.join(" • ")}<X /></button> : null}
            {genre !== "ทั้งหมด" ? <button type="button" onClick={() => setGenre("ทั้งหมด")}>{genreFilters.find((item) => item.value === genre)?.label}<X /></button> : null}
            {year !== "ทั้งหมด" ? <button type="button" onClick={() => setYear("ทั้งหมด")}>{year}<X /></button> : null}
            {language !== "ทั้งหมด" ? <button type="button" onClick={() => setLanguage("ทั้งหมด")}>{languageLabel}<X /></button> : null}
            {sortMode !== "updated" ? <button type="button" onClick={() => setSortMode("updated")}>{sortLabel}<X /></button> : null}
            {hasFilters ? <button className={styles.clearButton} type="button" onClick={clearAll}>ล้างทั้งหมด</button> : null}
          </div>
        </div>

        {loadFailed && !items.length ? (
          <div className={styles.empty}><RotateCcw /><h3>ยังเปิดรายการไม่ได้</h3><p>แตะลองใหม่เพื่อโหลดรายการอีกครั้ง</p><button type="button" onClick={() => void fetchCatalog(0, false)}>ลองใหม่</button></div>
        ) : loading && !items.length ? (
          <SkeletonGrid />
        ) : !items.length ? (
          <div className={styles.empty}><Search /><h3>ยังไม่พบรายการ</h3><p>ลองเปลี่ยนคำค้นหรือหมวดที่เลือก</p><button type="button" onClick={clearAll}>แสดงทั้งหมด</button></div>
        ) : isDefaultHome ? (
          <>
            <div className={styles.sectionTitle}>
              <div><Clock3 /><span><strong>มาใหม่ 2026</strong><small>ใหม่ล่าสุดก่อน แล้วเรียงคะแนนสูง</small></span></div>
              <button type="button" onClick={() => chooseMode("new")}>ดูทั้งหมด <ChevronRight /></button>
            </div>
            {freshItems.length ? renderCards(freshItems) : renderCards(items.slice(0, 18))}

            <div className={styles.sectionTitle}>
              <div><Flame /><span><strong>ใหม่และน่าดู</strong><small>ปีใหม่ก่อน พร้อมคะแนนและเสียงตอบรับดี</small></span></div>
              <button type="button" onClick={() => chooseMode("popular")}>ดูทั้งหมด <ChevronRight /></button>
            </div>
            {renderCards(popularItems.length ? popularItems : items.slice(0, 18), true)}
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
        <button type="button" onClick={() => document.getElementById("catalog-search-input")?.focus()}><Search /><span>ค้นหา</span></button>
        <button className={viewMode === "favorites" ? styles.mobileActive : ""} type="button" onClick={() => chooseMode("favorites")}><Bookmark /><span>รายการโปรด</span></button>
        <button className={viewMode === "history" ? styles.mobileActive : ""} type="button" onClick={() => chooseMode("history")}><History /><span>ดูล่าสุด</span></button>
      </nav>

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
        <CatalogDetailModal
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
