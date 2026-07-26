"use client";

import {
  Bell,
  Bookmark,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Crown,
  Download,
  Film,
  Flame,
  Heart,
  History,
  Home,
  Info,
  Menu,
  Moon,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Tv,
  UserRound,
  X,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  genres,
  heroSlides,
  newMovies,
  qualities,
  trendingMovies,
  years,
  type HeroSlide,
  type MovieItem,
} from "@/lib/catalog";

type Theme = "dark" | "light";
type PosterStyle = CSSProperties & {
  "--poster-a": string;
  "--poster-b": string;
  "--poster-c": string;
};
type HeroStyle = CSSProperties & {
  "--hero-a": string;
  "--hero-b": string;
  "--hero-c": string;
  "--hero-d": string;
};

const mainNav = ["หน้าแรก", "ภาพยนตร์", "ซีรีส์", "อนิเมะ", "มาใหม่", "ยอดนิยม"];

const sideNav: Array<{ label: string; icon: ReactNode }> = [
  { label: "หน้าแรก", icon: <Home /> },
  { label: "ภาพยนตร์", icon: <Film /> },
  { label: "ซีรีส์", icon: <Tv /> },
  { label: "อนิเมะ", icon: <Sparkles /> },
  { label: "มาใหม่", icon: <Calendar /> },
  { label: "ยอดนิยม", icon: <Flame /> },
  { label: "รายการโปรด", icon: <Heart /> },
  { label: "ประวัติการดู", icon: <History /> },
  { label: "ดาวน์โหลด", icon: <Download /> },
];

const quickLinks = [
  { label: "ภาพยนตร์", caption: "ดูทั้งหมด", icon: <Film /> },
  { label: "ซีรีส์", caption: "ดูทั้งหมด", icon: <Tv /> },
  { label: "อนิเมะ", caption: "ดูทั้งหมด", icon: <Sparkles /> },
  { label: "ยอดนิยม", caption: "วันนี้", icon: <Flame /> },
  { label: "ล่าสุด", caption: "อัปเดต", icon: <Clock3 /> },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brandCompact" : ""}`} aria-label="REAL2FREE">
      <span className="brandMark" aria-hidden="true">
        <span />
        <span />
      </span>
      {!compact && (
        <span className="brandWord">
          REAL<span>2</span>FREE
        </span>
      )}
    </div>
  );
}

