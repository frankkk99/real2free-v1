import "server-only";

import {
  mapPublicCatalogCardRow,
  PUBLIC_CATALOG_CARD_FIELDS,
  type PublicCatalogCardRow,
  type PublicCatalogItem,
} from "@/lib/public-catalog";
import {
  catalogPath,
  catalogSlug,
  normalizeCatalogSlug,
  type CatalogUrlItem,
} from "@/lib/catalog-url";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { fetchVip6Catalog, vip6ApiConfigured, vip6Card } from "@/lib/apiplayer-vip6";

export type SeoCatalogFilter = "all" | "movie" | "series" | "anime" | "new" | "popular" | "vertical" | "thai";

export type SeoSitemapEntry = CatalogUrlItem & {
  id: string;
  updatedAt: string;
};

export type SeoSlugResolution = {
  id: string;
  contentType: "movie" | "series";
};

type SeoSlugLookupRow = {
  id: string;
  content_type: "movie" | "series";
  title_th: string | null;
  title_en: string | null;
  year: number | null;
};

const SITE_URL = "https://www.real2free.online";
const SMART_CATALOG_VIEW = "real2free_public_smart_cards";
const SEO_PREVIEW_BATCH_SIZE = 100;
const SEO_PREVIEW_MAX_ROWS = 500;
const SITEMAP_PAGE_SIZE = 1000;
const SITEMAP_MAX_ROWS = 10000;
const SLUG_LOOKUP_PAGE_SIZE = 500;
const SLUG_LOOKUP_MAX_ROWS = 10000;

function upstreamUrl(view: string, params: URLSearchParams) {
  return `${SUPABASE_URL}/rest/v1/${view}?${params.toString()}`;
}

async function fetchRows<T>(view: string, params: URLSearchParams, revalidate = 900): Promise<T[]> {
  const response = await fetch(upstreamUrl(view, params), {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      accept: "application/json",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`SEO catalog ${view} returned HTTP ${response.status}`);
  }

  const payload = await response.json().catch(() => []);
  return Array.isArray(payload) ? payload as T[] : [];
}

function catalogParams(limit: number, filter: SeoCatalogFilter, offset = 0) {
  const order = filter === "new"
    ? "release_date.desc.nullslast,year.desc.nullslast,updated_at.desc,rating.desc.nullslast,vote_count.desc.nullslast"
    : "year.desc.nullslast,release_date.desc.nullslast,rating.desc.nullslast,vote_count.desc.nullslast,updated_at.desc";

  const params = new URLSearchParams({
    select: PUBLIC_CATALOG_CARD_FIELDS,
    order,
    limit: String(Math.max(1, Math.min(limit, SEO_PREVIEW_BATCH_SIZE))),
    offset: String(Math.max(0, offset)),
  });

  if (filter === "movie") {
    params.set("content_type", "eq.movie");
  } else if (filter === "series") {
    params.set("content_type", "eq.series");
    params.set("is_vertical", "eq.false");
  } else if (filter === "anime") {
    params.set("genres", "ov.{Animation,Anime}");
  } else if (filter === "popular") {
    params.set("rating", "gte.6");
  } else if (filter === "vertical") {
    params.set("content_type", "eq.series");
    params.set("is_vertical", "eq.true");
  } else if (filter === "thai") {
    params.set("content_type", "eq.movie");
    params.set("is_thai", "eq.true");
  }

  return params;
}

export async function getSeoCatalogPreview(
  limit = 24,
  filter: SeoCatalogFilter = "all",
): Promise<PublicCatalogItem[]> {
  const targetLimit = Math.max(1, Math.min(limit, SEO_PREVIEW_MAX_ROWS));

  if (vip6ApiConfigured()) {
    const type = filter === "movie" ? "movie" : filter === "series" || filter === "vertical" ? "series" : "all";
    const response = await fetchVip6Catalog({ page: 1, limit: Math.min(targetLimit, 100), type, player: "all" });
    return response.items.map(vip6Card).filter((item): item is PublicCatalogItem => Boolean(item));
  }
  const rows: PublicCatalogCardRow[] = [];

  for (let offset = 0; offset < targetLimit; offset += SEO_PREVIEW_BATCH_SIZE) {
    const batchLimit = Math.min(SEO_PREVIEW_BATCH_SIZE, targetLimit - offset);
    const batch = await fetchRows<PublicCatalogCardRow>(
      SMART_CATALOG_VIEW,
      catalogParams(batchLimit, filter, offset),
      600,
    );

    rows.push(...batch);
    if (batch.length < batchLimit) break;
  }

  const deduped = new Map<string, PublicCatalogItem>();
  rows.forEach((row) => {
    const item = mapPublicCatalogCardRow(row);
    if (item) deduped.set(item.id, item);
  });

  return [...deduped.values()];
}

