import Link from "next/link";
import type { PublicCatalogItem } from "@/lib/public-catalog";
import styles from "./SeoCategoryPage.module.css";

const categoryLinks = [
  ["/movies", "หนังออนไลน์"],
  ["/series", "ซีรีส์ออนไลน์"],
  ["/anime", "อนิเมะ"],
  ["/new", "มาใหม่"],
  ["/popular", "ยอดนิยม"],
] as const;

export default function SeoCategoryPage({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: PublicCatalogItem[];
}) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/" aria-label="กลับหน้าแรก REAL2FREE">
            REAL<span>2</span>FREE
          </Link>
          <Link className={styles.homeLink} href="/">กลับหน้าแรก</Link>
        </header>

        <section className={styles.hero}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <nav className={styles.nav} aria-label="หมวดเนื้อหา">
            {categoryLinks.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <p className={styles.count}>แสดง {items.length.toLocaleString("th-TH")} รายการที่อัปเดตล่าสุด</p>
        </section>

        {items.length ? (
          <section className={styles.grid} aria-label={title}>
            {items.map((item) => (
              <Link
                key={item.id}
                className={styles.card}
                href={`/watch/${item.id}`}
                aria-label={`ดูรายละเอียด ${item.thaiTitle}${item.year ? ` ปี ${item.year}` : ""}`}
              >
                <div className={styles.poster}>
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={`โปสเตอร์ ${item.thaiTitle}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <span>{item.contentType === "series" ? "ซีรีส์" : "หนัง"}</span>
                </div>
                <div className={styles.body}>
                  <strong>{item.thaiTitle}</strong>
                  <small>
                    {[item.title !== item.thaiTitle ? item.title : "", item.year || "", item.genres.slice(0, 2).join(" • ")]
                      .filter(Boolean)
                      .join(" • ")}
                  </small>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <p className={styles.empty}>ยังไม่มีรายการในหมวดนี้ กรุณากลับมาตรวจสอบอีกครั้งภายหลัง</p>
        )}
      </div>
    </main>
  );
}
