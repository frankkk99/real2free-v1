import type { Metadata } from "next";
import SeoCategoryPage from "@/components/SeoCategoryPage";
import { getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "หนังยอดนิยม ซีรีส์น่าดู คะแนนดี",
  description: "รวมหนังยอดนิยม ซีรีส์น่าดู และรายการคะแนนดี เรียงข้อมูลจากปี คะแนน และเสียงตอบรับ พร้อมรายละเอียดเรื่องบน REAL2FREE",
  alternates: { canonical: "/popular" },
  openGraph: {
    title: "หนังยอดนิยม ซีรีส์น่าดู | REAL2FREE",
    description: "รวมหนังและซีรีส์คะแนนดี พร้อมข้อมูลปี ประเภท และรายละเอียดเรื่อง",
    url: "/popular",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "หนังยอดนิยม ซีรีส์น่าดู | REAL2FREE",
    description: "รวมหนังและซีรีส์คะแนนดี พร้อมรายละเอียดเรื่อง",
  },
};

export default async function PopularPage() {
  const items = await getSeoCatalogPreview(30, "popular").catch(() => []);
  return (
    <SeoCategoryPage
      eyebrow="Popular"
      title="หนังยอดนิยมและซีรีส์น่าดู"
      description="เลือกจากรายการที่มีคะแนนและเสียงตอบรับดี พร้อมจัดเรียงเรื่องใหม่ก่อน เพื่อช่วยค้นหาภาพยนตร์และซีรีส์ที่น่าสนใจได้รวดเร็วขึ้น"
      items={items}
      filter="popular"
    />
  );
}
