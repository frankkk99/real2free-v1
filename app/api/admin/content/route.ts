import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 36;
const ALLOWED_STATUSES = new Set(["active", "draft", "broken", "hidden"]);

function safePage(value: string | null) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 10_000) : 1;
}

function cleanSearch(value: string | null) {
  return String(value || "")
    .trim()
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const page = safePage(url.searchParams.get("page"));
  const query = cleanSearch(url.searchParams.get("q"));
  const status = String(url.searchParams.get("status") || "all");
  const source = String(url.searchParams.get("source") || "all");
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let builder = auth.supabase
    .from("content_titles")
    .select(
      "id,content_type,source,source_url,tmdb_id,imdb_id,title_th,title_en,original_title,overview,release_date,year,runtime,poster_url,backdrop_url,genres,rating,vote_count,status,metadata,last_synced_at,updated_at,players(id,label,stream_url,iframe_url,status,last_checked_at,sort_order)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (query) {
    builder = builder.or(
      `title_th.ilike.%${query}%,title_en.ilike.%${query}%,original_title.ilike.%${query}%,imdb_id.ilike.%${query}%`,
    );
  }
  if (status !== "all" && ALLOWED_STATUSES.has(status)) {
    builder = builder.eq("status", status);
  }
  if (source !== "all") {
    builder = builder.eq("source", source);
  }

  const { data, error, count } = await builder;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    items: data ?? [],
    page,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action || "title-status");

  if (action === "title-status") {
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    if (!id || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ ok: false, error: "ข้อมูลสถานะหนังไม่ถูกต้อง" }, { status: 400 });
    }
    const { data, error } = await auth.supabase
      .from("content_titles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,status,updated_at")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
  }

  if (action === "player-status") {
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    if (!id || !["active", "broken", "expired", "unchecked"].includes(status)) {
      return NextResponse.json({ ok: false, error: "ข้อมูลสถานะ Player ไม่ถูกต้อง" }, { status: 400 });
    }
    const { data, error } = await auth.supabase
      .from("players")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id,status,updated_at")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
  }

  return NextResponse.json({ ok: false, error: "Action ไม่รองรับ" }, { status: 400 });
}
