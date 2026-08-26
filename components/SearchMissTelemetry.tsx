"use client";

import { useEffect, useRef } from "react";

const MISS_HEADING = "ยังไม่พบรายการ";
const STABLE_MISS_MS = 1200;

function normalizeQuery(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/\s+/g, " ")
    .trim();
}

export default function SearchMissTelemetry() {
  const reportedRef = useRef(new Set<string>());

  useEffect(() => {
    let timer: number | null = null;

    const scheduleCheck = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.visibilityState !== "visible") return;

        const input = document.getElementById("catalog-search-input") as HTMLInputElement | null;
        const catalog = document.getElementById("catalog");
        if (!input || !catalog) return;

        const query = input.value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
        const normalized = normalizeQuery(query);
        if (normalized.length < 2) return;

        const isMiss = Array.from(catalog.querySelectorAll("h3"))
          .some((heading) => heading.textContent?.trim() === MISS_HEADING);
        if (!isMiss) return;

        const key = `${window.location.pathname}|${normalized}`;
        if (reportedRef.current.has(key)) return;
        reportedRef.current.add(key);

        void fetch("/api/analytics/search-miss", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventId: crypto.randomUUID(),
            query,
            path: window.location.pathname,
            resultCount: 0,
          }),
        }).catch(() => undefined);
      }, STABLE_MISS_MS);
    };

    const handleInput = (event: Event) => {
      if (event.target instanceof HTMLInputElement && event.target.id === "catalog-search-input") scheduleCheck();
    };

    const observer = new MutationObserver(scheduleCheck);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener("input", handleInput, true);
    scheduleCheck();

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleInput, true);
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
