"use client";

import { LoaderCircle, Play, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackSource } from "@/lib/public-catalog";
import styles from "./WatchPlayer.module.css";

type PlaybackReferrerPolicy = "no-referrer" | "origin";
type PlaybackDelivery = "inline" | "new-tab";
type PlaybackSourceWithPolicy = PlaybackSource & {
  referrerPolicy?: PlaybackReferrerPolicy;
  delivery?: PlaybackDelivery;
};

const GETPLAY_PLAYER_TIMEOUT_MS = 15_000;
const GETPLAY_READY_STATUSES = new Set(["ready", "active", "playing", "completed"]);
const GETPLAY_FAILURE_STATUSES = new Set(["error", "failed", "forbidden", "denied"]);

function sourceReferrerPolicy(
  source: PlaybackSource,
  fallback: PlaybackReferrerPolicy,
): PlaybackReferrerPolicy {
  return (source as PlaybackSourceWithPolicy).referrerPolicy || fallback;
}

function isEmbedSource(source: PlaybackSource): boolean {
  if (!source.url) return source.kind === "embed";

  try {
    const pathname = new URL(source.url).pathname.toLowerCase();
    return source.kind === "embed" || /\/(?:embed|player)(?:\/|$)/u.test(pathname);
  } catch {
    return source.kind === "embed";
  }
}

function sourceDelivery(source: PlaybackSource): PlaybackDelivery {
  if (isGetplayEmbedSource(source)) return "inline";
  return (source as PlaybackSourceWithPolicy).delivery || "inline";
}

function isGetplayEmbedSource(source: PlaybackSource): boolean {
  if (!source.url) return false;

  try {
    const hostname = new URL(source.url).hostname.toLowerCase();
    return hostname === "getplay-cdn.com" || hostname.endsWith(".getplay-cdn.com");
  } catch {
    return false;
  }
}

function isGetplayOrigin(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "getplay-cdn.com" || hostname.endsWith(".getplay-cdn.com");
  } catch {
    return false;
  }
}

function HlsVideo({
  source,
  poster,
  onReady,
  onFatal,
}: {
  source: PlaybackSource;
  poster: string | null;
  onReady: () => void;
  onFatal: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source.url) return;

    let disposed = false;
    let fatalTriggered = false;
    let readyTriggered = false;
    let recoveryCount = 0;
    let referrerRetryUsed = false;
    let activeReferrerPolicy = sourceReferrerPolicy(source, "no-referrer");
    let instance: {
      destroy: () => void;
      startLoad?: () => void;
      stopLoad?: () => void;
      recoverMediaError?: () => void;
    } | null = null;

    video.setAttribute("referrerpolicy", activeReferrerPolicy);

    let readyTimer: number | null = null;

    const fatal = () => {
      if (disposed || fatalTriggered) return;
      fatalTriggered = true;
      if (readyTimer !== null) window.clearTimeout(readyTimer);
      onFatal();
    };

    const markReady = () => {
      if (disposed || readyTriggered) return;
      readyTriggered = true;
      if (readyTimer !== null) window.clearTimeout(readyTimer);
      onReady();
    };

    const handleCanPlay = () => {
      markReady();
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", fatal);
    readyTimer = window.setTimeout(() => {
      if (!readyTriggered) fatal();
    }, 20000);

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (disposed) return;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 36,
            manifestLoadingTimeOut: 15000,
            levelLoadingTimeOut: 15000,
            fragLoadingTimeOut: 20000,
            fetchSetup: (context, initParams) =>
              new Request(context.url, {
                ...initParams,
                cache: "no-store",
                referrerPolicy: activeReferrerPolicy,
              }),
          });

          instance = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (disposed) return;
            markReady();
            void video.play().catch(() => undefined);
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (disposed || !data.fatal) return;

            const statusCode = Number(data.response?.code || 0);
            if (
              data.type === Hls.ErrorTypes.NETWORK_ERROR
              && (statusCode === 401 || statusCode === 403)
              && !referrerRetryUsed
            ) {
              referrerRetryUsed = true;
              activeReferrerPolicy = activeReferrerPolicy === "no-referrer" ? "origin" : "no-referrer";
              video.setAttribute("referrerpolicy", activeReferrerPolicy);
              hls.stopLoad();
              hls.loadSource(source.url);
              return;
            }

            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoveryCount < 1) {
              recoveryCount += 1;
              hls.startLoad();
              return;
            }

            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveryCount < 2) {
              recoveryCount += 1;
              hls.recoverMediaError();
              return;
            }

            fatal();
          });

          hls.loadSource(source.url);
          hls.attachMedia(video);
          return;
        }

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = source.url;
          video.load();
          void video.play().catch(() => undefined);
          return;
        }

        fatal();
      })
      .catch(fatal);

    return () => {
      disposed = true;
      if (readyTimer !== null) window.clearTimeout(readyTimer);
      instance?.destroy();
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", fatal);
      video.removeAttribute("src");
      video.removeAttribute("referrerpolicy");
      video.load();
    };
  }, [onFatal, onReady, source]);

  return (
    <video
      ref={videoRef}
      className={styles.media}
      controls
      playsInline
      preload="auto"
      poster={poster || undefined}
    />
  );
}

