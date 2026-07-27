"use client";

import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Film,
  Heart,
  Info,
  Languages,
  Play,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useEffect } from "react";
import {
  contentTypeLabel,
  playerAvailabilityLabels,
  runtimeLabel,
  type PublicCatalogItem,
} from "@/lib/public-catalog";
import styles from "./MovieHomeV2.module.css";

function releaseLabel(value: string | null, year: number | null) {
  if (!value) return year ? String(year) : "ไม่ระบุ";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return year ? String(year) : "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
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
  const labels = playerAvailabilityLabels(movie.players);
  const meta = [
    contentTypeLabel(movie.contentType),
    movie.year ? String(movie.year) : "",
    movie.contentType === "series" && movie.episodeCount ? `${movie.episodeCount.toLocaleString("th-TH")} ตอน` : runtimeLabel(movie.runtime),
  ].filter(Boolean);

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
              <div className={styles.modalReady}><ShieldCheck /><strong>{movie.contentType === "series" ? movie.episodeCount : movie.players.length}</strong><span>{movie.contentType === "series" ? "ตอนที่มี" : "ตัวเลือกรับชม"}</span></div>
            </div>

            <section className={styles.modalOverview}>
              <span><Info /> เรื่องย่อ</span>
              <p>{movie.overview || "เรื่องนี้พร้อมให้คุณรับชมแล้ว"}</p>
            </section>

            <div className={styles.modalFacts}>
              <div><CalendarDays /><span><small>วันที่เข้าฉาย</small><strong>{releaseLabel(movie.releaseDate, movie.year)}</strong></span></div>
              <div><Clock3 /><span><small>{movie.contentType === "series" ? "จำนวนตอน" : "ความยาว"}</small><strong>{movie.contentType === "series" ? `${movie.episodeCount.toLocaleString("th-TH")} ตอน` : runtimeLabel(movie.runtime) || "ไม่ระบุ"}</strong></span></div>
              <div><Languages /><span><small>รูปแบบ</small><strong>{labels.join(" • ") || "พร้อมรับชม"}</strong></span></div>
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
