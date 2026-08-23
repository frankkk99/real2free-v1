import type { Metadata } from "next";
import SeoCategoryPage from "@/components/SeoCategoryPage";
import { getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "หนังไทย ดูทั้งหมด",
  description: "รวมภาพยนตร์ไทยที่มีในระบบ REAL2FREE เรียงจากรายการใหม่และอัปเดตล่าสุด",
  alternates: { canonical: "/thai-movies" },
  openGraph: {
    title: "หนังไทย ดูทั้งหมด | REAL2FREE",
    description: "รวมภาพยนตร์ไทยที่มีในระบบ REAL2FREE",
    url: "/thai-movies",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
};

export default async function ThaiMoviesPage() {
  const items = await getSeoCatalogPreview(30, "thai").catch(() => []);
  return (
    <SeoCategoryPage
      eyebrow="Thai Movies"
      title="หนังไทย"
      description="ดูภาพยนตร์ไทยทั้งหมดที่มีในระบบ เรียงจากปีฉายและรายการอัปเดตล่าสุด"
      items={items}
      filter="thai"
    />
  );
}
