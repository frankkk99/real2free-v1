export type PlayerKind = "hls" | "embed";

export type PublicPlayer = {
  id: string;
  label: string;
  url: string;
  kind: PlayerKind;
  fallbackUrl: string | null;
  fallbackKind: PlayerKind | null;
  order: number;
};

export type PublicCatalogItem = {
  id: string;
  contentType: "movie" | "series";
  thaiTitle: string;
  title: string;
  overview: string;
  releaseDate: string | null;
  year: number | null;
  runtime: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  rawGenres: string[];
  genres: string[];
  rating: number;
  voteCount: number;
  updatedAt: string;
  players: PublicPlayer[];
};

export type PublicCatalogRow = {
  id: string;
  content_type: "movie" | "series";
  title_th: string | null;
  title_en: string | null;
  overview: string | null;
  release_date: string | null;
  year: number | null;
  runtime: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  rating: number | string | null;
  vote_count: number | null;
  updated_at: string;
  players: unknown;
};

export type PublicEpisode = {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
  stillUrl: string | null;
  updatedAt: string;
  players: PublicPlayer[];
};

export type PublicEpisodeRow = {
  id: string;
  series_id: string;
  season_number: number | null;
  episode_number: number | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  runtime: number | null;
  still_url: string | null;
  updated_at: string;
  players: unknown;
};

export type PublicSeriesSummary = {
  seriesId: string;
  episodeCount: number;
  seasonCount: number;
  firstSeason: number;
  lastSeason: number;
  latestEpisode: number;
};

export type PublicSeriesSummaryRow = {
  series_id: string;
  episode_count: number | string | null;
  season_count: number | string | null;
  first_season: number | string | null;
  last_season: number | string | null;
  latest_episode: number | string | null;
};

export const PUBLIC_CATALOG_FIELDS =
  "id,content_type,title_th,title_en,overview,release_date,year,runtime,poster_url,backdrop_url,genres,rating,vote_count,updated_at,players";

export const PUBLIC_EPISODE_FIELDS =
  "id,series_id,season_number,episode_number,title,overview,air_date,runtime,still_url,updated_at,players";

export const PUBLIC_SERIES_SUMMARY_FIELDS =
  "series_id,episode_count,season_count,first_season,last_season,latest_episode";

export const FAVORITES_KEY = "real2free-favorites";
export const HISTORY_KEY = "real2free-history";

const genreLabels: Record<string, string> = {
  Action: "แอ็กชัน",
  Adventure: "ผจญภัย",
  Animation: "แอนิเมชัน",
  Anime: "อนิเมะ",
  Comedy: "ตลก",
  Crime: "อาชญากรรม",
  Documentary: "สารคดี",
  Drama: "ดราม่า",
  Family: "ครอบครัว",
  Fantasy: "แฟนตาซี",
  History: "ประวัติศาสตร์",
  Horror: "สยองขวัญ",
  Music: "ดนตรี",
  Mystery: "ลึกลับ",
  Romance: "โรแมนติก",
  "Science Fiction": "ไซไฟ",
  Thriller: "ระทึกขวัญ",
  War: "สงคราม",
  Western: "ตะวันตก",
  "TV Movie": "ภาพยนตร์โทรทัศน์",
};

function asKind(value: unknown): PlayerKind {
  return value === "embed" ? "embed" : "hls";
}

function optionalKind(value: unknown): PlayerKind | null {
  if (value === "embed" || value === "hls") return value;
  return null;
}

export function parsePublicPlayers(value: unknown): PublicPlayer[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): PublicPlayer[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? "");
    const url = String(row.url ?? "");
    if (!id || !url) return [];

    const fallbackUrl = String(row.fallback_url ?? "").trim() || null;
    return [{
      id,
      label: String(row.label ?? "รับชม"),
      url,
      kind: asKind(row.kind),
      fallbackUrl,
      fallbackKind: fallbackUrl ? optionalKind(row.fallback_kind) : null,
      order: Number(row.order ?? 0),
    }];
  }).sort((a, b) => a.order - b.order);
}

export function mapPublicCatalogRow(row: PublicCatalogRow): PublicCatalogItem | null {
  const players = parsePublicPlayers(row.players);
  if (!row.id || !players.length) return null;

  const rawGenres = Array.isArray(row.genres) ? row.genres.filter(Boolean) : [];
  return {
    id: row.id,
    contentType: row.content_type === "series" ? "series" : "movie",
    thaiTitle: String(row.title_th || row.title_en || "ไม่ระบุชื่อ"),
    title: String(row.title_en || row.title_th || "ไม่ระบุชื่อ"),
    overview: String(row.overview || ""),
    releaseDate: row.release_date || null,
    year: Number.isFinite(Number(row.year)) ? Number(row.year) : null,
    runtime: Number.isFinite(Number(row.runtime)) ? Number(row.runtime) : null,
    posterUrl: row.poster_url || null,
    backdropUrl: row.backdrop_url || row.poster_url || null,
    rawGenres,
    genres: rawGenres.map((genre) => genreLabels[genre] || genre),
    rating: Number.isFinite(Number(row.rating)) ? Number(row.rating) : 0,
    voteCount: Number(row.vote_count || 0),
    updatedAt: row.updated_at,
    players,
  };
}

export function mapPublicEpisodeRow(row: PublicEpisodeRow): PublicEpisode | null {
  const players = parsePublicPlayers(row.players);
  const seasonNumber = Number(row.season_number || 1);
  const episodeNumber = Number(row.episode_number || 0);
  if (!row.id || !row.series_id || !episodeNumber || !players.length) return null;

  return {
    id: row.id,
    seriesId: row.series_id,
    seasonNumber: Number.isFinite(seasonNumber) && seasonNumber > 0 ? seasonNumber : 1,
    episodeNumber,
    title: String(row.title || `ตอนที่ ${episodeNumber}`),
    overview: String(row.overview || ""),
    airDate: row.air_date || null,
    runtime: Number.isFinite(Number(row.runtime)) ? Number(row.runtime) : null,
    stillUrl: row.still_url || null,
    updatedAt: row.updated_at,
    players,
  };
}

export function mapPublicSeriesSummaryRow(row: PublicSeriesSummaryRow): PublicSeriesSummary | null {
  if (!row.series_id) return null;
  return {
    seriesId: row.series_id,
    episodeCount: Number(row.episode_count || 0),
    seasonCount: Number(row.season_count || 0),
    firstSeason: Number(row.first_season || 1),
    lastSeason: Number(row.last_season || 1),
    latestEpisode: Number(row.latest_episode || 0),
  };
}

export function runtimeLabel(minutes: number | null) {
  if (!minutes || minutes < 1) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} นาที`;
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`;
}

export function contentTypeLabel(type: PublicCatalogItem["contentType"]) {
  return type === "series" ? "ซีรีส์" : "ภาพยนตร์";
}

export function cleanCatalogSearch(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}\s.-]/gu, " ").replace(/\s+/g, " ").slice(0, 80);
}
