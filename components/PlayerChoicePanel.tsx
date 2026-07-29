"use client";

import { Check, ChevronRight, CircleCheck, Play, RotateCcw, Server } from "lucide-react";
import type { PlaybackSource } from "@/lib/public-catalog";
import styles from "./PlayerChoicePanel.module.css";

export default function PlayerChoicePanel({
  source,
  sourceIndex,
  totalSources,
  started,
  switching,
  hasNextSource,
  episodeNumber,
  onNextSource,
  onRetry,
}: {
  source: PlaybackSource | null;
  sourceIndex: number;
  totalSources: number;
  started: boolean;
  switching: boolean;
  hasNextSource: boolean;
  episodeNumber?: number;
  onNextSource: () => void;
  onRetry: () => void;
}) {
  const currentLabel = source?.role === "backup"
    ? `ตัวสำรอง ${source.backupIndex || sourceIndex}`
    : source?.label || "ตัวหลัก";

  return (
    <aside className={styles.card}>
      <div className={styles.heading}>
        <div>
          <span><CircleCheck /> ตัวเลือกรับชม</span>
          <h3>{episodeNumber ? `ตอน ${episodeNumber} • เรียก Player เมื่อกดเล่น` : "เรียก Player เมื่อกดเล่น"}</h3>
        </div>
        <span>{totalSources.toLocaleString("th-TH")} ตัวเลือก</span>
      </div>

      <div className={styles.summary}>
        <span>{source ? currentLabel : "ยังไม่เปิดเผย Player"}</span>
        <small>{source ? "หากเปิดไม่ได้ ระบบจะขอตัวถัดไป" : "URL ไม่อยู่ใน HTML ก่อนกดเล่น"}</small>
      </div>

      <div className={styles.choices}>
        {source ? (
          <button className={styles.choiceActive} type="button" disabled>
            <span className={styles.choiceIcon}><Check /></span>
            <span className={styles.choiceText}>
              <strong>{currentLabel}</strong>
              <small>{source.kind === "hls" ? "HLS" : "Embed"} • {sourceIndex + 1}/{totalSources}</small>
            </span>
            <Play />
          </button>
        ) : (
          <button type="button" disabled>
            <span className={styles.choiceIcon}><Server /></span>
            <span className={styles.choiceText}>
              <strong>{switching ? "กำลังขอ Player" : "ยังไม่เรียก Player"}</strong>
              <small>{started ? "รอการตอบกลับจากระบบ" : "กดเริ่มรับชมก่อน"}</small>
            </span>
            <ChevronRight />
          </button>
        )}

        {source && hasNextSource ? (
          <button type="button" onClick={onNextSource}>
            <span className={styles.choiceIcon}><Server /></span>
            <span className={styles.choiceText}>
              <strong>เปลี่ยนตัวรับชม</strong>
              <small>ขอตัวสำรองถัดไป</small>
            </span>
            <ChevronRight />
          </button>
        ) : null}

        {started && !switching && !source ? (
          <button type="button" onClick={onRetry}>
            <span className={styles.choiceIcon}><RotateCcw /></span>
            <span className={styles.choiceText}>
              <strong>ลองใหม่</strong>
              <small>เริ่มขอตัวรับชมตั้งแต่ตัวแรก</small>
            </span>
            <ChevronRight />
          </button>
        ) : null}
      </div>
    </aside>
  );
}
