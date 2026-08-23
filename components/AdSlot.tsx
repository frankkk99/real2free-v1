import { Mail, Megaphone } from "lucide-react";
import styles from "./AdSlot.module.css";

const CONTACT_EMAIL = "dofree2026@gmail.com";
const DESKTOP_PANELS = [
  { suffix: "A", label: "ซ้าย" },
  { suffix: "B", label: "กลาง" },
  { suffix: "C", label: "ขวา" },
] as const;
const SIDE_AD_COUNT = 6;

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

function SideRail({ side }: { side: "left" | "right" }) {
  const sideLabel = side === "left" ? "ซ้าย" : "ขวา";
  const sideCode = side === "left" ? "L" : "R";

  return (
    <aside className={`${styles.sideRail} ${side === "left" ? styles.sideRailLeft : styles.sideRailRight}`} aria-label={`พื้นที่โฆษณาด้าน${sideLabel}`}>
      {Array.from({ length: SIDE_AD_COUNT }).map((_, index) => {
        const code = `AD-${sideCode}${String(index + 1).padStart(2, "0")}`;
        return (
          <a
            key={code}
            className={styles.sideCard}
            href={buildMailto(code, `Side Ad ${sideLabel} ${index + 1}`, `ด้าน${sideLabel}ของรายการหนัง เริ่มจากระดับ AD-02`, "16:9 responsive")}
            title={`${code} • พื้นที่โฆษณา 16:9`}
          >
            <span className={styles.sideTop}><small>พื้นที่โฆษณา</small><em>{code}</em></span>
            <span className={styles.sideCenter}><Megaphone /><strong>16:9</strong><small>ด้าน{sideLabel}</small></span>
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
  const mobileMailto = buildMailto(code, name, placement, mobileSize);
  const hasDesktopSideRails = code === "AD-02";

  return (
    <section
      className={`${styles.slot} ${variant === "compact" ? styles.compact : ""} ${hasDesktopSideRails ? styles.withSideRails : ""}`}
      aria-label={`พื้นที่โฆษณา ${name}`}
    >
      {hasDesktopSideRails ? <SideRail side="left" /> : null}

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

      {hasDesktopSideRails ? <SideRail side="right" /> : null}
    </section>
  );
}
