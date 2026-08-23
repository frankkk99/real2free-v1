"use client";

import { Mail, Megaphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./AdSlot.module.css";

const CONTACT_EMAIL = "dofree2026@gmail.com";
const DESKTOP_PANELS = [
  { suffix: "A", label: "ซ้าย" },
  { suffix: "B", label: "กลาง" },
  { suffix: "C", label: "ขวา" },
] as const;
const DEFAULT_SIDE_AD_COUNT = 6;
const MAX_SIDE_AD_COUNT = 20;
const SIDE_AD_MIN_GAP = 14;
const SIDE_AD_DESKTOP_BREAKPOINT = 1360;

type SideRailLayout = {
  count: number;
  height: number | null;
};

export type AdSlotProps = {
  code: string;
  name: string;
  placement: string;
  desktopSize: string;
  mobileSize: string;
  variant?: "banner" | "compact";
};

function buildMailto(code: string, name: string, placement: string, sizeLabel: string) {
  const subject = `สนใจลงโฆษณา ${code} - REAL2FREE`;
  const body = [
    `สนใจจองพื้นที่โฆษณา: ${name}`,
    `รหัสตำแหน่ง: ${code}`,
    `ตำแหน่ง: ${placement}`,
    `สัดส่วน/ขนาด: ${sizeLabel}`,
    "ราคา: 2,000 บาท/เดือน",
    "รบกวนแจ้งรายละเอียดและวันที่เริ่มลงโฆษณากลับด้วยครับ",
  ].join("\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function findThaiHomeSection(): HTMLElement | null {
  const catalog = document.getElementById("catalog");
  if (!catalog) return null;

  for (const child of Array.from(catalog.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const heading = child.querySelector("strong");
    if (heading?.textContent?.trim() === "หนังไทย") return child;
  }

  return null;
}

function SideRail({ side, count, height }: { side: "left" | "right"; count: number; height: number | null }) {
  const sideLabel = side === "left" ? "ซ้าย" : "ขวา";
  const sideCode = side === "left" ? "L" : "R";

  return (
    <aside
      className={`${styles.sideRail} ${side === "left" ? styles.sideRailLeft : styles.sideRailRight}`}
      aria-label={`พื้นที่โฆษณาแนวตั้งด้าน${sideLabel}`}
      data-side-rail={side}
      style={height ? { height: `${height}px`, justifyContent: "space-between" } : undefined}
    >
      {Array.from({ length: count }).map((_, index) => {
        const code = `AD-${sideCode}${String(index + 1).padStart(2, "0")}`;
        return (
          <a
            key={code}
            className={styles.sideCard}
            href={buildMailto(code, `Side Ad แนวตั้ง ${sideLabel} ${index + 1}`, `ด้าน${sideLabel}ของรายการหนัง ตั้งแต่ระดับ AD-02 ถึงท้ายหมวดหนังไทย`, "9:16 vertical responsive")}
            title={`${code} • พื้นที่โฆษณาแนวตั้ง 9:16`}
          >
            <span className={styles.sideTop}><small>พื้นที่โฆษณา</small><em>{code}</em></span>
            <span className={styles.sideCenter}><Megaphone /><strong>9:16</strong><small>แนวตั้ง • ด้าน{sideLabel}</small></span>
            <span className={styles.sidePrice}>฿2,000<small>/เดือน</small></span>
          </a>
        );
      })}
    </aside>
  );
}

export default function AdSlot({
  code,
  name,
  placement,
  desktopSize,
  mobileSize,
  variant = "banner",
}: AdSlotProps) {
  const slotRef = useRef<HTMLElement>(null);
  const [sideRailLayout, setSideRailLayout] = useState<SideRailLayout>({ count: DEFAULT_SIDE_AD_COUNT, height: null });
  const mobileMailto = buildMailto(code, name, placement, mobileSize);
  const hasDesktopSideRails = code === "AD-02";

  useEffect(() => {
    if (!hasDesktopSideRails) return;

    let frame = 0;
    const root = slotRef.current;
    if (!root) return;

    const setDefaultLayout = () => {
      setSideRailLayout((current) => (
        current.count === DEFAULT_SIDE_AD_COUNT && current.height === null
          ? current
          : { count: DEFAULT_SIDE_AD_COUNT, height: null }
      ));
    };

    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (window.innerWidth < SIDE_AD_DESKTOP_BREAKPOINT) {
          setDefaultLayout();
          return;
        }

        const rail = root.querySelector<HTMLElement>('[data-side-rail="left"]');
        const thaiSection = findThaiHomeSection();
        if (!rail || !thaiSection) {
          setDefaultLayout();
          return;
        }

        const railRect = rail.getBoundingClientRect();
        const thaiRect = thaiSection.getBoundingClientRect();
        const targetHeight = Math.max(0, thaiRect.bottom - railRect.top);
        const railWidth = railRect.width;
        if (!targetHeight || !railWidth) return;

        const cardHeight = railWidth * (16 / 9);
        const fittedCount = Math.floor((targetHeight + SIDE_AD_MIN_GAP) / (cardHeight + SIDE_AD_MIN_GAP));
        const count = Math.max(DEFAULT_SIDE_AD_COUNT, Math.min(MAX_SIDE_AD_COUNT, fittedCount));
        const height = Math.round(targetHeight);

        setSideRailLayout((current) => (
          current.count === count && current.height !== null && Math.abs(current.height - height) < 2
            ? current
            : { count, height }
        ));
      });
    };

    measure();

    const catalog = document.getElementById("catalog");
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (catalog) resizeObserver?.observe(catalog);

    const mutationObserver = catalog && typeof MutationObserver !== "undefined"
      ? new MutationObserver(measure)
      : null;
    mutationObserver?.observe(catalog as Node, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [hasDesktopSideRails]);

  return (
    <section
      ref={slotRef}
      className={`${styles.slot} ${variant === "compact" ? styles.compact : ""} ${hasDesktopSideRails ? styles.withSideRails : ""}`}
      aria-label={`พื้นที่โฆษณา ${name}`}
    >
      {hasDesktopSideRails ? <SideRail side="left" count={sideRailLayout.count} height={sideRailLayout.height} /> : null}

      <div className={styles.desktopTriptych} aria-label={`${name} แบ่ง 3 ช่อง`}>
        {DESKTOP_PANELS.map((panel) => {
          const panelCode = `${code}-${panel.suffix}`;
          return (
            <a
              key={panelCode}
              className={styles.desktopCard}
              href={buildMailto(panelCode, `${name} ช่อง${panel.label}`, `${placement} • ช่อง${panel.label}`, `21:9 responsive • อ้างอิงเดิม ${desktopSize}`)}
            >
              <span className={styles.desktopTop}>
                <span><Megaphone /> พื้นที่โฆษณา</span>
                <em>{panelCode}</em>
              </span>

              <span className={styles.desktopCenter}>
                <span className={styles.desktopIcon}><Megaphone /></span>
                <span>
                  <strong>{name}</strong>
                  <small>ช่อง{panel.label} • สัดส่วน 21:9</small>
                </span>
              </span>

              <span className={styles.desktopBottom}>
                <small>{placement}</small>
                <span className={styles.desktopPrice}>฿2,000<small>/เดือน</small></span>
              </span>
            </a>
          );
        })}
      </div>

      <a className={styles.mobileLink} href={mobileMailto}>
        <div className={styles.heading}>
          <span className={styles.badge}><Megaphone /> พื้นที่โฆษณา</span>
          <span className={styles.code}>{code}</span>
        </div>

        <div className={styles.main}>
          <span className={styles.icon}><Megaphone /></span>
          <span className={styles.copy}>
            <strong>{name}</strong>
            <small>{placement} • {mobileSize} mobile</small>
          </span>
          <span className={styles.price}>฿2,000<small>/เดือน</small></span>
        </div>

        <div className={styles.footer}>
          <span>พื้นที่ว่างสำหรับแบรนด์ของคุณ</span>
          <span><Mail /> คลิกเพื่อติดต่อ: {CONTACT_EMAIL}</span>
        </div>
      </a>

      {hasDesktopSideRails ? <SideRail side="right" count={sideRailLayout.count} height={sideRailLayout.height} /> : null}
    </section>
  );
}
