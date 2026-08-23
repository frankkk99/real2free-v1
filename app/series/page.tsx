import type { Metadata } from "next";
import SeoCategoryPage from "@/components/SeoCategoryPage";
import { getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "ดูซีรีส์ออนไลน์ ซีรีส์ใหม่ อัปเดตตอนล่าสุด",
  description: "รวมหน้าข้อมูลซีรีส์ออนไลน์ ซีรีส์ใหม่ พากย์ไทยและซับไทย พร้อมปี จำนวนซีซัน จำนวนตอน และรายละเอียดเรื่องบน REAL2FREE",
  alternates: { canonical: "/series" },
  openGraph: {
    title: "ดูซีรีส์ออนไลน์ ซีรีส์ใหม่ | REAL2FREE",
    description: "ค้นหาซีรีส์ใหม่ตามชื่อ ปี ประเภท และจำนวนตอน พร้อมรายละเอียดเรื่อง",
    url: "/series",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ดูซีรีส์ออนไลน์ ซีรีส์ใหม่ | REAL2FREE",
    description: "ค้นหาซีรีส์ใหม่ตามชื่อ ปี ประเภท และจำนวนตอน",
  },
};

export default async function SeriesPage() {
  const items = await getSeoCatalogPreview(30, "series").catch(() => []);
  return (
    <SeoCategoryPage
      eyebrow="Series"
      title="ดูซีรีส์ออนไลน์และซีรีส์ใหม่"
      description="ค้นหาซีรีส์จากชื่อไทย ชื่อต้นฉบับ ปีที่ฉาย ประเภท จำนวนซีซัน และจำนวนตอน พร้อมรายการที่มีการอัปเดตล่าสุดในระบบ"
      items={items}
      filter="series"
    />
  );
}
