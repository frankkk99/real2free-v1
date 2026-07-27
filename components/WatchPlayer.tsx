"use client";

import { ExternalLink, LoaderCircle, Play, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerKind, PublicPlayer } from "@/lib/public-catalog";
import styles from "./WatchPlayer.module.css";

type Source = {
  url: string;
  kind: PlayerKind;
  isFallback: boolean;
};

function isMeePlayerEmbed(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const isMeePlayer = url.hostname === "meeplayer.com" || url.hostname.endsWith(".meeplayer.com");
    return isMeePlayer && url.pathname.startsWith("/play/");
  } catch {
    return false;
  }
}

function initialSource(player: PublicPlayer): Source {
  if (
    player.kind === "embed"
    && isMeePlayerEmbed(player.url)
    && player.fallbackUrl
    && player.fallbackKind === "hls"
  ) {
    return { url: player.fallbackUrl, kind: "hls", isFallback: true };
  }
  return { url: player.url, kind: player.kind, isFallback: false };
}

function HlsVideo({ url, poster, onFatal }: { url: string; poster: string | null; onFatal: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let disposed = false;
    let fatalTriggered = false;
    let instance: { destroy: () => void } | null = null;
    const fatal = () => {
      if (disposed || fatalTriggered) return;
      fatalTriggered = true;
      onFatal();
    };

    video.addEventListener("error", fatal);

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (disposed) return;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            manifestLoadingTimeOut: 12000,
            levelLoadingTimeOut: 12000,
            fragLoadingTimeOut: 18000,
            fetchSetup: (context, initParams) => new Request(context.url, {
              ...initParams,
              cache: "no-store",
              referrerPolicy: "no-referrer",
            }),
          });
          instance = hls;
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) fatal();
          });
          hls.loadSource(url);
          hls.attachMedia(video);
          return;
        }

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          video.load();
          return;
        }

        fatal();
      })
      .catch(fatal);

    return () => {
      disposed = true;
      instance?.destroy();
      video.removeEventListener("error", fatal);
      video.removeAttribute("src");
      video.load();
    };
  }, [onFatal, url]);

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

export default function WatchPlayer({
  player,
  poster,
  exhausted,
  onExhausted,
  onRetry,
}: {
  player: PublicPlayer;
  poster: string | null;
  exhausted: boolean;
  onExhausted: () => void;
  onRetry: () => void;
}) {
  const [source, setSource] = useState<Source>(() => initialSource(player));
  const [switching, setSwitching] = useState(false);
  const [showEmbedHelp, setShowEmbedHelp] = useState(false);

  useEffect(() => {
    setSource(initialSource(player));
    setSwitching(false);
    setShowEmbedHelp(false);
  }, [player]);

  useEffect(() => {
    if (source.kind !== "embed") return;
    const timer = window.setTimeout(() => setShowEmbedHelp(true), 9000);
    return () => window.clearTimeout(timer);
  }, [source.kind, source.url]);

  const moveToFallback = useCallback(() => {
    if (!source.isFallback && player.fallbackUrl && player.fallbackKind) {
      if (player.fallbackKind === "embed" && isMeePlayerEmbed(player.fallbackUrl)) {
        onExhausted();
        return;
      }

      setSwitching(true);
      window.setTimeout(() => {
        setSource({
          url: player.fallbackUrl as string,
          kind: player.fallbackKind as PlayerKind,
          isFallback: true,
        });
        setSwitching(false);
        setShowEmbedHelp(false);
      }, 280);
      return;
    }
    onExhausted();
  }, [onExhausted, player.fallbackKind, player.fallbackUrl, source.isFallback]);

  if (exhausted) {
    const openUrl = player.fallbackUrl || player.url;
    return (
      <div className={styles.failedState}>
        <RotateCcw />
        <strong>ยังเปิดเรื่องนี้ไม่ได้</strong>
        <p>ตัวรับชมทั้งหมดของเรื่องนี้ยังไม่ตอบสนอง</p>
        <div className={styles.failedActions}>
          <button type="button" onClick={onRetry}><RefreshCw /> ลองอีกครั้ง</button>
          <a href={openUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ExternalLink /> เปิดแยกหน้าต่าง</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {switching ? (
        <div className={styles.switching}><LoaderCircle /><span>กำลังสลับตัวรับชม...</span></div>
      ) : source.kind === "hls" ? (
        <HlsVideo key={source.url} url={source.url} poster={poster} onFatal={moveToFallback} />
      ) : (
        <iframe
          key={source.url}
          className={styles.media}
          src={source.url}
          title="หน้ารับชม"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      )}

      {showEmbedHelp && !switching ? (
        <div className={styles.embedHelp}>
          <span><Play /> ภาพยังไม่ขึ้น?</span>
          <button type="button" onClick={moveToFallback}>{player.fallbackUrl && !source.isFallback ? "ลองตัวเลือกสำรอง" : "ลองตัวรับชมถัดไป"}</button>
        </div>
      ) : null}
    </div>
  );
}
