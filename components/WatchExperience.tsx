"use client";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Film,
  Heart,
  Info,
  Layers3,
  Play,
  RotateCcw,
  ShieldCheck,
  Share2,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { catalogPath } from "@/lib/catalog-url";
import {
  addStoredId,
  FAVORITES_KEY,
  HISTORY_KEY,
  LAST_EPISODES_KEY,
  readStoredIdList,
  readStoredStringMap,
  toggleStoredId,
  writeStoredStringMap,
} from "@/lib/client-storage";
import {
  contentTypeLabel,
  runtimeLabel,
  type PlaybackSource,
  type PublicCatalogItem,
  type PublicEpisode,
} from "@/lib/public-catalog";
import AdSlot from "./AdSlot";
import PlayerChoicePanel from "./PlayerChoicePanel";
import SeriesEpisodeBrowser from "./SeriesEpisodeBrowser";
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
  if (!value) return year ? String(year) : "ไม่ระบุ";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return year ? String(year) : "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

type PlaybackPayload = {
  source: PlaybackSource | null;
  index: number;
  total: number;
  hasNext: boolean;
  error?: string;
};

type ExternalFallbackCandidate = {
  source: PlaybackSource;
  index: number;
};

function isGetplaySource(source: PlaybackSource | null): boolean {
  if (!source?.url) return false;

  try {
    const hostname = new URL(source.url).hostname.toLowerCase();
    return hostname === "getplay-cdn.com" || hostname.endsWith(".getplay-cdn.com");
  } catch {
    return false;
  }
}

