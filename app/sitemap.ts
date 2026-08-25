import type { MetadataRoute } from "next";
import { absoluteCatalogUrl, getSeoSitemapEntries } from "@/lib/seo-catalog";

const SITE_URL = "https://www.real2free.online";

export const revalidate = 3600;

function latestModified(
  items: Awaited<ReturnType<typeof getSeoSitemapEntries>>,
  contentType?: "movie" | "series",
) {
  let latest = 0;
  for (const item of items) {
    if (contentType && item.contentType !== contentType) continue;
    const timestamp = Date.parse(item.updatedAt);
    if (Number.isFinite(timestamp) && timestamp > latest) latest = timestamp;
  }
  return latest > 0 ? new Date(latest) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await getSeoSitemapEntries().catch(() => []);
  const catalogModified = latestModified(items);
  const moviesModified = latestModified(items, "movie");
  const seriesModified = latestModified(items, "series");

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: catalogModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/movies`, lastModified: moviesModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/series`, lastModified: seriesModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/anime`, lastModified: catalogModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/new`, lastModified: catalogModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/popular`, lastModified: catalogModified, changeFrequency: "daily", priority: 0.8 },
  ];

  return [
    ...staticEntries,
    ...items.map((item) => {
      const modified = new Date(item.updatedAt);
      return {
        url: absoluteCatalogUrl(item),
        lastModified: Number.isNaN(modified.getTime()) ? undefined : modified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    }),
  ];
}
