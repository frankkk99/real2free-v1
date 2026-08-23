"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addStoredId,
  FAVORITES_KEY,
  HISTORY_KEY,
  readStoredIdList,
  toggleStoredId,
} from "@/lib/client-storage";
import {
  mapPublicCatalogCardRow,
  mapPublicCatalogRow,
  PUBLIC_CATALOG_CARD_FIELDS,
  PUBLIC_CATALOG_FIELDS,
  type PublicCatalogCardRow,
  type PublicCatalogItem,
  type PublicCatalogRow,
} from "@/lib/public-catalog";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import CatalogDetailModal from "./CatalogDetailModal";
import CatalogPosterCard from "./CatalogPosterCard";
import homeStyles from "./MovieHomeV2.module.css";
import styles from "./HomeBottomInfiniteFeed.module.css";

const REQUIRED_HOME_SECTIONS = ["มาใหม่", "ซีรีส์", "ซีรีส์แนวตั้ง", "หนังไทย"];
const FETCH_BATCH = 48;
const ROWS_PER_REVEAL = 3;

function getColumnCount(grid: HTMLElement) {
  const template = window.getComputedStyle(grid).gridTemplateColumns.trim();
  if (!template || template === "none") return 1;
  return Math.max(1, template.split(/\s+/u).filter(Boolean).length);
}

function isDefaultHomepageCatalog(catalog: HTMLElement) {
  const titles = Array.from(catalog.children)
    .map((node) => node.querySelector(":scope > :first-child strong")?.textContent?.trim() || "")
    .filter(Boolean);
  return REQUIRED_HOME_SECTIONS.every((title) => titles.includes(title));
}

