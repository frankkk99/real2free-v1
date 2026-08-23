import type { PublicCatalogItem } from "@/lib/public-catalog";

export type CatalogUrlItem = Pick<
  PublicCatalogItem,
  "contentType" | "thaiTitle" | "title" | "year"
>;

function cleanSlugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-{2,}/gu, "-");
}

export function catalogSlug(item: CatalogUrlItem) {
  const preferredTitle = item.title.trim() || item.thaiTitle.trim() || "title";
  const base = cleanSlugPart(preferredTitle) || cleanSlugPart(item.thaiTitle) || "title";
  const year = item.year ? String(item.year) : "";

  if (!year || base.endsWith(`-${year}`)) return base;
  return `${base}-${year}`;
}

export function normalizeCatalogSlug(value: string) {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }

  return decoded
    .normalize("NFKC")
    .trim()
    .replace(/^\/+|\/+$/gu, "")
    .toLocaleLowerCase("en-US");
}

export function catalogPath(item: CatalogUrlItem) {
  const root = item.contentType === "series" ? "series" : "movie";
  return `/${root}/${catalogSlug(item)}`;
}
