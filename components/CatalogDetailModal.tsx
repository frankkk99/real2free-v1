"use client";

import {
  CalendarDays,
  Check,
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
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  playerAvailabilityLabels,
  runtimeLabel,
  type PublicCatalogItem,
} from "@/lib/public-catalog";
import styles from "./CatalogDetailModal.module.css";

type TrailerRow = {
  trailer_url: string | null;
};

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
  const trailerEmbed = useMemo(() => youtubeEmbedUrl(trailerUrl), [trailerUrl]);
  const previewImage = movie.backdropUrl || movie.posterUrl || "";
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.thaiTitle} ${movie.year || ""} trailer`)}`;
  const badges = formatBadges(movie);
  const durationValue = movie.contentType === "series"
    ? `${movie.episodeCount.toLocaleString("th-TH")} ตอน`
    : runtimeLabel(movie.runtime) || "ไม่ระบุ";

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

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

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label={`ข้อมูล ${movie.thaiTitle}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.hero}>
          {movie.backdropUrl ? <img src={movie.backdropUrl} alt="" referrerPolicy="no-referrer" /> : null}
          <span className={styles.heroShade} />
          <button className={styles.close} type="button" onClick={onClose} aria-label="ปิด"><X /></button>

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

          <section className={styles.trailerSection}>
            <div className={styles.trailer}>
              <span className={styles.trailerLabel}><Youtube /> ตัวอย่าง</span>
              {trailerLoading ? (
                <div className={styles.trailerLoading}><span /></div>
              ) : trailerEmbed ? (
                <iframe
                  src={trailerEmbed}
                  title={`ตัวอย่าง ${movie.thaiTitle}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div
                  className={styles.trailerEmpty}
                  style={{ "--preview-image": previewImage ? `url(${JSON.stringify(previewImage)})` : "none" } as CSSProperties}
                >
                  <Youtube />
                  <strong>ยังไม่มีตัวอย่างในข้อมูลเรื่องนี้</strong>
                  <small>เปิดค้นหาตัวอย่างจาก YouTube ได้ในแท็บใหม่</small>
                  <a href={youtubeSearchUrl} target="_blank" rel="noopener noreferrer">ค้นหาบน YouTube</a>
                </div>
              )}
            </div>
          </section>

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