export default function HomeBottomInfiniteFeed() {
  const router = useRouter();
  const [catalogTarget, setCatalogTarget] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<PublicCatalogItem | null>(null);
  const [columns, setColumns] = useState(8);
  const [revealedRows, setRevealedRows] = useState(ROWS_PER_REVEAL);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextOffsetRef = useRef(0);
  const requestActiveRef = useRef(false);
  const revealActiveRef = useRef(false);
  const detailCacheRef = useRef(new Map<string, PublicCatalogItem>());

  useEffect(() => {
    setFavorites(new Set(readStoredIdList(FAVORITES_KEY)));
  }, []);

  useEffect(() => {
    let frame = 0;
    const syncTarget = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const catalog = document.getElementById("catalog");
        const nextTarget = catalog && isDefaultHomepageCatalog(catalog) ? catalog : null;
        setCatalogTarget((current) => current === nextTarget ? current : nextTarget);
      });
    };

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const loadBatch = useCallback(async (reset = false) => {
    if (requestActiveRef.current) return false;
    requestActiveRef.current = true;
    setLoadFailed(false);
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const from = reset ? 0 : nextOffsetRef.current;
      const to = from + FETCH_BATCH - 1;
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("real2free_public_smart_cards")
        .select(PUBLIC_CATALOG_CARD_FIELDS)
        .order("year", { ascending: false, nullsFirst: false })
        .order("release_date", { ascending: false, nullsFirst: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .order("vote_count", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const mapped = ((data || []) as unknown as PublicCatalogCardRow[])
        .map(mapPublicCatalogCardRow)
        .filter((item): item is PublicCatalogItem => Boolean(item));

      nextOffsetRef.current = from + mapped.length;
      setHasMore(mapped.length === FETCH_BATCH);
      setItems((current) => {
        const base = reset ? [] : current;
        const merged = new Map(base.map((item) => [item.id, item]));
        mapped.forEach((item) => merged.set(item.id, item));
        return [...merged.values()];
      });
      return true;
    } catch {
      setLoadFailed(true);
      return false;
    } finally {
      requestActiveRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!catalogTarget) {
      setSelectedMovie(null);
      return;
    }

    nextOffsetRef.current = 0;
    setItems([]);
    setHasMore(true);
    setRevealedRows(ROWS_PER_REVEAL);
    void loadBatch(true);
  }, [catalogTarget, loadBatch]);

  const hasItems = items.length > 0;
  useEffect(() => {
    if (!hasItems) return;
    const grid = gridRef.current;
    if (!grid) return;

    const measure = () => setColumns(getColumnCount(grid));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [hasItems]);

  const visibleCount = columns * revealedRows;
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const canContinue = visibleItems.length < items.length || hasMore;

  const revealMore = useCallback(async () => {
    if (revealActiveRef.current || loading || loadingMore) return;
    revealActiveRef.current = true;
    try {
      const nextRows = revealedRows + ROWS_PER_REVEAL;
      const requiredCount = columns * nextRows;
      if (requiredCount > items.length && hasMore) {
        const loaded = await loadBatch(false);
        if (!loaded) return;
      }
      setRevealedRows(nextRows);
    } finally {
      revealActiveRef.current = false;
    }
  }, [columns, hasMore, items.length, loadBatch, loading, loadingMore, revealedRows]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !catalogTarget || !canContinue || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void revealMore();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canContinue, catalogTarget, loading, loadingMore, revealMore, visibleItems.length]);

  useEffect(() => {
    document.body.style.overflow = selectedMovie ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedMovie]);

  const loadMovieDetail = useCallback(async (movie: PublicCatalogItem) => {
    const cached = detailCacheRef.current.get(movie.id);
    if (cached) return cached;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("real2free_public_titles")
        .select(PUBLIC_CATALOG_FIELDS)
        .eq("id", movie.id)
        .limit(1);
      if (error) throw error;
      const detail = mapPublicCatalogRow(((data || [])[0] || null) as unknown as PublicCatalogRow);
      if (detail) detailCacheRef.current.set(movie.id, detail);
      return detail || movie;
    } catch {
      return movie;
    }
  }, []);

  const openMovie = useCallback(async (movie: PublicCatalogItem) => {
    router.prefetch(`/watch/${movie.id}`);
    setSelectedMovie(await loadMovieDetail(movie));
  }, [loadMovieDetail, router]);

  const goWatch = useCallback((movie: PublicCatalogItem) => {
    addStoredId(HISTORY_KEY, movie.id);
    setSelectedMovie(null);
    router.push(`/watch/${movie.id}`);
  }, [router]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(new Set(toggleStoredId(FAVORITES_KEY, id)));
  }, []);

  if (!catalogTarget) return null;

  return createPortal(
    <section className={styles.section} aria-label="รายการใหม่และคะแนนดีเพิ่มเติม">
      <div className={homeStyles.sectionTitle}>
        <div>
          <Sparkles />
          <span>
            <strong>เลือกดูต่อ</strong>
            <small>เรียงใหม่ล่าสุด • คะแนนสูงก่อน</small>
          </span>
        </div>
      </div>

      {loading && !items.length ? (
        <div className={styles.status}><span><LoaderCircle /> กำลังจัดรายการ...</span></div>
      ) : items.length ? (
        <>
          <div ref={gridRef} className={homeStyles.grid}>
            {visibleItems.map((movie) => (
              <CatalogPosterCard
                key={movie.id}
                movie={movie}
                favorite={favorites.has(movie.id)}
                onOpen={() => void openMovie(movie)}
                onPlay={() => goWatch(movie)}
                onFavorite={() => toggleFavorite(movie.id)}
                onPrefetch={() => router.prefetch(`/watch/${movie.id}`)}
              />
            ))}
          </div>

          {canContinue || loadFailed ? (
            <div ref={sentinelRef} className={styles.status}>
              {loadingMore ? <span><LoaderCircle /> กำลังแสดงเพิ่ม...</span> : loadFailed ? <button type="button" onClick={() => void revealMore()}>โหลดเพิ่มอีกครั้ง</button> : <span aria-hidden="true" />}
            </div>
          ) : (
            <div className={`${styles.status} ${styles.end}`}>แสดงครบแล้ว</div>
          )}
        </>
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
    </section>,
    catalogTarget,
  );
}
