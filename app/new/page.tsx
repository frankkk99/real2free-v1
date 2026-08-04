import type { Metadata } from "next";
import SeoCategoryPage from "@/components/SeoCategoryPage";
import { getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "หนังใหม่ 2026 ซีรีส์ใหม่ อัปเดตล่าสุด",
  description: "รวมหนังใหม่ 2026 และซีรีส์ใหม่ที่อัปเดตล่าสุด ค้นหาตามชื่อ ประเภท คะแนน และปี พร้อมรายละเอียดเรื่องบน REAL2FREE",
  alternates: { canonical: "/new" },
  openGraph: {
    title: "หนังใหม่ 2026 ซีรีส์ใหม่ | REAL2FREE",
    description: "รวมหนังและซีรีส์ใหม่ที่อัปเดตล่าสุด พร้อมข้อมูลก่อนรับชม",
    url: "/new",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "หนังใหม่ 2026 ซีรีส์ใหม่ | REAL2FREE",
    description: "รวมหนังและซีรีส์ใหม่ที่อัปเดตล่าสุด",
  },
};

export default async function NewReleasesPage() {
  const items = await getSeoCatalogPreview(72, "new").catch(() => []);
  return (
    <SeoCategoryPage
      eyebrow="New Releases"
      title="หนังใหม่ 2026 และซีรีส์ใหม่"
      description="ดูรายการภาพยนตร์และซีรีส์ปีปัจจุบันที่อัปเดตล่าสุด พร้อมชื่อไทย ชื่อต้นฉบับ คะแนน ประเภท และข้อมูลจำนวนตอนสำหรับซีรีส์"
      items={items}
    />
  );
}
