"use client";

import { Check, ChevronRight, CircleCheck, Languages, Play } from "lucide-react";
import type { PlayerGroupKey, PublicPlayer, PublicPlayerGroup } from "@/lib/public-catalog";
import styles from "./PlayerChoicePanel.module.css";

export default function PlayerChoicePanel({
  groups,
  activeGroupKey,
  currentPlayers,
  activePlayerIndex,
  playRequested,
  episodeNumber,
  isAvailable,
  onSelectGroup,
  onSelectPlayer,
}: {
  groups: PublicPlayerGroup[];
  activeGroupKey: PlayerGroupKey;
  currentPlayers: PublicPlayer[];
  activePlayerIndex: number;
  playRequested: boolean;
  episodeNumber?: number;
  isAvailable: (playerIndex: number) => boolean;
  onSelectGroup: (groupKey: PlayerGroupKey) => void;
  onSelectPlayer: (playerIndex: number) => void;
}) {
  const activeGroup = groups.find((group) => group.key === activeGroupKey) || groups[0] || null;

  return (
    <aside className={styles.card}>
      <div className={styles.heading}>
        <div>
          <span><CircleCheck /> ตัวเลือกรับชม</span>
          <h3>{episodeNumber ? `ตอน ${episodeNumber} • เลือกภาษาและตัวสำรอง` : "เลือกภาษาและตัวสำรอง"}</h3>
        </div>
        <span>{groups.reduce((sum, group) => sum + group.players.length, 0)} ตัวเลือก</span>
      </div>

      {groups.length > 1 || groups[0]?.key !== "default" ? (
        <div className={styles.groups} aria-label="เลือกภาษา">
          {groups.map((group) => (
            <button
              key={group.key}
              className={group.key === activeGroup?.key ? styles.groupActive : ""}
              type="button"
              onClick={() => onSelectGroup(group.key)}
            >
              <Languages />
              <span>
                <strong>{group.label}</strong>
                <small>{group.players.length} ตัวเลือก{group.hasBackup ? " • มีสำรอง" : ""}</small>
              </span>
              {group.key === activeGroup?.key ? <Check /> : <ChevronRight />}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.summary}>
        <span>{activeGroup?.label || "ตัวเลือกรับชม"}</span>
        <small>เริ่มจากตัวหลัก แล้วไล่สำรองให้อัตโนมัติ</small>
      </div>

      <div className={styles.choices}>
        {currentPlayers.map((player, index) => {
          const available = isAvailable(index);
          const active = index === activePlayerIndex;
          const choiceLabel = player.role === "backup" ? `สำรอง ${player.backupIndex || index}` : "ตัวหลัก";

          return (
            <button
              key={player.id}
              className={active ? styles.choiceActive : ""}
              type="button"
              disabled={!available}
              onClick={() => onSelectPlayer(index)}
            >
              <span className={styles.choiceIcon}>{active ? <Check /> : <Play />}</span>
              <span className={styles.choiceText}>
                <strong>{choiceLabel}</strong>
                <small>{active ? (playRequested ? "กำลังใช้งาน" : "พร้อมเริ่ม") : available ? "พร้อมเป็นตัวสำรอง" : "ยังไม่พร้อม"}</small>
              </span>
              <ChevronRight />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
