"use client";

import { Film, Heart, Play, Star } from "lucide-react";
import { contentTypeLabel, playerAvailabilityLabels, type PublicCatalogItem } from "@/lib/public-catalog";
import styles from "./MovieHomeV2.module.css";

function isRecentlyAdded(item: PublicCatalogItem) {
  const updated = new Date(item.updatedAt).getTime();
  return Number.isFinite(updated) && Date.now() - updated <= 30 * 24 * 60 * 60 * 1000;
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
  const availability = movie.contentType === "series" && movie.episodeCount
    ? `${movie.episodeCount.toLocaleString("th-TH")} ตอน`
    : playerAvailabilityLabels(movie.players).slice(0, 2).join(" • ");

  return (
    <article className={styles.card} onPointerEnter={onPrefetch}>
      <button className={styles.posterButton} type="button" onClick={onOpen} aria-label={`ดูข้อมูล ${movie.thaiTitle}`}>
        <span className={styles.poster}>
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
          {rank ? <span className={styles.rank}>{rank}</span> : null}
          {isRecentlyAdded(movie) ? <span className={styles.newBadge}>ใหม่</span> : null}
          {availability ? <span className={styles.audioBadge}>{availability}</span> : null}
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
