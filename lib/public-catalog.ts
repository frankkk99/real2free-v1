export type PlayerKind = "hls" | "embed";
export type PlayerGroupKey = "dub_th" | "sub_th" | "default";
export type PlayerRole = "primary" | "backup";

export type PublicPlayer = {
  id: string;
  label: string;
  groupKey: PlayerGroupKey;
  groupLabel: string;
  role: PlayerRole;
  backupIndex: number;
  url: string;
  kind: PlayerKind;
  fallbackUrl: string | null;
  fallbackKind: PlayerKind | null;
  order: number;
};

export type PlaybackSource = {
  id: string;
  label: string;
  url: string;
  kind: PlayerKind;
  groupKey: PlayerGroupKey;
  role: PlayerRole;
  backupIndex: number;
  order: number;
};

export type PublicPlayerGroup = {
  key: PlayerGroupKey;
  label: string;
  players: PublicPlayer[];
  hasBackup: boolean;
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
  episodeCount: number;
  seasonCount: number;
  latestEpisode: number;
  playerCount: number;
  hasDubThai: boolean;
  hasSubThai: boolean;
  hasBackup: boolean;
  languageCode: string | null;
  isOngoing: boolean;
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
  episode_count: number | string | null;
  season_count: number | string | null;
  latest_episode: number | string | null;
  player_count?: number | string | null;
  has_dub_th?: boolean | null;
  has_sub_th?: boolean | null;
  has_backup?: boolean | null;
  language_code?: string | null;
  is_ongoing?: boolean | null;
  players?: unknown;
};

export type PublicCatalogCardRow = {
  id: string;
  content_type: "movie" | "series";
  title_th: string | null;
  title_en: string | null;
  release_date: string | null;
  year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  rating: number | string | null;
  vote_count: number | null;
  updated_at: string;
  episode_count: number | string | null;
  season_count: number | string | null;
  latest_episode: number | string | null;
  player_count: number | string | null;
  has_dub_th: boolean | null;
  has_sub_th: boolean | null;
  has_backup: boolean | null;
  language_code: string | null;
  is_ongoing: boolean | null;
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
  playerCount: number;
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
  player_count?: number | string | null;
  players?: unknown;
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

// These fields deliberately exclude the URL-bearing `players` JSON column.
export const PUBLIC_CATALOG_FIELDS =
  "id,content_type,title_th,title_en,overview,release_date,year,runtime,poster_url,backdrop_url,genres,rating,vote_count,updated_at,episode_count,season_count,latest_episode,player_count,has_dub_th,has_sub_th,has_backup,language_code,is_ongoing";

export const PUBLIC_CATALOG_CARD_FIELDS =
  "id,content_type,title_th,title_en,release_date,year,poster_url,backdrop_url,genres,rating,vote_count,updated_at,episode_count,season_count,latest_episode,player_count,has_dub_th,has_sub_th,has_backup,language_code,is_ongoing";

// Episodes are now supplied by the secure metadata gateway. Keep this safe list for compatibility.
export const PUBLIC_EPISODE_FIELDS =
  "id,series_id,season_number,episode_number,title,overview,air_date,runtime,still_url,updated_at,player_count";

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

const groupOrder: Record<PlayerGroupKey, number> = {
  dub_th: 0,
  sub_th: 1,
  default: 2,
};

function asKind(value: unknown): PlayerKind {
  return value === "embed" ? "embed" : "hls";
}

function optionalKind(value: unknown): PlayerKind | null {
  if (value === "embed" || value === "hls") return value;
  return null;
}

function asGroupKey(value: unknown): PlayerGroupKey {
  if (value === "dub_th" || value === "sub_th") return value;
  return "default";
}

function asRole(value: unknown): PlayerRole {
  return value === "backup" ? "backup" : "primary";
}

function defaultGroupLabel(key: PlayerGroupKey) {
  if (key === "dub_th") return "พากย์ไทย";
  if (key === "sub_th") return "ซับไทย";
  return "ตัวเลือกรับชม";
}

function numberOrZero(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedLanguageCode(value: unknown) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/u.test(code)) return null;
  if (code === "JA") return "JP";
  if (code === "ZH") return "CN";
  return code;
}

