"use client";

import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Globe2,
  KeyRound,
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
import simStyles from "./ApiPlayerClientSimulator.module.css";

type CredentialMode = "CLIENT_SPECIFIC_KEY" | "REFERENCE_KEY" | "MISSING_KEY";

type ClientPreset = {
  id: string;
  label: string;
  domain: string;
  credentialMode: CredentialMode;
};

type CallMeta = {
  ok: boolean;
  status: number;
  ms: number;
  path: string;
  error: string | null;
  errorCode: string | null;
  clientDomain: string;
  credentialMode: CredentialMode;
};

type Health = {
  ok: boolean;
  config?: {
    mode: string;
    origin: string;
    clientDomain: string;
    apiKeyConfigured: boolean;
    credentialMode: CredentialMode;
    supportsClientSpecificKeys: boolean;
  };
  presets?: ClientPreset[];
  ping?: CallMeta & { sampleCount: number };
  error?: string;
};

type DomainCheck = {
  ok: boolean;
  config: Health["config"];
  result: CallMeta & { sampleCount: number };
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

type DetailResponse = CallMeta & {
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
  host: string;
};

type PlaybackResponse = CallMeta & {
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
  errorCode: string | null;
};

type BulkResponse = {
  ok: boolean;
  clientDomain: string;
  credentialMode: CredentialMode;
  truncated: boolean;
  total: number;
  passed: number;
  failed: number;
  results: BulkRow[];
};

type MatrixResponse = {
  ok: boolean;
  rows: Array<CallMeta & { sampleCount: number }>;
};

async function adminToken() {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  return data.session?.access_token || "";
}

function credentialLabel(mode?: CredentialMode) {
  if (mode === "CLIENT_SPECIFIC_KEY") return "CLIENT KEY";
  if (mode === "REFERENCE_KEY") return "REFERENCE KEY";
  return "NO KEY";
}

function normalizeDomainInput(value: string) {
  const input = value.trim().toLowerCase();
  if (!input) return "";
  try {
    const parsed = new URL(input.includes("://") ? input : `https://${input}`);
    return parsed.hostname;
  } catch {
    return input.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  }
}

export default function ApiPlayerReferenceTest() {
  const [health, setHealth] = useState<Health | null>(null);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [domainCheck, setDomainCheck] = useState<DomainCheck | null>(null);
  const [matrix, setMatrix] = useState<MatrixResponse | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [playback, setPlayback] = useState<PlaybackResponse | null>(null);
  const [bulk, setBulk] = useState<BulkResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [testingMatrix, setTestingMatrix] = useState(false);
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
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload as T;
  }

  function clearTitleResults() {
    setItems([]);
    setSelectedItem(null);
    setDetail(null);
    setPlayback(null);
    setBulk(null);
  }

  async function refreshHealth() {
    setLoadingHealth(true);
    setError("");
    try {
      const payload = await request<Health>();
      setHealth(payload);
      const domain = payload.config?.clientDomain || "real2free.online";
      setSelectedDomain((current) => current || domain);
      if (!domainCheck && payload.ping) {
        setDomainCheck({ ok: payload.ping.ok, config: payload.config, result: payload.ping });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ตรวจ APIPlayer ไม่สำเร็จ");
    } finally {
      setLoadingHealth(false);
    }
  }

  useEffect(() => {
    void refreshHealth();
  }, []);

  async function checkClientDomain(domain: string) {
    const normalized = normalizeDomainInput(domain);
    if (!normalized) return;
    setCheckingDomain(true);
    setError("");
    setDomainCheck(null);
    clearTitleResults();
    try {
      const payload = await request<DomainCheck>({ action: "domain-check", clientDomain: normalized });
      setSelectedDomain(payload.result.clientDomain || normalized);
      setCustomDomain(payload.result.clientDomain || normalized);
      setDomainCheck(payload);
      if (!payload.ok) {
        setError(`${payload.result.errorCode || "API_ERROR"}: ${payload.result.error || "ตรวจโดเมนไม่ผ่าน"}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ตรวจ Client Domain ไม่สำเร็จ");
    } finally {
      setCheckingDomain(false);
    }
  }

  async function testDomainMatrix() {
    setTestingMatrix(true);
    setError("");
    try {
      const domains = (health?.presets || []).map((preset) => preset.domain);
      const custom = normalizeDomainInput(customDomain);
      if (custom && !domains.includes(custom)) domains.push(custom);
      setMatrix(await request<MatrixResponse>({ action: "domain-matrix", domains }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ทดสอบ Domain Matrix ไม่สำเร็จ");
    } finally {
      setTestingMatrix(false);
    }
  }

  async function searchCatalog(event?: FormEvent) {
    event?.preventDefault();
    const q = query.trim();
    if (!q || !selectedDomain) return;
    setSearching(true);
    setError("");
    setSelectedItem(null);
    setDetail(null);
    setPlayback(null);
    setBulk(null);
    try {
      const payload = await request<CallMeta & { items: CatalogItem[] }>({
        action: "search",
        q,
        clientDomain: selectedDomain,
      });
      setItems(Array.isArray(payload.items) ? payload.items : []);
      if (!payload.ok) setError(`${payload.errorCode || "API_ERROR"}: ${payload.error || `HTTP ${payload.status}`}`);
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
      const payload = await request<DetailResponse>({ action: "detail", id: item.id, clientDomain: selectedDomain });
      setDetail(payload);
      if (!payload.ok) setError(`${payload.errorCode || "API_ERROR"}: ${payload.error || `HTTP ${payload.status}`}`);
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
        clientDomain: selectedDomain,
      });
      setPlayback(payload);
      if (!payload.ok) setError(`${payload.errorCode || "API_ERROR"}: ${payload.error || `HTTP ${payload.status}`}`);
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
      setBulk(await request<BulkResponse>({
        action: "test-all",
        titleId: selectedItem.id,
        clientDomain: selectedDomain,
      }));
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

  const activeCheck = domainCheck?.result || health?.ping;
  const apiHealthy = Boolean(activeCheck?.ok);
  const activeCredential = activeCheck?.credentialMode || health?.config?.credentialMode;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href="/admin"><ArrowLeft /> หลังบ้าน</Link>
          <span className={styles.eyebrow}>APIPlayer Reference Client</span>
          <h1>Wrapper Test Center</h1>
          <p>จำลองการเรียก APIPlayer ด้วย Client Domain ของเว็บลูกค้า แล้วแยกว่าเสียที่สิทธิ์โดเมน, API key, wrapper หรือ player ต้นทาง</p>
        </div>
        <button className={styles.iconButton} type="button" onClick={() => void refreshHealth()} disabled={loadingHealth}>
          <RefreshCw className={loadingHealth ? styles.spin : ""} />
        </button>
      </header>

      <section className={`${styles.statusCard} ${apiHealthy ? styles.good : styles.bad}`}>
        <div className={styles.statusIcon}>{apiHealthy ? <ShieldCheck /> : <CircleAlert />}</div>
        <div className={styles.statusMain}>
          <strong>{apiHealthy ? `${selectedDomain || "Reference client"} เชื่อมต่อผ่าน` : `${selectedDomain || "APIPlayer wrapper"} มีปัญหา`}</strong>
          <span>{activeCheck?.errorCode ? `${activeCheck.errorCode} · ${activeCheck.error || ""}` : (apiHealthy ? "API authorization + domain whitelist ผ่าน" : "กำลังตรวจสอบหรือยังไม่มีผล")}</span>
        </div>
        <div className={styles.statusMetrics}>
          <span><b>{activeCheck?.status ?? "-"}</b> HTTP</span>
          <span><b>{activeCheck?.ms ?? "-"}</b> ms</span>
          <span><b>{credentialLabel(activeCredential)}</b> CREDENTIAL</span>
        </div>
      </section>

      <section className={styles.configGrid}>
        <div><Server /><span>API Origin</span><strong>{health?.config?.origin || "-"}</strong></div>
        <div><Globe2 /><span>Active Client Domain</span><strong>{selectedDomain || "-"}</strong></div>
        <div><KeyRound /><span>Credential Mode</span><strong>{credentialLabel(activeCredential)}</strong></div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div><span>CLIENT SIMULATOR</span><h2>เลือกเว็บลูกค้าที่ต้องการจำลอง</h2></div>
          <button className={simStyles.secondaryButton} type="button" onClick={() => void testDomainMatrix()} disabled={testingMatrix}>
            {testingMatrix ? <LoaderCircle className={styles.spin} /> : <Activity />} ทดสอบทุกโดเมน
          </button>
        </div>

        <div className={simStyles.clientPresets}>
          {(health?.presets || []).map((preset) => (
            <button
              key={preset.domain}
              type="button"
              className={`${simStyles.clientPreset} ${selectedDomain === preset.domain ? simStyles.clientPresetActive : ""}`}
              onClick={() => void checkClientDomain(preset.domain)}
              disabled={checkingDomain}
            >
              <strong>{preset.label}</strong>
              <span>{preset.domain}</span>
              <small>{credentialLabel(preset.credentialMode)}</small>
            </button>
          ))}
        </div>

        <form className={simStyles.domainForm} onSubmit={(event) => { event.preventDefault(); void checkClientDomain(customDomain); }}>
          <Globe2 />
          <input value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} placeholder="โดเมนอื่น เช่น customer-site.com" />
          <button type="submit" disabled={checkingDomain || !customDomain.trim()}>
            {checkingDomain ? <LoaderCircle className={styles.spin} /> : <ShieldCheck />} ใช้โดเมนนี้
          </button>
        </form>

        <div className={simStyles.simulatorNote}>
          <ShieldCheck />
          <span><b>REFERENCE KEY</b> = ใช้ key ของ REAL2FREE แต่เปลี่ยน x-client-domain เพื่อเช็ก whitelist · <b>CLIENT KEY</b> = มี key เฉพาะลูกค้าถูกตั้งบน server และจำลองได้ใกล้เคียงลูกค้าจริงที่สุด</span>
        </div>

        {matrix ? (
          <div className={simStyles.matrixTable}>
            {matrix.rows.map((row) => (
              <button key={row.clientDomain} type="button" className={simStyles.matrixRow} onClick={() => void checkClientDomain(row.clientDomain)}>
                {row.ok ? <CheckCircle2 className={styles.okIcon} /> : <XCircle className={styles.failIcon} />}
                <strong>{row.clientDomain}</strong>
                <span>HTTP {row.status}</span>
                <span>{row.ms} ms</span>
                <span>{credentialLabel(row.credentialMode)}</span>
                <code>{row.errorCode || "OK"}</code>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {error ? <div className={styles.alert}><CircleAlert /><span>{error}</span></div> : null}

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div><span>STEP 1</span><h2>ค้นหาเรื่องจาก APIPlayer</h2></div>
          <span className={simStyles.domainBadge}>{selectedDomain || "เลือก Client Domain ก่อน"}</span>
        </div>
        <form className={styles.searchForm} onSubmit={searchCatalog}>
          <Search />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อหนัง / ซีรีส์ / ชื่ออังกฤษ" />
          <button type="submit" disabled={searching || !query.trim() || !selectedDomain}>
            {searching ? <LoaderCircle className={styles.spin} /> : <Search />} ค้นหา
          </button>
        </form>

        {items.length ? (
          <div className={styles.results}>
            {items.map((item) => (
              <button key={item.id} type="button" className={`${styles.resultCard} ${selectedItem?.id === item.id ? styles.selected : ""}`} onClick={() => void openItem(item)}>
                <div className={styles.poster}>{item.posterUrl ? <img src={item.posterUrl} alt="" /> : <Play />}</div>
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

          {loadingDetail ? <div className={styles.loading}><LoaderCircle className={styles.spin} /> กำลังเรียก catalog detail ผ่าน {selectedDomain}</div> : null}

          {detail ? (
            <div className={styles.detailMeta}>
              <span className={detail.ok ? styles.passPill : styles.failPill}>{detail.ok ? "PASS" : "FAIL"}</span>
              <code>{detail.path}</code>
              <span>HTTP {detail.status}</span>
              <span>{detail.ms} ms</span>
              <span>{credentialLabel(detail.credentialMode)}</span>
              {detail.errorCode ? <span>{detail.errorCode}</span> : null}
            </div>
          ) : null}

          {detail?.detail?.episodes?.length ? (
            <div className={styles.episodeList}>
              {detail.detail.episodes.map((episode) => (
                <div className={styles.episodeRow} key={episode.id}>
                  <div><strong>S{episode.seasonNumber} · EP{episode.episodeNumber}</strong><span>{episode.title || "ไม่มีชื่อตอน"}</span></div>
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
            <span className={playback.ok && playback.playerCount > 0 ? styles.passPill : styles.failPill}>{playback.ok && playback.playerCount > 0 ? "PASS" : "FAIL"}</span>
          </div>
          <div className={styles.detailMeta}>
            <code>{playback.path}</code><span>HTTP {playback.status}</span><span>{playback.ms} ms</span><span>{playback.playerCount} player</span><span>{playback.clientDomain}</span><span>{credentialLabel(playback.credentialMode)}</span>
          </div>
          {playback.error ? <div className={styles.inlineError}><XCircle /> <b>{playback.errorCode || "API_ERROR"}</b> · {playback.error}</div> : null}
          <div className={styles.playerList}>
            {playback.players.map((player, index) => (
              <div className={styles.playerRow} key={`${player.id}-${index}`}>
                <div><strong>{player.label}</strong><span>{player.kind} · {player.role} · {player.groupKey}{player.host ? ` · ${player.host}` : ""}</span></div>
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
            <div><span>BULK RESULT</span><h2>Test All EP · {bulk.clientDomain}</h2></div>
            <span className={bulk.failed === 0 ? styles.passPill : styles.failPill}>{bulk.failed === 0 ? "ALL PASS" : `${bulk.failed} FAIL`}</span>
          </div>
          <div className={styles.bulkStats}>
            <div><CheckCircle2 /><span>ผ่าน</span><strong>{bulk.passed}</strong></div>
            <div><XCircle /><span>ไม่ผ่าน</span><strong>{bulk.failed}</strong></div>
            <div><Activity /><span>เฉลี่ย</span><strong>{bulkAverage} ms</strong></div>
          </div>
          <div className={styles.detailMeta}><span>{credentialLabel(bulk.credentialMode)}</span></div>
          {bulk.truncated ? <div className={styles.inlineError}><CircleAlert /> แสดงผลสูงสุด 120 ตอนต่อครั้ง</div> : null}
          <div className={styles.bulkTable}>
            {bulk.results.map((row, index) => (
              <div className={styles.bulkRow} key={row.episodeId || index}>
                {row.ok ? <CheckCircle2 className={styles.okIcon} /> : <XCircle className={styles.failIcon} />}
                <strong>{row.episodeNumber == null ? "MOVIE" : `S${row.seasonNumber} EP${row.episodeNumber}`}</strong>
                <span>HTTP {row.status}</span>
                <span>{row.ms} ms</span>
                <span>{row.playerCount} player</span>
                <code>{row.errorCode || row.error || "OK"}</code>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