function PosterCard({
  movie,
  favorite,
  onFavorite,
  onOpen,
}: {
  movie: MovieItem;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  const posterStyle: PosterStyle = {
    "--poster-a": movie.palette[0],
    "--poster-b": movie.palette[1],
    "--poster-c": movie.palette[2],
  };

  return (
    <article className="movieCard">
      <button className="posterButton" type="button" onClick={onOpen} aria-label={`ดูข้อมูล ${movie.thaiTitle}`}>
        <span className="posterArtwork" style={posterStyle}>
          <span className="posterNoise" />
          <span className="posterMoon" />
          <span className="posterBeam" />
          <span className="posterSilhouette" />
          <span className="posterTypography">
            <small>{movie.thaiTitle}</small>
            <strong>{movie.title}</strong>
          </span>
          <span className="qualityBadge">{movie.quality}</span>
          {movie.rank && <span className="rankBadge">{movie.rank}</span>}
          {movie.isNew && <span className="newCorner">NEW</span>}
          <span className="posterHover">
            <span className="roundPlay"><Play fill="currentColor" /></span>
            <span>ดูรายละเอียด</span>
          </span>
        </span>
      </button>
      <div className="movieMeta">
        <button className="movieTitle" type="button" onClick={onOpen}>
          {movie.thaiTitle}
        </button>
        <div className="movieStats">
          <span>{movie.year}</span>
          <span><Star fill="currentColor" /> {movie.rating.toFixed(1)}</span>
        </div>
      </div>
      <button
        className={`favoriteButton ${favorite ? "isFavorite" : ""}`}
        type="button"
        onClick={onFavorite}
        aria-label={favorite ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
      >
        <Heart fill={favorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}

function Hero({
  slide,
  index,
  onNext,
  onPrevious,
  onSelect,
}: {
  slide: HeroSlide;
  index: number;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
}) {
  const heroStyle: HeroStyle = {
    "--hero-a": slide.palette[0],
    "--hero-b": slide.palette[1],
    "--hero-c": slide.palette[2],
    "--hero-d": slide.palette[3],
  };

  return (
    <section className="hero" style={heroStyle} aria-label="ภาพยนตร์แนะนำ">
      <div className="heroAtmosphere" aria-hidden="true">
        <span className="heroOrb heroOrbOne" />
        <span className="heroOrb heroOrbTwo" />
        <span className="heroOrb heroOrbThree" />
        <span className="heroRidge heroRidgeOne" />
        <span className="heroRidge heroRidgeTwo" />
        <span className="heroFigure heroFigureOne" />
        <span className="heroFigure heroFigureTwo" />
      </div>
      <div className="heroShade" />
      <div className="heroContent">
        <span className="heroEyebrow">{slide.eyebrow}</span>
        <h1>{slide.title}</h1>
        <h2>{slide.subtitle}</h2>
        <p>{slide.description}</p>
        <div className="heroMeta">{slide.meta}</div>
        <div className="heroActions">
          <button className="primaryButton" type="button">
            <Play fill="currentColor" /> ดูเลย
          </button>
          <button className="secondaryButton" type="button">
            <Info /> ข้อมูลเพิ่มเติม
          </button>
        </div>
      </div>
      <button className="heroArrow heroArrowLeft" type="button" onClick={onPrevious} aria-label="สไลด์ก่อนหน้า">
        <ChevronLeft />
      </button>
      <button className="heroArrow heroArrowRight" type="button" onClick={onNext} aria-label="สไลด์ถัดไป">
        <ChevronRight />
      </button>
      <div className="heroDots" aria-label="เลือกสไลด์">
        {heroSlides.map((item, dotIndex) => (
          <button
            key={item.id}
            className={dotIndex === index ? "active" : ""}
            type="button"
            onClick={() => onSelect(dotIndex)}
            aria-label={`สไลด์ ${dotIndex + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function FilterRail({
  genre,
  year,
  quality,
  onGenre,
  onYear,
  onQuality,
}: {
  genre: string;
  year: string;
  quality: string;
  onGenre: (value: string) => void;
  onYear: (value: string) => void;
  onQuality: (value: string) => void;
}) {
  return (
    <aside className="rightRail">
      <div className="filterPanel">
        <div className="panelHeading">
          <span>ประเภท</span>
          <SlidersHorizontal />
        </div>
        <div className="genreList">
          {genres.map((item) => (
            <button
              key={item}
              className={genre === item ? "active" : ""}
              type="button"
              onClick={() => onGenre(item)}
            >
              <span>{item}</span>
              {genre === item ? <Check /> : <ChevronRight />}
            </button>
          ))}
        </div>
      </div>
      <div className="filterPanel">
        <div className="panelHeading"><span>ปีที่ฉาย</span><Calendar /></div>
        <div className="chipGrid">
          {years.map((item) => (
            <button key={item} className={year === item ? "active" : ""} type="button" onClick={() => onYear(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="filterPanel">
        <div className="panelHeading"><span>คุณภาพ</span><Film /></div>
        <div className="chipGrid twoColumns">
          {qualities.map((item) => (
            <button key={item} className={quality === item ? "active" : ""} type="button" onClick={() => onQuality(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function MovieHome() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [heroIndex, setHeroIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("ทั้งหมด");
  const [selectedYear, setSelectedYear] = useState("ทั้งหมด");
  const [selectedQuality, setSelectedQuality] = useState("ทั้งหมด");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("real2free-theme") as Theme | null;
    const nextTheme = savedTheme ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedMovie || mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedMovie, mobileMenuOpen]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("real2free-theme", nextTheme);
  };

  const allMovies = useMemo(() => {
    const map = new Map<string, MovieItem>();
    [...newMovies, ...trendingMovies].forEach((movie) => map.set(movie.id, movie));
    return Array.from(map.values());
  }, []);

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allMovies.filter((movie) => {
      const matchesQuery =
        !normalizedQuery ||
        movie.title.toLowerCase().includes(normalizedQuery) ||
        movie.thaiTitle.toLowerCase().includes(normalizedQuery) ||
        movie.genres.some((item) => item.toLowerCase().includes(normalizedQuery));
      const matchesGenre = selectedGenre === "ทั้งหมด" || movie.genres.includes(selectedGenre);
      const matchesQuality = selectedQuality === "ทั้งหมด" || movie.quality === selectedQuality;
      const matchesYear =
        selectedYear === "ทั้งหมด" ||
        (selectedYear === "2020-2022" && movie.year >= 2020 && movie.year <= 2022) ||
        (selectedYear === "ก่อน 2020" && movie.year < 2020) ||
        movie.year.toString() === selectedYear;
      return matchesQuery && matchesGenre && matchesQuality && matchesYear;
    });
  }, [allMovies, query, selectedGenre, selectedQuality, selectedYear]);

  const hasFilters =
    query.trim().length > 0 ||
    selectedGenre !== "ทั้งหมด" ||
    selectedYear !== "ทั้งหมด" ||
    selectedQuality !== "ทั้งหมด";

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedGenre("ทั้งหมด");
    setSelectedYear("ทั้งหมด");
    setSelectedQuality("ทั้งหมด");
  };

  return (
    <div className="siteShell">
      <aside className="desktopSidebar">
        <Brand />
        <nav className="sidebarNav" aria-label="เมนูหลัก">
          {sideNav.map((item, index) => (
            <button key={item.label} className={index === 0 ? "active" : ""} type="button">
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="premiumCard">
          <Crown />
          <div><strong>Premium</strong><p>รับชมไม่จำกัด ภาพคมชัด และไม่มีโฆษณาคั่น</p></div>
          <button type="button">สมัครสมาชิก</button>
        </div>
        <div className="sidebarFooter">© 2026 REAL2FREE<br />Entertainment UI</div>
      </aside>

      <div className="mainColumn">
        <header className="topHeader">
          <button className="mobileIconButton menuButton" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="เปิดเมนู">
            <Menu />
          </button>
          <div className="mobileBrand"><Brand /></div>
          <nav className="desktopTopNav" aria-label="หมวดหมู่หลัก">
            {mainNav.map((item, index) => <button key={item} className={index === 0 ? "active" : ""} type="button">{item}</button>)}
          </nav>
          <div className="headerActions">
            <label className="desktopSearch">
              <Search />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาหนัง ซีรีส์ นักแสดง..." />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="ล้างคำค้น"><X /></button>}
            </label>
            <button className="mobileIconButton searchButton" type="button" onClick={() => setMobileSearchOpen((value) => !value)} aria-label="ค้นหา"><Search /></button>
            <button className="iconButton themeButton" type="button" onClick={toggleTheme} aria-label="สลับโหมดสี">
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>
            <button className="iconButton notificationButton" type="button" aria-label="การแจ้งเตือน"><Bell /><span /></button>
            <button className="profileButton" type="button" aria-label="โปรไฟล์"><CircleUserRound /><ChevronRight /></button>
          </div>
        </header>

        {mobileSearchOpen && (
          <div className="mobileSearchPanel">
            <Search />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาหนัง ซีรีส์ นักแสดง..." />
            <button type="button" onClick={() => setMobileSearchOpen(false)}><X /></button>
          </div>
        )}

        <nav className="mobileCategoryTabs" aria-label="หมวดหมู่บนมือถือ">
          {mainNav.slice(0, 5).map((item, index) => <button key={item} className={index === 0 ? "active" : ""} type="button">{item}</button>)}
        </nav>

        <div className="contentLayout">
          <main className="contentMain">
            <Hero
              slide={heroSlides[heroIndex]}
              index={heroIndex}
              onNext={() => setHeroIndex((heroIndex + 1) % heroSlides.length)}
              onPrevious={() => setHeroIndex((heroIndex - 1 + heroSlides.length) % heroSlides.length)}
              onSelect={setHeroIndex}
            />

            <section className="quickGrid" aria-label="ทางลัด">
              {quickLinks.map((item) => (
                <button key={item.label} type="button">
                  <span className="quickIcon">{item.icon}</span>
                  <span><strong>{item.label}</strong><small>{item.caption}</small></span>
                </button>
              ))}
            </section>

            <div className="mobileFilterBar">
              <button type="button" onClick={() => setSelectedGenre(selectedGenre === "ทั้งหมด" ? "แอคชัน" : "ทั้งหมด")}>
                <SlidersHorizontal /> ตัวกรอง
              </button>
              <div className="mobileFilterChips">
                {["ทั้งหมด", "แอคชัน", "แฟนตาซี", "ไซไฟ"].map((item) => (
                  <button key={item} className={selectedGenre === item ? "active" : ""} type="button" onClick={() => setSelectedGenre(item)}>{item}</button>
                ))}
              </div>
            </div>

            {hasFilters ? (
              <section className="movieSection searchResultsSection">
                <div className="sectionHeading">
                  <div><span className="sectionKicker">ผลการค้นหา</span><h2>พบ {filteredMovies.length} รายการ</h2></div>
                  <button className="textButton" type="button" onClick={clearFilters}>ล้างตัวกรอง <X /></button>
                </div>
                {filteredMovies.length ? (
                  <div className="movieGrid resultsGrid">
                    {filteredMovies.map((movie) => (
                      <PosterCard key={movie.id} movie={movie} favorite={favorites.has(movie.id)} onFavorite={() => toggleFavorite(movie.id)} onOpen={() => setSelectedMovie(movie)} />
                    ))}
                  </div>
                ) : (
                  <div className="emptyState"><Search /><h3>ยังไม่พบเรื่องที่ค้นหา</h3><p>ลองเปลี่ยนคำค้น หมวดหมู่ ปี หรือคุณภาพ</p><button type="button" onClick={clearFilters}>แสดงทั้งหมด</button></div>
                )}
              </section>
            ) : (
              <>
                <section className="movieSection">
                  <div className="sectionHeading"><h2>มาใหม่</h2><button className="textButton" type="button">ดูทั้งหมด <ChevronRight /></button></div>
                  <div className="movieGrid horizontalOnMobile">
                    {newMovies.map((movie) => (
                      <PosterCard key={movie.id} movie={movie} favorite={favorites.has(movie.id)} onFavorite={() => toggleFavorite(movie.id)} onOpen={() => setSelectedMovie(movie)} />
                    ))}
                  </div>
                </section>

                <section className="movieSection">
                  <div className="sectionHeading"><h2>ยอดนิยมวันนี้</h2><button className="textButton" type="button">ดูทั้งหมด <ChevronRight /></button></div>
                  <div className="movieGrid horizontalOnMobile trendingGrid">
                    {trendingMovies.map((movie) => (
                      <PosterCard key={movie.id} movie={movie} favorite={favorites.has(movie.id)} onFavorite={() => toggleFavorite(movie.id)} onOpen={() => setSelectedMovie(movie)} />
                    ))}
                  </div>
                </section>

                <section className="premiumBanner">
                  <div className="premiumIllustration"><Crown /><span /></div>
                  <div><strong><span>สมัครสมาชิก</span> REAL2FREE Premium</strong><p>รับชมได้ไม่จำกัด ไม่มีโฆษณาคั่น และรองรับความคมชัดระดับ 4K</p></div>
                  <button type="button">สมัครเลย <ChevronRight /></button>
                </section>
              </>
            )}
          </main>

          <FilterRail
            genre={selectedGenre}
            year={selectedYear}
            quality={selectedQuality}
            onGenre={setSelectedGenre}
            onYear={setSelectedYear}
            onQuality={setSelectedQuality}
          />
        </div>
      </div>

      <nav className="mobileBottomNav" aria-label="เมนูด้านล่าง">
        <button className="active" type="button"><Home /><span>หน้าแรก</span></button>
        <button type="button" onClick={() => setMobileSearchOpen(true)}><Search /><span>ค้นหา</span></button>
        <button type="button"><Bookmark /><span>รายการของฉัน</span></button>
        <button type="button"><Download /><span>ดาวน์โหลด</span></button>
        <button type="button"><UserRound /><span>โปรไฟล์</span></button>
      </nav>

      {mobileMenuOpen && (
        <div className="drawerBackdrop" role="presentation" onMouseDown={() => setMobileMenuOpen(false)}>
          <aside className="mobileDrawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawerHeader"><Brand /><button type="button" onClick={() => setMobileMenuOpen(false)}><X /></button></div>
            <nav>
              {sideNav.map((item, index) => <button key={item.label} className={index === 0 ? "active" : ""} type="button">{item.icon}<span>{item.label}</span></button>)}
            </nav>
            <div className="drawerTheme"><span>{theme === "dark" ? "โหมดมืด" : "โหมดสว่าง"}</span><button type="button" onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}</button></div>
          </aside>
        </div>
      )}

      {selectedMovie && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setSelectedMovie(null)}>
          <section className="movieModal" role="dialog" aria-modal="true" aria-label={`ข้อมูล ${selectedMovie.thaiTitle}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modalClose" type="button" onClick={() => setSelectedMovie(null)} aria-label="ปิด"><X /></button>
            <div className="modalVisual" style={{
              "--poster-a": selectedMovie.palette[0],
              "--poster-b": selectedMovie.palette[1],
              "--poster-c": selectedMovie.palette[2],
            } as PosterStyle}>
              <span className="modalOrb" /><span className="modalBeam" />
              <div className="modalTitleArt"><small>{selectedMovie.thaiTitle}</small><strong>{selectedMovie.title}</strong></div>
            </div>
            <div className="modalContent">
              <span className="modalEyebrow">{selectedMovie.quality} • {selectedMovie.year}</span>
              <h2>{selectedMovie.thaiTitle}</h2>
              <h3>{selectedMovie.title}</h3>
              <div className="modalRating"><Star fill="currentColor" /> {selectedMovie.rating.toFixed(1)} <span>เสียงไทย / ซับไทย</span></div>
              <p>เรื่องราวเข้มข้นที่พาคุณเข้าสู่โลกใหม่ พร้อมภาพและเสียงแบบเต็มอารมณ์ ดูต่อได้ทันทีจากทุกอุปกรณ์</p>
              <div className="modalGenres">{selectedMovie.genres.map((item) => <span key={item}>{item}</span>)}</div>
              <div className="modalActions"><button className="primaryButton" type="button"><Play fill="currentColor" /> ดูเลย</button><button className="secondaryButton" type="button" onClick={() => toggleFavorite(selectedMovie.id)}><Heart fill={favorites.has(selectedMovie.id) ? "currentColor" : "none"} /> {favorites.has(selectedMovie.id) ? "บันทึกแล้ว" : "รายการโปรด"}</button></div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
