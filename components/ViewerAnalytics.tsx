"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "real2free:viewer:visitor:v1";
const SESSION_KEY = "real2free:viewer:session:v1";
const SENT_PREFIX = "real2free:viewer:sent:v2:";
const BOT_RE = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pagespeed|uptime|monitor|curl|wget|python-requests|httpclient)/i;
const PLAY_SELECTOR = 'button[aria-label^="เริ่มรับชม "], a[aria-label^="รับชม "]';

type EventType = "page_view" | "engaged_visit" | "play_clicked" | "player_started" | "watch_30s" | "watch_2m" | "ad_impression" | "ad_click";
type SourceKind = "video" | "embed" | "external" | "ad" | "unknown";
type Verification = "page_load" | "interaction" | "media_playback" | "media_time" | "embed_loaded" | "embed_visible" | "external_click" | "intersection" | "unknown";

function storageUuid(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}
function pageTitle() {
  const heading = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim();
  if (heading) return heading.slice(0, 200);
  return document.title.replace(/\s*[|·-]\s*real2free.*$/i, "").trim().slice(0, 200) || null;
}
function publicPath() {
  const path = window.location.pathname || "/";
  if (path.startsWith("/admin") || path.startsWith("/api/")) return null;
  return path.slice(0, 500);
}
function isWatchPath() { return window.location.pathname.startsWith("/watch/"); }

export function ViewerAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (navigator.webdriver || BOT_RE.test(navigator.userAgent || "")) return;

    const visitorId = storageUuid(window.localStorage, VISITOR_KEY);
    const sessionId = storageUuid(window.sessionStorage, SESSION_KEY);
    const timers = new Set<number>();
    const observed = new WeakSet<Element>();
    const observedAds = new WeakSet<Element>();

    function send(eventType: EventType, sourceKind: SourceKind = "unknown", verification: Verification = "unknown", sessionWide = false, adCode: string | null = null) {
      const path = publicPath();
      if (!path) return;
      const cleanAdCode = adCode?.trim().slice(0, 100) || null;
      const dedupe = sessionWide ? `${eventType}:session` : `${eventType}:${path}:${sourceKind}:${verification}:${cleanAdCode || "-"}`;
      const key = `${SENT_PREFIX}${dedupe}`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
      void fetch("/api/analytics/viewer", {
        method: "POST", cache: "no-store", credentials: "same-origin", keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: crypto.randomUUID(), visitorId, sessionId, eventType, path, titleLabel: pageTitle(), referrer: document.referrer || null, sourceKind, verification, adCode: cleanAdCode, automationHint: navigator.webdriver === true }),
      }).catch(() => undefined);
    }

    send("page_view", "unknown", "page_load");
    let engaged = false;
    const markEngaged = () => { if (!engaged) { engaged = true; send("engaged_visit", "unknown", "interaction", true); } };

    const handleClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const ad = element?.closest<HTMLElement>("[data-ad-code]");
      if (ad?.dataset.adCode) { markEngaged(); send("ad_click", "ad", "interaction", false, ad.dataset.adCode); }
      if (!isWatchPath()) return;
      const target = element?.closest(PLAY_SELECTOR);
      if (!target) return;
      markEngaged();
      const external = target instanceof HTMLAnchorElement;
      send("play_clicked", external ? "external" : "unknown", external ? "external_click" : "interaction");
    };

    function observeVideo(video: HTMLVideoElement) {
      if (observed.has(video) || !isWatchPath()) return;
      observed.add(video); let sent30 = false; let sent120 = false;
      const onPlaying = () => send("player_started", "video", "media_playback");
      const onTime = () => { const seconds = Number(video.currentTime || 0); if (!sent30 && seconds >= 30) { sent30 = true; send("watch_30s", "video", "media_time"); } if (!sent120 && seconds >= 120) { sent120 = true; send("watch_2m", "video", "media_time"); } };
      video.addEventListener("playing", onPlaying, { passive: true });
      video.addEventListener("timeupdate", onTime, { passive: true });
    }
    function observeFrame(frame: HTMLIFrameElement) {
      if (observed.has(frame) || !isWatchPath()) return;
      observed.add(frame); let timer: number | null = null; let visibleSeconds = 0; let sent30 = false; let sent120 = false;
      frame.addEventListener("load", () => {
        send("player_started", "embed", "embed_loaded");
        if (timer != null) return;
        timer = window.setInterval(() => {
          if (!frame.isConnected) { if (timer != null) { window.clearInterval(timer); timers.delete(timer); timer = null; } return; }
          if (document.visibilityState !== "visible") return;
          visibleSeconds += 5;
          if (!sent30 && visibleSeconds >= 30) { sent30 = true; send("watch_30s", "embed", "embed_visible"); }
          if (!sent120 && visibleSeconds >= 120) { sent120 = true; send("watch_2m", "embed", "embed_visible"); if (timer != null) { window.clearInterval(timer); timers.delete(timer); timer = null; } }
        }, 5000);
        timers.add(timer);
      }, { passive: true });
    }

    const adObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const ad = entry.target as HTMLElement;
        if (ad.dataset.adCode) send("ad_impression", "ad", "intersection", false, ad.dataset.adCode);
        adObserver.unobserve(ad);
      }
    }, { threshold: [0.5] });

    function scan(root: ParentNode) {
      if (isWatchPath()) {
        if (root instanceof HTMLVideoElement) observeVideo(root);
        if (root instanceof HTMLIFrameElement) observeFrame(root);
        root.querySelectorAll?.("video").forEach((node) => observeVideo(node as HTMLVideoElement));
        root.querySelectorAll?.("iframe").forEach((node) => observeFrame(node as HTMLIFrameElement));
      }
      const ads = root instanceof Element && root.matches("[data-ad-code]") ? [root] : Array.from(root.querySelectorAll?.("[data-ad-code]") || []);
      ads.forEach((node) => { if (!observedAds.has(node)) { observedAds.add(node); adObserver.observe(node); } });
    }

    const observer = new MutationObserver((records) => { for (const record of records) record.addedNodes.forEach((node) => { if (node instanceof Element) scan(node); }); });
    scan(document); observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pointerdown", markEngaged, { capture: true, passive: true });
    window.addEventListener("touchstart", markEngaged, { capture: true, passive: true });
    window.addEventListener("keydown", markEngaged, { capture: true });
    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      observer.disconnect(); adObserver.disconnect();
      window.removeEventListener("pointerdown", markEngaged, true); window.removeEventListener("touchstart", markEngaged, true); window.removeEventListener("keydown", markEngaged, true); document.removeEventListener("click", handleClick, true);
      timers.forEach((timer) => window.clearInterval(timer)); timers.clear();
    };
  }, [pathname]);
  return null;
}
