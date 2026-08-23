import "server-only";

import {
  mapPublicCatalogCardRow,
  PUBLIC_CATALOG_CARD_FIELDS,
  type PublicCatalogCardRow,
  type PublicCatalogItem,
} from "@/lib/public-catalog";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export type SeoCatalogFilter = "all" | "movie" | "series" | "anime" | "new" | "popular" | "vertical" | "thai";

export type SeoSitemapEntry = {
  id: string;
  updatedAt: string;
};

const SITE_URL = "https://www.real2free.online";
const SMART_CATALOG_VIEW = "real2free_public_smart_cards";
const SEO_PREVIEW_BATCH_SIZE = 100;
const SEO_PREVIEW_MAX_ROWS = 500;
const SITEMAP_PAGE_SIZE = 1000;
const SITEMAP_MAX_ROWS = 2000;

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
      select: "id,updated_at",
      order: "updated_at.desc",
      limit: String(SITEMAP_PAGE_SIZE),
      offset: String(offset),
    });
    const rows = await fetchRows<Array<{ id?: string; updated_at?: string }>[number]>(
      SMART_CATALOG_VIEW,
      params,
      3600,
    );

    for (const row of rows) {
      if (!row.id) continue;
      output.push({
        id: row.id,
        updatedAt: row.updated_at || new Date().toISOString(),
      });
    }

    if (rows.length < SITEMAP_PAGE_SIZE) break;
  }

  return output;
}

export function absoluteWatchUrl(id: string) {
  return `${SITE_URL}/watch/${encodeURIComponent(id)}`;
}
