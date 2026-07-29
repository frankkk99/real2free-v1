"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
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

type BrandOption = {
  value: string;
  label: string;
  logo: string;
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

const brandOptions: BrandOption[] = [
  { value: "netflix", label: "Netflix", logo: "https://image.tmdb.org/t/p/w154/wwemzKWzjKYJFfCeiB57q3r4Bcm.png" },
  { value: "disney", label: "Disney+", logo: "https://image.tmdb.org/t/p/w154/1edZOYAfoyZyZ3rklNSiUpXX30Q.png" },
  { value: "hbo", label: "HBO / Max", logo: "https://cdn.simpleicons.org/hbo/FFFFFF" },
  { value: "marvel", label: "Marvel", logo: "https://cdn.simpleicons.org/marvel/ED1D24" },
  { value: "dc", label: "DC", logo: "https://cdn.simpleicons.org/dc/1685F8" },
  { value: "prime", label: "Prime Video", logo: "https://image.tmdb.org/t/p/w154/w7HfLNm9CWwRmAMU58udl2L7We7.png" },
  { value: "apple", label: "Apple TV+", logo: "https://image.tmdb.org/t/p/w154/bngHRFi794mnMq34gfVcm9nDxN1.png" },
  { value: "iqiyi", label: "iQIYI", logo: "https://image.tmdb.org/t/p/w154/fNxBFqWr7eWEgNeBDvvCxsSItXx.png" },
  { value: "viu", label: "Viu", logo: "https://image.tmdb.org/t/p/w154/mmQOH5hoPd9ZieQPr5FFsjAMgD8.png" },
  { value: "wetv", label: "WeTV", logo: "https://image.tmdb.org/t/p/w154/mPsCbXC5k20bpKErrbOQd1fG0L7.png" },
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

function BrandLogo({ option }: { option: BrandOption }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={styles.brandFallback}>{option.label}</span>
  ) : (
    <img
      src={option.logo}
      alt={option.label}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

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
  const activeBrand = genre.startsWith("brand:") ? genre.slice(6) : "";
  const hasSelection = viewMode !== "home" || year !== "ทั้งหมด" || genre !== "ทั้งหมด";

  return (
    <section className={styles.dock} aria-label="ค้นหาด่วน">
      <div className={styles.brandSection}>
        <span className={styles.sectionLabel}>ค่ายหนังและสตรีมมิง</span>
        <div className={styles.brandGrid}>
          {brandOptions.map((option) => (
            <button
              key={option.value}
              className={`${styles.brandButton} ${activeBrand === option.value ? styles.brandActive : ""}`}
              type="button"
              title={option.label}
              aria-label={`แสดงรายการจาก ${option.label}`}
              aria-pressed={activeBrand === option.value}
              onClick={() => onGenreChange(activeBrand === option.value ? "ทั้งหมด" : `brand:${option.value}`)}
            >
              <BrandLogo option={option} />
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterRail}>
        <div className={styles.filterCluster}>
          <span className={styles.clusterLabel}>ดู</span>
          <div className={styles.optionGrid}>
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

        <div className={styles.filterCluster}>
          <span className={styles.clusterLabel}>ปี</span>
          <div className={styles.optionGrid}>
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
        </div>

        <div className={styles.filterCluster}>
          <span className={styles.clusterLabel}>แนว</span>
          <div className={styles.optionGrid}>
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
        </div>

        <div className={styles.filterActions}>
          <button className={styles.moreButton} type="button" onClick={onOpenMore} aria-label="เปิดตัวกรองเพิ่มเติม">
            <SlidersHorizontal />
            <span>เพิ่มเติม</span>
          </button>

          {hasSelection ? (
            <button className={styles.clearButton} type="button" onClick={onClear} aria-label="ล้างตัวกรองทั้งหมด">
              <X />
              <span>ล้าง</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
