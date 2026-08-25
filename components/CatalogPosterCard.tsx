"use client";

import { Bookmark, Film, Play, Star } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { contentTypeLabel, type PublicCatalogItem } from "@/lib/public-catalog";
import styles from "./CatalogPosterCard.module.css";

const SHARED_POSTER_GHOST_ID = "catalog-shared-poster-ghost";

function isRecentlyAdded(item: PublicCatalogItem) {
  const updated = new Date(item.updatedAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated <= 30 * 24 * 60 * 60 * 1000;
}

function cardLanguageBadges(movie: PublicCatalogItem) {
  const badges: string[] = [];
  if (movie.hasDubThai) badges.push("TH");
  if (movie.languageCode && movie.languageCode !== "TH") badges.push(movie.languageCode);
  if (movie.hasSubThai) badges.push("SUB");
  return [...new Set(badges)].slice(0, 3);
}

function normalizedTitle(value: string) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase("th-TH");
}

function findSharedPosterTarget(movieId: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-shared-poster-id]"))
    .find((element) => element.dataset.sharedPosterId === movieId) || null;
}

export default function CatalogPosterCard({
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
  const cardRef = useRef<HTMLElement | null>(null);
  const posterMediaRef = useRef<HTMLSpanElement | null>(null);
  const tiltFrameRef = useRef<number | null>(null);
  const recent = isRecentlyAdded(movie);
  const languages = cardLanguageBadges(movie);
  const hasDistinctEnglishTitle = Boolean(movie.title.trim())
    && normalizedTitle(movie.title) !== normalizedTitle(movie.thaiTitle);

  useEffect(() => {
    const card = cardRef.current;
    const grid = card?.parentElement;
    const sectionHeading = grid?.previousElementSibling;
    if (!grid || !sectionHeading?.querySelector("strong")) return;
    if (grid.dataset.spatialCarousel === "true") return;

    grid.dataset.spatialCarousel = "true";
    grid.classList.add(styles.spatialCarousel);

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (grid.scrollWidth <= grid.clientWidth + 4) return;

      const atStart = grid.scrollLeft <= 1;
      const atEnd = Math.ceil(grid.scrollLeft + grid.clientWidth) >= grid.scrollWidth - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return;

      event.preventDefault();
      grid.scrollLeft += event.deltaY * 0.82;
    };

    grid.addEventListener("wheel", handleWheel, { passive: false });
  }, []);

  const resetTilt = () => {
    if (tiltFrameRef.current !== null) {
      window.cancelAnimationFrame(tiltFrameRef.current);
      tiltFrameRef.current = null;
    }

    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--glow-x", "50%");
    card.style.setProperty("--glow-y", "45%");
  };

  const updateTilt = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "mouse") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const rotateY = (x - 0.5) * 9;
    const rotateX = (0.5 - y) * 7;

    if (tiltFrameRef.current !== null) window.cancelAnimationFrame(tiltFrameRef.current);
    tiltFrameRef.current = window.requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      card.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
      card.style.setProperty("--glow-x", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--glow-y", `${(y * 100).toFixed(1)}%`);
      tiltFrameRef.current = null;
    });
  };

  const openWithSharedTransition = () => {
    const source = posterMediaRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!source || reducedMotion) {
      onOpen();
      return;
    }

    const sourceRect = source.getBoundingClientRect();
    if (sourceRect.width < 2 || sourceRect.height < 2) {
      onOpen();
      return;
    }

    document.getElementById(SHARED_POSTER_GHOST_ID)?.remove();

    const ghost = document.createElement("div");
    ghost.id = SHARED_POSTER_GHOST_ID;
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
      position: "fixed",
      zIndex: "2147483000",
      top: `${sourceRect.top}px`,
      left: `${sourceRect.left}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,.16)",
      borderRadius: getComputedStyle(source).borderRadius || "14px",
      background: "var(--surface-raised)",
      boxShadow: "0 28px 70px rgba(0,0,0,.42)",
      pointerEvents: "none",
      transformOrigin: "top left",
      willChange: "transform, opacity, border-radius",
    });

    const sourceImage = source.querySelector("img");
    if (sourceImage instanceof HTMLImageElement) {
      const image = sourceImage.cloneNode(true) as HTMLImageElement;
      image.removeAttribute("loading");
      image.removeAttribute("sizes");
      Object.assign(image.style, {
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: "none",
        filter: "none",
      });
      ghost.appendChild(image);
    } else {
      ghost.textContent = movie.thaiTitle;
      Object.assign(ghost.style, {
        display: "grid",
        placeItems: "center",
        padding: "18px",
        color: "var(--text)",
        fontSize: "12px",
        fontWeight: "700",
        textAlign: "center",
      });
    }

    document.body.appendChild(ghost);
    onOpen();

    const startedAt = performance.now();
    const resolveTarget = () => {
      const target = findSharedPosterTarget(movie.id);
      if (!target) {
        if (performance.now() - startedAt < 1800) {
          window.requestAnimationFrame(resolveTarget);
          return;
        }

        const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 160,
          easing: "ease-out",
          fill: "forwards",
        });
        void fade.finished.catch(() => undefined).finally(() => ghost.remove());
        return;
      }

      const targetRect = target.getBoundingClientRect();
      if (targetRect.width < 2 || targetRect.height < 2) {
        window.requestAnimationFrame(resolveTarget);
        return;
      }

      target.style.opacity = "0";
      const targetRadius = getComputedStyle(target).borderRadius || "16px";
      const translateX = targetRect.left - sourceRect.left;
      const translateY = targetRect.top - sourceRect.top;
      const scaleX = targetRect.width / sourceRect.width;
      const scaleY = targetRect.height / sourceRect.height;

      const animation = ghost.animate([
        {
          transform: "translate3d(0,0,0) scale(1,1)",
          borderRadius: getComputedStyle(source).borderRadius || "14px",
          opacity: 1,
        },
        {
          transform: `translate3d(${translateX}px,${translateY}px,0) scale(${scaleX},${scaleY})`,
          borderRadius: targetRadius,
          opacity: 1,
        },
      ], {
        duration: 430,
        easing: "cubic-bezier(.2,.82,.24,1)",
        fill: "forwards",
      });

      void animation.finished
        .catch(() => undefined)
        .finally(() => {
          if (target.isConnected) target.style.removeProperty("opacity");
          ghost.remove();
        });
    };

    window.requestAnimationFrame(() => window.requestAnimationFrame(resolveTarget));
  };

  return (
    <article ref={cardRef} className={`${styles.card} ${rank ? styles.rankedCard : ""}`}>
      {rank ? <span className={styles.rankBackdrop} aria-hidden="true">{rank}</span> : null}

      <button
        className={styles.posterButton}
        type="button"
        onPointerDown={onPrefetch}
        onPointerMove={updateTilt}
        onPointerLeave={resetTilt}
        onPointerCancel={resetTilt}
        onBlur={resetTilt}
        onClick={openWithSharedTransition}
        aria-label={`ดูข้อมูล ${movie.thaiTitle}`}
      >
        <span ref={posterMediaRef} className={styles.poster}>
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={movie.thaiTitle}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 560px) 31vw, (max-width: 900px) 22vw, 13vw"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className={styles.posterFallback}><Film /><strong>{movie.thaiTitle}</strong></span>
          )}
          <span className={styles.posterShade} />

          <span className={styles.posterTopBadges}>
            <span className={styles.badgeCluster}>
              {recent ? <span className={styles.newBadge}>ใหม่</span> : null}
            </span>
            {movie.contentType === "series" ? (
              <span className={`${styles.badgeCluster} ${styles.badgeClusterRight}`}>
                {movie.episodeCount ? <span className={styles.episodeBadge}>EP {movie.episodeCount.toLocaleString("th-TH")}</span> : null}
                {movie.isOngoing ? <span className={styles.ongoingBadge}>ยังไม่จบ</span> : null}
              </span>
            ) : null}
          </span>

          <span className={styles.posterBottomBadges}>
            <span className={styles.badgeCluster}>
              {languages.map((language) => <span key={language} className={styles.languageBadge}>{language}</span>)}
            </span>
            {movie.hasBackup ? <span className={styles.backupBadge}>สำรอง</span> : null}
          </span>

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
        aria-label={favorite ? "นำออกจากรายการโปรด" : "บันทึกในรายการโปรด"}
        style={favorite ? {
          color: "var(--primary-bright)",
          background: "color-mix(in srgb, var(--primary-soft) 88%, rgba(2, 9, 19, .68))",
          borderColor: "color-mix(in srgb, var(--primary) 48%, rgba(255, 255, 255, .18))",
        } : undefined}
      >
        <Bookmark fill={favorite ? "currentColor" : "none"} />
      </button>

      <div className={styles.cardTitles}>
        <button className={styles.cardTitle} type="button" onClick={openWithSharedTransition}>{movie.thaiTitle}</button>
        {hasDistinctEnglishTitle ? <button className={`${styles.cardTitle} ${styles.cardTitleEnglish}`} type="button" onClick={openWithSharedTransition}>{movie.title}</button> : null}
      </div>
      <div className={styles.cardMeta}>
        <span>{movie.year || contentTypeLabel(movie.contentType)}</span>
        <span><Star fill="currentColor" /> {movie.rating ? movie.rating.toFixed(1) : "-"}</span>
      </div>
    </article>
  );
}