function EmbedFrame({
  source,
  onReady,
  onFatal,
}: {
  source: PlaybackSource;
  onReady: () => void;
  onFatal: () => void;
}) {
  const [frameLoaded, setFrameLoaded] = useState(false);
  const loadedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const getplayReadyRef = useRef(false);
  const playerWatchdogRef = useRef<number | null>(null);
  const onFatalRef = useRef(onFatal);
  const isGetplayEmbed = isGetplayEmbedSource(source);
  const referrerPolicy = isGetplayEmbed
    ? "no-referrer"
    : sourceReferrerPolicy(source, "origin");

  useEffect(() => {
    onFatalRef.current = onFatal;
  }, [onFatal]);

  useEffect(() => {
    loadedRef.current = false;
    getplayReadyRef.current = false;
    setFrameLoaded(false);
    if (playerWatchdogRef.current !== null) {
      window.clearTimeout(playerWatchdogRef.current);
      playerWatchdogRef.current = null;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isGetplayEmbed || event.source !== iframeRef.current?.contentWindow) return;
      if (!isGetplayOrigin(event.origin)) return;

      const payload = event.data;
      if (!payload || typeof payload !== "object" || payload.type !== "video_stat") return;

      const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
      if (GETPLAY_READY_STATUSES.has(status)) {
        getplayReadyRef.current = true;
        if (playerWatchdogRef.current !== null) {
          window.clearTimeout(playerWatchdogRef.current);
          playerWatchdogRef.current = null;
        }
        return;
      }

      if (GETPLAY_FAILURE_STATUSES.has(status)) {
        onFatalRef.current();
      }
    };

    window.addEventListener("message", handleMessage);
    const timer = window.setTimeout(() => {
      if (!loadedRef.current) onFatalRef.current();
    }, GETPLAY_PLAYER_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
      if (playerWatchdogRef.current !== null) {
        window.clearTimeout(playerWatchdogRef.current);
        playerWatchdogRef.current = null;
      }
    };
  }, [isGetplayEmbed, source.id, source.url]);

  if (isGetplayEmbed) {
    return (
      <div className="player-shell">
        {!frameLoaded ? (
          <div className="player-shell-loading" aria-hidden="true">
            <div className="player-loading" />
          </div>
        ) : null}
        <iframe
          ref={iframeRef}
          src={source.url}
          title={source.label || "หน้ารับชม"}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          loading="eager"
          onLoad={() => {
            loadedRef.current = true;
            setFrameLoaded(true);
            onReady();
            if (playerWatchdogRef.current !== null) {
              window.clearTimeout(playerWatchdogRef.current);
            }
            playerWatchdogRef.current = window.setTimeout(() => {
              if (!getplayReadyRef.current) onFatalRef.current();
            }, GETPLAY_PLAYER_TIMEOUT_MS);
          }}
          onError={onFatal}
        />
      </div>
    );
  }

  return (
    <iframe
      className={styles.media}
      src={source.url}
      title={source.label || "หน้ารับชม"}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      sandbox="allow-scripts allow-same-origin allow-presentation"
      allowFullScreen
      referrerPolicy={referrerPolicy}
      onLoad={() => {
        loadedRef.current = true;
        onReady();
      }}
      onError={onFatal}
    />
  );
}

