import type { Metadata } from "next";
import SeoCategoryPage from "@/components/SeoCategoryPage";
import { getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "ดูหนังออนไลน์ หนังใหม่ อัปเดตล่าสุด",
  description: "รวมหน้าข้อมูลหนังออนไลน์ หนังใหม่ หนังพากย์ไทยและซับไทย ค้นหาตามชื่อ ปี และประเภท พร้อมรายละเอียดก่อนรับชมบน REAL2FREE",
  alternates: { canonical: "/movies" },
  openGraph: {
    title: "ดูหนังออนไลน์ หนังใหม่ อัปเดตล่าสุด | REAL2FREE",
    description: "ค้นหาหนังใหม่ตามชื่อ ปี และประเภท พร้อมรายละเอียดเรื่องบน REAL2FREE",
    url: "/movies",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ดูหนังออนไลน์ หนังใหม่ | REAL2FREE",
    description: "ค้นหาหนังใหม่ตามชื่อ ปี และประเภท พร้อมรายละเอียดเรื่อง",
  },
};

export default async function MoviesPage() {
  const items = await getSeoCatalogPreview(72, "movie").catch(() => []);
  return (
    <SeoCategoryPage
      eyebrow="Movies"
      title="ดูหนังออนไลน์และหนังใหม่"
      description="เลือกดูข้อมูลภาพยนตร์จากชื่อไทย ชื่อต้นฉบับ ปีที่ฉาย คะแนน และประเภทเรื่อง รวมหนังใหม่และหนังน่าดูที่อัปเดตในระบบล่าสุด"
      items={items}
    />
  );
}
