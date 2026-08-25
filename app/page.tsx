import type { Metadata } from "next";
import MovieHomeV2 from "@/components/MovieHomeV2";
import SeoCatalogLinks from "@/components/SeoCatalogLinks";
import { absoluteCatalogUrl, getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
  description: "ค้นหาหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ พร้อมชื่อไทย ปี ประเภท คะแนน จำนวนตอน และข้อมูลอัปเดตล่าสุดบน REAL2FREE",
  alternates: { canonical: "/" },
  openGraph: {
    title: "REAL2FREE ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
    description: "ค้นหาหนัง ซีรีส์ และอนิเมะ พร้อมข้อมูลชื่อ ปี ประเภท คะแนน และจำนวนตอน",
    url: "/",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "REAL2FREE ดูหนังออนไลน์ ซีรีส์ใหม่ และอนิเมะ",
    description: "ค้นหาหนัง ซีรีส์ และอนิเมะ พร้อมข้อมูลอัปเดตล่าสุด",
  },
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function HomePage() {
  const items = await getSeoCatalogPreview(24).catch(() => []);
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "REAL2FREE",
    alternateName: ["Real2Free", "REAL 2 FREE"],
    url: "https://www.real2free.online/",
    inLanguage: "th-TH",
    description: "ค้นหาหนัง ซีรีส์ และอนิเมะ พร้อมข้อมูลชื่อ ปี ประเภท คะแนน และจำนวนตอน",
  };
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "หนังและซีรีส์อัปเดตล่าสุดบน REAL2FREE",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteCatalogUrl(item),
      item: {
        "@type": item.contentType === "series" ? "TVSeries" : "Movie",
        name: item.thaiTitle,
        alternateName: item.title !== item.thaiTitle ? item.title : undefined,
        image: item.posterUrl || item.backdropUrl || undefined,
        genre: item.genres,
        url: absoluteCatalogUrl(item),
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }} />
      {items.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema) }} /> : null}
      <MovieHomeV2 />
      <SeoCatalogLinks items={items} />
    </>
  );
}
