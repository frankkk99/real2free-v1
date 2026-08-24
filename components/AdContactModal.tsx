"use client";

import { Mail, Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./AdContactModal.module.css";

const CONTACT_EMAIL = "dofree2026@gmail.com";

export default function AdContactModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={styles.shell}>
      <button
        type="button"
        className={styles.fab}
        aria-label="ติดต่อโฆษณา"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className={styles.dot} aria-hidden="true" />
        <span>ติดต่อโฆษณา</span>
      </button>

      {open ? (
        <div
          className={styles.backdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="real2free-ad-contact-title"
          >
            <button
              type="button"
              className={styles.close}
              aria-label="ปิด"
              onClick={() => setOpen(false)}
            >
              <X />
            </button>

            <div className={styles.icon} aria-hidden="true">
              <Megaphone />
            </div>

            <div className={styles.copy}>
              <p className={styles.kicker}>ADVERTISING</p>
              <h2 id="real2free-ad-contact-title">ติดต่อโฆษณา</h2>
              <p>สนใจลงโฆษณา ประชาสัมพันธ์ หรือจองพื้นที่บน REAL2FREE เลือกตำแหน่งได้ตามระดับการมองเห็นและงบประมาณ</p>
            </div>

            <div className={styles.priceBox}>
              <span>ราคาโฆษณาตามตำแหน่ง</span>
              <strong>2,000–20,000 บาท<small>/เดือน</small></strong>
            </div>

            <a
              className={styles.email}
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("ติดต่อโฆษณา REAL2FREE")}`}
            >
              <Mail />
              <span>
                <small>EMAIL</small>
                <strong>{CONTACT_EMAIL}</strong>
              </span>
            </a>
          </section>
        </div>
      ) : null}
    </div>
  );
}
