"use client";

import { ExternalLink, LoaderCircle, Play, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlayerKind, PublicPlayer } from "@/lib/public-catalog";
import styles from "./WatchPlayer.module.css";

type Source = {
  url: string;
  kind: PlayerKind;
  isFallback: boolean;
};

function HlsVideo({ url, poster, onFatal }: { url: string; poster: string | null; onFatal: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let disposed = false;
    let instance: { destroy: () => void } | null = null;
    const fatal = () => {
      if (!disposed) onFatal();
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.load();
      video.addEventListener("error", fatal);
      return () => {
        disposed = true;
        video.removeEventListener("error", fatal);
        video.removeAttribute("src");
        video.load();
      };
    }

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (disposed || !Hls.isSupported()) {
          fatal();
          return;
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 45,
          maxBufferLength: 30,
          manifestLoadingTimeOut: 12000,
          levelLoadingTimeOut: 12000,
          fragLoadingTimeOut: 18000,
        });
        instance = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) fatal();
        });
        hls.loadSource(url);
        hls.attachMedia(video);
      })
      .catch(fatal);

    return () => {
      disposed = true;
      instance?.destroy();
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
}: {
  player: PublicPlayer;
  poster: string | null;
  exhausted: boolean;
  onExhausted: () => void;
}) {
  const [source, setSource] = useState<Source>({ url: player.url, kind: player.kind, isFallback: false });
  const [switching, setSwitching] = useState(false);
  const [showEmbedHelp, setShowEmbedHelp] = useState(false);

  useEffect(() => {
    setSource({ url: player.url, kind: player.kind, isFallback: false });
    setSwitching(false);
    setShowEmbedHelp(false);
  }, [player.id, player.kind, player.url]);

  useEffect(() => {
    if (source.kind !== "embed") return;
    const timer = window.setTimeout(() => setShowEmbedHelp(true), 9000);
    return () => window.clearTimeout(timer);
  }, [source.kind, source.url]);

  const moveToFallback = () => {
    if (!source.isFallback && player.fallbackUrl && player.fallbackKind) {
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
  };

  const retry = () => {
    setSource((current) => ({ ...current, url: `${current.url}${current.url.includes("?") ? "&" : "?"}retry=${Date.now()}` }));
    setShowEmbedHelp(false);
  };

  if (exhausted) {
    const openUrl = player.fallbackUrl || player.url;
    return (
      <div className={styles.failedState}>
        <RotateCcw />
        <strong>ยังเปิดเรื่องนี้ไม่ได้</strong>
        <p>ตัวรับชมทั้งหมดของเรื่องนี้ยังไม่ตอบสนอง</p>
        <div className={styles.failedActions}>
          <button type="button" onClick={retry}><RefreshCw /> ลองอีกครั้ง</button>
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
