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
const MOBILE_PANELS = [
  { suffix: "M1", label: "ซ้าย" },
  { suffix: "M2", label: "ขวา" },
] as const;
const DEFAULT_SIDE_AD_COUNT = 6;
const MAX_SIDE_AD_COUNT = 20;
const SIDE_AD_MIN_GAP = 14;
const SIDE_AD_DESKTOP_BREAKPOINT = 1360;
const SIDE_AD_PRICE = 2_000;

const AD_PRICING: Record<string, { desktop: number; mobile: number }> = {
  "AD-01": { desktop: 20_000, mobile: 10_000 },
  "AD-02": { desktop: 10_000, mobile: 5_000 },
  "AD-03": { desktop: 5_000, mobile: 2_000 },
  "AD-04": { desktop: 5_000, mobile: 2_000 },
  "AD-05": { desktop: 2_000, mobile: 2_000 },
};

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

function getAdPrice(code: string, device: "desktop" | "mobile") {
  return AD_PRICING[code]?.[device] ?? 2_000;
}

function formatAdPrice(price: number) {
  return price.toLocaleString("en-US");
}

function buildMailto(code: string, name: string, placement: string, sizeLabel: string, price: number) {
  const subject = `สนใจลงโฆษณา ${code} - REAL2FREE`;
  const body = [
    `สนใจจองพื้นที่โฆษณา: ${name}`,
    `รหัสตำแหน่ง: ${code}`,
    `ตำแหน่ง: ${placement}`,
    `สัดส่วน/ขนาด: ${sizeLabel}`,
    `ราคา: ${formatAdPrice(price)} บาท/เดือน`,
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
        const railCode = `AD-${sideCode}${String(index + 1).padStart(2, "0")}`;
        return (
          <a
            key={railCode}
            className={styles.sideCard}
            data-ad-code={railCode}
            href={buildMailto(
              railCode,
              `Side Ad แนวตั้ง ${sideLabel} ${index + 1}`,
              `ด้าน${sideLabel}ของรายการหนัง ตั้งแต่ระดับ AD-02 ถึงท้ายหมวดหนังไทย`,
              "9:16 vertical responsive",
              SIDE_AD_PRICE,
            )}
            title={`${railCode} • พื้นที่โฆษณาแนวตั้ง 9:16`}
          >
            <span className={styles.sideTop}><small>พื้นที่โฆษณา</small><em>{railCode}</em></span>
            <span className={styles.sideCenter}><Megaphone /><strong>9:16</strong><small>แนวตั้ง • ด้าน{sideLabel}</small></span>
            <span className={styles.sidePrice}>฿{formatAdPrice(SIDE_AD_PRICE)}<small>/เดือน</small></span>
          </a>
        );
      })}
    </aside>
  );
}

export default function AdSlot({ code, name, placement, desktopSize, mobileSize, variant = "banner" }: AdSlotProps) {
  const slotRef = useRef<HTMLElement>(null);
  const [sideRailLayout, setSideRailLayout] = useState<SideRailLayout>({ count: DEFAULT_SIDE_AD_COUNT, height: null });
  const hasDesktopSideRails = code === "AD-02";
  const desktopPrice = getAdPrice(code, "desktop");
  const mobilePrice = getAdPrice(code, "mobile");

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
        if (window.innerWidth < SIDE_AD_DESKTOP_BREAKPOINT) { setDefaultLayout(); return; }
        const rail = root.querySelector<HTMLElement>('[data-side-rail="left"]');
        const thaiSection = findThaiHomeSection();
        if (!rail || !thaiSection) { setDefaultLayout(); return; }
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
    const mutationObserver = catalog && typeof MutationObserver !== "undefined" ? new MutationObserver(measure) : null;
    mutationObserver?.observe(catalog as Node, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
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
      data-ad-code={code}
    >
      {hasDesktopSideRails ? <SideRail side="left" count={sideRailLayout.count} height={sideRailLayout.height} /> : null}

      <div className={styles.desktopTriptych} aria-label={`${name} แบ่ง 3 ช่อง`}>
        {DESKTOP_PANELS.map((panel) => {
          const panelCode = `${code}-${panel.suffix}`;
          return (
            <a
              key={panelCode}
              className={styles.desktopCard}
              data-ad-code={panelCode}
              href={buildMailto(panelCode, `${name} ช่อง${panel.label}`, `${placement} • ช่อง${panel.label}`, `21:9 responsive • อ้างอิงเดิม ${desktopSize}`, desktopPrice)}
            >
              <span className={styles.desktopTop}><span><Megaphone /> พื้นที่โฆษณา</span><em>{panelCode}</em></span>
              <span className={styles.desktopCenter}><span className={styles.desktopIcon}><Megaphone /></span><span><strong>{name}</strong><small>ช่อง{panel.label} • สัดส่วน 21:9</small></span></span>
              <span className={styles.desktopBottom}><small>{placement}</small><span className={styles.desktopPrice}>฿{formatAdPrice(desktopPrice)}<small>/เดือน</small></span></span>
            </a>
          );
        })}
      </div>

      <div className={styles.mobilePair} aria-label={`${name} มือถือแบ่ง 2 ช่อง 21:9`}>
        {MOBILE_PANELS.map((panel) => {
          const panelCode = `${code}-${panel.suffix}`;
          return (
            <a
              key={panelCode}
              className={styles.mobileCard}
              data-ad-code={panelCode}
              href={buildMailto(panelCode, `${name} มือถือช่อง${panel.label}`, `${placement} • มือถือช่อง${panel.label}`, `21:9 responsive • เดิม ${mobileSize}`, mobilePrice)}
              title={`${panelCode} • โฆษณามือถือ 21:9`}
            >
              <span className={styles.mobileTop}><span><Megaphone /> AD</span><em>{panelCode}</em></span>
              <span className={styles.mobileCenter}><span className={styles.mobileIcon}><Megaphone /></span><span><strong>{name}</strong><small>ช่อง{panel.label} • 21:9</small></span></span>
              <span className={styles.mobileBottom}><strong>฿{formatAdPrice(mobilePrice)}<small>/เดือน</small></strong><span><Mail /> ติดต่อ</span></span>
            </a>
          );
        })}
      </div>

      {hasDesktopSideRails ? <SideRail side="right" count={sideRailLayout.count} height={sideRailLayout.height} /> : null}
    </section>
  );
}
