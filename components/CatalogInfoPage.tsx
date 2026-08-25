import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Film,
  Info,
  Languages,
  Layers3,
  Play,
  Star,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { runtimeLabel, type PublicCatalogItem, type PublicEpisode } from "@/lib/public-catalog";
import styles from "./CatalogInfoPage.module.css";

function releaseLabel(value: string | null, year: number | null) {
  if (!value) return year ? String(year) : "ไม่ระบุ";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return year ? String(year) : "ไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function Brand() {
  return (
    <span className={styles.brand} aria-label="REAL2FREE">
      <span className={styles.brandMark}><i /><i /></span>
      <strong>REAL<span>2</span>FREE</strong>
    </span>
  );
}

export default function CatalogInfoPage({
  item,
  episodes,
}: {
  item: PublicCatalogItem;
  episodes: PublicEpisode[];
}) {
  const isSeries = item.contentType === "series";
  const playableEpisodes = isSeries ? episodes.filter((episode) => episode.playerCount > 0) : [];
  const canWatch = isSeries ? playableEpisodes.length > 0 : item.playerCount > 0;
  const durationLabel = isSeries
    ? `${(item.episodeCount || episodes.length).toLocaleString("th-TH")} ตอน`
    : runtimeLabel(item.runtime) || "ไม่ระบุ";
  const categoryPath = isSeries ? "/series" : "/movies";
  const typeLabel = isSeries ? "ซีรีส์" : "ภาพยนตร์";
  const TypeIcon = isSeries ? Tv : Film;

  const formatBadges = [
    item.hasDubThai ? "พากย์ไทย" : "",
    item.hasSubThai ? "ซับไทย" : "",
    item.hasBackup ? "มีตัวสำรอง" : "",
    item.isOngoing ? "กำลังอัปเดต" : "",
  ].filter(Boolean);

  return (
    <main className={styles.page}>
      <div className={styles.backdrop}>
        {item.backdropUrl ? <img src={item.backdropUrl} alt="" referrerPolicy="no-referrer" /> : null}
        <span />
      </div>

      <header className={styles.header}>
        <Link href={categoryPath} className={styles.backLink}><ArrowLeft /><span>กลับไป{typeLabel}</span></Link>
        <Link href="/" className={styles.brandLink}><Brand /></Link>
        <span className={styles.headerType}><TypeIcon /> หน้าข้อมูล</span>
      </header>

      <div className={styles.content}>
        <section className={styles.heroCard}>
          <div className={styles.poster}>
            {item.posterUrl ? <img src={item.posterUrl} alt={item.thaiTitle} referrerPolicy="no-referrer" /> : <Film />}
          </div>

          <div className={styles.heroBody}>
            <div className={styles.eyebrow}><Info /> ข้อมูล{typeLabel}</div>
            <h1>{item.thaiTitle}</h1>
            {item.title !== item.thaiTitle ? <h2>{item.title}</h2> : null}

            <div className={styles.metaRow}>
              {item.year ? <span>{item.year}</span> : null}
              {item.rating > 0 ? <span><Star fill="currentColor" /> {item.rating.toFixed(1)}</span> : null}
              <span>{durationLabel}</span>
              {isSeries && item.seasonCount > 0 ? <span>{item.seasonCount.toLocaleString("th-TH")} ซีซัน</span> : null}
            </div>

            {formatBadges.length ? (
              <div className={styles.badges}>
                {formatBadges.map((badge) => <span key={badge}><CheckCircle2 /> {badge}</span>)}
              </div>
            ) : null}

            <div className={styles.genres}>
              {item.genres.map((genre) => <span key={genre}>{genre}</span>)}
            </div>

            <p className={styles.overview}>{item.overview || `ยังไม่มีเรื่องย่อสำหรับ${typeLabel}เรื่องนี้`}</p>

            <div className={styles.actions}>
              {canWatch ? (
                <Link
                  className={styles.watchButton}
                  href={`/watch/${encodeURIComponent(item.id)}`}
                  prefetch={false}
                  rel="nofollow"
                >
                  <Play fill="currentColor" />
                  <span><strong>ไปหน้ารับชม</strong><small>เปิด Player ในหน้ารับชมแยกต่างหาก</small></span>
                </Link>
              ) : (
                <span className={styles.unavailable}><Clock3 /> ยังไม่มีตัวรับชมที่พร้อมใช้งาน</span>
              )}
              <Link className={styles.secondaryButton} href={categoryPath}>ดู{typeLabel}เรื่องอื่น</Link>
            </div>
          </div>
        </section>

        <section className={styles.infoGrid} aria-label={`รายละเอียด ${item.thaiTitle}`}>
          <article className={styles.factCard}>
            <CalendarDays />
            <div><small>{isSeries ? "เริ่มออกอากาศ" : "วันที่เข้าฉาย"}</small><strong>{releaseLabel(item.releaseDate, item.year)}</strong></div>
          </article>
          <article className={styles.factCard}>
            <Star />
            <div><small>คะแนน</small><strong>{item.rating > 0 ? `${item.rating.toFixed(1)} / 10` : "ไม่ระบุ"}</strong></div>
          </article>
          <article className={styles.factCard}>
            <Clock3 />
            <div><small>{isSeries ? "จำนวนตอน" : "ความยาว"}</small><strong>{durationLabel}</strong></div>
          </article>
          <article className={styles.factCard}>
            <Layers3 />
            <div><small>ประเภท</small><strong>{typeLabel}</strong></div>
          </article>
          <article className={styles.factCard}>
            <Languages />
            <div><small>ภาษา</small><strong>{item.hasDubThai ? "มีพากย์ไทย" : item.hasSubThai ? "มีซับไทย" : item.languageCode || "ไม่ระบุ"}</strong></div>
          </article>
          {isSeries ? (
            <article className={styles.factCard}>
              <Tv />
              <div><small>ตอนล่าสุด</small><strong>{item.latestEpisode > 0 ? `ตอน ${item.latestEpisode.toLocaleString("th-TH")}` : "ไม่ระบุ"}</strong></div>
            </article>
          ) : (
            <article className={styles.factCard}>
              <Film />
              <div><small>สถานะรับชม</small><strong>{canWatch ? "พร้อมไปหน้ารับชม" : "รออัปเดต"}</strong></div>
            </article>
          )}
        </section>

        {isSeries ? (
          <section className={styles.seriesSummary}>
            <div>
              <span><Tv /> ข้อมูลซีรีส์</span>
              <h2>{item.thaiTitle}</h2>
            </div>
            <dl>
              <div><dt>ซีซัน</dt><dd>{item.seasonCount.toLocaleString("th-TH") || "-"}</dd></div>
              <div><dt>ตอนในข้อมูล</dt><dd>{(item.episodeCount || episodes.length).toLocaleString("th-TH")}</dd></div>
              <div><dt>ตอนที่พร้อมรับชม</dt><dd>{playableEpisodes.length.toLocaleString("th-TH")}</dd></div>
            </dl>
            <p>หน้านี้ใช้สำหรับข้อมูลเรื่องและการค้นหา ส่วนการเลือกตอนและ Player จะอยู่ในหน้ารับชมโดยเฉพาะ</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
