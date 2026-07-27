"use client";

import { SlidersHorizontal, X } from "lucide-react";
import styles from "./HomeQuickFilters.module.css";

export type HomeQuickView =
  | "home"
  | "movie"
  | "series"
  | "anime"
  | "new"
  | "popular"
  | "favorites"
  | "history";

type QuickOption<T extends string> = {
  value: T;
  label: string;
};

const viewOptions: Array<QuickOption<HomeQuickView>> = [
  { value: "home", label: "ทั้งหมด" },
  { value: "movie", label: "ภาพยนตร์" },
  { value: "series", label: "ซีรีส์" },
  { value: "anime", label: "อนิเมะ" },
  { value: "new", label: "มาใหม่" },
  { value: "popular", label: "ยอดนิยม" },
  { value: "favorites", label: "รายการโปรด" },
  { value: "history", label: "ดูล่าสุด" },
];

const yearOptions = ["2026", "2025", "2024", "2023", "2022", "ก่อน 2020"];

const genreOptions: Array<QuickOption<string>> = [
  { value: "Action", label: "แอ็กชัน" },
  { value: "Drama", label: "ดราม่า" },
  { value: "Comedy", label: "ตลก" },
  { value: "Horror", label: "สยองขวัญ" },
  { value: "Romance", label: "โรแมนติก" },
  { value: "Science Fiction", label: "ไซไฟ" },
  { value: "Fantasy", label: "แฟนตาซี" },
  { value: "Animation", label: "แอนิเมชัน" },
];

export default function HomeQuickFilters({
  viewMode,
  year,
  genre,
  onViewChange,
  onYearChange,
  onGenreChange,
  onOpenMore,
  onClear,
}: {
  viewMode: HomeQuickView;
  year: string;
  genre: string;
  onViewChange: (value: HomeQuickView) => void;
  onYearChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onOpenMore: () => void;
  onClear: () => void;
}) {
  const hasSelection = viewMode !== "home" || year !== "ทั้งหมด" || genre !== "ทั้งหมด";

  return (
    <section className={styles.dock} aria-label="ค้นหาด่วน">
      <div className={styles.row}>
        <span className={styles.rowLabel}>ดู</span>
        <div className={styles.scroller}>
          {viewOptions.map((option) => (
            <button
              key={option.value}
              className={viewMode === option.value ? styles.active : ""}
              type="button"
              onClick={() => onViewChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>ปี</span>
        <div className={styles.yearScroller}>
          {yearOptions.map((option) => (
            <button
              key={option}
              className={year === option ? styles.active : ""}
              type="button"
              onClick={() => onYearChange(year === option ? "ทั้งหมด" : option)}
            >
              {option}
            </button>
          ))}
        </div>

        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.rowLabel}>แนว</span>
        <div className={styles.genreScroller}>
          {genreOptions.map((option) => (
            <button
              key={option.value}
              className={genre === option.value ? styles.active : ""}
              type="button"
              onClick={() => onGenreChange(genre === option.value ? "ทั้งหมด" : option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button className={styles.moreButton} type="button" onClick={onOpenMore}>
          <SlidersHorizontal />
          <span>เพิ่มเติม</span>
        </button>

        {hasSelection ? (
          <button className={styles.clearButton} type="button" onClick={onClear} aria-label="ล้างตัวกรองทั้งหมด">
            <X />
          </button>
        ) : null}
      </div>
    </section>
  );
}
