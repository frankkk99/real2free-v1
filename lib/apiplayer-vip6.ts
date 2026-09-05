import "server-only";

import {
  mapPublicCatalogCardRow,
  mapPublicCatalogRow,
  mapPublicEpisodeRow,
  type PublicCatalogCardRow,
  type PublicCatalogItem,
  type PublicEpisode,
} from "@/lib/public-catalog";

type ApiItem = {
  id: string;
  content_type: "movie" | "series";
  title_th?: string | null;
  title_en?: string | null;
  original_title?: string | null;
  overview?: string | null;
  release_date?: string | null;
  year?: number | null;
  runtime?: number | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  genres?: string[] | null;
  rating?: number | string | null;
  vote_count?: number | string | null;
  updated_at?: string | null;
  readiness?: string | null;
  active_player_count?: number | string | null;
  player_count?: number | string | null;
  total_episode_count?: number | string | null;
  ready_episode_count?: number | string | null;
  missing_episode_count?: number | string | null;
};

type ApiPlayer = {
  id?: string | null;
  label?: string | null;
  url: string;
  kind?: "embed" | "hls" | string | null;
  type?: "embed" | "hls" | "video" | string | null;
  group_key?: string | null;
  role?: string | null;
  backup_index?: number | null;
  sort_order?: number | null;
};

type ApiEpisode = {
  id: string;
  episodeNumber: number;
  title?: string | null;
  overview?: string | null;
  airDate?: string | null;
  runtime?: number | null;
  stillUrl?: string | null;
  updatedAt?: string | null;
  players?: ApiPlayer[];
};

type ApiDetail = { item: ApiItem; players?: ApiPlayer[]; seasons?: Array<{ seasonNumber: number; episodes: ApiEpisode[] }> };

const API_ORIGIN = (process.env.APIPLAYER_API_URL || "https://www.apiplayer.online").replace(/\/$/, "");
const API_DOMAIN = process.env.APIPLAYER_CLIENT_DOMAIN || "real2free.online";

export function vip6ApiConfigured() {
  return Boolean(process.env.APIPLAYER_API_KEY?.trim());
}

async function apiFetch<T>(path: string, params?: URLSearchParams): Promise<T> {
  const key = process.env.APIPLAYER_API_KEY?.trim();
  if (!key) throw new Error("APIPlayer wrapper misconfigured: missing APIPLAYER_API_KEY");
  const url = new URL(path, API_ORIGIN);
  if (params) url.search = params.toString();
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "x-api-key": key,
      "x-client-domain": API_DOMAIN,
    },
  });
  const payload = await response.json().catch(() => null) as (T & { ok?: boolean; error?: string }) | null;
  if (!response.ok || !payload || payload.ok === false) {
    throw new Error(payload?.error || `APIPlayer wrapper HTTP ${response.status} on ${path}`);
  }
  return payload;
}

export async function fetchVip6Catalog(input: { page?: number; limit?: number; type?: "all" | "movie" | "series"; player?: "all" | "ready" | "pending" | "broken"; q?: string }) {
  const params = new URLSearchParams({
    page: String(Math.max(1, input.page || 1)),
    limit: String(Math.min(100, Math.max(1, input.limit || 24))),
    type: input.type || "all",
    player: input.player || "all",
    sort: "newest",
  });
  if (input.q?.trim()) params.set("q", input.q.trim().slice(0, 100));
  return apiFetch<{ items: ApiItem[]; page: number; pageSize: number; total: number | null; hasMore: boolean }>("/api/v1/vip/catalog", params);
}

