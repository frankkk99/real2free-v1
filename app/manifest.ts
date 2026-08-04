import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REAL2FREE ดูหนังและซีรีส์ออนไลน์",
    short_name: "REAL2FREE",
    description: "ค้นหาหนัง ซีรีส์ และอนิเมะ พร้อมข้อมูลชื่อ ปี ประเภท คะแนน และจำนวนตอน",
    start_url: "/",
    display: "standalone",
    background_color: "#020b18",
    theme_color: "#0b84ff",
    lang: "th",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
