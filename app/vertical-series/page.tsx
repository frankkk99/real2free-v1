import type { Metadata } from "next";
import SeoCategoryPage from "@/components/SeoCategoryPage";
import { getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "ซีรีส์แนวตั้ง ดูทั้งหมด",
  description: "รวมซีรีส์แนวตั้งสัดส่วน 9:16 อัปเดตล่าสุดบน REAL2FREE",
  alternates: { canonical: "/vertical-series" },
  openGraph: {
    title: "ซีรีส์แนวตั้ง ดูทั้งหมด | REAL2FREE",
    description: "รวมซีรีส์แนวตั้งสัดส่วน 9:16 อัปเดตล่าสุด",
    url: "/vertical-series",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
};

export default async function VerticalSeriesPage() {
  const items = await getSeoCatalogPreview(100, "vertical").catch(() => []);
  return (
    <SeoCategoryPage
      eyebrow="Vertical Series"
      title="ซีรีส์แนวตั้ง"
      description="ดูซีรีส์แนวตั้งสัดส่วน 9:16 ที่มีในระบบ เรียงจากรายการอัปเดตล่าสุด"
      items={items}
    />
  );
}
