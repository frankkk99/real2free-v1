import type { MetadataRoute } from "next";
import { absoluteCatalogUrl, getSeoSitemapEntries } from "@/lib/seo-catalog";

const SITE_URL = "https://www.real2free.online";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/movies`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/series`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/anime`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/new`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/popular`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  const items = await getSeoSitemapEntries().catch(() => []);
  return [
    ...staticEntries,
    ...items.map((item) => ({
      url: absoluteCatalogUrl(item),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
