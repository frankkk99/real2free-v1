"use client";

import { ExternalLink, LoaderCircle, Play, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerKind } from "@/lib/public-catalog";
import styles from "./WatchPlayer.module.css";

export type WatchSource = {
  key: string;
  playerId: string;
  playerIndex: number;
  label: string;
  url: string;
  kind: PlayerKind;
  externalUrl: string | null;
};

function HlsVideo({
  url,
  poster,
  onReady,
  onFatal,
}: {
  url: string;
  poster: string | null;
  onReady: () => void;
  onFatal: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let disposed = false;
    let fatalTriggered = false;
    let recoveryCount = 0;
    let instance: {
      destroy: () => void;
      startLoad?: () => void;
      recoverMediaError?: () => void;
    } | null = null;

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
                referrerPolicy: "no-referrer",
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

          hls.loadSource(url);
          hls.attachMedia(video);
          return;
        }

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
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
      video.load();
    };
  }, [onFatal, onReady, url]);

  return (
    <video
      ref={videoRef}
      className={styles.media}
      controls
      playsInline
      preload="metadata"
      crossOrigin="anonymous"
      poster={poster || undefined}
      referrerPolicy="no-referrer"
    />
  );
}

function EmbedFrame({
  source,
  onReady,
  onFatal,
}: {
  source: WatchSource;
  onReady: () => void;
  onFatal: () => void;
}) {
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    const timer = window.setTimeout(() => {
      if (!loadedRef.current) onFatal();
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [onFatal, source.key]);

  return (
    <iframe
      className={styles.media}
      src={source.url}
      title={source.label || "หน้ารับชม"}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="no-referrer"
      onLoad={() => {
        loadedRef.current = true;
        onReady();
      }}
      onError={onFatal}
    />
  );
}

export default function WatchPlayer({
  source,
  poster,
  title,
  active,
  switching,
  exhausted,
  onStart,
  onFailed,
  onRetry,
}: {
  source: WatchSource | null;
  poster: string | null;
  title: string;
  active: boolean;
  switching: boolean;
  exhausted: boolean;
  onStart: () => void;
  onFailed: () => void;
  onRetry: () => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [source?.key]);

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
          <small>กดครั้งเดียว ระบบจะเลือกตัวรับชมให้ต่อเนื่อง</small>
        </span>
      </button>
    );
  }

  if (exhausted || !source) {
    return (
      <div className={styles.failedState}>
        {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" /> : null}
        <span className={styles.failedShade} />
        <div className={styles.failedContent}>
          <RotateCcw />
          <strong>ยังเปิดเรื่องนี้ไม่ได้</strong>
          <p>ตัวรับชมของเรื่องนี้ยังไม่ตอบสนองในขณะนี้</p>
          <div className={styles.failedActions}>
            <button type="button" onClick={onRetry}><RefreshCw /> ลองใหม่ทั้งหมด</button>
            {source?.externalUrl ? (
              <a href={source.externalUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
                <ExternalLink /> เปิดแยกหน้าต่าง
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {source.kind === "hls" ? (
        <HlsVideo key={source.key} url={source.url} poster={poster} onReady={handleReady} onFatal={handleFailed} />
      ) : (
        <EmbedFrame key={source.key} source={source} onReady={handleReady} onFatal={handleFailed} />
      )}

      {switching || !ready ? (
        <div className={styles.loadingLayer}>
          {poster ? <img src={poster} alt="" referrerPolicy="no-referrer" /> : null}
          <span />
          <div><LoaderCircle /><strong>{switching ? "กำลังสลับตัวรับชม..." : "กำลังเตรียมการรับชม..."}</strong></div>
        </div>
      ) : null}
    </div>
  );
}
