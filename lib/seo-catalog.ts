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

function catalogParams(limit: number, filter: SeoCatalogFilter) {
  const params = new URLSearchParams({
    select: PUBLIC_CATALOG_CARD_FIELDS,
    order: "year.desc.nullslast,release_date.desc.nullslast,rating.desc.nullslast,vote_count.desc.nullslast,updated_at.desc",
    limit: String(Math.max(1, Math.min(limit, 100))),
  });

  if (filter === "movie" || filter === "series") {
    params.set("content_type", `eq.${filter}`);
  } else if (filter === "anime") {
    params.set("genres", "ov.{Animation,Anime}");
  } else if (filter === "new") {
    params.set("year", `eq.${new Date().getUTCFullYear()}`);
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
  const view = filter === "vertical" || filter === "thai"
    ? "real2free_public_smart_cards"
    : "real2free_public_cards";
  const rows = await fetchRows<PublicCatalogCardRow>(
    view,
    catalogParams(limit, filter),
    600,
  );

  return rows
    .map(mapPublicCatalogCardRow)
    .filter((item): item is PublicCatalogItem => Boolean(item));
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
      "real2free_public_cards",
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
