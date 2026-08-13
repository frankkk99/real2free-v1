"use client";

import { Bookmark, Film, Play, Star } from "lucide-react";
import { contentTypeLabel, type PublicCatalogItem } from "@/lib/public-catalog";
import styles from "./CatalogPosterCard.module.css";

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
  const recent = isRecentlyAdded(movie);
  const languages = cardLanguageBadges(movie);
  const hasDistinctEnglishTitle = Boolean(movie.title.trim())
    && normalizedTitle(movie.title) !== normalizedTitle(movie.thaiTitle);

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

          <span className={styles.posterTopBadges}>
            <span className={styles.badgeCluster}>
              {rank ? <span className={styles.rankBadge}>{rank}</span> : null}
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
        <button className={styles.cardTitle} type="button" onClick={onOpen}>{movie.thaiTitle}</button>
        {hasDistinctEnglishTitle ? <button className={`${styles.cardTitle} ${styles.cardTitleEnglish}`} type="button" onClick={onOpen}>{movie.title}</button> : null}
      </div>
      <div className={styles.cardMeta}>
        <span>{movie.year || contentTypeLabel(movie.contentType)}</span>
        <span><Star fill="currentColor" /> {movie.rating ? movie.rating.toFixed(1) : "-"}</span>
      </div>
    </article>
  );
}
