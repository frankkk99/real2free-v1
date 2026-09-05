import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_ORIGIN = (process.env.APIPLAYER_API_URL || "https://www.apiplayer.online").replace(/\/$/, "");
const API_DOMAIN = process.env.APIPLAYER_CLIENT_DOMAIN || "real2free.online";
const API_TIMEOUT_MS = 10_000;
const MAX_TEST_EPISODES = 120;

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};

type ApiCallResult = {
  ok: boolean;
  status: number;
  ms: number;
  path: string;
  payload: any;
  error: string | null;
};

function diagnosticConfig() {
  return {
    mode: "APIPLAYER_ONLY",
    origin: API_ORIGIN,
    clientDomain: API_DOMAIN,
    apiKeyConfigured: Boolean(process.env.APIPLAYER_API_KEY?.trim()),
  };
}

async function callApiPlayer(path: string, params?: URLSearchParams): Promise<ApiCallResult> {
  const startedAt = Date.now();
  const key = process.env.APIPLAYER_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      path,
      payload: null,
      error: "missing_APIPLAYER_API_KEY",
    };
  }

  const url = new URL(path, API_ORIGIN);
  if (params) url.search = params.toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-api-key": key,
        "x-client-domain": API_DOMAIN,
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    const ok = response.ok && payload?.ok !== false;
    return {
      ok,
      status: response.status,
      ms: Date.now() - startedAt,
      path: `${url.pathname}${url.search}`,
      payload,
      error: ok ? null : String(payload?.error || `HTTP_${response.status}`),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "request_failed";
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      path: `${url.pathname}${url.search}`,
      payload: null,
      error: message.includes("abort") ? "timeout" : message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function playerCount(payload: any) {
  const players = payload?.data?.players;
  return Array.isArray(players) ? players.length : 0;
}

function playerSummary(payload: any) {
  const players = Array.isArray(payload?.data?.players) ? payload.data.players : [];
  return players.map((player: any, index: number) => ({
    id: String(player?.id || ""),
    label: String(player?.label || (index === 0 ? "ตัวหลัก" : `สำรอง ${index}`)),
    kind: String(player?.kind || player?.type || "embed"),
    role: String(player?.role || (index === 0 ? "primary" : "backup")),
    groupKey: String(player?.group_key || "default"),
    url: String(player?.url || ""),
  }));
}

function catalogItems(payload: any) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item: any) => ({
    id: String(item?.id || ""),
    contentType: String(item?.content_type || "movie"),
    titleTh: String(item?.title_th || ""),
    titleEn: String(item?.title_en || item?.original_title || ""),
    year: item?.year ?? null,
    posterUrl: item?.poster_url || null,
    readiness: item?.readiness || null,
    playerCount: Number(item?.player_count || item?.active_player_count || 0),
    totalEpisodeCount: Number(item?.total_episode_count || 0),
    readyEpisodeCount: Number(item?.ready_episode_count || 0),
    missingEpisodeCount: Number(item?.missing_episode_count || 0),
  }));
}

function detailSummary(payload: any) {
  const item = payload?.item || null;
  const seasons = Array.isArray(payload?.seasons) ? payload.seasons : [];
  const episodes = seasons.flatMap((season: any) => {
    const rows = Array.isArray(season?.episodes) ? season.episodes : [];
    return rows.map((episode: any) => ({
      id: String(episode?.id || ""),
      seasonNumber: Number(season?.seasonNumber || 0),
      episodeNumber: Number(episode?.episodeNumber || 0),
      title: String(episode?.title || ""),
      playerCount: Array.isArray(episode?.players) ? episode.players.length : 0,
    }));
  });
  return {
    item: item ? {
      id: String(item.id || ""),
      contentType: String(item.content_type || "movie"),
      titleTh: String(item.title_th || ""),
      titleEn: String(item.title_en || item.original_title || ""),
      year: item.year ?? null,
      playerCount: Number(item.player_count || item.active_player_count || 0),
      totalEpisodeCount: Number(item.total_episode_count || episodes.length || 0),
    } : null,
    episodes,
  };
}

async function authenticate(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) {
    return {
      auth: null,
      response: NextResponse.json({ ok: false, error: auth.error }, {
        status: auth.status,
        headers: noStoreHeaders,
      }),
    };
  }
  return { auth, response: null };
}

