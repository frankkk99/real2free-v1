import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import WatchExperience from "@/components/WatchExperience";
import { catalogPath, catalogSlug } from "@/lib/catalog-url";
import { hashGatewayClient, Real2freeGatewayError } from "@/lib/real2free-gateway";
import { loadSecureCatalogDetail } from "@/lib/secure-catalog";
import { resolveSeoCatalogSlug } from "@/lib/seo-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE_URL = "https://www.real2free.online";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SeoContentType = "movie" | "series";
type WatchSearchParams = { seoType?: string | string[] };

function cleanDescription(value: string, fallback: string) {
  const text = value.replace(/\s+/g, " ").trim() || fallback;
  return text.length > 158 ? `${text.slice(0, 155).trimEnd()}…` : text;
}

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function parseSeoContentType(value: string | string[] | undefined): SeoContentType | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "movie" || candidate === "series" ? candidate : null;
}

const resolveWatchId = cache(async (reference: string, contentTypeHint: SeoContentType | null) => {
  if (UUID_PATTERN.test(reference)) return reference;
  const resolved = await resolveSeoCatalogSlug(reference, contentTypeHint);
  return resolved?.id || null;
});

const getWatchDetail = cache(async (reference: string, contentTypeHint: SeoContentType | null) => {
  const id = await resolveWatchId(reference, contentTypeHint);
  if (!id) return null;

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  const userAgent = requestHeaders.get("user-agent") || "unknown";

  try {
    return await loadSecureCatalogDetail(
      id,
      hashGatewayClient("metadata", ip, userAgent, id),
    );
  } catch (error) {
    if (error instanceof Real2freeGatewayError && error.code === "not_found") return null;
    throw error;
  }
});

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<WatchSearchParams>;
}): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const contentTypeHint = parseSeoContentType(query.seoType);
  const detail = await getWatchDetail(id, contentTypeHint);
  if (!detail) notFound();

  const { item } = detail;
  const typeLabel = item.contentType === "series" ? "ซีรีส์" : "หนัง";
  const yearLabel = item.year ? ` (${item.year})` : "";
  const pageTitle = `ดู${typeLabel} ${item.thaiTitle}${yearLabel} ออนไลน์`;
  const description = cleanDescription(
    item.overview,
    `ดูข้อมูล${typeLabel} ${item.thaiTitle}${yearLabel} พร้อมประเภท คะแนน และรายละเอียดเรื่องบน REAL2FREE`,
  );
  const canonical = catalogPath(item);
  const image = item.backdropUrl || item.posterUrl || undefined;

  return {
    title: pageTitle,
    description,
    keywords: [
      item.thaiTitle,
      item.title,
      `ดู${typeLabel}ออนไลน์`,
      ...item.genres,
      item.year ? String(item.year) : "",
    ].filter(Boolean),
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: `${pageTitle} | REAL2FREE`,
      description,
      url: canonical,
      siteName: "REAL2FREE",
      locale: "th_TH",
      type: "website",
      images: image ? [{ url: image, alt: `ภาพ ${item.thaiTitle}` }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${pageTitle} | REAL2FREE`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<WatchSearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const contentTypeHint = parseSeoContentType(query.seoType);
  const detail = await getWatchDetail(id, contentTypeHint);
  if (!detail) notFound();

  const { item, episodes } = detail;
  const canonicalPath = catalogPath(item);
  const canonicalSlug = catalogSlug(item);
  const isCanonicalRewrite = contentTypeHint === item.contentType && id === canonicalSlug;

  // Old UUID links and direct /watch/<slug> links remain valid, but they are
  // permanently consolidated into one readable URL for users and search bots.
  if (!isCanonicalRewrite) permanentRedirect(canonicalPath);

  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const aggregateRating = item.rating > 0 && item.voteCount > 0
    ? {
        "@type": "AggregateRating",
        ratingValue: item.rating,
        ratingCount: item.voteCount,
        bestRating: 10,
        worstRating: 0,
      }
    : undefined;
  const mediaSchema = {
    "@context": "https://schema.org",
    "@type": item.contentType === "series" ? "TVSeries" : "Movie",
    name: item.thaiTitle,
    alternateName: item.title !== item.thaiTitle ? item.title : undefined,
    description: item.overview || undefined,
    url: canonicalUrl,
    image: [item.posterUrl, item.backdropUrl].filter(Boolean),
    datePublished: item.releaseDate || undefined,
    genre: item.genres,
    inLanguage: item.languageCode || "th",
    aggregateRating,
    duration: item.contentType === "movie" && item.runtime ? `PT${Math.round(item.runtime)}M` : undefined,
    numberOfEpisodes: item.contentType === "series" ? item.episodeCount || episodes.length || undefined : undefined,
    numberOfSeasons: item.contentType === "series" ? item.seasonCount || undefined : undefined,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "REAL2FREE",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: item.contentType === "series" ? "ซีรีส์" : "ภาพยนตร์",
        item: `${SITE_URL}/${item.contentType === "series" ? "series" : "movies"}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: item.thaiTitle,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(mediaSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }} />
      <WatchExperience item={item} episodes={episodes} />
    </>
  );
}
