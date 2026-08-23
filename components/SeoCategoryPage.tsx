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
      </div>
    </main>
  );
}