export async function GET(request: Request) {
  const checked = await authenticate(request);
  if (checked.response) return checked.response;

  const params = new URLSearchParams({
    page: "1",
    limit: "1",
    type: "all",
    player: "all",
    sort: "newest",
  });
  const ping = await callApiPlayer("/api/v1/vip/catalog", params);
  return NextResponse.json({
    ok: ping.ok,
    config: diagnosticConfig(),
    ping: {
      ok: ping.ok,
      status: ping.status,
      ms: ping.ms,
      path: ping.path,
      error: ping.error,
      sampleCount: catalogItems(ping.payload).length,
    },
  }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const checked = await authenticate(request);
  if (checked.response) return checked.response;

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const action = String(body.action || "");

  if (action === "search") {
    const q = String(body.q || "").trim().slice(0, 100);
    if (!q) {
      return NextResponse.json({ ok: false, error: "missing_query" }, { status: 400, headers: noStoreHeaders });
    }
    const params = new URLSearchParams({
      page: "1",
      limit: "20",
      type: "all",
      player: "all",
      sort: "newest",
      q,
    });
    const result = await callApiPlayer("/api/v1/vip/catalog", params);
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      ms: result.ms,
      path: result.path,
      error: result.error,
      items: catalogItems(result.payload),
    }, { headers: noStoreHeaders });
  }

  if (action === "detail") {
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400, headers: noStoreHeaders });
    }
    const result = await callApiPlayer(`/api/v1/catalog/${encodeURIComponent(id)}`);
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      ms: result.ms,
      path: result.path,
      error: result.error,
      detail: result.ok ? detailSummary(result.payload) : null,
    }, { headers: noStoreHeaders });
  }

  if (action === "playback") {
    const titleId = String(body.titleId || "").trim();
    const episodeId = body.episodeId ? String(body.episodeId).trim() : "";
    const index = Number.isInteger(body.index) ? Math.max(0, Math.min(50, Number(body.index))) : 0;
    if (!titleId) {
      return NextResponse.json({ ok: false, error: "missing_title_id" }, { status: 400, headers: noStoreHeaders });
    }
    const path = episodeId
      ? `/api/v1/player/${encodeURIComponent(titleId)}/episode/${encodeURIComponent(episodeId)}`
      : `/api/v1/player/${encodeURIComponent(titleId)}`;
    const result = await callApiPlayer(path);
    const players = playerSummary(result.payload);
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      ms: result.ms,
      path: result.path,
      error: result.error,
      playerCount: players.length,
      players,
      selected: players[index] || null,
    }, { headers: noStoreHeaders });
  }

  if (action === "test-all") {
    const titleId = String(body.titleId || "").trim();
    if (!titleId) {
      return NextResponse.json({ ok: false, error: "missing_title_id" }, { status: 400, headers: noStoreHeaders });
    }

    const detailCall = await callApiPlayer(`/api/v1/catalog/${encodeURIComponent(titleId)}`);
    if (!detailCall.ok) {
      return NextResponse.json({
        ok: false,
        status: detailCall.status,
        ms: detailCall.ms,
        path: detailCall.path,
        error: detailCall.error,
        results: [],
      }, { headers: noStoreHeaders });
    }

    const detail = detailSummary(detailCall.payload);
    const episodes = detail.episodes.slice(0, MAX_TEST_EPISODES);
    if (!episodes.length) {
      const result = await callApiPlayer(`/api/v1/player/${encodeURIComponent(titleId)}`);
      return NextResponse.json({
        ok: result.ok,
        truncated: false,
        total: 1,
        passed: result.ok && playerCount(result.payload) > 0 ? 1 : 0,
        failed: result.ok && playerCount(result.payload) > 0 ? 0 : 1,
        results: [{
          episodeId: null,
          seasonNumber: null,
          episodeNumber: null,
          ok: result.ok && playerCount(result.payload) > 0,
          status: result.status,
          ms: result.ms,
          playerCount: playerCount(result.payload),
          error: result.error || (playerCount(result.payload) ? null : "no_players"),
        }],
      }, { headers: noStoreHeaders });
    }

    const results = new Array<any>(episodes.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < episodes.length) {
        const current = cursor;
        cursor += 1;
        const episode = episodes[current];
        const result = await callApiPlayer(
          `/api/v1/player/${encodeURIComponent(titleId)}/episode/${encodeURIComponent(episode.id)}`,
        );
        const count = playerCount(result.payload);
        results[current] = {
          episodeId: episode.id,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          ok: result.ok && count > 0,
          status: result.status,
          ms: result.ms,
          playerCount: count,
          error: result.error || (count ? null : "no_players"),
        };
      }
    };

    await Promise.all([worker(), worker(), worker()]);
    const passed = results.filter((row) => row?.ok).length;
    return NextResponse.json({
      ok: passed === results.length,
      truncated: detail.episodes.length > episodes.length,
      total: results.length,
      passed,
      failed: results.length - passed,
      results,
    }, { headers: noStoreHeaders });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, {
    status: 400,
    headers: noStoreHeaders,
  });
}
