import type { Metadata } from "next";
import SeoCategoryPage from "@/components/SeoCategoryPage";
import { getSeoCatalogPreview } from "@/lib/seo-catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "ดูอนิเมะออนไลน์ อนิเมะใหม่และแอนิเมชัน",
  description: "รวมหน้าข้อมูลอนิเมะออนไลน์ อนิเมะใหม่และแอนิเมชัน ค้นหาตามชื่อ ปี ประเภท และคะแนน พร้อมรายละเอียดเรื่องบน REAL2FREE",
  alternates: { canonical: "/anime" },
  openGraph: {
    title: "ดูอนิเมะออนไลน์ อนิเมะใหม่ | REAL2FREE",
    description: "ค้นหาอนิเมะและแอนิเมชันตามชื่อ ปี ประเภท และคะแนน",
    url: "/anime",
    siteName: "REAL2FREE",
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ดูอนิเมะออนไลน์ อนิเมะใหม่ | REAL2FREE",
    description: "ค้นหาอนิเมะและแอนิเมชันตามชื่อ ปี และประเภท",
  },
};

export default async function AnimePage() {
  const items = await getSeoCatalogPreview(72, "anime").catch(() => []);
  return (
    <SeoCategoryPage
      eyebrow="Anime & Animation"
      title="ดูอนิเมะออนไลน์และแอนิเมชัน"
      description="รวมอนิเมะและภาพยนตร์แอนิเมชันที่ค้นหาได้จากชื่อ ปี คะแนน และประเภท พร้อมรายละเอียดก่อนเปิดหน้ารับชม"
      items={items}
    />
  );
}
