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

function sourceReferrerPolicy(
  source: PlaybackSource,
  fallback: PlaybackReferrerPolicy,
): PlaybackReferrerPolicy {
  return (source as PlaybackSourceWithPolicy).referrerPolicy || fallback;
}

function sourceDelivery(source: PlaybackSource): PlaybackDelivery {
  return (source as PlaybackSourceWithPolicy).delivery || "inline";
}

function isGetplayEmbedSource(source: PlaybackSource): boolean {
  if (source.kind !== "embed" || !source.url) return false;

  try {
    const hostname = new URL(source.url).hostname.toLowerCase();
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

    const fatal = () => {
      if (disposed || fatalTriggered) return;
      fatalTriggered = true;
      onFatal();
    };

    const handleCanPlay = () => {
      if (!disposed) onReady();
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", fatal);

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
            onReady();
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
      preload="none"
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
  const loadedRef = useRef(false);
  const referrerPolicy = isGetplayEmbedSource(source)
    ? "no-referrer"
    : sourceReferrerPolicy(source, "origin");

  useEffect(() => {
    loadedRef.current = false;
    const timer = window.setTimeout(() => {
      if (!loadedRef.current) onFatal();
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [onFatal, source.id]);

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

  return (
    <div className={styles.shell}>
      {source.kind === "hls" ? (
        <HlsVideo source={source} poster={poster} onReady={handleReady} onFatal={handleFailed} />
      ) : (
        <EmbedFrame source={source} onReady={handleReady} onFatal={handleFailed} />
      )}

      {switching || !ready ? (
        <div className={styles.loadingLayer}>
          {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" /> : null}
          <span />
          <div><LoaderCircle /><strong>{switching ? "กำลังเปลี่ยนตัวรับชม..." : "กำลังเตรียมการรับชม..."}</strong></div>
        </div>
      ) : null}
    </div>
  );
}
