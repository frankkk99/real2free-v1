import type { Metadata } from "next";
import HomeBottomInfiniteLoader from "@/components/HomeBottomInfiniteLoader";
import MovieHomeV2, { type HomeSectionsState } from "@/components/MovieHomeV2";
import SeoCatalogLinks from "@/components/SeoCatalogLinks";
import {
  mapPublicCatalogCardRow,
  type PublicCatalogCardRow,
  type PublicCatalogItem,
} from "@/lib/public-catalog";
import { absoluteCatalogUrl, getSeoCatalogPreview } from "@/lib/seo-catalog";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
  description: "ค้นหาหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ พร้อมชื่อไทย ปี ประเภท คะแนน จำนวนตอน และข้อมูลอัปเดตล่าสุดบน REAL2FREE",
  alternates: { canonical: "/" },
  openGraph: {
    title: "REAL2FREE ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
    description: "ค้นหาหนัง ซีรีส์ และอนิเมะ พร้อมข้อมูลชื่อ ปี ประเภท คะแนน และจำนวนตอน",
    url: "/",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "REAL2FREE ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
    description: "ค้นหาหนัง ซีรีส์ และอนิเมะ พร้อมข้อมูลอัปเดตล่าสุด",
  },
};

const HOME_SECTION_LIMIT = 24;
const HOME_SECTION_FIELDS = "section_key,section_rank,id,content_type,title_th,title_en,release_date,year,poster_url,backdrop_url,genres,rating,vote_count,updated_at,episode_count,season_count,latest_episode,player_count,has_dub_th,has_sub_th,has_backup,language_code,is_ongoing";
const RESET_HOME_BROWSE_STATE_SCRIPT = `
try {
  window.localStorage.removeItem("real2free-browse-state-v1");
} catch {}
`;

type HomeSectionKey = keyof HomeSectionsState;
type HomeSectionRow = PublicCatalogCardRow & {
  section_key: HomeSectionKey;
  section_rank: number;
};

function emptyHomeSections(): HomeSectionsState {
  return { new: [], series: [], vertical: [], thai: [] };
}

async function getInitialHomeSections(): Promise<HomeSectionsState> {
  const params = new URLSearchParams({
    select: HOME_SECTION_FIELDS,
    order: "section_key.asc,section_rank.asc",
    limit: String(HOME_SECTION_LIMIT * 4),
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/real2free_public_home_sections?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error(`Homepage sections returned HTTP ${response.status}`);
  const payload = await response.json().catch(() => []);
  const sections = emptyHomeSections();

  (Array.isArray(payload) ? payload as HomeSectionRow[] : []).forEach((row) => {
    if (!(row.section_key in sections)) return;
    const item = mapPublicCatalogCardRow(row);
    if (item && sections[row.section_key].length < HOME_SECTION_LIMIT) sections[row.section_key].push(item);
  });

  return sections;
}

function fallbackHomeSections(items: PublicCatalogItem[]): HomeSectionsState {
  const sections = emptyHomeSections();
  const verticalTerms = new Set(["ซีรีส์แนวตั้ง", "ละครสั้นจีน"]);

  for (const item of items) {
    if (item.contentType === "movie" && sections.new.length < HOME_SECTION_LIMIT) sections.new.push(item);
    if (item.contentType === "series") {
      const isVertical = item.rawGenres.some((genre) => verticalTerms.has(genre));
      const key: HomeSectionKey = isVertical ? "vertical" : "series";
      if (sections[key].length < HOME_SECTION_LIMIT) sections[key].push(item);
    }
    if (item.contentType === "movie" && (item.isThai || item.languageCode === "TH") && sections.thai.length < HOME_SECTION_LIMIT) {
      sections.thai.push(item);
    }
  }

  return sections;
}

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function HomePage() {
  const [items, loadedSections] = await Promise.all([
    getSeoCatalogPreview(24).catch(() => []),
    getInitialHomeSections().catch(() => null),
  ]);
  const initialHomeSections = loadedSections || fallbackHomeSections(items);
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "REAL2FREE",
    alternateName: ["Real2Free", "REAL 2 FREE"],
    url: "https://www.real2free.online/",
    inLanguage: "th-TH",
    description: "ค้นหาหนัง ซีรีส์ และอนิเมะ พร้อมข้อมูลชื่อ ปี ประเภท คะแนน และจำนวนตอน",
  };
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "หนังและซีรีส์อัปเดตล่าสุดบน REAL2FREE",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteCatalogUrl(item),
      item: {
        "@type": item.contentType === "series" ? "TVSeries" : "Movie",
        name: item.thaiTitle,
        alternateName: item.title !== item.thaiTitle ? item.title : undefined,
        image: item.posterUrl || item.backdropUrl || undefined,
        genre: item.genres,
        url: absoluteCatalogUrl(item),
      },
    })),
  };

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: RESET_HOME_BROWSE_STATE_SCRIPT }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }} />
      {items.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema) }} /> : null}
      <MovieHomeV2 initialItems={items} initialHomeSections={initialHomeSections} />
      <HomeBottomInfiniteLoader />
      <SeoCatalogLinks items={items} />
    </>
  );
}
