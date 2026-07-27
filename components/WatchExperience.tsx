"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Film,
  Heart,
  Info,
  Layers3,
  Play,
  RotateCcw,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  contentTypeLabel,
  FAVORITES_KEY,
  HISTORY_KEY,
  mapPublicCatalogRow,
  mapPublicEpisodeRow,
  PUBLIC_CATALOG_FIELDS,
  PUBLIC_EPISODE_FIELDS,
  runtimeLabel,
  type PublicCatalogItem,
  type PublicCatalogRow,
  type PublicEpisode,
  type PublicEpisodeRow,
  type PublicPlayer,
} from "@/lib/public-catalog";
import SeriesEpisodeBrowser from "./SeriesEpisodeBrowser";
import WatchPlayer, { type WatchSource } from "./WatchPlayer";
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
  if (!value) return year ? String(year) : "ไม่ระบุ";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return year ? String(year) : "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function isMeePlayerBlockedEmbed(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const isMeePlayer = url.hostname === "meeplayer.com" || url.hostname.endsWith(".meeplayer.com");
    return isMeePlayer && url.pathname.startsWith("/play/");
  } catch {
    return false;
  }
}

function isWebUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function buildSources(players: PublicPlayer[]): WatchSource[] {
  const seen = new Set<string>();
  const result: WatchSource[] = [];

  players.forEach((player, playerIndex) => {
    const externalUrl = [player.fallbackUrl, player.url].find((value) => isWebUrl(value)) || null;
    const choices = [
      { url: player.url, kind: player.kind },
      { url: player.fallbackUrl, kind: player.fallbackKind },
    ];

    choices.forEach((choice, choiceIndex) => {
      if (!choice.url || !choice.kind || seen.has(choice.url)) return;
      if (choice.kind === "embed" && isMeePlayerBlockedEmbed(choice.url)) return;

      seen.add(choice.url);
      result.push({
        key: `${player.id}-${choiceIndex}-${choice.kind}`,
        playerId: player.id,
        playerIndex,
        label: player.label || `ตัวเลือก ${playerIndex + 1}`,
        url: choice.url,
        kind: choice.kind,
        externalUrl,
      });
    });
  });

  return result;
}

