import { ImageResponse } from "next/og";
import { loadCatalogDetailById, UUID_PATTERN } from "@/lib/catalog-detail-page";
import type { PublicCatalogItem } from "@/lib/public-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const size = { width: 1200, height: 630 };

function safeHttpsUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function SocialCard({ item }: { item: PublicCatalogItem | null }) {
  const poster = safeHttpsUrl(item?.posterUrl);
  const backdrop = safeHttpsUrl(item?.backdropUrl || item?.posterUrl);
  const englishTitle = item?.title || item?.thaiTitle || "ดูหนังออนไลน์";
  const thaiTitle = item?.thaiTitle && item.thaiTitle !== englishTitle ? item.thaiTitle : "";
  const typeLabel = item?.contentType === "series" ? "SERIES" : "MOVIE";
  const year = item?.year ? String(item.year) : "REAL2FREE";
  const genres = (item?.genres || []).slice(0, 3);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #020817 0%, #08172b 48%, #15061a 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      {backdrop ? (
        <img
          src={backdrop}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.52,
          }}
        />
      ) : null}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: "linear-gradient(90deg, rgba(2,8,23,.98) 0%, rgba(2,8,23,.88) 38%, rgba(2,8,23,.48) 70%, rgba(19,4,24,.76) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: "linear-gradient(0deg, rgba(2,8,23,.96) 0%, rgba(2,8,23,0) 56%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 430,
          height: 430,
          display: "flex",
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(236,72,153,.34) 0%, rgba(236,72,153,0) 68%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "52px 68px",
          gap: 52,
        }}
      >
        <div
          style={{
            width: 286,
            height: 430,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,.22)",
            background: "linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.035))",
            boxShadow: "0 30px 80px rgba(0,0,0,.5)",
          }}
        >
          {poster ? (
            <img
              src={poster}
              alt=""
              width={286}
              height={430}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, opacity: 0.7 }}>R2F</div>
          )}
        </div>

        <div
          style={{
            minWidth: 0,
            flex: 1,
            height: 430,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 34 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 27,
                  fontWeight: 900,
                  letterSpacing: 1.5,
                }}
              >
                REAL<span style={{ color: "#ec4899" }}>2</span>FREE
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "7px 13px",
                  borderRadius: 999,
                  fontSize: 16,
                  letterSpacing: 1.4,
                  color: "#fbcfe8",
                  border: "1px solid rgba(244,114,182,.36)",
                  background: "rgba(190,24,93,.16)",
                }}
              >
                WATCH NOW
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: englishTitle.length > 48 ? 48 : englishTitle.length > 30 ? 56 : 66,
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: -1.5,
                maxWidth: 700,
              }}
            >
              {englishTitle}
            </div>

            {thaiTitle ? (
              <div
                lang="th"
                style={{
                  display: "flex",
                  marginTop: 16,
                  fontSize: 28,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.82)",
                  maxWidth: 700,
                }}
              >
                {thaiTitle}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.12)",
                  border: "1px solid rgba(255,255,255,.16)",
                  fontSize: 17,
                  fontWeight: 800,
                }}
              >
                {typeLabel}
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.12)",
                  border: "1px solid rgba(255,255,255,.16)",
                  fontSize: 17,
                  fontWeight: 800,
                }}
              >
                {year}
              </div>
              {item?.rating ? (
                <div
                  style={{
                    display: "flex",
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.12)",
                    border: "1px solid rgba(255,255,255,.16)",
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  ★ {item.rating.toFixed(1)}
                </div>
              ) : null}
            </div>

            {genres.length ? (
              <div style={{ display: "flex", gap: 10, color: "rgba(255,255,255,.66)", fontSize: 17 }}>
                {genres.map((genre, index) => (
                  <div key={genre} style={{ display: "flex" }}>
                    {index ? "• " : ""}{genre}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", color: "rgba(255,255,255,.66)", fontSize: 17 }}>
                real2free.online
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let item: PublicCatalogItem | null = null;

  if (UUID_PATTERN.test(id)) {
    try {
      item = (await loadCatalogDetailById(id))?.item || null;
    } catch {
      item = null;
    }
  }

  return new ImageResponse(<SocialCard item={item} />, {
    ...size,
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
