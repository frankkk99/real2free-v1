import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import WatchExperience from "@/components/WatchExperience";
import { hashGatewayClient, Real2freeGatewayError } from "@/lib/real2free-gateway";
import { loadSecureCatalogDetail } from "@/lib/secure-catalog";

export const metadata: Metadata = {
  title: "หน้ารับชม | REAL2FREE",
  description: "รับชมภาพยนตร์และซีรีส์บน REAL2FREE",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  const userAgent = requestHeaders.get("user-agent") || "unknown";

  try {
    const detail = await loadSecureCatalogDetail(
      id,
      hashGatewayClient("metadata", ip, userAgent, id),
    );
    if (!detail) notFound();
    return <WatchExperience item={detail.item} episodes={detail.episodes} />;
  } catch (error) {
    if (error instanceof Real2freeGatewayError && error.code === "not_found") notFound();
    throw error;
  }
}
