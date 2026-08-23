"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Film,
  Heart,
  Info,
  Languages,
  Play,
  Share2,
  Star,
  X,
  Youtube,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  playerAvailabilityLabels,
  runtimeLabel,
  type PublicCatalogItem,
} from "@/lib/public-catalog";
import styles from "./CatalogDetailModal.module.css";

type TrailerRow = {
  trailer_url: string | null;
};

type DragState = {
  pointerId: number;
  startY: number;
  lastY: number;
  lastAt: number;
  currentY: number;
  velocity: number;
};

const CLOSE_DURATION_MS = 280;
const SNAP_DURATION_MS = 360;

function releaseLabel(value: string | null, year: number | null) {
  if (!value) return year ? String(year) : "ไม่ระบุ";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return year ? String(year) : "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(date);
}

function youtubeEmbedUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, "").toLocaleLowerCase("en-US");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
      if (!videoId) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0] || "")) videoId = parts[1] || "";
      }
    }

    if (!/^[A-Za-z0-9_-]{6,20}$/u.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  } catch {
    return null;
  }
}

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function formatBadges(movie: PublicCatalogItem) {
  const badges: string[] = [];
  const rawLabels = playerAvailabilityLabels(movie.players)
    .filter((label) => label && !/พร้อมรับชม/u.test(label));

  if (movie.hasDubThai || rawLabels.some((label) => /พากย์ไทย/u.test(label))) badges.push("TH");

  const sourceLanguage = movie.languageCode?.toLocaleUpperCase("en-US") || "";
  if (sourceLanguage && sourceLanguage !== "TH") {
    badges.push(sourceLanguage === "JA" ? "JP" : sourceLanguage);
  }

  if (movie.hasSubThai || rawLabels.some((label) => /ซับไทย|บรรยายไทย/u.test(label))) badges.push("SUB");
  if (movie.hasBackup || rawLabels.some((label) => /สำรอง/u.test(label))) badges.push("สำรอง");

  return [...new Set(badges)].slice(0, 4);
}