export function vip6Card(row: ApiItem): PublicCatalogItem | null {
  const card = mapPublicCatalogCardRow({
    id: row.id,
    content_type: row.content_type,
    title_th: row.title_th ?? null,
    title_en: row.title_en ?? null,
    release_date: row.release_date ?? null,
    year: row.year ?? null,
    poster_url: row.poster_url ?? null,
    backdrop_url: row.backdrop_url ?? null,
    genres: row.genres ?? null,
    rating: row.rating ?? null,
    vote_count: row.vote_count ? Number(row.vote_count) : null,
    updated_at: row.updated_at || new Date().toISOString(),
    episode_count: row.total_episode_count ? Number(row.total_episode_count) : 0,
    season_count: null,
    latest_episode: null,
    player_count: row.player_count ? Number(row.player_count) : 0,
    has_dub_th: null,
    has_sub_th: null,
    has_backup: false,
    language_code: null,
    is_ongoing: null,
  } satisfies PublicCatalogCardRow);
  return card;
}

export async function fetchVip6Detail(id: string) {
  const detail = await apiFetch<ApiDetail>(`/api/v1/catalog/${encodeURIComponent(id)}`);
  const item = mapPublicCatalogRow({
    id: detail.item.id,
    content_type: detail.item.content_type,
    title_th: detail.item.title_th ?? null,
    title_en: detail.item.title_en ?? null,
    overview: detail.item.overview ?? null,
    release_date: detail.item.release_date ?? null,
    year: detail.item.year ?? null,
    runtime: detail.item.runtime ?? null,
    poster_url: detail.item.poster_url ?? null,
    backdrop_url: detail.item.backdrop_url ?? null,
    genres: detail.item.genres ?? null,
    rating: detail.item.rating ?? null,
    vote_count: detail.item.vote_count ? Number(detail.item.vote_count) : null,
    updated_at: detail.item.updated_at || new Date().toISOString(),
    episode_count: detail.item.total_episode_count ? Number(detail.item.total_episode_count) : 0,
    season_count: null,
    latest_episode: null,
    player_count: detail.item.player_count ? Number(detail.item.player_count) : 0,
    has_dub_th: null,
    has_sub_th: null,
    has_backup: false,
    language_code: null,
    is_ongoing: null,
    players: detail.players || [],
  });
  if (!item) return null;

  const episodes: PublicEpisode[] = (detail.seasons || []).flatMap((season) => (
    (season.episodes || []).map((episode) => mapPublicEpisodeRow({
      id: episode.id,
      series_id: detail.item.id,
      season_number: season.seasonNumber,
      episode_number: episode.episodeNumber,
      title: episode.title ?? null,
      overview: episode.overview ?? null,
      air_date: episode.airDate ?? null,
      runtime: episode.runtime ?? null,
      still_url: episode.stillUrl ?? null,
      updated_at: episode.updatedAt || new Date().toISOString(),
      player_count: Array.isArray(episode.players) ? episode.players.length : 0,
      players: episode.players || [],
    })).filter((value): value is PublicEpisode => Boolean(value))
  ));

  return { item, episodes };
}

export async function fetchVip6Playback(titleId: string, episodeId: string | null, index: number) {
  const path = episodeId
    ? `/api/v1/player/${encodeURIComponent(titleId)}/episode/${encodeURIComponent(episodeId)}`
    : `/api/v1/player/${encodeURIComponent(titleId)}`;
  const payload = await apiFetch<{ data?: { players?: ApiPlayer[] } }>(path);
  const players = Array.isArray(payload.data?.players) ? payload.data.players : [];
  const selected = players[index] || null;
  const selectedType = String(selected?.kind || selected?.type || '').toLowerCase();
  return {
    fallback_url: null,
    fallback_kind: null,
    found: Boolean(selected?.url),
    id: selected?.id || "",
    label: selected?.label || (index === 0 ? "ตัวหลัก" : `สำรอง ${index}`),
    url: selected?.url || "",
    kind: selectedType === "hls" ? "hls" as const : "embed" as const,
    group_key: selected?.group_key === "dub_th" || selected?.group_key === "sub_th" ? selected.group_key : "default" as const,
    role: selected?.role === "backup" ? "backup" as const : "primary" as const,
    backup_index: Number(selected?.backup_index || index),
    order: Number(selected?.sort_order || index),
    index,
    total: players.length,
    has_next: index + 1 < players.length,
  };
}
