"use client";

import {
  Check,
  ChevronDown,
  Menu,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicCatalogItem } from "@/lib/public-catalog";
import {
  languageFilterOptions,
  parseSmartCatalogSearch,
  sortModeOptions,
  type CatalogLanguageFilter,
  type CatalogSortMode,
} from "@/lib/smart-catalog-search";
import type { HomeQuickView } from "./HomeQuickFilters";
import styles from "./SmartCatalogHeader.module.css";

type Theme = "dark" | "light";

type FilterOption = {
  value: string;
  label: string;
};

const navItems: Array<{ value: HomeQuickView; label: string }> = [
  { value: "home", label: "หน้าแรก" },
  { value: "movie", label: "ภาพยนตร์" },
  { value: "series", label: "ซีรีส์" },
  { value: "anime", label: "อนิเมะ" },
  { value: "new", label: "มาใหม่" },
  { value: "popular", label: "ยอดนิยม" },
];

const typeOptions: Array<{ value: HomeQuickView; label: string }> = [
  { value: "home", label: "ทั้งหมด" },
  { value: "movie", label: "ภาพยนตร์" },
  { value: "series", label: "ซีรีส์" },
  { value: "anime", label: "อนิเมะ" },
];

function Brand() {
  return (
    <span className={styles.brand} aria-label="REAL2FREE">
      <span className={styles.brandMark}><i /><i /></span>
      <strong>REAL<span>2</span>FREE</strong>
    </span>
  );
}

