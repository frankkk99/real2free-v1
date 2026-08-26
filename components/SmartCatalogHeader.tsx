"use client";

import {
  Check,
  ChevronDown,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { catalogTitleMatchScore, rankCatalogTitleMatches } from "@/lib/fuzzy-catalog-search";
import type { PublicCatalogItem } from "@/lib/public-catalog";
import {
  languageFilterOptions,
  brandFilterOptions,
  countryFilterOptions,
  parseSmartCatalogSearch,
  SMART_SEARCH_EXAMPLES,
  sortModeOptions,
  type CatalogBrandFilter,
  type CatalogCountryFilter,
  type CatalogLanguageFilter,
  type CatalogSortMode,
} from "@/lib/smart-catalog-search";
import type { HomeQuickView } from "./HomeQuickFilters";
import styles from "./SmartCatalogHeader.module.css";
import menuStyles from "./SmartCatalogHamburger.module.css";

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

const menuNavItems: Array<{ value: HomeQuickView; label: string }> = [
  ...navItems,
  { value: "favorites", label: "รายการโปรด" },
  { value: "history", label: "ดูล่าสุด" },
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
  brand,
  country,
  year,
  language,
  sortMode,
  items,
  genreOptions,
  yearOptions,
  onViewChange,
  onQueryChange,
  onGenreChange,
  onBrandChange,
  onCountryChange,
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
  brand: CatalogBrandFilter;
  country: CatalogCountryFilter;
  year: string;
  language: CatalogLanguageFilter;
  sortMode: CatalogSortMode;
  items: PublicCatalogItem[];
  genreOptions: FilterOption[];
  yearOptions: string[];
  onViewChange: (value: HomeQuickView) => void;
  onQueryChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onBrandChange: (value: CatalogBrandFilter) => void;
  onCountryChange: (value: CatalogCountryFilter) => void;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const parsedSearch = useMemo(() => parseSmartCatalogSearch(queryInput), [queryInput]);
  const activeViewMode = viewMode === "home" && parsedSearch.viewMode ? parsedSearch.viewMode : viewMode;
  const activeGenre = genre === "ทั้งหมด" ? parsedSearch.genre || "ทั้งหมด" : genre;
  const activeBrand = brand === "ทั้งหมด" ? parsedSearch.brand || "ทั้งหมด" : brand;
  const activeCountry = country === "ทั้งหมด" ? parsedSearch.country || "ทั้งหมด" : country;
  const activeYear = year === "ทั้งหมด" ? parsedSearch.year || "ทั้งหมด" : year;
  const activeLanguage = language === "ทั้งหมด" ? parsedSearch.language || "ทั้งหมด" : language;

  // Keep the legacy callback in the public component contract while the header now owns the unified menu.
  void onOpenMenu;

  const suggestions = useMemo(() => {
    const needle = parsedSearch.text.trim();
    if (!needle) return [];

    return rankCatalogTitleMatches(items, needle)
      .filter((item) => catalogTitleMatchScore(needle, item.thaiTitle, item.title) >= 0.3)
      .slice(0, 5);
  }, [items, parsedSearch.text]);

  const selectedFilterCount = [
    activeViewMode !== "home",
    activeGenre !== "ทั้งหมด",
    activeBrand !== "ทั้งหมด",
    activeCountry !== "ทั้งหมด",
    activeYear !== "ทั้งหมด",
    activeLanguage !== "ทั้งหมด",
    sortMode !== "updated",
  ].filter(Boolean).length;

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
        setFilterOpen(false);
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSearchOpen(false);
      setFilterOpen(false);
      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const chooseSuggestion = (title: string) => {
    onQueryChange(title);
    setSearchOpen(false);
    inputRef.current?.blur();
    window.requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const submitSearch = () => {
    setSearchOpen(false);
    inputRef.current?.blur();
    window.requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const chooseMenuView = (value: HomeQuickView) => {
    onViewChange(value);
    setMenuOpen(false);
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
            className={activeViewMode === item.value ? styles.navActive : ""}
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
              if (event.key === "Enter") submitSearch();
              if (event.key === "Escape") {
                setSearchOpen(false);
                event.currentTarget.blur();
              }
            }}
            placeholder="ค้นชื่อ หรือพิมพ์ เช่น หนังเกาหลี 2025 พากย์ไทย"
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
                <span>
                  <small>ระบบเข้าใจคำค้นเป็นตัวกรอง</small>
                  <strong>{parsedSearch.labels.join(" • ")}{parsedSearch.text ? ` • ชื่อ “${parsedSearch.text}”` : ""}</strong>
                </span>
              </div>
            ) : (
              <div className={styles.searchTip}>
                <Sparkles /> ค้นได้ทั้งชื่อเรื่องและภาษาคน เช่น “หนังเกาหลี 2025 พากย์ไทย”
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
              <div className={styles.searchAction}>
                <Search />
                <span>
                  {parsedSearch.labels.length && !parsedSearch.text
                    ? `กรองรายการตาม ${parsedSearch.labels.join(" • ")}`
                    : parsedSearch.labels.length
                      ? `ค้นชื่อ “${parsedSearch.text}” พร้อมกรอง ${parsedSearch.labels.join(" • ")}`
                      : `ค้นหาทุกเรื่องด้วย “${queryInput}”`}
                </span>
              </div>
            ) : (
              <div className={styles.examples}>
                {SMART_SEARCH_EXAMPLES.map((example) => (
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
            id="catalog-filter-button"
            className={`${styles.filterButton} ${filterOpen || selectedFilterCount ? styles.controlActive : ""}`}
            type="button"
            onClick={() => {
              setFilterOpen((current) => !current);
              setSearchOpen(false);
              setMenuOpen(false);
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
                    <button key={option.value} className={activeViewMode === option.value ? styles.choiceActive : ""} type="button" onClick={() => onViewChange(option.value)}>
                      {option.label}{activeViewMode === option.value ? <Check /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>ค่ายหนังและสตรีมมิง</span>
                <div className={styles.genreGrid}>
                  {brandFilterOptions.map((option) => (
                    <button key={option.value} className={activeBrand === option.value ? styles.choiceActive : ""} type="button" onClick={() => onBrandChange(option.value)}>
                      {option.label}{activeBrand === option.value ? <Check /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>ประเทศต้นฉบับ</span>
                <div className={styles.choiceGrid}>
                  {countryFilterOptions.map((option) => (
                    <button key={option.value} className={activeCountry === option.value ? styles.choiceActive : ""} type="button" onClick={() => onCountryChange(option.value)}>
                      {option.label}{activeCountry === option.value ? <Check /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>ภาษาและตัวสำรอง</span>
                <div className={styles.choiceGrid}>
                  {languageFilterOptions.map((option) => (
                    <button key={option.value} className={activeLanguage === option.value ? styles.choiceActive : ""} type="button" onClick={() => onLanguageChange(option.value)}>
                      {option.label}{activeLanguage === option.value ? <Check /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>ปีที่ฉาย</span>
                <div className={styles.scrollChoices}>
                  {yearOptions.map((option) => (
                    <button key={option} className={activeYear === option ? styles.choiceActive : ""} type="button" onClick={() => onYearChange(option)}>
                      {option === "ทั้งหมด" ? "ทุกปี" : option}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterSection}>
                <span>แนว</span>
                <div className={styles.genreGrid}>
                  {genreOptions.map((option) => (
                    <button key={option.value} className={activeGenre === option.value ? styles.choiceActive : ""} type="button" onClick={() => onGenreChange(option.value)}>
                      {option.label}{activeGenre === option.value ? <Check /> : null}
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

      <button
        className={`${styles.menuButton} ${menuStyles.trigger} ${menuOpen ? menuStyles.triggerOpen : ""}`}
        type="button"
        onClick={() => {
          setMenuOpen((current) => !current);
          setSearchOpen(false);
          setFilterOpen(false);
        }}
        aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนูทั้งหมด"}
        aria-expanded={menuOpen}
        aria-controls="catalog-universal-menu"
      >
        <span className={menuStyles.lines} aria-hidden="true"><i /><i /><i /></span>
      </button>

      {menuOpen ? (
        <section id="catalog-universal-menu" className={menuStyles.panel} aria-label="เมนูทั้งหมด">
          <div className={menuStyles.panelHead}>
            <span><small>REAL2FREE</small><strong>เมนูทั้งหมด</strong></span>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"><X /></button>
          </div>

          <label className={menuStyles.menuSearch}>
            <Search />
            <input
              value={queryInput}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setMenuOpen(false);
                  event.currentTarget.blur();
                  window.requestAnimationFrame(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }
              }}
              placeholder="ค้นชื่อ หรือ หนังเกาหลี 2025 พากย์ไทย"
              autoComplete="off"
            />
            {queryInput ? <button type="button" onClick={() => onQueryChange("")} aria-label="ล้างคำค้น"><X /></button> : null}
          </label>

          <div className={menuStyles.quickActions}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setFilterOpen(true);
              }}
            >
              <SlidersHorizontal />
              <span><strong>ตัวกรองละเอียด</strong><small>{selectedFilterCount ? `เลือกอยู่ ${selectedFilterCount} รายการ` : "ประเภท • ปี • แนว • ภาษา"}</small></span>
              {selectedFilterCount ? <b>{selectedFilterCount}</b> : null}
            </button>

            <button type="button" onClick={onToggleTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
              <span><strong>{theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}</strong><small>สลับธีมหน้าเว็บ</small></span>
            </button>
          </div>

          <div className={menuStyles.sectionLabel}>ไปที่</div>
          <nav className={menuStyles.menuNav} aria-label="ทางลัดทั้งหมด">
            {menuNavItems.map((item) => (
              <button
                key={item.value}
                className={activeViewMode === item.value ? menuStyles.activeItem : ""}
                type="button"
                onClick={() => chooseMenuView(item.value)}
              >
                <span>{item.label}</span>
                {activeViewMode === item.value ? <i>กำลังดู</i> : null}
              </button>
            ))}
          </nav>

          {selectedFilterCount ? (
            <button
              className={menuStyles.clearButton}
              type="button"
              onClick={() => {
                onClearFilters();
                setMenuOpen(false);
              }}
            >
              ล้างการค้นหาและตัวกรองทั้งหมด
            </button>
          ) : null}
        </section>
      ) : null}
    </header>
  );
}
