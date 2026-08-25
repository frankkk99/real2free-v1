import Link from "next/link";
import type { PublicCatalogItem } from "@/lib/public-catalog";
import SeoCategoryInfiniteGrid, { type CategoryCatalogFilter } from "./SeoCategoryInfiniteGrid";
import styles from "./SeoCategoryPage.module.css";

const categoryLinks = [
  ["/movies", "หนังออนไลน์"],
  ["/series", "ซีรีส์ออนไลน์"],
  ["/anime", "อนิเมะ"],
  ["/new", "มาใหม่"],
  ["/popular", "ยอดนิยม"],
] as const;

function contextCopy(filter: CategoryCatalogFilter) {
  if (filter === "movie") {
    return {
      heading: "เลือกหนังออนไลน์จากข้อมูลที่ช่วยตัดสินใจได้จริง",
      paragraphs: [
        "หน้าหนังของ REAL2FREE รวมรายการภาพยนตร์พร้อมชื่อไทย ชื่อต้นฉบับ ปีที่ฉาย แนว คะแนน และรูปแบบภาษาเมื่อมีข้อมูล เพื่อให้ค้นหาเรื่องที่ต้องการได้จากรายละเอียดของเรื่อง ไม่ใช่เพียงภาพโปสเตอร์",
        "เมื่อเปิดหน้ารายละเอียดของหนังแต่ละเรื่อง จะมีลิงก์ไปยังหมวดที่เกี่ยวข้อง เช่น หนังทั้งหมด รายการมาใหม่ รายการยอดนิยม และคำค้นจากปีหรือแนว เพื่อช่วยให้สำรวจเรื่องใกล้เคียงได้ต่อเนื่อง",
      ],
      links: [["/new", "หนังและซีรีส์มาใหม่"], ["/popular", "รายการยอดนิยม"], ["/series", "ดูซีรีส์ออนไลน์"]] as const,
    };
  }
  if (filter === "series") {
    return {
      heading: "ค้นหาซีรีส์จากจำนวนตอน ซีซัน และสถานะอัปเดต",
      paragraphs: [
        "หน้าซีรีส์ของ REAL2FREE จัดข้อมูลเรื่อง ปี คะแนน จำนวนตอน จำนวนซีซัน ภาษา และสถานะตอนล่าสุด เพื่อให้เลือกเรื่องได้ง่ายขึ้นก่อนเข้าสู่หน้ารับชม",
        "ใช้หน้ารายละเอียดของแต่ละเรื่องเพื่อไล่ต่อไปยังรายการมาใหม่ รายการยอดนิยม แนวเดียวกัน หรือค้นหาจากปีที่ฉาย โดยลิงก์ภายในถูกทำเป็นลิงก์ HTML ปกติให้ทั้งผู้ใช้และเสิร์ชเอนจินค้นพบหน้าเกี่ยวข้องได้ง่ายขึ้น",
      ],
      links: [["/new", "ซีรีส์อัปเดตใหม่"], ["/popular", "ซีรีส์และหนังยอดนิยม"], ["/movies", "ดูหนังออนไลน์"]] as const,
    };
  }
  if (filter === "anime") {
    return {
      heading: "รวมอนิเมะพร้อมข้อมูลเรื่องและรายการที่เกี่ยวข้อง",
      paragraphs: [
        "หมวดอนิเมะรวบรวมรายการที่มีข้อมูลประเภท Animation หรือ Anime พร้อมชื่อเรื่อง ปี คะแนน จำนวนตอน และรายละเอียดที่มีในแคตตาล็อก เพื่อช่วยค้นหาเรื่องใหม่และเรื่องที่เกี่ยวข้องได้สะดวก",
      ],
      links: [["/series", "ซีรีส์ทั้งหมด"], ["/new", "รายการมาใหม่"], ["/popular", "รายการยอดนิยม"]] as const,
    };
  }
  if (filter === "popular") {
    return {
      heading: "รายการยอดนิยมสำหรับเริ่มสำรวจเรื่องที่น่าสนใจ",
      paragraphs: [
        "หน้ายอดนิยมคัดรายการที่มีคะแนนและสัญญาณความนิยมในแคตตาล็อก แล้วเชื่อมต่อไปยังหน้ารายละเอียดของแต่ละเรื่องเพื่อดูปี แนว ภาษา จำนวนตอน และข้อมูลอื่นก่อนเลือกชม",
      ],
      links: [["/new", "ดูรายการมาใหม่"], ["/movies", "หนังทั้งหมด"], ["/series", "ซีรีส์ทั้งหมด"]] as const,
    };
  }
  return {
    heading: "สำรวจรายการอัปเดตล่าสุดบน REAL2FREE",
    paragraphs: [
      "หน้ามาใหม่ช่วยรวมรายการที่เพิ่งเข้าหรือมีข้อมูลใหม่ โดยแต่ละเรื่องเชื่อมไปยังหน้ารายละเอียดที่มีข้อมูลเฉพาะเรื่องและลิงก์ภายในไปยังหมวดที่เกี่ยวข้อง เพื่อให้ค้นหาเนื้อหาได้ต่อเนื่องโดยไม่ต้องย้อนกลับหน้าแรกทุกครั้ง",
    ],
    links: [["/movies", "หนังออนไลน์"], ["/series", "ซีรีส์ออนไลน์"], ["/popular", "รายการยอดนิยม"]] as const,
  };
}

export default function SeoCategoryPage({
  eyebrow,
  title,
  description,
  items,
  filter,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: PublicCatalogItem[];
  filter: CategoryCatalogFilter;
}) {
  const context = contextCopy(filter);

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
        </section>

        <SeoCategoryInfiniteGrid initialItems={items} filter={filter} title={title} />

        <section style={{ marginTop: 34, padding: "22px 0 10px", maxWidth: 920 }} aria-label="ข้อมูลเพิ่มเติมของหมวด">
          <h2 style={{ margin: "0 0 10px" }}>{context.heading}</h2>
          {context.paragraphs.map((paragraph) => (
            <p key={paragraph} style={{ lineHeight: 1.85, opacity: 0.8 }}>{paragraph}</p>
          ))}
          <nav aria-label="สำรวจหมวดที่เกี่ยวข้อง" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            {context.links.map(([href, label]) => (
              <Link key={href} href={href} style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>{label}</Link>
            ))}
          </nav>
        </section>
      </div>
    </main>
  );
}
