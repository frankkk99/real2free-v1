"use client";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  Play,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./ApiPlayerReferenceTest.module.css";

type Health = {
  ok: boolean;
  config?: {
    mode: string;
    origin: string;
    clientDomain: string;
    apiKeyConfigured: boolean;
  };
  ping?: {
    ok: boolean;
    status: number;
    ms: number;
    path: string;
    error: string | null;
    sampleCount: number;
  };
  error?: string;
};

type CatalogItem = {
  id: string;
  contentType: string;
  titleTh: string;
  titleEn: string;
  year: number | null;
  posterUrl: string | null;
  readiness: string | null;
  playerCount: number;
  totalEpisodeCount: number;
  readyEpisodeCount: number;
  missingEpisodeCount: number;
};

type Episode = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  playerCount: number;
};

type DetailResponse = {
  ok: boolean;
  status: number;
  ms: number;
  path: string;
  error: string | null;
  detail: {
    item: CatalogItem | null;
    episodes: Episode[];
  } | null;
};

type PlayerRow = {
  id: string;
  label: string;
  kind: string;
  role: string;
  groupKey: string;
  url: string;
};

type PlaybackResponse = {
  ok: boolean;
  status: number;
  ms: number;
  path: string;
  error: string | null;
  playerCount: number;
  players: PlayerRow[];
  selected: PlayerRow | null;
};

type BulkRow = {
  episodeId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  ok: boolean;
  status: number;
  ms: number;
  playerCount: number;
  error: string | null;
};

type BulkResponse = {
  ok: boolean;
  truncated: boolean;
  total: number;
  passed: number;
  failed: number;
  results: BulkRow[];
};

async function adminToken() {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  return data.session?.access_token || "";
}

