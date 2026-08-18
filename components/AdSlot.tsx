import { Mail, Megaphone } from "lucide-react";
import styles from "./AdSlot.module.css";

const CONTACT_EMAIL = "dofree2026@gmail.com";

export type AdSlotProps = {
  code: string;
  name: string;
  placement: string;
  desktopSize: string;
  mobileSize: string;
  variant?: "banner" | "compact";
};

export default function AdSlot({
  code,
  name,
  placement,
  desktopSize,
  mobileSize,
  variant = "banner",
}: AdSlotProps) {
  const subject = `สนใจลงโฆษณา ${code} - REAL2FREE`;
  const body = [
    `สนใจจองพื้นที่โฆษณา: ${name}`,
    `รหัสตำแหน่ง: ${code}`,
    "ราคา: 2,000 บาท/เดือน",
    "รบกวนแจ้งรายละเอียดและวันที่เริ่มลงโฆษณากลับด้วยครับ",
  ].join("\n");
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section className={`${styles.slot} ${variant === "compact" ? styles.compact : ""}`} aria-label={`พื้นที่โฆษณา ${name}`}>
      <a className={styles.link} href={mailto}>
        <div className={styles.heading}>
          <span className={styles.badge}><Megaphone /> พื้นที่โฆษณา</span>
          <span className={styles.code}>{code}</span>
        </div>

        <div className={styles.main}>
          <span className={styles.icon}><Megaphone /></span>
          <span className={styles.copy}>
            <strong>{name}</strong>
            <small>{placement} • {desktopSize} desktop / {mobileSize} mobile</small>
          </span>
          <span className={styles.price}>฿2,000<small>/เดือน</small></span>
        </div>

        <div className={styles.footer}>
          <span>พื้นที่ว่างสำหรับแบรนด์ของคุณ</span>
          <span><Mail /> คลิกเพื่อติดต่อ: {CONTACT_EMAIL}</span>
        </div>
      </a>
    </section>
  );
}
