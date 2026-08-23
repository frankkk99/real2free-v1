import type { Metadata } from "next";
import SeoCategoryPage from "@/components/SeoCategoryPage";
import { getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "หนังใหม่ ซีรีส์ใหม่ อัปเดตล่าสุด",
  description: "รวมหนังและซีรีส์ที่เพิ่มและอัปเดตล่าสุด เรียงตามวันที่ฉาย พร้อมรายละเอียดเรื่องบน REAL2FREE",
  alternates: { canonical: "/new" },
  openGraph: {
    title: "หนังใหม่ ซีรีส์ใหม่ อัปเดตล่าสุด | REAL2FREE",
    description: "รวมหนังและซีรีส์ใหม่ เรียงตามวันที่ฉายและการอัปเดตล่าสุด",
    url: "/new",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "หนังใหม่ ซีรีส์ใหม่ | REAL2FREE",
    description: "รวมหนังและซีรีส์ใหม่ที่อัปเดตล่าสุด",
  },
};

export default async function NewReleasesPage() {
  const items = await getSeoCatalogPreview(30, "new").catch(() => []);
  return (
    <SeoCategoryPage
      eyebrow="New Releases"
      title="มาใหม่"
      description="ดูภาพยนตร์และซีรีส์ที่เพิ่มล่าสุด เรียงตามวันที่ฉายล่าสุดให้ตรงกับหมวดมาใหม่บนหน้าแรก"
      items={items}
      filter="new"
    />
  );
}
