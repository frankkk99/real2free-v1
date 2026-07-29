import { NextRequest, NextResponse } from "next/server";
import { loadSecureCatalogDetail } from "@/lib/secure-catalog";
import {
  hashGatewayClient,
  Real2freeGatewayError,
} from "@/lib/real2free-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestOrigin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((requestOrigin && requestOrigin !== request.nextUrl.origin) || fetchSite === "cross-site") {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: noStoreHeaders() });
  }
  if (request.headers.get("x-real2free-catalog") !== "1") {
    return NextResponse.json({ error: "missing_catalog_header" }, { status: 403, headers: noStoreHeaders() });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders() });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const clientHash = hashGatewayClient("metadata", ip, userAgent, id);

  try {
    const detail = await loadSecureCatalogDetail(id, clientHash);
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStoreHeaders() });
    }
    return NextResponse.json({ item: detail.item }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof Real2freeGatewayError) {
      const status = error.code === "rate_limited" ? 429 : error.status;
      return NextResponse.json({ error: error.code }, { status, headers: noStoreHeaders() });
    }
    console.error("[api/catalog] failed", error);
    return NextResponse.json({ error: "catalog_unavailable" }, { status: 503, headers: noStoreHeaders() });
  }
}