export default function WatchExperience({ id }: { id: string }) {
  const [movie, setMovie] = useState<PublicCatalogItem | null>(null);
  const [episodes, setEpisodes] = useState<PublicEpisode[]>([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [playRequested, setPlayRequested] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [allExhausted, setAllExhausted] = useState(false);
  const [playerSession, setPlayerSession] = useState(0);
  const [favorite, setFavorite] = useState(false);

  const failedKeysRef = useRef<Set<string>>(new Set());
  const retryCycleRef = useRef(0);
  const transitionRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
  const playerStageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let disposed = false;

    async function load() {
      setLoading(true);
      setFailed(false);
      setEpisodes([]);
      setActiveEpisodeId(null);

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

      let mappedEpisodes: PublicEpisode[] = [];
      if (mapped.contentType === "series") {
        const { data: episodeData, error: episodeError } = await supabase
          .from("real2free_public_episodes")
          .select(PUBLIC_EPISODE_FIELDS)
          .eq("series_id", mapped.id)
          .order("season_number", { ascending: true })
          .order("episode_number", { ascending: true });

        if (disposed) return;
        if (episodeError) {
          setFailed(true);
          setLoading(false);
          return;
        }

        mappedEpisodes = ((episodeData || []) as unknown as PublicEpisodeRow[])
          .map(mapPublicEpisodeRow)
          .filter((episode): episode is PublicEpisode => Boolean(episode));

        if (!mappedEpisodes.length) {
          setFailed(true);
          setLoading(false);
          return;
        }
      }

      setMovie(mapped);
      setEpisodes(mappedEpisodes);

      if (mappedEpisodes.length) {
        const requestedEpisodeId = new URLSearchParams(window.location.search).get("episode");
        const initialEpisode = mappedEpisodes.find((episode) => episode.id === requestedEpisodeId) || mappedEpisodes[0];
        setActiveEpisodeId(initialEpisode.id);
      }

      setLoading(false);
      setActiveSourceIndex(0);
      setPlayRequested(false);
      setAllExhausted(false);
      failedKeysRef.current = new Set();
      retryCycleRef.current = 0;

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
    return () => {
      disposed = true;
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    };
  }, [id]);

  const activeEpisode = useMemo(
    () => episodes.find((episode) => episode.id === activeEpisodeId) || episodes[0] || null,
    [activeEpisodeId, episodes],
  );

  const currentPlayers = useMemo(() => {
    if (!movie) return [];
    return movie.contentType === "series" ? activeEpisode?.players || [] : movie.players;
  }, [activeEpisode?.players, movie]);

  const sources = useMemo(() => buildSources(currentPlayers), [currentPlayers]);
  const activeSource = sources[Math.min(activeSourceIndex, Math.max(sources.length - 1, 0))] || null;
  const activePlayerIndex = activeSource?.playerIndex ?? 0;
  const seasonCount = useMemo(() => new Set(episodes.map((episode) => episode.seasonNumber)).size, [episodes]);

  const meta = useMemo(() => {
    if (!movie) return [];
    if (movie.contentType === "series") {
      return [
        contentTypeLabel(movie.contentType),
        movie.year ? String(movie.year) : "",
        episodes.length ? `${episodes.length.toLocaleString("th-TH")} ตอน` : "",
        seasonCount > 1 ? `${seasonCount} ซีซัน` : "",
      ].filter(Boolean);
    }

    return [
      contentTypeLabel(movie.contentType),
      movie.year ? String(movie.year) : "",
      runtimeLabel(movie.runtime),
      movie.players.length > 1 ? `${movie.players.length} ตัวเลือกรับชม` : "พร้อมรับชม",
    ].filter(Boolean);
  }, [episodes.length, movie, seasonCount]);

  useEffect(() => {
    if (!activeEpisodeId) return;
    failedKeysRef.current = new Set();
    retryCycleRef.current = 0;
    transitionRef.current = false;
    setActiveSourceIndex(0);
    setAllExhausted(false);
    setSwitching(false);
    setPlayerSession((current) => current + 1);
  }, [activeEpisodeId]);

  const startPlayback = useCallback(() => {
    failedKeysRef.current = new Set();
    retryCycleRef.current = 0;
    setActiveSourceIndex(0);
    setAllExhausted(false);
    setSwitching(false);
    setPlayRequested(true);
    setPlayerSession((current) => current + 1);
  }, []);

  const handleSourceFailed = useCallback(() => {
    if (!activeSource || transitionRef.current) return;

    transitionRef.current = true;
    setSwitching(true);

    transitionTimerRef.current = window.setTimeout(() => {
      const failedKeys = new Set(failedKeysRef.current);
      failedKeys.add(activeSource.key);
      failedKeysRef.current = failedKeys;

      const nextIndex = sources.findIndex((candidate, index) => index > activeSourceIndex && !failedKeys.has(candidate.key));

      if (nextIndex >= 0) {
        setActiveSourceIndex(nextIndex);
        setPlayerSession((current) => current + 1);
        setSwitching(false);
        transitionRef.current = false;
        return;
      }

      if (retryCycleRef.current < 1 && sources.length) {
        retryCycleRef.current += 1;
        failedKeysRef.current = new Set();
        setActiveSourceIndex(0);
        setPlayerSession((current) => current + 1);
        setSwitching(false);
        transitionRef.current = false;
        return;
      }

      setAllExhausted(true);
      setSwitching(false);
      transitionRef.current = false;
    }, 260);
  }, [activeSource, activeSourceIndex, sources]);

  const retryAllSources = useCallback(() => {
    failedKeysRef.current = new Set();
    retryCycleRef.current = 0;
    transitionRef.current = false;
    setActiveSourceIndex(0);
    setAllExhausted(false);
    setSwitching(false);
    setPlayRequested(true);
    setPlayerSession((current) => current + 1);
  }, []);

  const selectPlayer = (playerIndex: number) => {
    const sourceIndex = sources.findIndex((source) => source.playerIndex === playerIndex);
    if (sourceIndex < 0) return;

    failedKeysRef.current = new Set();
    retryCycleRef.current = 0;
    setActiveSourceIndex(sourceIndex);
    setAllExhausted(false);
    setSwitching(false);
    setPlayerSession((current) => current + 1);
  };

  const selectEpisode = (episode: PublicEpisode) => {
    setActiveEpisodeId(episode.id);
    const url = new URL(window.location.href);
    url.searchParams.set("episode", episode.id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    window.requestAnimationFrame(() => playerStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
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
        <div className={styles.stateSkeleton}>
          <span />
          <div><i /><i /><i /></div>
        </div>
      </main>
    );
  }

  if (failed || !movie || !sources.length || (movie.contentType === "series" && !episodes.length)) {
    return (
      <main className={styles.statePage}>
        <RotateCcw />
        <h1>ยังเปิดหน้ารับชมไม่ได้</h1>
        <p>ลองกลับไปเลือกเรื่องนี้อีกครั้ง</p>
        <Link href="/"><ArrowLeft /> กลับหน้าแรก</Link>
      </main>
    );
  }

  const playerPoster = activeEpisode?.stillUrl || movie.backdropUrl;
  const playerTitle = activeEpisode ? `${movie.thaiTitle} ตอน ${activeEpisode.episodeNumber}` : movie.thaiTitle;
  const detailRuntime = activeEpisode?.runtime || movie.runtime;

  return (
    <main className={styles.page}>
      <div className={styles.backdrop}>
        {movie.backdropUrl ? <img src={movie.backdropUrl} alt="" referrerPolicy="no-referrer" /> : null}
        <span />
      </div>

      <header className={styles.header}>
        <Link className={styles.backButton} href="/"><ArrowLeft /><span>กลับหน้าแรก</span></Link>
        <Link href="/" className={styles.brandLink}><Brand /></Link>
        <button className={`${styles.favoriteButton} ${favorite ? styles.favoriteActive : ""}`} type="button" onClick={toggleFavorite}>
          <Heart fill={favorite ? "currentColor" : "none"} />
          <span>{favorite ? "บันทึกแล้ว" : "รายการโปรด"}</span>
        </button>
      </header>

      <div className={styles.content}>
        <section className={styles.titleBlock}>
          <div className={styles.eyebrow}><Play fill="currentColor" /> หน้ารับชม</div>
          <h1>{movie.thaiTitle}</h1>
          {movie.title !== movie.thaiTitle ? <h2>{movie.title}</h2> : null}
          <div className={styles.titleMeta}>{meta.map((entry) => <span key={entry}>{entry}</span>)}</div>
          {activeEpisode ? (
            <div className={styles.titleMeta}>
              <span>ซีซัน {activeEpisode.seasonNumber}</span>
              <span>ตอน {activeEpisode.episodeNumber}</span>
              <span>{activeEpisode.title}</span>
            </div>
          ) : null}
        </section>

        <section ref={playerStageRef} className={styles.playerStage}>
          <WatchPlayer
            key={`${activeEpisode?.id || "movie"}-${activeSource?.key || "none"}-${playerSession}`}
            source={activeSource}
            poster={playerPoster}
            title={playerTitle}
            active={playRequested}
            switching={switching}
            exhausted={allExhausted}
            onStart={startPlayback}
            onFailed={handleSourceFailed}
            onRetry={retryAllSources}
          />

          <div className={styles.playbackNote}>
            <span className={styles.playbackIcon}><ShieldCheck /></span>
            <div>
              <strong>{!playRequested ? "พร้อมเมื่อคุณกดเล่น" : switching ? "กำลังเลือกตัวรับชมที่เหมาะสม" : allExhausted ? "รอการลองใหม่" : "ระบบดูแลการสลับให้อัตโนมัติ"}</strong>
              <small>{activeEpisode ? `กำลังเลือกตอน ${activeEpisode.episodeNumber} หากตัวหนึ่งเปิดไม่ได้จะไปตัวถัดไปทันที` : "เมื่อแหล่งรับชมหนึ่งเปิดไม่ได้ ระบบจะไปตัวถัดไปทันที"}</small>
            </div>
            <span className={styles.sourceCount}>{activePlayerIndex + 1}/{currentPlayers.length}</span>
          </div>
        </section>

        {movie.contentType === "series" ? (
          <SeriesEpisodeBrowser episodes={episodes} activeEpisodeId={activeEpisode?.id || null} onSelect={selectEpisode} />
        ) : null}

        <section className={styles.lowerGrid}>
          <article className={styles.infoCard}>
            <div className={styles.posterWrap}>
              {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.thaiTitle} referrerPolicy="no-referrer" /> : <Film />}
            </div>

            <div className={styles.infoBody}>
              <div className={styles.infoHeading}>
                <div>
                  <span><Info /> รายละเอียดเรื่อง</span>
                  <h2>{activeEpisode ? `${movie.thaiTitle} ตอน ${activeEpisode.episodeNumber}` : movie.thaiTitle}</h2>
                </div>
                <div className={styles.rating}><Star fill="currentColor" /><strong>{movie.rating ? movie.rating.toFixed(1) : "-"}</strong></div>
              </div>

              <p>{activeEpisode?.overview || movie.overview || "เรื่องนี้พร้อมให้คุณรับชมแล้ว"}</p>

              <div className={styles.detailFacts}>
                <div><CalendarDays /><span><small>{activeEpisode ? "วันที่ออกอากาศ" : "วันที่เข้าฉาย"}</small><strong>{activeEpisode?.airDate ? releaseLabel(activeEpisode.airDate, movie.year) : releaseLabel(movie.releaseDate, movie.year)}</strong></span></div>
                <div><Clock3 /><span><small>ความยาว</small><strong>{runtimeLabel(detailRuntime) || "ไม่ระบุ"}</strong></span></div>
                <div><Layers3 /><span><small>ประเภท</small><strong>{activeEpisode ? `ซีซัน ${activeEpisode.seasonNumber} • ตอน ${activeEpisode.episodeNumber}` : contentTypeLabel(movie.contentType)}</strong></span></div>
              </div>

              <div className={styles.genres}>{movie.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
            </div>
          </article>

          <aside className={styles.choiceCard}>
            <div className={styles.choiceHeading}>
              <div>
                <span><CircleCheck /> ตัวเลือกรับชม</span>
                <h3>{activeEpisode ? `ตอน ${activeEpisode.episodeNumber} • เลือกภาษา หรือปล่อยให้ระบบเลือก` : "เลือกภาษา หรือปล่อยให้ระบบเลือก"}</h3>
              </div>
              <span>{currentPlayers.length} ตัวเลือก</span>
            </div>

            <div className={styles.playerChoices}>
              {currentPlayers.map((player, index) => {
                const available = sources.some((source) => source.playerIndex === index);
                const active = index === activePlayerIndex;
                return (
                  <button
                    key={player.id}
                    className={active ? styles.playerChoiceActive : ""}
                    type="button"
                    disabled={!available}
                    onClick={() => selectPlayer(index)}
                  >
                    <span className={styles.choiceIcon}>{active ? <Check /> : <Play />}</span>
                    <span className={styles.choiceText}>
                      <strong>{player.label || `ตัวเลือก ${index + 1}`}</strong>
                      <small>{active ? (playRequested ? "กำลังใช้งาน" : "พร้อมเริ่ม") : available ? "แตะเพื่อเลือก" : "ยังไม่พร้อม"}</small>
                    </span>
                    <ChevronRight />
                  </button>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