export async function getSeoSitemapEntries(): Promise<SeoSitemapEntry[]> {
  const output: SeoSitemapEntry[] = [];

  for (let offset = 0; offset < SITEMAP_MAX_ROWS; offset += SITEMAP_PAGE_SIZE) {
    const params = new URLSearchParams({
      select: "id,updated_at,content_type,title_th,title_en,year",
      order: "updated_at.desc",
      limit: String(SITEMAP_PAGE_SIZE),
      offset: String(offset),
    });
    const rows = await fetchRows<{
      id?: string;
      updated_at?: string;
      content_type?: "movie" | "series";
      title_th?: string | null;
      title_en?: string | null;
      year?: number | null;
    }>(SMART_CATALOG_VIEW, params, 3600);

    for (const row of rows) {
      if (!row.id || (row.content_type !== "movie" && row.content_type !== "series")) continue;
      const thaiTitle = String(row.title_th || row.title_en || "").trim();
      const title = String(row.title_en || row.title_th || "").trim();
      if (!thaiTitle && !title) continue;

      output.push({
        id: row.id,
        updatedAt: row.updated_at || new Date().toISOString(),
        contentType: row.content_type,
        thaiTitle: thaiTitle || title,
        title: title || thaiTitle,
        year: typeof row.year === "number" ? row.year : null,
      });
    }

    if (rows.length < SITEMAP_PAGE_SIZE) break;
  }

  return output;
}

async function findSlugMatch(
  targetSlug: string,
  expectedContentType: "movie" | "series" | null | undefined,
  yearFilter: number | null,
): Promise<SeoSlugResolution | null> {
  for (let offset = 0; offset < SLUG_LOOKUP_MAX_ROWS; offset += SLUG_LOOKUP_PAGE_SIZE) {
    const params = new URLSearchParams({
      select: "id,content_type,title_th,title_en,year",
      order: "updated_at.desc",
      limit: String(SLUG_LOOKUP_PAGE_SIZE),
      offset: String(offset),
    });

    if (expectedContentType) params.set("content_type", `eq.${expectedContentType}`);
    if (yearFilter !== null) params.set("year", `eq.${yearFilter}`);

    const rows = await fetchRows<SeoSlugLookupRow>(SMART_CATALOG_VIEW, params, 3600);
    for (const row of rows) {
      if (!row.id || (row.content_type !== "movie" && row.content_type !== "series")) continue;
      const candidate: CatalogUrlItem = {
        contentType: row.content_type,
        thaiTitle: String(row.title_th || row.title_en || "").trim(),
        title: String(row.title_en || row.title_th || "").trim(),
        year: typeof row.year === "number" ? row.year : null,
      };

      if (catalogSlug(candidate) === targetSlug) {
        return { id: row.id, contentType: row.content_type };
      }
    }

    if (rows.length < SLUG_LOOKUP_PAGE_SIZE) break;
  }

  return null;
}

export async function resolveSeoCatalogSlug(
  slug: string,
  expectedContentType?: "movie" | "series" | null,
): Promise<SeoSlugResolution | null> {
  const targetSlug = normalizeCatalogSlug(slug);
  if (!targetSlug) return null;

  if (vip6ApiConfigured()) {
    const query = targetSlug.replace(/-\d{4}$/u, "").replace(/-/g, " ").trim();
    const type = expectedContentType === "movie" ? "movie" : expectedContentType === "series" ? "series" : "all";
    const response = await fetchVip6Catalog({ page: 1, limit: 100, type, player: "all", q: query });
    const match = response.items
      .map(vip6Card)
      .find((item) => item && catalogSlug(item) === targetSlug);
    if (match) return { id: match.id, contentType: match.contentType };
  }

  const yearMatch = targetSlug.match(/-(\d{4})$/u);
  const parsedYear = yearMatch ? Number(yearMatch[1]) : null;
  const targetYear = parsedYear !== null && parsedYear >= 1900 && parsedYear <= 2200
    ? parsedYear
    : null;

  if (targetYear !== null) {
    const yearMatchResult = await findSlugMatch(targetSlug, expectedContentType, targetYear);
    if (yearMatchResult) return yearMatchResult;
  }

  return findSlugMatch(targetSlug, expectedContentType, null);
}

export function absoluteCatalogUrl(item: CatalogUrlItem) {
  return `${SITE_URL}${catalogPath(item)}`;
}

// Kept only for old links during the migration. /watch/:id permanently redirects
// to the readable canonical URL once the title metadata has been resolved.
export function absoluteWatchUrl(id: string) {
  return `${SITE_URL}/watch/${encodeURIComponent(id)}`;
}
