import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const [{ data: stats, error: statsError }, { data: jobs, error: jobsError }] =
    await Promise.all([
      auth.supabase.rpc("real2free_admin_stats"),
      auth.supabase
        .from("extractor_jobs")
        .select("id,source,status,total_detected,total_saved,total_failed,created_at,updated_at,input_urls")
        .eq("source", "movie2freehd")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  if (statsError) {
    return NextResponse.json(
      { ok: false, error: statsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    stats,
    jobs: jobsError ? [] : jobs ?? [],
  });
}
