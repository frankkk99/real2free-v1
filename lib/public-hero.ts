export type PublicHeroRow = {
  id: string;
  catalog_id: string | null;
  title_th: string | null;
  title_en: string | null;
  overview: string | null;
  release_date: string | null;
  year: number | string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  trailer_url: string | null;
  detail_url: string | null;
  priority: number | string | null;
  is_watch_ready: boolean | null;
};

export type PublicHeroItem = {
  id: string;
  catalogId: string | null;
  thaiTitle: string;
  title: string;
  overview: string;
  releaseDate: string | null;
  year: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  trailerUrl: string | null;
  detailUrl: string | null;
  priority: number;
  isWatchReady: boolean;
};

export const PUBLIC_HERO_FIELDS =
  "id,catalog_id,title_th,title_en,overview,release_date,year,poster_url,backdrop_url,genres,trailer_url,detail_url,priority,is_watch_ready";

export function mapPublicHeroRow(row: PublicHeroRow): PublicHeroItem | null {
  if (!row.id) return null;
  const parsedYear = Number(row.year);
  const parsedPriority = Number(row.priority || 0);

  return {
    id: row.id,
    catalogId: row.catalog_id || null,
    thaiTitle: String(row.title_th || row.title_en || "เร็ว ๆ นี้"),
    title: String(row.title_en || row.title_th || "Coming Soon"),
    overview: String(row.overview || ""),
    releaseDate: row.release_date || null,
    year: Number.isFinite(parsedYear) ? parsedYear : null,
    posterUrl: row.poster_url || null,
    backdropUrl: row.backdrop_url || row.poster_url || null,
    genres: Array.isArray(row.genres) ? row.genres.filter(Boolean) : [],
    trailerUrl: row.trailer_url || null,
    detailUrl: row.detail_url || null,
    priority: Number.isFinite(parsedPriority) ? parsedPriority : 0,
    isWatchReady: Boolean(row.is_watch_ready),
  };
}

export function heroReleaseLabel(value: string | null) {
  if (!value) return "เร็ว ๆ นี้";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "เร็ว ๆ นี้";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