export default function ApiPlayerReferenceTest() {
  const [health, setHealth] = useState<Health | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [playback, setPlayback] = useState<PlaybackResponse | null>(null);
  const [bulk, setBulk] = useState<BulkResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [testingEpisode, setTestingEpisode] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [error, setError] = useState("");

  async function request<T>(body?: Record<string, unknown>): Promise<T> {
    const token = await adminToken();
    if (!token) throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
    const response = await fetch("/api/admin/apiplayer-reference-test", {
      method: body ? "POST" : "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload as T;
  }

  async function refreshHealth() {
    setLoadingHealth(true);
    setError("");
    try {
      setHealth(await request<Health>());
    } catch (err) {
      setError(err instanceof Error ? err.message : "ตรวจ APIPlayer ไม่สำเร็จ");
    } finally {
      setLoadingHealth(false);
    }
  }

  useEffect(() => {
    void refreshHealth();
  }, []);

  async function searchCatalog(event?: FormEvent) {
    event?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    setSelectedItem(null);
    setDetail(null);
    setPlayback(null);
    setBulk(null);
    try {
      const payload = await request<{
        ok: boolean;
        status: number;
        ms: number;
        path: string;
        error: string | null;
        items: CatalogItem[];
      }>({ action: "search", q });
      setItems(Array.isArray(payload.items) ? payload.items : []);
      if (!payload.ok) setError(payload.error || `APIPlayer HTTP ${payload.status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ค้นหาไม่สำเร็จ");
    } finally {
      setSearching(false);
    }
  }

  async function openItem(item: CatalogItem) {
    setSelectedItem(item);
    setLoadingDetail(true);
    setDetail(null);
    setPlayback(null);
    setBulk(null);
    setError("");
    try {
      const payload = await request<DetailResponse>({ action: "detail", id: item.id });
      setDetail(payload);
      if (!payload.ok) setError(payload.error || `APIPlayer HTTP ${payload.status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายละเอียดไม่สำเร็จ");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function testPlayback(episodeId?: string) {
    if (!selectedItem) return;
    setTestingEpisode(episodeId || "movie");
    setPlayback(null);
    setError("");
    try {
      const payload = await request<PlaybackResponse>({
        action: "playback",
        titleId: selectedItem.id,
        episodeId: episodeId || null,
        index: 0,
      });
      setPlayback(payload);
      if (!payload.ok) setError(payload.error || `APIPlayer HTTP ${payload.status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทดสอบ Player ไม่สำเร็จ");
    } finally {
      setTestingEpisode(null);
    }
  }

  async function testAll() {
    if (!selectedItem) return;
    setTestingAll(true);
    setBulk(null);
    setError("");
    try {
      const payload = await request<BulkResponse>({ action: "test-all", titleId: selectedItem.id });
      setBulk(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test All EP ไม่สำเร็จ");
    } finally {
      setTestingAll(false);
    }
  }

  const bulkAverage = useMemo(() => {
    if (!bulk?.results?.length) return 0;
    return Math.round(bulk.results.reduce((sum, row) => sum + Number(row.ms || 0), 0) / bulk.results.length);
  }, [bulk]);

  const apiHealthy = Boolean(health?.ok && health?.config?.apiKeyConfigured && health?.ping?.ok);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href="/admin"><ArrowLeft /> หลังบ้าน</Link>
          <span className={styles.eyebrow}>APIPlayer Reference Client</span>
          <h1>Wrapper Test Center</h1>
          <p>ทดสอบจาก environment จริงของ REAL2FREE เพื่อเทียบอาการกับเว็บลูกค้าแบบตรงจุด</p>
        </div>
        <button className={styles.iconButton} type="button" onClick={() => void refreshHealth()} disabled={loadingHealth}>
          <RefreshCw className={loadingHealth ? styles.spin : ""} />
        </button>
      </header>

      <section className={`${styles.statusCard} ${apiHealthy ? styles.good : styles.bad}`}>
        <div className={styles.statusIcon}>{apiHealthy ? <ShieldCheck /> : <CircleAlert />}</div>
        <div className={styles.statusMain}>
          <strong>{apiHealthy ? "APIPlayer wrapper พร้อมใช้งาน" : "APIPlayer wrapper มีปัญหา"}</strong>
          <span>{health?.ping?.error || (apiHealthy ? "Reference client เชื่อมต่อสำเร็จ" : "กำลังตรวจสอบหรือยังไม่มีผล")}</span>
        </div>
        <div className={styles.statusMetrics}>
          <span><b>{health?.ping?.status ?? "-"}</b> HTTP</span>
          <span><b>{health?.ping?.ms ?? "-"}</b> ms</span>
          <span><b>{health?.config?.apiKeyConfigured ? "YES" : "NO"}</b> API KEY</span>
        </div>
      </section>

      <section className={styles.configGrid}>
        <div><Server /><span>API Origin</span><strong>{health?.config?.origin || "-"}</strong></div>
        <div><Activity /><span>Client Domain</span><strong>{health?.config?.clientDomain || "-"}</strong></div>
        <div><ShieldCheck /><span>Mode</span><strong>{health?.config?.mode || "-"}</strong></div>
      </section>

      {error ? <div className={styles.alert}><CircleAlert /><span>{error}</span></div> : null}

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div><span>STEP 1</span><h2>ค้นหาเรื่องจาก APIPlayer</h2></div>
        </div>
        <form className={styles.searchForm} onSubmit={searchCatalog}>
          <Search />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อหนัง / ซีรีส์ / ชื่ออังกฤษ" />
          <button type="submit" disabled={searching || !query.trim()}>
            {searching ? <LoaderCircle className={styles.spin} /> : <Search />} ค้นหา
          </button>
        </form>

        {items.length ? (
          <div className={styles.results}>
            {items.map((item) => (
              <button key={item.id} type="button" className={`${styles.resultCard} ${selectedItem?.id === item.id ? styles.selected : ""}`} onClick={() => void openItem(item)}>
                <div className={styles.poster}>
                  {item.posterUrl ? <img src={item.posterUrl} alt="" /> : <Play />}
                </div>
                <div className={styles.resultText}>
                  <strong>{item.titleTh || item.titleEn || item.id}</strong>
                  <span>{item.titleEn || "-"}</span>
                  <small>{item.contentType === "series" ? "ซีรีส์" : "หนัง"} · {item.year || "-"} · Player {item.playerCount}</small>
                </div>
              </button>
            ))}
          </div>
        ) : query && !searching ? <p className={styles.empty}>ยังไม่มีผลค้นหา</p> : null}
      </section>

      {selectedItem ? (
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><span>STEP 2</span><h2>{selectedItem.titleTh || selectedItem.titleEn}</h2></div>
            <div className={styles.headingActions}>
              <Link href={`/watch/${selectedItem.id}`} target="_blank">เปิดหน้า Watch จริง <ExternalLink /></Link>
              <button type="button" onClick={() => void testAll()} disabled={testingAll || loadingDetail}>
                {testingAll ? <LoaderCircle className={styles.spin} /> : <Play />} Test All EP
              </button>
            </div>
          </div>

          {loadingDetail ? <div className={styles.loading}><LoaderCircle className={styles.spin} /> กำลังเรียก /api/v1/catalog/{selectedItem.id}</div> : null}

          {detail ? (
            <div className={styles.detailMeta}>
              <span className={detail.ok ? styles.passPill : styles.failPill}>{detail.ok ? "PASS" : "FAIL"}</span>
              <code>{detail.path}</code>
              <span>HTTP {detail.status}</span>
              <span>{detail.ms} ms</span>
            </div>
          ) : null}

          {detail?.detail?.episodes?.length ? (
            <div className={styles.episodeList}>
              {detail.detail.episodes.map((episode) => (
                <div className={styles.episodeRow} key={episode.id}>
                  <div>
                    <strong>S{episode.seasonNumber} · EP{episode.episodeNumber}</strong>
                    <span>{episode.title || "ไม่มีชื่อตอน"}</span>
                  </div>
                  <span className={styles.playerCount}>ข้อมูลเดิม {episode.playerCount} player</span>
                  <button type="button" onClick={() => void testPlayback(episode.id)} disabled={Boolean(testingEpisode)}>
                    {testingEpisode === episode.id ? <LoaderCircle className={styles.spin} /> : <Play />} Test
                  </button>
                </div>
              ))}
            </div>
          ) : detail?.ok && !loadingDetail ? (
            <button className={styles.movieTest} type="button" onClick={() => void testPlayback()} disabled={Boolean(testingEpisode)}>
              {testingEpisode === "movie" ? <LoaderCircle className={styles.spin} /> : <Play />} ทดสอบ Player หนังเรื่องนี้
            </button>
          ) : null}
        </section>
      ) : null}

      {playback ? (
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><span>RESULT</span><h2>Wrapper Playback Response</h2></div>
            <span className={playback.ok && playback.playerCount > 0 ? styles.passPill : styles.failPill}>
              {playback.ok && playback.playerCount > 0 ? "PASS" : "FAIL"}
            </span>
          </div>
          <div className={styles.detailMeta}>
            <code>{playback.path}</code><span>HTTP {playback.status}</span><span>{playback.ms} ms</span><span>{playback.playerCount} player</span>
          </div>
          {playback.error ? <div className={styles.inlineError}><XCircle /> {playback.error}</div> : null}
          <div className={styles.playerList}>
            {playback.players.map((player, index) => (
              <div className={styles.playerRow} key={`${player.id}-${index}`}>
                <div><strong>{player.label}</strong><span>{player.kind} · {player.role} · {player.groupKey}</span></div>
                <code>{player.url || "ไม่มี URL"}</code>
                {player.url ? <a href={player.url} target="_blank" rel="noreferrer">เปิดต้นทาง <ExternalLink /></a> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {bulk ? (
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><span>BULK RESULT</span><h2>Test All EP</h2></div>
            <span className={bulk.failed === 0 ? styles.passPill : styles.failPill}>{bulk.failed === 0 ? "ALL PASS" : `${bulk.failed} FAIL`}</span>
          </div>
          <div className={styles.bulkStats}>
            <div><CheckCircle2 /><span>ผ่าน</span><strong>{bulk.passed}</strong></div>
            <div><XCircle /><span>ไม่ผ่าน</span><strong>{bulk.failed}</strong></div>
            <div><Activity /><span>เฉลี่ย</span><strong>{bulkAverage} ms</strong></div>
          </div>
          {bulk.truncated ? <div className={styles.inlineError}><CircleAlert /> แสดงผลสูงสุด 120 ตอนต่อครั้ง</div> : null}
          <div className={styles.bulkTable}>
            {bulk.results.map((row, index) => (
              <div className={styles.bulkRow} key={row.episodeId || index}>
                {row.ok ? <CheckCircle2 className={styles.okIcon} /> : <XCircle className={styles.failIcon} />}
                <strong>{row.episodeNumber == null ? "MOVIE" : `S${row.seasonNumber} EP${row.episodeNumber}`}</strong>
                <span>HTTP {row.status}</span>
                <span>{row.ms} ms</span>
                <span>{row.playerCount} player</span>
                <code>{row.error || "OK"}</code>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
