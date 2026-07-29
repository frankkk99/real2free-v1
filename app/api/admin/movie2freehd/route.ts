import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ORIGIN = "https://movie2freehd.com";
const PLAYER_API_ORIGIN = "https://finplayer.meeplayer.com";
const FETCH_TIMEOUT_MS = 18_000;
const MAX_HTML_BYTES = 3_000_000;
const MAX_PAGES = 1_200;
const MAX_DISCOVER_BATCH = 6;
const MAX_EXTRACT_BATCH = 3;

type ListingCard = {
  id: string;
  url: string;
  title: string;
  poster: string | null;
  year: string | null;
  rating: string | null;
  quality: string | null;
  postId: string | null;
  page: number;
};

type PlayerOption = {
  postId: string;
  type: string;
  number: string;
  label: string;
};

type Validation = {
  ok: boolean;
  status: number;
  contentType: string;
  cors: string;
  noReferer: boolean;
  resolution: string | null;
  bandwidth: number | null;
  variantUrl: string | null;
  audioUrl: string | null;
  error: string;
};

type ResolvedPlayer = {
  label: string;
  embedUrl: string;
  hash: string;
  hlsUrl: string;
  posterUrl: string | null;
  subtitleUrl: string | null;
  validation: Validation;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#039;|&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tag.match(new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? "";
}

function validSourceUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!["http:", "https:"].includes(url.protocol) || host !== "movie2freehd.com") return null;
    if (url.username || url.password) return null;
    url.protocol = "https:";
    url.hostname = "movie2freehd.com";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function isMovieDetail(value: string) {
  try {
    return /^\/movies\/[^/]+\/?$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

function isMeePlayerUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && (hostname === "meeplayer.com" || hostname.endsWith(".meeplayer.com"));
  } catch {
    return false;
  }
}

function sourceHeaders(referer = `${SOURCE_ORIGIN}/`) {
  return {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "accept-language": "th-TH,th;q=0.9,en;q=0.8",
    referer,
  };
}

