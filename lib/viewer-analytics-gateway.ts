import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";

const TEAM_ID = "team_lZ0lAYrRy4KqgupCAuTiNMDD";
const PROJECT_ID = "prj_GzUmZY7KJlNqmO5AWgwOk0wvca5X";
const DEFAULT_SUPABASE_URL = "https://xzlfrpamifzpexfajdlg.supabase.co";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const GATEWAY_URL = `${SUPABASE_URL}/functions/v1/real2free-analytics-gateway`;

export class ViewerAnalyticsGatewayError extends Error {
  readonly status: number;

  constructor(status: number, message = "viewer_analytics_gateway_error") {
    super(message);
    this.name = "ViewerAnalyticsGatewayError";
    this.status = status;
  }
}

async function sendAnalyticsGatewayAction(action: string, payloadKey: string, payload: Record<string, unknown>) {
  let token: string;
  try {
    token = await getVercelOidcToken({ project: PROJECT_ID, team: TEAM_ID });
  } catch (error) {
    console.error("[viewer-analytics] unable to obtain Vercel OIDC token", error);
    throw new ViewerAnalyticsGatewayError(503, "gateway_unavailable");
  }

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-real2free-analytics-server": "1",
    },
    body: JSON.stringify({ action, [payloadKey]: payload }),
  });

  if (!response.ok) {
    const responsePayload = await response.json().catch(() => null) as { error?: string } | null;
    throw new ViewerAnalyticsGatewayError(response.status, responsePayload?.error || "gateway_error");
  }
}

export async function sendViewerAnalyticsEvent(event: Record<string, unknown>) {
  await sendAnalyticsGatewayAction("event", "event", event);
}

export async function sendSearchMissAnalytics(searchMiss: Record<string, unknown>) {
  await sendAnalyticsGatewayAction("search_miss", "searchMiss", searchMiss);
}
