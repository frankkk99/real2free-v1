import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import WatchExperience from "@/components/WatchExperience";
import { catalogSlug, normalizeCatalogSlug, watchPath } from "@/lib/catalog-url";
import {
  loadCatalogDetailById,
  UUID_PATTERN,
} from "@/lib/catalog-detail-page";
import { resolveSeoCatalogSlug } from "@/lib/seo-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function resolveWatchReference(reference: string) {
  if (UUID_PATTERN.test(reference)) return loadCatalogDetailById(reference);

  const resolved = await resolveSeoCatalogSlug(reference, null);
  if (!resolved) return null;
  return loadCatalogDetailById(resolved.id);
}

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
  const image = item.posterUrl || item.backdropUrl || undefined;

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
      images: image ? [{ url: image, alt: `โปสเตอร์ ${item.thaiTitle}` }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} | REAL2FREE`,
      description,
      images: image ? [image] : undefined,
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

  return <WatchExperience item={item} episodes={episodes} />;
}
