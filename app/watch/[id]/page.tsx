import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import WatchExperience from "@/components/WatchExperience";
import { catalogSlug, normalizeCatalogSlug, watchPath } from "@/lib/catalog-url";
import {
  loadCatalogDetailById,
  SITE_URL,
  UUID_PATTERN,
} from "@/lib/catalog-detail-page";
import { resolveSeoCatalogSlug } from "@/lib/seo-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resolveWatchReference = cache(async (reference: string) => {
  if (UUID_PATTERN.test(reference)) return loadCatalogDetailById(reference);

  const resolved = await resolveSeoCatalogSlug(reference, null);
  if (!resolved) return null;
  return loadCatalogDetailById(resolved.id);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await resolveWatchReference(id);
  if (!detail) notFound();

  const { item } = detail;
  const typeLabel = item.contentType === "series" ? "ซีรีส์" : "หนัง";
  const yearLabel = item.year ? ` (${item.year})` : "";
  const canonical = watchPath(item);
  const title = `ดู ${item.thaiTitle}${yearLabel}`;
  const description = item.overview?.trim()
    ? item.overview.replace(/\s+/g, " ").trim().slice(0, 180)
    : `รับชม${typeLabel} ${item.thaiTitle}${yearLabel} บน REAL2FREE`;
  const socialImage = `${SITE_URL}/api/og/watch/${encodeURIComponent(item.id)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: `${title} | REAL2FREE`,
      description,
      url: canonical,
      siteName: "REAL2FREE",
      locale: "th_TH",
      type: "website",
      images: [{
        url: socialImage,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: `REAL2FREE • ${item.thaiTitle}`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | REAL2FREE`,
      description,
      images: [socialImage],
    },
  };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await resolveWatchReference(id);
  if (!detail) notFound();

  const { item, episodes } = detail;
  const canonicalSlug = catalogSlug(item);

  if (UUID_PATTERN.test(id) || normalizeCatalogSlug(id) !== canonicalSlug) {
    permanentRedirect(watchPath(item));
  }

  // VIP6 detail responses intentionally do not need to embed live player URLs.
  // A canonical episode id is enough to let the uncached playback endpoint
  // determine current availability when the user actually presses play.
  const selectableEpisodes = episodes.map((episode) => ({
    ...episode,
    playerCount: episode.id ? Math.max(1, Number(episode.playerCount || 0)) : episode.playerCount,
  }));

  return <WatchExperience item={item} episodes={selectableEpisodes} />;
}