export default function WatchExperience({
  item,
  episodes,
}: {
  item: PublicCatalogItem;
  episodes: PublicEpisode[];
}) {
  const infoPath = catalogPath(item);
  const playableEpisodes = useMemo(
    () => episodes.filter((episode) => episode.playerCount > 0),
    [episodes],
  );
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(playableEpisodes[0]?.id || null);
  const [source, setSource] = useState<PlaybackSource | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [totalSources, setTotalSources] = useState(playableEpisodes[0]?.playerCount || item.playerCount);
  const [hasNextSource, setHasNextSource] = useState((playableEpisodes[0]?.playerCount || item.playerCount) > 1);
  const [playRequested, setPlayRequested] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [allExhausted, setAllExhausted] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [forceExternalFallback, setForceExternalFallback] = useState(false);
  const [playerSession, setPlayerSession] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const requestRef = useRef(0);
  const playerStageRef = useRef<HTMLElement | null>(null);
  const externalFallbackCandidateRef = useRef<ExternalFallbackCandidate | null>(null);

  const activeEpisode = useMemo(
    () => playableEpisodes.find((episode) => episode.id === activeEpisodeId) || playableEpisodes[0] || null,
    [activeEpisodeId, playableEpisodes],
  );

  useEffect(() => {
    if (!playableEpisodes.length) return;
    const requestedEpisodeId = new URLSearchParams(window.location.search).get("episode");
    const requestedEpisode = playableEpisodes.find((episode) => episode.id === requestedEpisodeId);
    const savedEpisodeId = readStoredStringMap(LAST_EPISODES_KEY)[item.id];
    const savedEpisode = playableEpisodes.find((episode) => episode.id === savedEpisodeId);
    const selectedEpisodeId = requestedEpisode?.id || savedEpisode?.id || playableEpisodes[0].id;
    setActiveEpisodeId(selectedEpisodeId);
    if (selectedEpisodeId) {
      const lastEpisodes = readStoredStringMap(LAST_EPISODES_KEY);
      lastEpisodes[item.id] = selectedEpisodeId;
      writeStoredStringMap(LAST_EPISODES_KEY, lastEpisodes);
    }
  }, [item.id, playableEpisodes]);

  useEffect(() => {
    const count = activeEpisode?.playerCount || item.playerCount;
    requestRef.current += 1;
    setSource(null);
    setSourceIndex(0);
    setTotalSources(count);
    setHasNextSource(count > 1);
    setPlayRequested(false);
    setSwitching(false);
    setAllExhausted(false);
    setRequestError(null);
    setForceExternalFallback(false);
    externalFallbackCandidateRef.current = null;
    setPlayerSession((current) => current + 1);
  }, [activeEpisode?.id, activeEpisode?.playerCount, item.id, item.playerCount]);

  useEffect(() => {
    setFavorite(readStoredIdList(FAVORITES_KEY).includes(item.id));
    addStoredId(HISTORY_KEY, item.id);
  }, [item.id]);

  useEffect(() => {
    const syncSharedLists = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY) setFavorite(readStoredIdList(FAVORITES_KEY).includes(item.id));
    };

    window.addEventListener("storage", syncSharedLists);
    return () => window.removeEventListener("storage", syncSharedLists);
  }, [item.id]);

  const requestSource = useCallback(async (startIndex: number) => {
    const requestId = ++requestRef.current;
    setSource(null);
    setSwitching(true);
    setAllExhausted(false);
    setRequestError(null);
    setForceExternalFallback(false);
    if (startIndex === 0) externalFallbackCandidateRef.current = null;
    setPlayerSession((current) => current + 1);

    const showExternalFallback = () => {
      const candidate = externalFallbackCandidateRef.current;
      if (!candidate) return false;

      setSource(candidate.source);
      setSourceIndex(candidate.index);
      setForceExternalFallback(true);
      setAllExhausted(true);
      setHasNextSource(false);
      setRequestError("ตัวรับชมแบบฝังเปิดไม่ได้");
      return true;
    };

    try {
      if (startIndex === 0) {
        const challengeResponse = await fetch("/api/playback/challenge", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          referrer: `/watch/${item.id}`,
          referrerPolicy: "same-origin",
          headers: {
            "content-type": "application/json",
            "x-real2free-challenge": "1",
          },
          body: JSON.stringify({
            titleId: item.id,
            episodeId: activeEpisode?.id || null,
          }),
        });
        if (!challengeResponse.ok) {
          if (challengeResponse.status === 429) throw new Error("มีการขอตัวรับชมถี่เกินไป กรุณารอสักครู่");
          throw new Error("ไม่สามารถเริ่ม session รับชมได้");
        }
      }

      let requestedIndex = startIndex;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await fetch("/api/playback/session", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          referrer: `/watch/${item.id}`,
          referrerPolicy: "same-origin",
          headers: {
            "content-type": "application/json",
            "x-real2free-playback": "1",
          },
          body: JSON.stringify({
            titleId: item.id,
            episodeId: activeEpisode?.id || null,
            index: requestedIndex,
          }),
        });
        const payload = await response.json() as PlaybackPayload;
        if (requestId !== requestRef.current) return;

        if (!response.ok) {
          if (response.status === 429) throw new Error("มีการขอตัวรับชมถี่เกินไป กรุณารอประมาณ 1 นาที");
          if (response.status === 401) throw new Error("Session รับชมหมดอายุ กรุณากดลองใหม่");
          throw new Error("ไม่สามารถขอตัวรับชมได้");
        }

        setTotalSources(payload.total || 0);
        if (!payload.source && payload.hasNext) {
          requestedIndex = payload.index + 1;
          continue;
        }

        if (!payload.source) {
          if (showExternalFallback()) return;
          setHasNextSource(false);
          setAllExhausted(true);
          setRequestError("ไม่พบตัวรับชมที่ผ่านการตรวจสอบ");
          return;
        }

        setSource(payload.source);
        setForceExternalFallback(false);
        setSourceIndex(payload.index);
        setTotalSources(payload.total);
        setHasNextSource(payload.hasNext);
        setAllExhausted(false);
        return;
      }

      if (showExternalFallback()) return;
      setHasNextSource(false);
      setAllExhausted(true);
      setRequestError("ตัวรับชมหลายรายการไม่ผ่านการตรวจสอบความปลอดภัย");
    } catch (error) {
      if (requestId !== requestRef.current) return;
      setSource(null);
      setHasNextSource(false);
      setAllExhausted(true);
      setRequestError(error instanceof Error ? error.message : "ระบบตัวรับชมไม่พร้อมใช้งาน");
    } finally {
      if (requestId === requestRef.current) setSwitching(false);
    }
  }, [activeEpisode?.id, item.id]);

  const startPlayback = useCallback(() => {
    setPlayRequested(true);
    void requestSource(0);
  }, [requestSource]);

  const handleSourceFailed = useCallback(() => {
    if (switching) return;

    const currentGetplayCandidate = source && isGetplaySource(source)
      ? { source, index: sourceIndex }
      : null;
    const getplayCandidate = currentGetplayCandidate || externalFallbackCandidateRef.current;

    // Step 1 is the inline iframe. Keep a failed getplay URL for the final
    // external fallback while the normal source sequence continues.
    if (currentGetplayCandidate) externalFallbackCandidateRef.current = currentGetplayCandidate;

    // Step 2 is the next source returned by the existing Session/Ticket flow.
    if (sourceIndex + 1 < totalSources) {
      void requestSource(sourceIndex + 1);
      return;
    }

    // Step 3 is opening the original getplay URL externally. This is useful
    // when the mobile browser blocks the embedded player but allows the page.
    if (getplayCandidate) {
      setSource(getplayCandidate.source);
      setSourceIndex(getplayCandidate.index);
      setForceExternalFallback(true);
      setAllExhausted(true);
      setHasNextSource(false);
      setRequestError("ตัวรับชมแบบฝังเปิดไม่ได้");
      return;
    }

    setSource(null);
    setHasNextSource(false);
    setAllExhausted(true);
    setRequestError("ตัวรับชมทั้งหมดไม่ตอบสนองในขณะนี้");
  }, [requestSource, source, sourceIndex, switching, totalSources]);

  const retryAllSources = useCallback(() => {
    setPlayRequested(true);
    void requestSource(0);
  }, [requestSource]);

  const chooseNextSource = useCallback(() => {
    if (!hasNextSource || switching) return;
    void requestSource(sourceIndex + 1);
  }, [hasNextSource, requestSource, sourceIndex, switching]);

  const selectEpisode = (episode: PublicEpisode) => {
    setActiveEpisodeId(episode.id);
    const lastEpisodes = readStoredStringMap(LAST_EPISODES_KEY);
    lastEpisodes[item.id] = episode.id;
    writeStoredStringMap(LAST_EPISODES_KEY, lastEpisodes);
    const url = new URL(window.location.href);
    url.searchParams.set("episode", episode.id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    window.requestAnimationFrame(() => playerStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const toggleFavorite = () => {
    const next = toggleStoredId(FAVORITES_KEY, item.id);
    setFavorite(next.includes(item.id));
  };

  const shareMovie = useCallback(async () => {
    const url = `${window.location.origin}${infoPath}`;
    const shareTitle = item.thaiTitle;
    const shareText = "ข้อมูล" + contentTypeLabel(item.contentType) + "เรื่องนี้บน REAL2FREE";

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("copy_failed");
      }

      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setShareCopied(false);
    }
  }, [infoPath, item.contentType, item.thaiTitle]);

  const seasonCount = useMemo(
    () => new Set(playableEpisodes.map((episode) => episode.seasonNumber)).size,
    [playableEpisodes],
  );

  const meta = useMemo(() => {
    const values = [
      contentTypeLabel(item.contentType),
      item.year ? String(item.year) : "",
      item.contentType === "series"
        ? playableEpisodes.length ? `${playableEpisodes.length.toLocaleString("th-TH")} ตอน` : ""
        : runtimeLabel(item.runtime),
      item.contentType === "series" && seasonCount > 1 ? `${seasonCount} ซีซัน` : "",
      item.hasDubThai ? "พากย์ไทย" : "",
      item.hasSubThai ? "ซับไทย" : "",
      item.hasBackup ? "มีสำรอง" : "",
    ];
    return values.filter(Boolean);
  }, [item, playableEpisodes.length, seasonCount]);

  if (item.contentType === "series" && !playableEpisodes.length) {
    return (
      <main className={styles.statePage}>
        <RotateCcw />
        <h1>ยังเปิดหน้ารับชมไม่ได้</h1>
        <p>ยังไม่มีตอนที่พร้อมรับชม</p>
        <Link href={infoPath}><ArrowLeft /> กลับหน้าข้อมูล</Link>
      </main>
    );
  }

  if (item.contentType === "movie" && item.playerCount < 1) {
    return (
      <main className={styles.statePage}>
        <RotateCcw />
        <h1>ยังเปิดหน้ารับชมไม่ได้</h1>
        <p>เรื่องนี้ยังไม่มีตัวรับชมที่พร้อมใช้งาน</p>
        <Link href={infoPath}><ArrowLeft /> กลับหน้าข้อมูล</Link>
      </main>
    );
  }

  const playerPoster = activeEpisode?.stillUrl || item.backdropUrl;
  const playerTitle = activeEpisode ? `${item.thaiTitle} ตอน ${activeEpisode.episodeNumber}` : item.thaiTitle;
  const detailRuntime = activeEpisode?.runtime || item.runtime;

  return (
    <main className={styles.page}>
      <div className={styles.backdrop}>
        {item.backdropUrl ? <img src={item.backdropUrl} alt="" referrerPolicy="no-referrer" /> : null}
        <span />
      </div>

      <header className={styles.header}>
        <Link className={styles.backButton} href={infoPath}><ArrowLeft /><span>หน้าข้อมูล</span></Link>
        <Link href="/" className={styles.brandLink}><Brand /></Link>
        <button className={`${styles.favoriteButton} ${favorite ? styles.favoriteActive : ""}`} type="button" onClick={toggleFavorite}>
          <Heart fill={favorite ? "currentColor" : "none"} />
          <span>{favorite ? "บันทึกแล้ว" : "รายการโปรด"}</span>
        </button>
      </header>

      <div className={styles.content}>
        <section className={styles.titleBlock}>
          <div className={styles.titleTopline}>
            <div className={styles.eyebrow}><Play fill="currentColor" /> หน้ารับชม</div>
            <button
              className={[styles.shareButton, shareCopied ? styles.shareButtonCopied : ""].filter(Boolean).join(" ")}
              type="button"
              onClick={shareMovie}
              aria-label={shareCopied ? "คัดลอกลิงก์แล้ว" : "แชร์เรื่องนี้"}
            >
              <Share2 />
              <span>{shareCopied ? "คัดลอกแล้ว" : "แชร์"}</span>
            </button>
          </div>
          <h1>{item.thaiTitle}</h1>
          {item.title !== item.thaiTitle ? <h2>{item.title}</h2> : null}
          <div className={styles.titleMeta}>{meta.map((entry) => <span key={entry}>{entry}</span>)}</div>
          {activeEpisode ? (
            <div className={styles.titleMeta}>
              <span>ซีซัน {activeEpisode.seasonNumber}</span>
              <span>ตอน {activeEpisode.episodeNumber}</span>
              <span>{activeEpisode.title}</span>
            </div>
          ) : null}
        </section>

        <AdSlot
          code="AD-06"
          name="แบนเนอร์หน้ารับชม"
          placement="ใต้ชื่อเรื่อง เหนือ Player"
          desktopSize="970×90 px"
          mobileSize="320×100 px"
        />

        <section ref={playerStageRef} className={styles.playerStage}>
          <WatchPlayer
            key={`${activeEpisode?.id || "movie"}-${source?.id || "none"}-${playerSession}`}
            source={source}
            poster={playerPoster}
            title={playerTitle}
            active={playRequested}
            switching={switching}
            exhausted={allExhausted}
            errorMessage={requestError}
            forceExternal={forceExternalFallback}
            onStart={startPlayback}
            onFailed={handleSourceFailed}
            onRetry={retryAllSources}
          />

          <div className={styles.playbackNote}>
            <span className={styles.playbackIcon}><ShieldCheck /></span>
            <div>
              <strong>{!playRequested
                ? "ยังไม่เรียก Player"
                : switching
                  ? "กำลังขอตัวรับชมอย่างปลอดภัย"
                  : allExhausted
                    ? forceExternalFallback
                      ? "กำลังเปิดตัวรับชมภายนอก"
                      : "ยังเปิดตัวรับชมไม่ได้"
                    : source
                      ? `กำลังใช้ ${source.label || "ตัวรับชม"}`
                      : "กำลังเตรียมการรับชม"}</strong>
              <small>{!playRequested
                ? "URL ของ Player จะถูกขอหลังจากคุณกดเริ่มรับชมเท่านั้น"
                : "Session จะหมุนใหม่ทุกครั้งและไล่ตัวสำรองให้อัตโนมัติ"}</small>
            </div>
            <span className={styles.sourceCount}>{source ? sourceIndex + 1 : 0}/{totalSources}</span>
          </div>
        </section>

        {item.contentType === "series" ? (
          <SeriesEpisodeBrowser episodes={playableEpisodes} activeEpisodeId={activeEpisode?.id || null} onSelect={selectEpisode} />
        ) : null}

        <AdSlot
          code="AD-07"
          name="แบนเนอร์คั่น Player"
          placement="ระหว่าง Player และรายละเอียดเรื่อง"
          desktopSize="728×90 px"
          mobileSize="320×100 px"
          variant="compact"
        />

        <section className={styles.lowerGrid}>
          <article className={styles.infoCard}>
            <div className={styles.posterWrap}>
              {item.posterUrl ? <img src={item.posterUrl} alt={item.thaiTitle} referrerPolicy="no-referrer" /> : <Film />}
            </div>

            <div className={styles.infoBody}>
              <div className={styles.infoHeading}>
                <div>
                  <span><Info /> รายละเอียดเรื่อง</span>
                  <h2>{activeEpisode ? `${item.thaiTitle} ตอน ${activeEpisode.episodeNumber}` : item.thaiTitle}</h2>
                </div>
                <div className={styles.rating}><Star fill="currentColor" /><strong>{item.rating ? item.rating.toFixed(1) : "-"}</strong></div>
              </div>

              <p>{activeEpisode?.overview || item.overview || "เรื่องนี้พร้อมให้คุณรับชมแล้ว"}</p>

              <div className={styles.detailFacts}>
                <div><CalendarDays /><span><small>{activeEpisode ? "วันที่ออกอากาศ" : "วันที่เข้าฉาย"}</small><strong>{activeEpisode?.airDate ? releaseLabel(activeEpisode.airDate, item.year) : releaseLabel(item.releaseDate, item.year)}</strong></span></div>
                <div><Clock3 /><span><small>ความยาว</small><strong>{runtimeLabel(detailRuntime) || "ไม่ระบุ"}</strong></span></div>
                <div><Layers3 /><span><small>ประเภท</small><strong>{activeEpisode ? `ซีซัน ${activeEpisode.seasonNumber} • ตอน ${activeEpisode.episodeNumber}` : contentTypeLabel(item.contentType)}</strong></span></div>
              </div>

              <div className={styles.genres}>{item.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
            </div>
          </article>

          <PlayerChoicePanel
            source={source}
            sourceIndex={sourceIndex}
            totalSources={totalSources}
            started={playRequested}
            switching={switching}
            hasNextSource={hasNextSource}
            episodeNumber={activeEpisode?.episodeNumber}
            onNextSource={chooseNextSource}
            onRetry={retryAllSources}
          />
        </section>

        <AdSlot
          code="AD-08"
          name="แบนเนอร์ท้ายหน้ารับชม"
          placement="ท้ายรายละเอียดเรื่อง"
          desktopSize="970×90 px"
          mobileSize="320×100 px"
        />
      </div>
    </main>
  );
}