function mappedGenres(value: string[] | null | undefined) {
  const rawGenres = Array.isArray(value) ? value.filter(Boolean) : [];
  return {
    rawGenres,
    genres: rawGenres.map((genre) => genreLabels[genre] || genre),
  };
}

export function parsePublicPlayers(value: unknown): PublicPlayer[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): PublicPlayer[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? "");
    const url = String(row.url ?? "");
    if (!id || !url) return [];

    const groupKey = asGroupKey(row.group_key);
    const role = asRole(row.role);
    const backupIndex = Number(row.backup_index || 0);
    const fallbackUrl = String(row.fallback_url ?? "").trim() || null;

    return [{
      id,
      label: String(row.label ?? (role === "backup" ? `สำรอง ${backupIndex || 1}` : "ตัวหลัก")),
      groupKey,
      groupLabel: String(row.group_label || defaultGroupLabel(groupKey)),
      role,
      backupIndex: Number.isFinite(backupIndex) ? backupIndex : 0,
      url,
      kind: asKind(row.kind),
      fallbackUrl,
      fallbackKind: fallbackUrl ? optionalKind(row.fallback_kind) : null,
      order: Number(row.order ?? 0),
    }];
  }).sort((a, b) => {
    const groupDifference = groupOrder[a.groupKey] - groupOrder[b.groupKey];
    if (groupDifference) return groupDifference;
    if (a.role !== b.role) return a.role === "primary" ? -1 : 1;
    if (a.backupIndex !== b.backupIndex) return a.backupIndex - b.backupIndex;
    return a.order - b.order;
  });
}

export function groupPublicPlayers(players: PublicPlayer[]): PublicPlayerGroup[] {
  const groups = new Map<PlayerGroupKey, PublicPlayerGroup>();

  players.forEach((player) => {
    const current = groups.get(player.groupKey) || {
      key: player.groupKey,
      label: player.groupLabel || defaultGroupLabel(player.groupKey),
      players: [],
      hasBackup: false,
    };
    current.players.push(player);
    current.hasBackup ||= player.role === "backup";
    groups.set(player.groupKey, current);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      players: [...group.players].sort((a, b) => {
        if (a.role !== b.role) return a.role === "primary" ? -1 : 1;
        if (a.backupIndex !== b.backupIndex) return a.backupIndex - b.backupIndex;
        return a.order - b.order;
      }),
    }))
    .sort((a, b) => groupOrder[a.key] - groupOrder[b.key]);
}

export function playerAvailabilityLabels(players: PublicPlayer[]) {
  const groups = groupPublicPlayers(players);
  const labels = groups
    .filter((group) => group.key !== "default")
    .map((group) => group.label);
  const hasBackup = groups.some((group) => group.hasBackup);

  if (!labels.length && players.length) labels.push("พร้อมรับชม");
  if (hasBackup) labels.push("มีสำรอง");
  return [...new Set(labels)];
}

export function preferredPlayerGroup(players: PublicPlayer[]): PlayerGroupKey {
  const groups = groupPublicPlayers(players);
  return groups.find((group) => group.key === "dub_th")?.key
    || groups.find((group) => group.key === "sub_th")?.key
    || groups[0]?.key
    || "default";
}

