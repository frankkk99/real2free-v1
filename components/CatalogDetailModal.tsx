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
  ShieldCheck,
  Star,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  contentTypeLabel,
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
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
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
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(true);
  const [shareDone, setShareDone] = useState(false);
  const trailerEmbed = useMemo(() => youtubeEmbedUrl(trailerUrl), [trailerUrl]);
  const previewImage = movie.backdropUrl || movie.posterUrl || "";
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.thaiTitle} ${movie.year || ""} trailer`)}`;

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
            <span className={styles.eyebrow}><Play fill="currentColor" /> พร้อมรับชม</span>
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
              <div className={styles.stats}>
                <div className={styles.stat}><Star fill="currentColor" /><strong>{movie.rating ? movie.rating.toFixed(1) : "-"}</strong><small>คะแนน</small></div>
                <div className={styles.stat}><ShieldCheck /><strong>{movie.contentType === "series" ? movie.episodeCount : movie.players.length}</strong><small>{movie.contentType === "series" ? "ตอนที่มี" : "ตัวเลือกรับชม"}</small></div>
              </div>

              <div className={styles.facts}>
                <div className={styles.fact}><CalendarDays /><span><small>วันที่เข้าฉาย</small><strong>{releaseLabel(movie.releaseDate, movie.year)}</strong></span></div>
                <div className={styles.fact}><Clock3 /><span><small>{movie.contentType === "series" ? "จำนวนตอน" : "ความยาว"}</small><strong>{movie.contentType === "series" ? `${movie.episodeCount.toLocaleString("th-TH")} ตอน` : runtimeLabel(movie.runtime) || "ไม่ระบุ"}</strong></span></div>
                <div className={styles.fact}><Languages /><span><small>รูปแบบ</small><strong>{labels.join(" • ") || "พร้อมรับชม"}</strong></span></div>
              </div>

              <div className={styles.tags}>
                <span>{contentTypeLabel(movie.contentType)}</span>
                {movie.genres.slice(0, 5).map((genre) => <span key={genre}>{genre}</span>)}
                {labels.map((label) => <span key={label} className={styles.language}>{label}</span>)}
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
            <div className={styles.sectionHeading}>
              <span><Youtube /> ตัวอย่าง</span>
              <small>YouTube</small>
            </div>
            <div className={styles.trailer}>
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
            <p>{movie.overview || "เรื่องนี้พร้อมให้คุณรับชมแล้ว"}</p>
          </section>

          <button className={styles.watchButton} type="button" onClick={onWatch}>
            <span><Play fill="currentColor" /></span>
            <span><strong>ไปหน้ารับชม</strong><small>กดเล่นครั้งเดียว ระบบจะเลือกตัวรับชมและสำรองให้อัตโนมัติ</small></span>
            <ChevronRight />
          </button>
        </div>
      </section>
    </div>
  );
}
