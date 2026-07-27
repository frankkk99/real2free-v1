"use client";

import { Check, ChevronLeft, ChevronRight, Layers3, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { runtimeLabel, type PublicEpisode } from "@/lib/public-catalog";
import styles from "./SeriesEpisodeBrowser.module.css";

export default function SeriesEpisodeBrowser({
  episodes,
  activeEpisodeId,
  onSelect,
}: {
  episodes: PublicEpisode[];
  activeEpisodeId: string | null;
  onSelect: (episode: PublicEpisode) => void;
}) {
  const seasons = useMemo(
    () => [...new Set(episodes.map((episode) => episode.seasonNumber))].sort((a, b) => a - b),
    [episodes],
  );
  const activeEpisode = episodes.find((episode) => episode.id === activeEpisodeId) || episodes[0] || null;
  const [season, setSeason] = useState(activeEpisode?.seasonNumber || seasons[0] || 1);

  useEffect(() => {
    if (activeEpisode) setSeason(activeEpisode.seasonNumber);
  }, [activeEpisode?.id, activeEpisode?.seasonNumber]);

  const seasonEpisodes = useMemo(
    () => episodes.filter((episode) => episode.seasonNumber === season),
    [episodes, season],
  );
  const activeIndex = activeEpisode ? episodes.findIndex((episode) => episode.id === activeEpisode.id) : -1;
  const previous = activeIndex > 0 ? episodes[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < episodes.length - 1 ? episodes[activeIndex + 1] : null;

  if (!episodes.length) return null;

  return (
    <section className={styles.card} aria-label="รายการตอนทั้งหมด">
      <div className={styles.heading}>
        <div>
          <span><Layers3 /> ตอนทั้งหมด</span>
          <h2>{episodes.length.toLocaleString("th-TH")} ตอน</h2>
        </div>
        <div className={styles.stepActions}>
          <button type="button" disabled={!previous} onClick={() => previous && onSelect(previous)}>
            <ChevronLeft /> ตอนก่อนหน้า
          </button>
          <button type="button" disabled={!next} onClick={() => next && onSelect(next)}>
            ตอนถัดไป <ChevronRight />
          </button>
        </div>
      </div>

      {seasons.length > 1 ? (
        <div className={styles.seasons} aria-label="เลือกซีซัน">
          {seasons.map((seasonNumber) => {
            const count = episodes.filter((episode) => episode.seasonNumber === seasonNumber).length;
            return (
              <button
                key={seasonNumber}
                className={season === seasonNumber ? styles.seasonActive : ""}
                type="button"
                onClick={() => setSeason(seasonNumber)}
              >
                ซีซัน {seasonNumber}<small>{count} ตอน</small>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={styles.episodeGrid}>
        {seasonEpisodes.map((episode) => {
          const active = episode.id === activeEpisode?.id;
          const plainTitle = episode.title.trim().toLowerCase();
          const genericTitle = plainTitle === `ep ${episode.episodeNumber}` || plainTitle === `ep${episode.episodeNumber}` || plainTitle === `ตอนที่ ${episode.episodeNumber}`;
          return (
            <button
              key={episode.id}
              className={active ? styles.episodeActive : ""}
              type="button"
              onClick={() => onSelect(episode)}
              aria-current={active ? "true" : undefined}
            >
              <span className={styles.number}>{active ? <Check /> : <Play />}</span>
              <span className={styles.text}>
                <strong>ตอน {episode.episodeNumber}</strong>
                <small>{genericTitle ? runtimeLabel(episode.runtime) || "พร้อมรับชม" : episode.title}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