function ExternalPlaybackFallback({
  source,
  poster,
  title,
}: {
  source: PlaybackSource;
  poster: string | null;
  title: string;
}) {
  return (
    <a
      className={styles.posterState}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      aria-label={`รับชม ${title}`}
      style={{ textDecoration: "none" }}
    >
      {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" /> : null}
      <span className={styles.posterShade} />
      <span className={styles.startContent}>
        <span className={styles.startButton}><Play fill="currentColor" /></span>
        <strong>แตะเพื่อรับชม</strong>
        <small>รับชมต่อได้ทันที</small>
      </span>
    </a>
  );
}

function LoadingState({ poster, message }: { poster: string | null; message: string }) {
  return (
    <div className={styles.shell}>
      <div className={styles.loadingLayer}>
        {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" /> : null}
        <span />
        <div><LoaderCircle /><strong>{message}</strong></div>
      </div>
    </div>
  );
}

export default function WatchPlayer({
  source,
  poster,
  title,
  active,
  switching,
  exhausted,
  errorMessage,
  onStart,
  onFailed,
  onRetry,
  forceExternal = false,
}: {
  source: PlaybackSource | null;
  poster: string | null;
  title: string;
  active: boolean;
  switching: boolean;
  exhausted: boolean;
  errorMessage: string | null;
  onStart: () => void;
  onFailed: () => void;
  onRetry: () => void;
  forceExternal?: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [source?.id]);

  const handleReady = useCallback(() => setReady(true), []);
  const handleFailed = useCallback(() => onFailed(), [onFailed]);

  if (!active) {
    return (
      <button className={styles.posterState} type="button" onClick={onStart} aria-label={`เริ่มรับชม ${title}`}>
        {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" /> : null}
        <span className={styles.posterShade} />
        <span className={styles.startContent}>
          <span className={styles.startButton}><Play fill="currentColor" /></span>
          <strong>เริ่มรับชม</strong>
          <small>แตะเพื่อเริ่มเล่น</small>
        </span>
      </button>
    );
  }

  if (switching && !source) {
    return <LoadingState poster={poster} message="กำลังเตรียมการรับชม..." />;
  }

  if (forceExternal && source) {
    return <ExternalPlaybackFallback source={source} poster={poster} title={title} />;
  }

  if (exhausted || !source) {
    return (
      <div className={styles.failedState}>
        {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" /> : null}
        <span className={styles.failedShade} />
        <div className={styles.failedContent}>
          <RotateCcw />
          <strong>ยังเปิดเรื่องนี้ไม่ได้</strong>
          <p>{errorMessage || "ลองใหม่อีกครั้ง"}</p>
          <div className={styles.failedActions}>
            <button type="button" onClick={onRetry}><RefreshCw /> ลองใหม่</button>
          </div>
        </div>
      </div>
    );
  }

  if (sourceDelivery(source) === "new-tab") {
    return <ExternalPlaybackFallback source={source} poster={poster} title={title} />;
  }

  const getplayEmbed = isGetplayEmbedSource(source);
  const embedSource = getplayEmbed || isEmbedSource(source);

  return (
    <div className={styles.shell}>
      {embedSource ? (
        <EmbedFrame source={source} onReady={handleReady} onFatal={handleFailed} />
      ) : (
        <HlsVideo source={source} poster={poster} onReady={handleReady} onFatal={handleFailed} />
      )}

      {!getplayEmbed && (switching || !ready) ? (
        <div className={styles.loadingLayer}>
          {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" /> : null}
          <span />
          <div><LoaderCircle /><strong>{switching ? "กำลังเปลี่ยนตัวรับชม..." : "กำลังเตรียมการรับชม..."}</strong></div>
        </div>
      ) : null}
    </div>
  );
}
