"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  mapPublicCatalogCardRow,
  PUBLIC_CATALOG_CARD_FIELDS,
  type PublicCatalogCardRow,
  type PublicCatalogItem,
} from "@/lib/public-catalog";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import AdSlot from "./AdSlot";
import styles from "./SeoCategoryPage.module.css";

export type CategoryCatalogFilter = "all" | "movie" | "series" | "anime" | "new" | "popular" | "vertical" | "thai";

const ROWS_PER_REVEAL = 5;
const FETCH_BATCH = 60;

function getColumnCount(grid: HTMLElement | null) {
  if (!grid) return 6;
  const template = window.getComputedStyle(grid).gridTemplateColumns.trim();
  if (!template || template === "none") return 1;
  return Math.max(1, template.split(/\s+/u).filter(Boolean).length);
}

function adPrefix(filter: CategoryCatalogFilter) {
  if (filter === "movie") return "MOVIE";
  if (filter === "series") return "SERIES";
  if (filter === "anime") return "ANIME";
  if (filter === "new") return "NEW";
  if (filter === "popular") return "POPULAR";
  if (filter === "vertical") return "VERTICAL";
  if (filter === "thai") return "THAI";
  return "ALL";
}

export default function SeoCategoryInfiniteGrid({
  initialItems,
  filter,
  title,
}: {
  initialItems: PublicCatalogItem[];
  filter: CategoryCatalogFilter;
  title: string;
}) {
  const [items, setItems] = useState<PublicCatalogItem[]>(initialItems);
  const [columns, setColumns] = useState(6);
  const [revealedRows, setRevealedRows] = useState(ROWS_PER_REVEAL);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(initialItems.length > 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const firstGridRef = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextOffsetRef = useRef(initialItems.length);
  const requestActiveRef = useRef(false);
  const revealActiveRef = useRef(false);

  const applyFilter = useCallback((query: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["from"]>) => {
    if (filter === "movie") return query.eq("content_type", "movie");
    if (filter === "series") return query.eq("content_type", "series").eq("is_vertical", false);
    if (filter === "anime") return query.overlaps("genres", ["Animation", "Anime"]);
    if (filter === "popular") return query.gte("rating", 6);
    if (filter === "vertical") return query.eq("content_type", "series").eq("is_vertical", true);
    if (filter === "thai") return query.eq("content_type", "movie").eq("is_thai", true);
    return query;
  }, [filter]);

  const applyOrder = useCallback((query: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["from"]>) => {
    if (filter === "new") {
      return query
        .order("release_date", { ascending: false, nullsFirst: false })
        .order("year", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .order("vote_count", { ascending: false, nullsFirst: false });
    }

    return query
      .order("year", { ascending: false, nullsFirst: false })
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("rating", { ascending: false, nullsFirst: false })
      .order("vote_count", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
  }, [filter]);

  useEffect(() => {
    let cancelled = false;

    const loadCount = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        let query = supabase
          .from("real2free_public_smart_cards")
          .select("id", { count: "exact", head: true });
        query = applyFilter(query);
        const { count, error } = await query;
        if (error) throw error;
        if (cancelled) return;
        const exactCount = typeof count === "number" ? count : null;
        setTotalCount(exactCount);
        if (exactCount !== null) setHasMore(nextOffsetRef.current < exactCount);
      } catch {
        // The feed can still paginate without an exact count.
      }
    };

    void loadCount();
    return () => {
      cancelled = true;
    };
  }, [applyFilter]);

  useEffect(() => {
    const grid = firstGridRef.current;
    if (!grid) return;
    const measure = () => setColumns(getColumnCount(grid));
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(grid);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [items.length]);

  const loadBatch = useCallback(async () => {
    if (requestActiveRef.current || !hasMore) return true;
    requestActiveRef.current = true;
    setLoadingMore(true);
    setLoadFailed(false);

    try {
      const from = nextOffsetRef.current;
      const to = from + FETCH_BATCH - 1;
      const supabase = getSupabaseBrowserClient();
      let query = supabase
        .from("real2free_public_smart_cards")
        .select(PUBLIC_CATALOG_CARD_FIELDS);
      query = applyFilter(query);
      query = applyOrder(query).range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      const mapped = ((data || []) as unknown as PublicCatalogCardRow[])
        .map(mapPublicCatalogCardRow)
        .filter((item): item is PublicCatalogItem => Boolean(item));

      nextOffsetRef.current = from + mapped.length;
      setItems((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        mapped.forEach((item) => merged.set(item.id, item));
        return [...merged.values()];
      });

      if (totalCount !== null) setHasMore(nextOffsetRef.current < totalCount);
      else setHasMore(mapped.length === FETCH_BATCH);
      return true;
    } catch {
      setLoadFailed(true);
      return false;
    } finally {
      requestActiveRef.current = false;
      setLoadingMore(false);
    }
  }, [applyFilter, applyOrder, hasMore, totalCount]);

  const visibleCount = columns * revealedRows;
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const canContinue = visibleItems.length < items.length || hasMore;

  const revealMore = useCallback(async () => {
    if (revealActiveRef.current || loadingMore) return;
    revealActiveRef.current = true;

    try {
      const nextRows = revealedRows + ROWS_PER_REVEAL;
      const requiredCount = columns * nextRows;
      if (requiredCount > items.length && hasMore) {
        const loaded = await loadBatch();
        if (!loaded) return;
      }
      setRevealedRows(nextRows);
    } finally {
      revealActiveRef.current = false;
    }
  }, [columns, hasMore, items.length, loadBatch, loadingMore, revealedRows]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canContinue || loadFailed) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void revealMore();
    }, { rootMargin: "520px 0px" });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canContinue, loadFailed, revealMore]);

  const cardsPerBlock = Math.max(1, columns * ROWS_PER_REVEAL);
  const blocks = useMemo(() => {
    const output: PublicCatalogItem[][] = [];
    for (let index = 0; index < visibleItems.length; index += cardsPerBlock) {
      output.push(visibleItems.slice(index, index + cardsPerBlock));
    }
    return output;
  }, [cardsPerBlock, visibleItems]);

  if (!items.length && !hasMore) {
    return <p className={styles.empty}>ยังไม่มีรายการในหมวดนี้ กรุณากลับมาตรวจสอบอีกครั้งภายหลัง</p>;
  }

  return (
    <>
      <p className={styles.count}>
        แสดงแล้ว {visibleItems.length.toLocaleString("th-TH")}
        {totalCount !== null ? ` จาก ${totalCount.toLocaleString("th-TH")} รายการ` : " รายการ"}
        {canContinue ? " • เลื่อนลงเพื่อโหลดต่อ" : " • แสดงครบทั้งหมดแล้ว"}
      </p>

      <div className={styles.feed}>
        {blocks.map((block, blockIndex) => {
          const code = `CAT-${adPrefix(filter)}-${String(blockIndex + 1).padStart(2, "0")}`;
          const showAd = block.length > 0 && (blockIndex < blocks.length - 1 || canContinue);
          return (
            <div className={styles.block} key={`${code}-${block[0]?.id || blockIndex}`}>
              <section
                ref={blockIndex === 0 ? (node) => { firstGridRef.current = node; } : undefined}
                className={styles.grid}
                aria-label={`${title} ชุดที่ ${blockIndex + 1}`}
              >
                {block.map((item) => (
                  <Link
                    key={item.id}
                    className={styles.card}
                    href={`/watch/${item.id}`}
                    aria-label={`ดูรายละเอียด ${item.thaiTitle}${item.year ? ` ปี ${item.year}` : ""}`}
                  >
                    <div className={styles.poster}>
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={`โปสเตอร์ ${item.thaiTitle}`}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                      <span>{item.contentType === "series" ? "ซีรีส์" : "หนัง"}</span>
                    </div>
                    <div className={styles.body}>
                      <strong>{item.thaiTitle}</strong>
                      <small>
                        {[item.title !== item.thaiTitle ? item.title : "", item.year || "", item.genres.slice(0, 2).join(" • ")]
                          .filter(Boolean)
                          .join(" • ")}
                      </small>
                    </div>
                  </Link>
                ))}
              </section>

              {showAd ? (
                <div className={styles.adBreak}>
                  <AdSlot
                    code={code}
                    name={`${title} • โฆษณาชุด ${blockIndex + 1}`}
                    placement={`แทรกระหว่างรายการหมวด ${title} ทุก ${ROWS_PER_REVEAL} แถว`}
                    desktopSize="21:9 x 3 ช่อง"
                    mobileSize="responsive banner"
                    variant="compact"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className={styles.sentinel} aria-live="polite">
        {loadingMore ? <span><LoaderCircle className={styles.spinner} /> กำลังโหลดรายการถัดไป...</span> : null}
        {loadFailed ? (
          <button type="button" className={styles.retry} onClick={() => void revealMore()}>
            โหลดต่ออีกครั้ง
          </button>
        ) : null}
        {!canContinue && visibleItems.length ? <span className={styles.complete}>แสดงครบทั้งหมดแล้ว</span> : null}
      </div>
    </>
  );
}