async function fetchText(url: string, options: RequestInit = {}, maxBytes = MAX_HTML_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    const body = (await response.text()).slice(0, maxBytes);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${body ? ` · ${decodeHtml(body).slice(0, 120)}` : ""}`);
    }
    return {
      text: body,
      status: response.status,
      finalUrl: response.url || url,
      contentType: response.headers.get("content-type") || "",
      cors: response.headers.get("access-control-allow-origin") || "",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("ต้นทางตอบสนองช้าเกินกำหนด");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function listingPageUrl(base: URL, page: number) {
  const url = new URL(base.toString());
  const requestedPath = url.pathname.replace(/\/page\/\d+\/?$/i, "").replace(/\/+$/, "");
  const cleanPath = requestedPath || "/movies";
  url.pathname = page <= 1
    ? `${cleanPath}/`.replace(/\/+/g, "/")
    : `${cleanPath}/page/${page}/`.replace(/\/+/g, "/");
  url.search = "";
  return url.toString();
}

function extractMaxPage(html: string) {
  let maximum = 1;
  const patterns = [
    /href\s*=\s*["'][^"']*\/page\/(\d+)\/?[^"']*["']/gi,
    /(?:page-numbers|pagination)[\s\S]{0,280}?>\s*(\d{1,4})\s*</gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html))) {
      const value = Number(match[1]);
      if (Number.isInteger(value) && value > maximum) maximum = value;
    }
  }
  return Math.min(maximum, MAX_PAGES);
}

function absoluteSourceLink(value: string, base: URL) {
  try {
    const decoded = decodeHtml(value).replace(/^["']+|["']+$/g, "");
    return validSourceUrl(new URL(decoded, base).toString())?.toString() ?? null;
  } catch {
    return null;
  }
}

function textCandidate(context: string, anchorTag: string) {
  const candidates = [
    attr(anchorTag, "title"),
    context.match(/<(?:h2|h3|h4)\b[^>]*>([\s\S]{0,500}?)<\/(?:h2|h3|h4)>/i)?.[1] || "",
    context.match(/<img\b[^>]*(?:alt|title)\s*=\s*["']([^"']+)["'][^>]*>/i)?.[1] || "",
  ];
  return candidates.map(decodeHtml).find((value) => value.length >= 2) || "";
}

function imageCandidate(context: string, base: URL) {
  const tag = context.match(/<img\b[^>]*>/i)?.[0] || "";
  const value =
    context.match(/background-image\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i)?.[1] ||
    attr(tag, "data-src") ||
    attr(tag, "data-lazy-src") ||
    attr(tag, "data-original") ||
    attr(tag, "src");
  if (!value || value.startsWith("data:")) return null;
  try {
    return new URL(decodeHtml(value), base).toString();
  } catch {
    return null;
  }
}

function extractListingCards(html: string, base: URL, page: number) {
  const cards = new Map<string, ListingCard>();
  const anchorPattern = /<a\b([^>]*?)href\s*=\s*["']([^"']*\/movies\/[^"']+)["']([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html))) {
    const url = absoluteSourceLink(match[2], base);
    if (!url || !isMovieDetail(url)) continue;
    const articleStart = html.lastIndexOf("<article", match.index);
    const articleEnd = html.indexOf("</article>", match.index);
    const nearby = articleStart >= 0 && articleEnd > match.index && match.index - articleStart < 8_000 && articleEnd - match.index < 8_000;
    const context = nearby
      ? html.slice(articleStart, articleEnd + 10)
      : html.slice(Math.max(0, match.index - 800), Math.min(html.length, match.index + 2_400));
    const anchor = `<a ${match[1]} href="${match[2]}" ${match[3]}>`;
    const title = textCandidate(context, anchor);
    if (!title || /^(watch now|ดูหนัง|ดูเรื่องนี้)$/i.test(title)) continue;
    const postId =
      context.match(/\b(?:post|postid)-(\d+)\b/i)?.[1] ||
      context.match(/\bdata-(?:post|id)\s*=\s*["'](\d+)["']/i)?.[1] ||
      null;
    const year = title.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || context.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || null;
    const rating = context.match(/(?:rating|imdb)[^>]*>[\s\S]{0,100}?(\d(?:\.\d)?)/i)?.[1] || null;
    const quality = context.match(/\b(4K|FULL\s*HD|HD|WEB-?DL|BLURAY|ZOOM|CAM)\b/i)?.[1]?.toUpperCase().replace(/\s+/g, " ") || null;
    cards.set(url, {
      id: postId ? `post-${postId}` : url,
      url,
      title,
      poster: imageCandidate(context, base),
      year,
      rating,
      quality,
      postId,
      page,
    });
  }
  return [...cards.values()];
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function sourceDate(value: string) {
  if (!value) return null;
  const parsed = Date.parse(value.replace(/\.(?=\s|$)/g, ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null;
}

function extractDetailMetadata(html: string, base: URL) {
  const title = decodeHtml(
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
      html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      "",
  ).replace(/\s*-\s*Movie2Free.*$/i, "").trim();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
  const itemImage = html.match(/<img\b[^>]*itemprop=["']image["'][^>]*>/i)?.[0] || "";
  const posterValue = attr(itemImage, "src") || head.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] || "";
  let poster: string | null = null;
  try {
    poster = posterValue ? new URL(decodeHtml(posterValue), base).toString() : null;
  } catch {
    poster = null;
  }
  const synopsisHtml = html.match(/<div\b[^>]*class=["'][^"']*\bm2f-synopsis\b[^"']*["'][^>]*>([\s\S]{0,16000}?)<\/div>/i)?.[1] || "";
  const genresHtml = html.match(/<div\b[^>]*class=["'][^"']*\bm2f-genres\b[^"']*["'][^>]*>([\s\S]{0,8000}?)<\/div>/i)?.[1] || "";
  const metaHtml = html.match(/<div\b[^>]*class=["'][^"']*\bm2f-meta-row\b[^"']*["'][^>]*>([\s\S]{0,8000}?)<\/div>/i)?.[1] || "";
  const metaText = decodeHtml(metaHtml);
  const genres = [...genresHtml.matchAll(/<a\b[^>]*>([\s\S]{0,160}?)<\/a>/gi)]
    .map((item) => decodeHtml(item[1]))
    .filter(Boolean);
  const releaseText = decodeHtml(metaHtml.match(/<[^>]+itemprop=["']dateCreated["'][^>]*>([\s\S]{0,120}?)<\//i)?.[1] || "");
  const runtimeText = decodeHtml(metaHtml.match(/<[^>]+itemprop=["']duration["'][^>]*>([\s\S]{0,120}?)<\//i)?.[1] || "");
  const contentRating = decodeHtml(metaHtml.match(/<[^>]+itemprop=["']contentRating["'][^>]*>([\s\S]{0,120}?)<\//i)?.[1] || "") || null;
  const metaTags = [...metaHtml.matchAll(/<span\b[^>]*class=["'][^"']*\bm2f-tag\b[^"']*["'][^>]*>([\s\S]{0,160}?)<\/span>/gi)].map((item) => decodeHtml(item[1]));
  const language = metaTags.find((value) => /^(?:TH|EN|JP|JA|KO|CN|ZH|FR|DE|ES)(?:[-/][A-Z]{2})?$/i.test(value)) || null;
  const imdb = metaText.match(/(?:⭐|IMDb)\s*(10(?:\.0)?|\d(?:\.\d+)?)(?:\s*\(([\d,]+)\))?/i);
  const tmdb = html.match(/<b>\s*TMDb:\s*<\/b>\s*(10(?:\.0)?|\d(?:\.\d+)?)(?:\s*<small>\s*\(([\d,]+)\s*votes?\)\s*<\/small>)?/i);
  return {
    title,
    poster,
    detailPoster: poster,
    year: title.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || releaseText.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || null,
    originalTitle: decodeHtml(html.match(/<b>\s*Original:\s*<\/b>\s*([^<]{1,300})/i)?.[1] || "") || null,
    overview: decodeHtml(synopsisHtml) || null,
    releaseDate: sourceDate(releaseText),
    sourceReleaseDate: releaseText || null,
    runtime: numberValue(runtimeText.match(/\d+/)?.[0]),
    contentRating,
    language,
    genres: [...new Set(genres)].slice(0, 20),
    imdbId: html.match(/\b(?:data-title|data-imdb(?:-id)?)\s*=\s*["'](tt\d{5,12})["']/i)?.[1] || null,
    imdbRating: numberValue(imdb?.[1]),
    imdbVoteCount: numberValue(imdb?.[2]),
    tmdbRating: numberValue(tmdb?.[1]),
    tmdbVoteCount: numberValue(tmdb?.[2]),
  };
}

function extractPlayerOptions(html: string) {
  const options = new Map<string, PlayerOption>();
  const pattern = /<(?:li|div|button)\b[^>]*\bdata-post\s*=\s*["'][^"']+["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const tag = match[0];
    const postId = attr(tag, "data-post");
    const type = attr(tag, "data-type") || "movie";
    const number = attr(tag, "data-nume") || attr(tag, "data-number") || "1";
    if (!/^\d+$/.test(postId) || !/^[a-z]+$/i.test(type) || !/^\d+$/.test(number)) continue;
    const context = html.slice(match.index, Math.min(html.length, match.index + 500));
    const label = decodeHtml(
      context.match(/class=["'][^"']*(?:title|server)[^"']*["'][^>]*>([\s\S]{0,160}?)</i)?.[1] ||
        context.match(/>([^<]{2,80})</)?.[1] ||
        `Server ${number}`,
    );
    options.set(`${postId}:${type}:${number}`, { postId, type, number, label });
  }
  if (!options.size) {
    const postId = html.match(/\bpostid-(\d+)\b/i)?.[1] || html.match(/\bdata-postid\s*=\s*["'](\d+)["']/i)?.[1];
    if (postId) options.set(`${postId}:movie:1`, { postId, type: "movie", number: "1", label: "Server 1" });
  }
  return [...options.values()].slice(0, 6);
}

async function dooPlayer(option: PlayerOption, detailUrl: string) {
  const form = new URLSearchParams({
    action: "doo_player_ajax",
    post: option.postId,
    nume: option.number,
    type: option.type,
  });
  const fetched = await fetchText(`${SOURCE_ORIGIN}/wp-admin/admin-ajax.php`, {
    method: "POST",
    headers: {
      ...sourceHeaders(detailUrl),
      origin: SOURCE_ORIGIN,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    body: form.toString(),
  }, 300_000);
  let embedUrl = "";
  try {
    embedUrl = text((JSON.parse(fetched.text) as { embed_url?: unknown }).embed_url);
  } catch {
    embedUrl = fetched.text.match(/https?:\\?\/\\?\/[^"'<>\\\s]+/i)?.[0]?.replace(/\\\//g, "/") || "";
  }
  if (!isMeePlayerUrl(embedUrl)) throw new Error("DooPlay ไม่ได้ส่ง MeePlayer URL กลับมา");
  return embedUrl;
}

function playerHash(embedUrl: string) {
  try {
    const value = new URL(embedUrl).pathname.split("/").filter(Boolean).at(-1) || "";
    return /^[a-z0-9_-]{16,128}$/i.test(value) ? value : "";
  } catch {
    return "";
  }
}

async function readManifest(value: string, referer?: string) {
  return fetchText(value, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      accept: "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*",
      ...(referer ? { referer } : {}),
    },
  }, 1_000_000);
}

async function validateHls(value: string, fallbackReferer?: string): Promise<Validation> {
  if (!isMeePlayerUrl(value)) {
    return { ok: false, status: 0, contentType: "", cors: "", noReferer: true, resolution: null, bandwidth: null, variantUrl: null, audioUrl: null, error: "HLS host ไม่ใช่ MeePlayer" };
  }
  let fetched: Awaited<ReturnType<typeof readManifest>>;
  let noReferer = true;
  try {
    fetched = await readManifest(value);
  } catch (firstError) {
    if (!fallbackReferer) {
      return { ok: false, status: 0, contentType: "", cors: "", noReferer: true, resolution: null, bandwidth: null, variantUrl: null, audioUrl: null, error: firstError instanceof Error ? firstError.message : "ตรวจ HLS ไม่สำเร็จ" };
    }
    try {
      fetched = await readManifest(value, fallbackReferer);
      noReferer = false;
    } catch (fallbackError) {
      return { ok: false, status: 0, contentType: "", cors: "", noReferer: false, resolution: null, bandwidth: null, variantUrl: null, audioUrl: null, error: fallbackError instanceof Error ? fallbackError.message : "ตรวจ HLS ไม่สำเร็จ" };
    }
  }
  try {
    if (!fetched.text.trimStart().startsWith("#EXTM3U")) throw new Error("ปลายทางไม่ใช่ HLS manifest");
    const lines = fetched.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    let variantUrl: string | null = null;
    let resolution: string | null = null;
    let bandwidth: number | null = null;
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].startsWith("#EXT-X-STREAM-INF")) continue;
      resolution = lines[index].match(/RESOLUTION=(\d+x\d+)/i)?.[1] || null;
      bandwidth = Number(lines[index].match(/BANDWIDTH=(\d+)/i)?.[1] || 0) || null;
      const next = lines.slice(index + 1).find((line) => !line.startsWith("#"));
      if (next) variantUrl = new URL(next, fetched.finalUrl).toString();
      break;
    }
    const audioValue = fetched.text.match(/#EXT-X-MEDIA:[^\r\n]*\bTYPE=AUDIO[^\r\n]*\bURI=["']([^"']+)["']/i)?.[1] || "";
    const audioUrl = audioValue ? new URL(audioValue, fetched.finalUrl).toString() : null;
    if (variantUrl) {
      const variant = await readManifest(variantUrl, noReferer ? undefined : fallbackReferer);
      if (!variant.text.trimStart().startsWith("#EXTM3U")) throw new Error("Video variant เปิดไม่ได้");
    }
    return { ok: true, status: fetched.status, contentType: fetched.contentType, cors: fetched.cors, noReferer, resolution, bandwidth, variantUrl, audioUrl, error: "" };
  } catch (error) {
    return { ok: false, status: fetched.status, contentType: fetched.contentType, cors: fetched.cors, noReferer, resolution: null, bandwidth: null, variantUrl: null, audioUrl: null, error: error instanceof Error ? error.message : "ตรวจ HLS ไม่สำเร็จ" };
  }
}

async function resolveMeePlayer(embedUrl: string, label: string): Promise<ResolvedPlayer> {
  const hash = playerHash(embedUrl);
  if (!hash) throw new Error("อ่าน MeePlayer hash ไม่สำเร็จ");
  const info = JSON.parse((await fetchText(`${PLAYER_API_ORIGIN}/api/video/${encodeURIComponent(hash)}`, {
    headers: { "user-agent": "Mozilla/5.0 Chrome/126 Safari/537.36", accept: "application/json", referer: embedUrl },
  }, 300_000)).text) as { video?: { md5?: unknown; subtitle?: unknown } };
  const md5 = text(info.video?.md5) || hash;
  const resolved = JSON.parse((await fetchText(`${PLAYER_API_ORIGIN}/api/resolve`, {
    method: "POST",
    headers: {
      "user-agent": "Mozilla/5.0 Chrome/126 Safari/537.36",
      accept: "application/json",
      "content-type": "application/json",
      origin: PLAYER_API_ORIGIN,
      referer: embedUrl,
    },
    body: JSON.stringify({ md5, hasSubtitle: Boolean(info.video?.subtitle), videoId: hash }),
  }, 500_000)).text) as { videoUrl?: unknown; poster?: unknown; posterUrl?: unknown; subtitleUrl?: unknown };
  const hlsUrl = text(resolved.videoUrl);
  if (!isMeePlayerUrl(hlsUrl)) throw new Error("Resolver ไม่ได้ส่ง HLS ของ MeePlayer");
  return {
    label,
    embedUrl,
    hash,
    hlsUrl,
    posterUrl: text(resolved.posterUrl) || text(resolved.poster) || null,
    subtitleUrl: text(resolved.subtitleUrl) || null,
    validation: await validateHls(hlsUrl, embedUrl),
  };
}

async function extractOne(raw: Record<string, unknown>) {
  const id = text(raw.id);
  const url = validSourceUrl(raw.url);
  if (!id || !url || !isMovieDetail(url.toString())) return { id, ok: false, error: "URL หน้าหนังไม่ถูกต้อง", players: [] };
  try {
    const detail = await fetchText(url.toString(), { headers: sourceHeaders() });
    const metadata = extractDetailMetadata(detail.text, url);
    const options = extractPlayerOptions(detail.text);
    if (!options.length) return { id, ok: false, error: "ไม่พบ DooPlay player option", players: [], ...metadata };
    const players: ResolvedPlayer[] = [];
    const errors: string[] = [];
    for (const option of options.slice(0, 4)) {
      try {
        const embedUrl = await dooPlayer(option, url.toString());
        const player = await resolveMeePlayer(embedUrl, option.label);
        if (!players.some((item) => item.hash === player.hash || item.hlsUrl === player.hlsUrl)) players.push(player);
      } catch (error) {
        errors.push(`${option.label}: ${error instanceof Error ? error.message : "resolve ไม่สำเร็จ"}`);
      }
    }
    const best = players.find((player) => player.validation.ok) || players[0] || null;
    return {
      id,
      ...metadata,
      ok: Boolean(best?.validation.ok),
      url: url.toString(),
      title: metadata.title || text(raw.title),
      poster: metadata.poster || text(raw.poster) || null,
      year: metadata.year || text(raw.year) || null,
      rating: text(raw.rating) || (metadata.imdbRating !== null ? String(metadata.imdbRating) : null),
      quality: text(raw.quality) || null,
      postId: options[0]?.postId || text(raw.postId) || null,
      options,
      players,
      best,
      error: best?.validation.ok ? "" : errors.join(" | ") || best?.validation.error || "ไม่พบ HLS ที่เล่นได้",
    };
  } catch (error) {
    return { id, ok: false, error: error instanceof Error ? error.message : "Extract ไม่สำเร็จ", players: [] };
  }
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, run: (item: T, index: number) => Promise<R>) {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await run(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return output;
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = text(body?.action) || "preview";

  try {
    if (action === "preview") {
      const base = validSourceUrl(body?.sourceUrl);
      if (!base) return NextResponse.json({ ok: false, error: "กรุณาใส่ URL ของ movie2freehd.com" }, { status: 400 });
      if (isMovieDetail(base.toString())) {
        return NextResponse.json({
          ok: true,
          scope: "single",
          totalPages: 1,
          cards: [{ id: base.toString(), url: base.toString(), title: decodeURIComponent(base.pathname.split("/").filter(Boolean).at(-1) || ""), poster: null, year: null, rating: null, quality: null, postId: null, page: 1 }],
        });
      }
      const fetched = await fetchText(base.toString(), { headers: sourceHeaders() });
      return NextResponse.json({ ok: true, scope: "listing", totalPages: extractMaxPage(fetched.text), cards: extractListingCards(fetched.text, new URL(fetched.finalUrl), 1) });
    }

    if (action === "discover") {
      const base = validSourceUrl(body?.sourceUrl);
      if (!base) return NextResponse.json({ ok: false, error: "URL ต้นทางไม่ถูกต้อง" }, { status: 400 });
      const pages = Array.isArray(body?.pages)
        ? [...new Set(body.pages.map(Number).filter((page) => Number.isInteger(page) && page >= 1 && page <= MAX_PAGES))].slice(0, MAX_DISCOVER_BATCH)
        : [];
      if (!pages.length) return NextResponse.json({ ok: false, error: "ไม่มีเลขหน้าสำหรับดึง" }, { status: 400 });
      const results = await mapConcurrent(pages, 3, async (page) => {
        const url = listingPageUrl(base, page);
        try {
          const fetched = await fetchText(url, { headers: sourceHeaders(base.toString()) });
          return { page, url, cards: extractListingCards(fetched.text, new URL(fetched.finalUrl), page), error: "" };
        } catch (error) {
          return { page, url, cards: [], error: error instanceof Error ? error.message : "ดึงหน้าไม่สำเร็จ" };
        }
      });
      return NextResponse.json({ ok: true, results });
    }

    if (action === "extract") {
      const items = (Array.isArray(body?.items) ? body.items : [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .slice(0, MAX_EXTRACT_BATCH);
      if (!items.length) return NextResponse.json({ ok: false, error: "ไม่มีรายการสำหรับ Extract" }, { status: 400 });
      return NextResponse.json({ ok: true, results: await mapConcurrent(items, 2, extractOne) });
    }

    if (action === "match") {
      const title = text(body?.title);
      if (!title) return NextResponse.json({ ok: false, error: "ไม่พบชื่อสำหรับค้น TMDB" }, { status: 400 });
      const year = Number(body?.year);
      const { data, error } = await auth.supabase.rpc("real2free_match_tmdb", {
        p_title: title,
        p_year: Number.isInteger(year) && year > 1800 ? year : null,
        p_limit: 6,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, matches: data ?? [] });
    }

    if (action === "create-job") {
      const sourceUrl = text(body?.sourceUrl);
      const mode = body?.mode === "single_url" ? "single_url" : "category_url";
      const { data, error } = await auth.supabase.rpc("real2free_create_movie2freehd_job", { p_source_url: sourceUrl, p_mode: mode });
      if (error) throw error;
      return NextResponse.json({ ok: true, jobId: data });
    }

    if (action === "save") {
      const item = body?.item && typeof body.item === "object" ? body.item : {};
      const jobId = text(body?.jobId) || null;
      const { data, error } = await auth.supabase.rpc("real2free_save_movie2freehd", { p_item: item, p_job_id: jobId });
      if (error) throw error;
      return NextResponse.json({ ok: true, saved: data });
    }

    if (action === "finish-job") {
      const jobId = text(body?.jobId);
      if (!jobId) return NextResponse.json({ ok: false, error: "ไม่พบ Job ID" }, { status: 400 });
      const status = text(body?.status) || "completed";
      const { error } = await auth.supabase.rpc("real2free_update_extractor_job", {
        p_job_id: jobId,
        p_status: status,
        p_total_detected: Number(body?.totalDetected) || 0,
        p_total_saved: Number(body?.totalSaved) || 0,
        p_total_skipped: Number(body?.totalSkipped) || 0,
        p_total_failed: Number(body?.totalFailed) || 0,
        p_summary: body?.summary && typeof body.summary === "object" ? body.summary : {},
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Action ไม่รองรับ" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Movie2FreeHD Extractor ทำงานไม่สำเร็จ" }, { status: 500 });
  }
}
