import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import CatalogInfoPage from "@/components/CatalogInfoPage";
import { catalogPath, catalogSlug } from "@/lib/catalog-url";
import {
  buildCatalogMetadata,
  buildCatalogSchemas,
  jsonLd,
  loadCatalogDetailBySlug,
} from "@/lib/catalog-detail-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await loadCatalogDetailBySlug(slug, "movie");
  if (!detail) notFound();
  return buildCatalogMetadata(detail.item);
}

export default async function MovieInfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await loadCatalogDetailBySlug(slug, "movie");
  if (!detail) notFound();

  const { item, episodes } = detail;
  if (slug !== catalogSlug(item)) permanentRedirect(catalogPath(item));

  const { mediaSchema, breadcrumbSchema } = buildCatalogSchemas(item, episodes);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(mediaSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }} />
      <CatalogInfoPage item={item} episodes={episodes} />
    </>
  );
}
