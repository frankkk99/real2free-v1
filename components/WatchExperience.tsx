"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Film,
  Heart,
  LoaderCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  contentTypeLabel,
  FAVORITES_KEY,
  HISTORY_KEY,
  mapPublicCatalogRow,
  PUBLIC_CATALOG_FIELDS,
  runtimeLabel,
  type PublicCatalogItem,
  type PublicCatalogRow,
} from "@/lib/public-catalog";
import WatchPlayer from "./WatchPlayer";
import styles from "./WatchExperience.module.css";

function Brand() {
  return (
    <span className={styles.brand} aria-label="REAL2FREE">
      <span className={styles.brandMark}><i /><i /></span>
      <strong>REAL<span>2</span>FREE</strong>
    </span>
  );
}

function releaseLabel(value: string | null, year: number | null) {
  if (!value) return year ? String(year) : "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return year ? String(year) : "";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function WatchExperience({ id }: { id: string }) {
  const [movie, setMovie] = useState<PublicCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [failedPlayerIndexes, setFailedPlayerIndexes] = useState<Set<number>>(new Set());
  const [allExhausted, setAllExhausted] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function load() {
      setLoading(true);
      setFailed(false);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("real2free_public_titles")
        .select(PUBLIC_CATALOG_FIELDS)
        .eq("id", id)
        .maybeSingle();

      if (disposed) return;
      if (error || !data) {
        setFailed(true);
        setLoading(false);
        return;
      }

      const mapped = mapPublicCatalogRow(data as unknown as PublicCatalogRow);
      if (!mapped) {
        setFailed(true);
        setLoading(false);
        return;
      }

      setMovie(mapped);
      setLoading(false);

      try {
        const favorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as string[];
        setFavorite(favorites.includes(mapped.id));
        const history = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]") as string[];
        const nextHistory = [mapped.id, ...history.filter((entry) => entry !== mapped.id)].slice(0, 100);
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      } catch {
        window.localStorage.removeItem(FAVORITES_KEY);
        window.localStorage.removeItem(HISTORY_KEY);
      }
    }

    void load();
    return () => { disposed = true; };
  }, [id]);

  const activePlayer = movie?.players[Math.min(activePlayerIndex, Math.max(movie.players.length - 1, 0))] || null;
  const meta = useMemo(() => {
    if (!movie) return [];
    return [
      contentTypeLabel(movie.contentType),
      movie.year ? String(movie.year) : "",
      runtimeLabel(movie.runtime),
      movie.players.length > 1 ? `${movie.players.length} ตัวเลือกรับชม` : "พร้อมรับชม",
    ].filter(Boolean);
  }, [movie]);

  const selectPlayer = (index: number) => {
    setActivePlayerIndex(index);
    setAllExhausted(false);
    setFailedPlayerIndexes(new Set());
  };

  const handlePlayerExhausted = () => {
    if (!movie) return;
    const updated = new Set(failedPlayerIndexes);
    updated.add(activePlayerIndex);
    setFailedPlayerIndexes(updated);

    const nextIndex = movie.players.findIndex((_player, index) => !updated.has(index));
    if (nextIndex >= 0) {
      setActivePlayerIndex(nextIndex);
      return;
    }
    setAllExhausted(true);
  };

  const toggleFavorite = () => {
    if (!movie) return;
    setFavorite((current) => {
      const nextValue = !current;
      try {
        const stored = new Set(JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as string[]);
        nextValue ? stored.add(movie.id) : stored.delete(movie.id);
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...stored]));
      } catch {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextValue ? [movie.id] : []));
      }
      return nextValue;
    });
  };

  if (loading) {
    return (
      <main className={styles.statePage}>
        <LoaderCircle className={styles.spinner} />
        <strong>กำลังเตรียมหน้ารับชม...</strong>
      </main>
    );
  }

  if (failed || !movie || !activePlayer) {
    return (
      <main className={styles.statePage}>
        <RotateCcw />
        <h1>ยังเปิดหน้ารับชมไม่ได้</h1>
        <p>ลองกลับไปเลือกเรื่องนี้อีกครั้ง</p>
        <Link href="/"><ArrowLeft /> กลับหน้าแรก</Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.backdrop}>
        {movie.backdropUrl ? <img src={movie.backdropUrl} alt="" referrerPolicy="no-referrer" /> : null}
        <span />
      </div>

      <header className={styles.header}>
        <Link className={styles.backButton} href="/"><ArrowLeft /> กลับ</Link>
        <Link href="/" className={styles.brandLink}><Brand /></Link>
        <button className={`${styles.favoriteButton} ${favorite ? styles.favoriteActive : ""}`} type="button" onClick={toggleFavorite}>
          <Heart fill={favorite ? "currentColor" : "none"} />
          <span>{favorite ? "บันทึกแล้ว" : "รายการโปรด"}</span>
        </button>
      </header>

      <div className={styles.layout}>
        <section className={styles.playerColumn}>
          <div className={styles.playerTopline}>
            <div>
              <span className={styles.nowWatching}><Play fill="currentColor" /> หน้ารับชม</span>
              <h1>{movie.thaiTitle}</h1>
            </div>
            <span className={styles.readyBadge}><ShieldCheck /> พร้อมรับชม</span>
          </div>

          <WatchPlayer
            key={`${activePlayer.id}-${activePlayerIndex}`}
            player={activePlayer}
            poster={movie.backdropUrl}
            exhausted={allExhausted}
            onExhausted={handlePlayerExhausted}
          />

          <div className={styles.playerControls}>
            <div className={styles.playerChoiceHeading}>
              <div><span>เลือกตัวรับชม</span><small>ระบบจะสลับตัวสำรองให้เมื่อจำเป็น</small></div>
              <span>{activePlayerIndex + 1}/{movie.players.length}</span>
            </div>
            <div className={styles.playerChoices}>
              {movie.players.map((player, index) => (
                <button
                  key={player.id}
                  className={index === activePlayerIndex ? styles.playerChoiceActive : ""}
                  type="button"
                  onClick={() => selectPlayer(index)}
                >
                  <span>{index === activePlayerIndex ? <Check /> : <Play />}</span>
                  <div><strong>{player.label || `ตัวเลือก ${index + 1}`}</strong><small>{index === activePlayerIndex ? "กำลังใช้งาน" : "แตะเพื่อสลับ"}</small></div>
                  <ChevronRight />
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className={styles.detailCard}>
          <div className={styles.posterWrap}>
            {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.thaiTitle} referrerPolicy="no-referrer" /> : <Film />}
            <span />
          </div>
          <div className={styles.detailBody}>
            <div className={styles.typeLine}>{meta.map((entry) => <span key={entry}>{entry}</span>)}</div>
            <h2>{movie.thaiTitle}</h2>
            {movie.title !== movie.thaiTitle ? <h3>{movie.title}</h3> : null}
            <div className={styles.ratingLine}><Star fill="currentColor" /> <strong>{movie.rating ? movie.rating.toFixed(1) : "-"}</strong><span>{releaseLabel(movie.releaseDate, movie.year)}</span></div>
            <p>{movie.overview || "เรื่องนี้พร้อมให้คุณรับชมแล้ว"}</p>
            <div className={styles.genres}>{movie.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