export default function CatalogDetailModal({
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
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(true);
  const [shareDone, setShareDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const modalRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const dragRef = useRef<DragState>({
    pointerId: -1,
    startY: 0,
    lastY: 0,
    lastAt: 0,
    currentY: 0,
    velocity: 0,
  });
  const trailerEmbed = useMemo(() => youtubeEmbedUrl(trailerUrl), [trailerUrl]);
  const badges = formatBadges(movie);
  const durationValue = movie.contentType === "series"
    ? `${movie.episodeCount.toLocaleString("th-TH")} ตอน`
    : runtimeLabel(movie.runtime) || "ไม่ระบุ";

  const setSheetPosition = useCallback((y: number) => {
    const clampedY = Math.max(0, y);
    modalRef.current?.style.setProperty("--sheet-drag-y", `${clampedY}px`);

    const fadeProgress = Math.min(clampedY / 420, 1);
    const backdropAlpha = Math.max(0.18, 0.78 - (fadeProgress * 0.56));
    backdropRef.current?.style.setProperty("--sheet-backdrop-alpha", backdropAlpha.toFixed(3));
  }, []);

  const clearMotionTimers = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
  }, []);

  const closeWithMotion = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setDragging(false);
    clearMotionTimers();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }

    const modal = modalRef.current;
    if (!modal) {
      onClose();
      return;
    }

    modal.style.animation = "none";
    modal.style.transition = `transform ${CLOSE_DURATION_MS}ms cubic-bezier(.32,.72,0,1)`;
    backdropRef.current?.style.setProperty("--sheet-backdrop-alpha", "0");

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setSheetPosition(Math.max(window.innerHeight, modal.offsetHeight + 120));
      });
    });

    closeTimerRef.current = window.setTimeout(onClose, CLOSE_DURATION_MS + 30);
  }, [clearMotionTimers, onClose, setSheetPosition]);

  const snapSheetBack = useCallback(() => {
    const modal = modalRef.current;
    setDragging(false);
    dragRef.current.pointerId = -1;

    if (!modal) return;
    modal.style.animation = "none";
    modal.style.transition = `transform ${SNAP_DURATION_MS}ms cubic-bezier(.2,.88,.24,1)`;
    setSheetPosition(0);
    backdropRef.current?.style.setProperty("--sheet-backdrop-alpha", "0.78");

    if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      modal.style.removeProperty("transition");
      snapTimerRef.current = null;
    }, SNAP_DURATION_MS + 20);
  }, [setSheetPosition]);

  const startSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (closingRef.current) return;
    if (!window.matchMedia("(max-width: 820px)").matches) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    clearMotionTimers();
    const now = performance.now();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastAt: now,
      currentY: 0,
      velocity: 0,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    const modal = modalRef.current;
    if (modal) {
      modal.style.animation = "none";
      modal.style.transition = "none";
    }
    setDragging(true);
  };

  const moveSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId || closingRef.current) return;

    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastAt);
    const deltaSinceLast = event.clientY - drag.lastY;
    drag.velocity = deltaSinceLast / elapsed;
    drag.lastY = event.clientY;
    drag.lastAt = now;
    drag.currentY = Math.max(0, event.clientY - drag.startY);
    setSheetPosition(drag.currentY);
  };

  const finishSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const modalHeight = modalRef.current?.offsetHeight || window.innerHeight;
    const distanceThreshold = Math.min(170, modalHeight * 0.22);
    const fastFlick = drag.currentY > 34 && drag.velocity > 0.62;
    const farEnough = drag.currentY >= distanceThreshold;

    drag.pointerId = -1;
    if (farEnough || fastFlick) closeWithMotion();
    else snapSheetBack();
  };

  const cancelSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.pointerId = -1;
    snapSheetBack();
  };

  useEffect(() => {
    closingRef.current = false;
    setClosing(false);
    setDragging(false);
    setSheetPosition(0);

    return clearMotionTimers;
  }, [clearMotionTimers, movie.id, setSheetPosition]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWithMotion();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeWithMotion]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTrailer() {
      setTrailerLoading(true);
      setTrailerUrl(null);

      try {
        const params = new URLSearchParams({
          select: "trailer_url",
          id: `eq.${movie.id}`,
          limit: "1",
        });
        const response = await fetch(`/api/public-catalog/real2free_public_trailers?${params.toString()}`, {
          signal: controller.signal,
          cache: "force-cache",
        });

        if (!response.ok) return;
        const rows = await response.json() as TrailerRow[];
        setTrailerUrl(rows[0]?.trailer_url || null);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setTrailerUrl(null);
      } finally {
        if (!controller.signal.aborted) setTrailerLoading(false);
      }
    }

    void loadTrailer();
    return () => controller.abort();
  }, [movie.id]);

  const shareMovie = async () => {
    const url = `${window.location.origin}/watch/${movie.id}`;
    const data = {
      title: movie.thaiTitle,
      text: `รับชม ${movie.thaiTitle} บน REAL2FREE`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        fallbackCopy(url);
      }
      setShareDone(true);
      window.setTimeout(() => setShareDone(false), 1800);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        try {
          if (navigator.clipboard) await navigator.clipboard.writeText(url);
          else fallbackCopy(url);
          setShareDone(true);
          window.setTimeout(() => setShareDone(false), 1800);
        } catch {
          setShareDone(false);
        }
      }
    }
  };

  const modalClassName = [
    styles.modal,
    dragging ? styles.modalDragging : "",
    closing ? styles.modalClosing : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={backdropRef} className={styles.backdrop} role="presentation" onMouseDown={closeWithMotion}>
      <section ref={modalRef} className={modalClassName} role="dialog" aria-modal="true" aria-label={`ข้อมูล ${movie.thaiTitle}`} onMouseDown={(event) => event.stopPropagation()}>
        <div
          className={styles.dragAffordance}
          onPointerDown={startSwipe}
          onPointerMove={moveSwipe}
          onPointerUp={finishSwipe}
          onPointerCancel={cancelSwipe}
          aria-hidden="true"
        >
          <span className={styles.dragGrip} />
          <ChevronDown />
        </div>

        <div className={styles.hero}>
          {movie.backdropUrl ? <img src={movie.backdropUrl} alt="" referrerPolicy="no-referrer" /> : null}
          <span className={styles.heroShade} />
          <button className={styles.close} type="button" onClick={closeWithMotion} aria-label="ปิด"><X /></button>

          <div className={styles.heroContent}>
            <h2>{movie.thaiTitle}</h2>
            {movie.title !== movie.thaiTitle ? <h3>{movie.title}</h3> : null}
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.summary}>
            <div className={styles.poster}>
              {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.thaiTitle} referrerPolicy="no-referrer" /> : <Film />}
            </div>

            <div className={styles.details}>
              <div className={styles.quickFacts}>
                <div className={styles.quickFact}>
                  <Star fill="currentColor" />
                  <span><strong>{movie.rating ? movie.rating.toFixed(1) : "-"}</strong><small>คะแนน</small></span>
                </div>
                <div className={styles.quickFact}>
                  <CalendarDays />
                  <span><strong>{releaseLabel(movie.releaseDate, movie.year)}</strong><small>วันที่ฉาย</small></span>
                </div>
                <div className={styles.quickFact}>
                  <Clock3 />
                  <span><strong>{durationValue}</strong><small>{movie.contentType === "series" ? "จำนวนตอน" : "ความยาว"}</small></span>
                </div>
              </div>

              {badges.length || movie.isOngoing ? (
                <div className={styles.formatRow}>
                  <Languages />
                  <div>
                    {badges.map((badge) => <span key={badge}>{badge}</span>)}
                    {movie.isOngoing ? <span className={styles.ongoing}>ยังไม่จบ</span> : null}
                  </div>
                </div>
              ) : null}

              <div className={styles.tags}>
                {movie.genres.slice(0, 4).map((genre) => <span key={genre}>{genre}</span>)}
              </div>

              <div className={styles.utilityActions}>
                <button className={favorite ? styles.favoriteActive : ""} type="button" onClick={onFavorite}>
                  <Heart fill={favorite ? "currentColor" : "none"} /><span>{favorite ? "บันทึกแล้ว" : "เพิ่มรายการโปรด"}</span>
                </button>
                <button className={shareDone ? styles.shareDone : ""} type="button" onClick={() => void shareMovie()}>
                  {shareDone ? <Check /> : <Share2 />}<span>{shareDone ? "คัดลอกแล้ว" : "แชร์"}</span>
                </button>
              </div>
            </div>
          </div>

          {!trailerLoading && trailerEmbed ? (
            <section className={styles.trailerSection}>
              <div className={styles.trailer}>
                <span className={styles.trailerLabel}><Youtube /> ตัวอย่าง</span>
                <iframe
                  src={trailerEmbed}
                  title={`ตัวอย่าง ${movie.thaiTitle}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </section>
          ) : null}

          <section className={styles.overview}>
            <span><Info /> เรื่องย่อ</span>
            <p>{movie.overview || "ยังไม่มีเรื่องย่อสำหรับเรื่องนี้"}</p>
          </section>

          <button className={styles.watchButton} type="button" onClick={onWatch}>
            <span><Play fill="currentColor" /></span>
            <span><strong>ไปหน้ารับชม</strong><small>ระบบจะเลือกตัวรับชมและสำรองให้อัตโนมัติ</small></span>
            <ChevronRight />
          </button>
        </div>
      </section>
    </div>
  );
}
