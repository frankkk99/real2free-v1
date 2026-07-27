import type { Metadata } from "next";
import WatchExperience from "@/components/WatchExperience";

export const metadata: Metadata = {
  title: "หน้ารับชม | REAL2FREE",
  description: "รับชมภาพยนตร์และซีรีส์บน REAL2FREE",
};

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WatchExperience id={id} />;
}
