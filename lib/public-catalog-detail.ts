import "server-only";

import { cache } from "react";
import {
  mapPublicCatalogRow,
  mapPublicEpisodeRow,
  PUBLIC_CATALOG_FIELDS,
  PUBLIC_EPISODE_FIELDS,
  type PublicCatalogItem,
  type PublicCatalogRow,
  type PublicEpisode,
  type PublicEpisodeRow,
} from "@/lib/public-catalog";
import { resolveSeoCatalogSlug } from "@/lib/seo-catalog";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export type PublicCatalogDetail = {
  item: PublicCatalogItem;
  episodes: PublicEpisode[];
};

const DETAIL_REVALIDATE_SECONDS = 21_600;
const TITLES_VIEW = "real2free_public_titles";
const EPISODES_VIEW = "real2free_public_episodes";

function publicViewUrl(view: string, params: URLSearchParams) {
  return `${SUPABASE_URL}/rest/v1/${view}?${params.toString()}`;
}

async function fetchRows<T>(view: string, params: URLSearchParams): Promise<T[]> {
  const response = await fetch(publicViewUrl(view, params), {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      accept: "application/json",
    },
    next: { revalidate: DETAIL_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Public catalog detail ${view} returned HTTP ${response.status}`);
  }

  const payload = await response.json().catch(() => []);
  return Array.isArray(payload) ? payload as T[] : [];
}

export const loadPublicCatalogDetailById = cache(async (
  id: string,
): Promise<PublicCatalogDetail | null> => {
  const titleParams = new URLSearchParams({
    select: PUBLIC_CATALOG_FIELDS,
    id: `eq.${id}`,
    limit: "1",
  });
  const [titleRow] = await fetchRows<PublicCatalogRow>(TITLES_VIEW, titleParams);
  const item = mapPublicCatalogRow(titleRow);
  if (!item) return null;

  if (item.contentType !== "series") {
    return { item, episodes: [] };
  }

  const episodeParams = new URLSearchParams({
    select: PUBLIC_EPISODE_FIELDS,
    series_id: `eq.${id}`,
    order: "season_number.asc,episode_number.asc",
    limit: "1000",
  });
  const episodeRows = await fetchRows<PublicEpisodeRow>(EPISODES_VIEW, episodeParams);
  const episodes = episodeRows
    .map(mapPublicEpisodeRow)
    .filter((episode): episode is PublicEpisode => Boolean(episode));

  return { item, episodes };
});

export const loadPublicCatalogDetailBySlug = cache(async (
  slug: string,
  expectedContentType: "movie" | "series",
): Promise<PublicCatalogDetail | null> => {
  const resolved = await resolveSeoCatalogSlug(slug, expectedContentType);
  if (!resolved || resolved.contentType !== expectedContentType) return null;

  const detail = await loadPublicCatalogDetailById(resolved.id);
  if (!detail || detail.item.contentType !== expectedContentType) return null;
  return detail;
});