export function mapPublicCatalogRow(row: PublicCatalogRow | null | undefined): PublicCatalogItem | null {
  if (!row?.id) return null;

  const players = parsePublicPlayers(row.players);
  const groups = groupPublicPlayers(players);
  const genreData = mappedGenres(row.genres);
  const updatedTimestamp = new Date(row.updated_at).getTime();
  const explicitPlayerCount = numberOrZero(row.player_count);
  const hasExplicitOngoing = typeof row.is_ongoing === "boolean";

  return {
    id: row.id,
    contentType: row.content_type === "series" ? "series" : "movie",
    thaiTitle: String(row.title_th || row.title_en || "ไม่ระบุชื่อ"),
    title: String(row.title_en || row.title_th || "ไม่ระบุชื่อ"),
    overview: String(row.overview || ""),
    releaseDate: row.release_date || null,
    year: optionalNumber(row.year),
    runtime: optionalNumber(row.runtime),
    posterUrl: row.poster_url || null,
    backdropUrl: row.backdrop_url || row.poster_url || null,
    ...genreData,
    rating: numberOrZero(row.rating),
    voteCount: numberOrZero(row.vote_count),
    updatedAt: row.updated_at,
    episodeCount: numberOrZero(row.episode_count),
    seasonCount: numberOrZero(row.season_count),
    latestEpisode: numberOrZero(row.latest_episode),
    playerCount: Math.max(explicitPlayerCount, players.length),
    hasDubThai: Boolean(row.has_dub_th) || groups.some((group) => group.key === "dub_th"),
    hasSubThai: Boolean(row.has_sub_th) || groups.some((group) => group.key === "sub_th"),
    hasBackup: Boolean(row.has_backup) || groups.some((group) => group.hasBackup),
    languageCode: normalizedLanguageCode(row.language_code),
    isOngoing: hasExplicitOngoing
      ? Boolean(row.is_ongoing)
      : row.content_type === "series"
        && Number.isFinite(updatedTimestamp)
        && Date.now() - updatedTimestamp <= 45 * 24 * 60 * 60 * 1000,
    players,
  };
}

export function mapPublicCatalogCardRow(row: PublicCatalogCardRow): PublicCatalogItem | null {
  if (!row.id) return null;
  const genreData = mappedGenres(row.genres);

  return {
    id: row.id,
    contentType: row.content_type === "series" ? "series" : "movie",
    thaiTitle: String(row.title_th || row.title_en || "ไม่ระบุชื่อ"),
    title: String(row.title_en || row.title_th || "ไม่ระบุชื่อ"),
    overview: "",
    releaseDate: row.release_date || null,
    year: optionalNumber(row.year),
    runtime: null,
    posterUrl: row.poster_url || null,
    backdropUrl: row.backdrop_url || row.poster_url || null,
    ...genreData,
    rating: numberOrZero(row.rating),
    voteCount: numberOrZero(row.vote_count),
    updatedAt: row.updated_at,
    episodeCount: numberOrZero(row.episode_count),
    seasonCount: numberOrZero(row.season_count),
    latestEpisode: numberOrZero(row.latest_episode),
    playerCount: numberOrZero(row.player_count),
    hasDubThai: Boolean(row.has_dub_th),
    hasSubThai: Boolean(row.has_sub_th),
    hasBackup: Boolean(row.has_backup),
    languageCode: normalizedLanguageCode(row.language_code),
    isOngoing: Boolean(row.is_ongoing),
    players: [],
  };
}

export function mapPublicEpisodeRow(row: PublicEpisodeRow): PublicEpisode | null {
  const players = parsePublicPlayers(row.players);
  const seasonNumber = Number(row.season_number || 1);
  const episodeNumber = Number(row.episode_number || 0);
  const playerCount = Math.max(numberOrZero(row.player_count), players.length);
  if (!row.id || !row.series_id || !episodeNumber || !playerCount) return null;

  return {
    id: row.id,
    seriesId: row.series_id,
    seasonNumber: Number.isFinite(seasonNumber) && seasonNumber > 0 ? seasonNumber : 1,
    episodeNumber,
    title: String(row.title || `ตอนที่ ${episodeNumber}`),
    overview: String(row.overview || ""),
    airDate: row.air_date || null,
    runtime: optionalNumber(row.runtime),
    stillUrl: row.still_url || null,
    updatedAt: row.updated_at,
    playerCount,
    players,
  };
}

export function mapPublicSeriesSummaryRow(row: PublicSeriesSummaryRow): PublicSeriesSummary | null {
  if (!row.series_id) return null;
  return {
    seriesId: row.series_id,
    episodeCount: numberOrZero(row.episode_count),
    seasonCount: numberOrZero(row.season_count),
    firstSeason: numberOrZero(row.first_season) || 1,
    lastSeason: numberOrZero(row.last_season) || 1,
    latestEpisode: numberOrZero(row.latest_episode),
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