export default function SmartCatalogHeader({
  theme,
  viewMode,
  queryInput,
  genre,
  year,
  language,
  sortMode,
  items,
  genreOptions,
  yearOptions,
  onViewChange,
  onQueryChange,
  onGenreChange,
  onYearChange,
  onLanguageChange,
  onSortChange,
  onClearFilters,
  onToggleTheme,
  onOpenMenu,
}: {
  theme: Theme;
  viewMode: HomeQuickView;
  queryInput: string;
  genre: string;
  year: string;
  language: CatalogLanguageFilter;
  sortMode: CatalogSortMode;
  items: PublicCatalogItem[];
  genreOptions: FilterOption[];
  yearOptions: string[];
  onViewChange: (value: HomeQuickView) => void;
  onQueryChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onLanguageChange: (value: CatalogLanguageFilter) => void;
  onSortChange: (value: CatalogSortMode) => void;
  onClearFilters: () => void;
  onToggleTheme: () => void;
  onOpenMenu: () => void;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const parsedSearch = useMemo(() => parseSmartCatalogSearch(queryInput), [queryInput]);

  const suggestions = useMemo(() => {
    const needle = (parsedSearch.text || queryInput).trim().toLocaleLowerCase("th-TH");
    if (!needle) return [];

    return items
      .filter((item) => `${item.thaiTitle} ${item.title}`.toLocaleLowerCase("th-TH").includes(needle))
      .slice(0, 5);
  }, [items, parsedSearch.text, queryInput]);

  const selectedFilterCount = [
    viewMode !== "home",
    genre !== "ทั้งหมด",
    year !== "ทั้งหมด",
    language !== "ทั้งหมด",
    sortMode !== "updated",
  ].filter(Boolean).length;

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
        setFilterOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);

  const chooseSuggestion = (title: string) => {
    onQueryChange(title);
    setSearchOpen(false);
    inputRef.current?.blur();
  };

  return (
    <header ref={rootRef} className={styles.header}>
      <button className={styles.brandButton} type="button" onClick={() => onViewChange("home")}>
        <Brand />
      </button>

      <nav className={styles.nav} aria-label="เมนูหลัก">
        {navItems.map((item) => (
          <button
            key={item.value}
            className={viewMode === item.value ? styles.navActive : ""}
            type="button"
            onClick={() => onViewChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.searchWrap}>
        <label className={`${styles.searchBox} ${searchOpen ? styles.searchBoxActive : ""}`}>
          <Search />
          <input
            ref={inputRef}
            id="catalog-search-input"
            value={queryInput}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearchOpen(false);
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setSearchOpen(false);
                event.currentTarget.blur();
              }
            }}
            placeholder="ค้นหา เช่น แอ็กชัน 2025"
            autoComplete="off"
          />
          {queryInput ? (
            <button type="button" onClick={() => onQueryChange("")} aria-label="ล้างคำค้น"><X /></button>
          ) : null}
        </label>

        {searchOpen ? (
          <div className={styles.searchDropdown}>
            {parsedSearch.labels.length ? (
              <div className={styles.interpreted}>
                <Sparkles />
                <span><small>ค้นหาแบบฉลาด</small><strong>{parsedSearch.labels.join(" • ")}</strong></span>
              </div>
            ) : (
              <div className={styles.searchTip}>
                <Sparkles /> ลองพิมพ์ “หนังแอ็กชัน 2025 พากย์ไทย”
              </div>
            )}

            {suggestions.length ? (
              <div className={styles.suggestions}>
                {suggestions.map((item) => (
                  <button key={item.id} type="button" onClick={() => chooseSuggestion(item.thaiTitle)}>
                    <span>
                      {item.posterUrl ? <img src={item.posterUrl} alt="" referrerPolicy="no-referrer" /> : <Search />}
                    </span>
                    <span><strong>{item.thaiTitle}</strong><small>{item.year || ""} {item.title !== item.thaiTitle ? `• ${item.title}` : ""}</small></span>
                  </button>
                ))}
              </div>
            ) : queryInput ? (
              <div className={styles.searchAction}><Search /><span>ค้นหาทุกเรื่องด้วย “{queryInput}”</span></div>
            ) : (
              <div className={styles.examples}>
                {["พากย์ไทย 2026", "ซีรีส์เกาหลี", "หนังสยองขวัญ", "มีสำรอง"].map((example) => (
                  <button key={example} type="button" onClick={() => chooseSuggestion(example)}>{example}</button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.controls}>
        <div className={styles.filterWrap}>
          <button
            className={`${styles.filterButton} ${filterOpen || selectedFilterCount ? styles.controlActive : ""}`}
            type="button"
            onClick={() => {
              setFilterOpen((current) => !current);
              setSearchOpen(false);
            }}
            aria-label="เปิดตัวกรองละเอียด"
            aria-expanded={filterOpen}
          >
            <SlidersHorizontal />
            <span className={styles.filterText}>กรอง</span>
            <ChevronDown className={styles.chevron} />
            {selectedFilterCount ? <b>{selectedFilterCount}</b> : null}
          </button>

          {filterOpen ? (
            <section className={styles.filterDropdown} aria-label="ตัวกรองละเอียด">
              <div className={styles.filterHeading}>
                <div><strong>กรองละเอียด</strong><small>เลือกแล้วรายการจะเปลี่ยนทันที</small></div>
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="ปิดตัวกรอง"><X /></button>
              </div>

              <div className={styles.filterSection}>
                <span>ประเภท</span>
                <div className={styles.choiceGrid}>
                  {typeOptions.map((option) => (
                    <button key={option.value} className={viewMode === option.value ? styles.choiceActive : ""} type="button" onClick={() => onViewChange(option.value)}>
                      {option.label}{viewMode === option.value ? <Check /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>ภาษาและตัวสำรอง</span>
                <div className={styles.choiceGrid}>
                  {languageFilterOptions.map((option) => (
                    <button key={option.value} className={language === option.value ? styles.choiceActive : ""} type="button" onClick={() => onLanguageChange(option.value)}>
                      {option.label}{language === option.value ? <Check /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>ปีที่ฉาย</span>
                <div className={styles.scrollChoices}>
                  {yearOptions.map((option) => (
                    <button key={option} className={year === option ? styles.choiceActive : ""} type="button" onClick={() => onYearChange(option)}>
                      {option === "ทั้งหมด" ? "ทุกปี" : option}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>แนว</span>
                <div className={styles.genreGrid}>
                  {genreOptions.map((option) => (
                    <button key={option.value} className={genre === option.value ? styles.choiceActive : ""} type="button" onClick={() => onGenreChange(option.value)}>
                      {option.label}{genre === option.value ? <Check /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>เรียงลำดับ</span>
                <div className={styles.choiceGrid}>
                  {sortModeOptions.map((option) => (
                    <button key={option.value} className={sortMode === option.value ? styles.choiceActive : ""} type="button" onClick={() => onSortChange(option.value)}>
                      {option.label}{sortMode === option.value ? <Check /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterActions}>
                <button type="button" onClick={onClearFilters}>ล้างทั้งหมด</button>
                <button type="button" onClick={() => setFilterOpen(false)}>ดูผลลัพธ์</button>
              </div>
            </section>
          ) : null}
        </div>

        <button className={styles.themeButton} type="button" onClick={onToggleTheme} aria-label="สลับโหมดสี">
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
      </div>

      <button className={styles.menuButton} type="button" onClick={onOpenMenu} aria-label="เปิดเมนู">
        <Menu />
      </button>
    </header>
  );
}
