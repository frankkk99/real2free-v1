import Link from "next/link";
import type { PublicCatalogItem } from "@/lib/public-catalog";
import styles from "./SeoCatalogLinks.module.css";

export default function SeoCatalogLinks({ items }: { items: PublicCatalogItem[] }) {
  return (
    <section className={styles.section} aria-labelledby="seo-home-title">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>REAL2FREE Movie & Series Catalog</span>
          <h1 id="seo-home-title">ดูหนังออนไลน์และซีรีส์ใหม่ พร้อมค้นหาตามปีและประเภท</h1>
          <p>
            REAL2FREE รวบรวมหน้าข้อมูลภาพยนตร์ ซีรีส์ และอนิเมะ พร้อมชื่อไทย ชื่อต้นฉบับ ปีที่ฉาย
            ประเภทเรื่อง คะแนน และจำนวนตอน เพื่อช่วยให้ค้นหาเรื่องที่ต้องการได้สะดวกทั้งบนมือถือและคอมพิวเตอร์
          </p>
        </div>

        <nav className={styles.nav} aria-label="หมวดเนื้อหาสำหรับค้นหา">
          <Link href="/movies">หนังออนไลน์</Link>
          <Link href="/series">ซีรีส์ออนไลน์</Link>
          <Link href="/anime">อนิเมะ</Link>
          <Link href="/new">หนังและซีรีส์ใหม่</Link>
          <Link href="/popular">เรื่องยอดนิยม</Link>
        </nav>

        {items.length ? (
          <>
            <div className={styles.heading}>
              <h2>รายการอัปเดตล่าสุด</h2>
              <span>{items.length.toLocaleString("th-TH")} เรื่องที่ค้นหาและเปิดดูรายละเอียดได้</span>
            </div>
            <div className={styles.grid}>
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
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
