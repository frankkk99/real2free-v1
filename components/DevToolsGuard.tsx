"use client";

import { useEffect, useRef, useState } from "react";

const DEVTOOLS_GAP_PX = 220;
const POLL_INTERVAL_MS = 850;
const SECURITY_EVENT = "r2f:security-lock";

function isDesktopPointer() {
  return window.matchMedia?.("(pointer: fine)").matches ?? false;
}

function devToolsLikelyDocked() {
  if (!isDesktopPointer()) return false;
  if (window.outerWidth < 800 || window.outerHeight < 520) return false;

  const widthGap = Math.max(0, window.outerWidth - window.innerWidth);
  const heightGap = Math.max(0, window.outerHeight - window.innerHeight);
  return widthGap > DEVTOOLS_GAP_PX || heightGap > DEVTOOLS_GAP_PX;
}

function blockedDeveloperShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  const command = event.ctrlKey || event.metaKey;
  const inspectorChord = command
    && (event.shiftKey || event.altKey)
    && ["i", "j", "c", "k"].includes(key);
  const viewSource = command && (key === "u" || (event.altKey && key === "u"));

  return event.key === "F12" || inspectorChord || viewSource;
}

function neutralizeActiveMedia() {
  document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((media) => {
    media.pause();
    media.removeAttribute("src");
    media.querySelectorAll("source").forEach((source) => source.removeAttribute("src"));
    media.load();
  });

  document.querySelectorAll<HTMLIFrameElement>("iframe").forEach((frame) => {
    if (frame.getAttribute("src") !== "about:blank") frame.setAttribute("src", "about:blank");
    frame.removeAttribute("srcdoc");
  });
}

export default function DevToolsGuard() {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const reloadAfterUnlockRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const publishLock = (nextLocked: boolean) => {
      if (lockedRef.current === nextLocked) return;

      const wasLocked = lockedRef.current;
      lockedRef.current = nextLocked;
      setLocked(nextLocked);
      document.documentElement.toggleAttribute("data-r2f-security-lock", nextLocked);
      window.dispatchEvent(new CustomEvent(SECURITY_EVENT, { detail: { locked: nextLocked } }));

      if (nextLocked) {
        reloadAfterUnlockRef.current = true;
        neutralizeActiveMedia();
        return;
      }

      if (wasLocked && reloadAfterUnlockRef.current) {
        reloadAfterUnlockRef.current = false;
        window.location.reload();
      }
    };

    const checkDockedTools = () => {
      if (document.visibilityState !== "visible") return;
      publishLock(devToolsLikelyDocked());
    };

    const preventShortcut = (event: KeyboardEvent) => {
      if (!blockedDeveloperShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const preventContextMenu = (event: MouseEvent) => {
      if (!isDesktopPointer()) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const mediaObserver = new MutationObserver(() => {
      if (lockedRef.current) neutralizeActiveMedia();
    });

    document.addEventListener("keydown", preventShortcut, true);
    document.addEventListener("contextmenu", preventContextMenu, true);
    window.addEventListener("resize", checkDockedTools, { passive: true });
    window.addEventListener("focus", checkDockedTools, { passive: true });
    document.addEventListener("visibilitychange", checkDockedTools, { passive: true });
    mediaObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcdoc"],
    });

    const timer = window.setInterval(checkDockedTools, POLL_INTERVAL_MS);
    checkDockedTools();

    return () => {
      window.clearInterval(timer);
      mediaObserver.disconnect();
      document.removeEventListener("keydown", preventShortcut, true);
      document.removeEventListener("contextmenu", preventContextMenu, true);
      window.removeEventListener("resize", checkDockedTools);
      window.removeEventListener("focus", checkDockedTools);
      document.removeEventListener("visibilitychange", checkDockedTools);
      document.documentElement.removeAttribute("data-r2f-security-lock");
    };
  }, []);

  if (!locked) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#02060d",
        color: "#f5f7fb",
        textAlign: "center",
        fontFamily: "var(--font-body), sans-serif",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <strong style={{ display: "block", fontSize: "clamp(22px, 4vw, 34px)", marginBottom: 10 }}>
          โหมดป้องกันกำลังทำงาน
        </strong>
        <span style={{ color: "#aeb8c8", lineHeight: 1.7 }}>
          กรุณาปิดเครื่องมือนักพัฒนาเพื่อใช้งานเว็บไซต์ต่อ
        </span>
      </div>
    </div>
  );
}
