import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import WatchExperience from "@/components/WatchExperience";
import { catalogPath } from "@/lib/catalog-url";
import {
  loadCatalogDetailById,
  UUID_PATTERN,
} from "@/lib/catalog-detail-page";
import { resolveSeoCatalogSlug } from "@/lib/seo-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function resolveLegacyWatchSlug(reference: string) {
  if (UUID_PATTERN.test(reference)) return null;
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
  const detail = UUID_PATTERN.test(id)
    ? await loadCatalogDetailById(id)
    : await resolveLegacyWatchSlug(id);
  if (!detail) notFound();

  const { item } = detail;
  const typeLabel = item.contentType === "series" ? "ซีรีส์" : "หนัง";
  const yearLabel = item.year ? ` (${item.year})` : "";
  const canonical = catalogPath(item);

  return {
    title: `รับชม ${item.thaiTitle}${yearLabel}`,
    description: `หน้ารับชม${typeLabel} ${item.thaiTitle}${yearLabel} บน REAL2FREE`,
    alternates: { canonical },
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        "max-image-preview": "none",
        "max-snippet": 0,
        "max-video-preview": 0,
      },
    },
  };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    const legacyDetail = await resolveLegacyWatchSlug(id);
    if (!legacyDetail) notFound();
    permanentRedirect(catalogPath(legacyDetail.item));
  }

  const detail = await loadCatalogDetailById(id);
  if (!detail) notFound();

  return <WatchExperience item={detail.item} episodes={detail.episodes} />;
}
