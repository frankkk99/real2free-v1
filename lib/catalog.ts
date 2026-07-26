export type MovieItem = {
  id: string;
  title: string;
  thaiTitle: string;
  year: number;
  rating: number;
  quality: "4K" | "Full HD" | "HD";
  genres: string[];
  palette: [string, string, string];
  rank?: number;
  isNew?: boolean;
};

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  meta: string;
  palette: [string, string, string, string];
};

export const heroSlides: HeroSlide[] = [
  {
    id: "ocean-beyond",
    eyebrow: "มาใหม่",
    title: "OCEAN BEYOND",
    subtitle: "อาณาจักรลับใต้คลื่น",
    description:
      "เมื่อนักสำรวจกลุ่มหนึ่งพบประตูสู่โลกใต้มหาสมุทร การเดินทางเพื่อกลับบ้านจึงกลายเป็นภารกิจปกป้องสองโลก",
    meta: "2026 • 2 ชม. 18 นาที • ผจญภัย",
    palette: ["#04152d", "#0069d9", "#45d6ff", "#d8f5ff"],
  },
  {
    id: "red-orbit",
    eyebrow: "REAL2FREE ORIGINAL",
    title: "RED ORBIT",
    subtitle: "สัญญาณสุดท้ายจากดาวอังคาร",
    description:
      "ยานกู้ภัยได้รับข้อความจากอาณานิคมที่เงียบหายไปนานสามปี แต่ผู้ส่งข้อความอาจไม่ใช่มนุษย์อีกต่อไป",
    meta: "2026 • 1 ชม. 56 นาที • ไซไฟ",
    palette: ["#16070a", "#801d23", "#f26438", "#ffd19b"],
  },
  {
    id: "emerald-kingdom",
    eyebrow: "ยอดนิยมอันดับ 1",
    title: "EMERALD KINGDOM",
    subtitle: "นครเหนือพงไพร",
    description:
      "เจ้าหญิงผู้หลบหนีและผู้พิทักษ์ป่าต้องร่วมมือกันหยุดสงคราม ก่อนนครสีเขียวจะถูกลบออกจากแผนที่ตลอดกาล",
    meta: "2025 • 2 ชม. 06 นาที • แฟนตาซี",
    palette: ["#03130f", "#0f5f4d", "#4ed28f", "#ecffc8"],
  },
];

export const newMovies: MovieItem[] = [
  {
    id: "black-signal",
    title: "BLACK SIGNAL",
    thaiTitle: "สัญญาณมรณะ",
    year: 2026,
    rating: 8.7,
    quality: "4K",
    genres: ["แอคชัน", "ไซไฟ"],
    palette: ["#030712", "#1267a4", "#51e4ff"],
    isNew: true,
  },
  {
    id: "blue-depth",
    title: "BLUE DEPTH",
    thaiTitle: "ลึกกว่ามหาสมุทร",
    year: 2026,
    rating: 7.9,
    quality: "Full HD",
    genres: ["ผจญภัย", "ดราม่า"],
    palette: ["#02162b", "#0879be", "#91e6ff"],
    isNew: true,
  },
  {
    id: "neon-runner",
    title: "NEON RUNNER",
    thaiTitle: "นักล่าเมืองนีออน",
    year: 2026,
    rating: 8.4,
    quality: "4K",
    genres: ["แอคชัน", "อาชญากรรม"],
    palette: ["#18051d", "#9e1ed2", "#ff4f9a"],
    isNew: true,
  },
  {
    id: "solar-flash",
    title: "SOLAR FLASH",
    thaiTitle: "สปีดเหนือแสง",
    year: 2026,
    rating: 7.8,
    quality: "HD",
    genres: ["แอคชัน", "ไซไฟ"],
    palette: ["#210706", "#cf3e16", "#ffd457"],
    isNew: true,
  },
  {
    id: "final-guardians",
    title: "FINAL GUARDIANS",
    thaiTitle: "ผู้พิทักษ์จักรวาล",
    year: 2025,
    rating: 8.1,
    quality: "Full HD",
    genres: ["แอคชัน", "แฟนตาซี"],
    palette: ["#130928", "#5e38aa", "#fa69b8"],
  },
  {
    id: "impossible-code",
    title: "IMPOSSIBLE CODE",
    thaiTitle: "รหัสลับเดิมพันโลก",
    year: 2025,
    rating: 7.6,
    quality: "4K",
    genres: ["แอคชัน", "ระทึกขวัญ"],
    palette: ["#101216", "#506077", "#d2e7f7"],
  },
  {
    id: "forest-spirit",
    title: "FOREST SPIRIT",
    thaiTitle: "เสียงกระซิบแห่งพงไพร",
    year: 2026,
    rating: 8.2,
    quality: "Full HD",
    genres: ["แฟนตาซี", "ครอบครัว"],
    palette: ["#031711", "#13734b", "#9df56f"],
    isNew: true,
  },
  {
    id: "the-last-chef",
    title: "THE LAST CHEF",
    thaiTitle: "เชฟคนสุดท้าย",
    year: 2025,
    rating: 7.5,
    quality: "HD",
    genres: ["คอมเมดี้", "ดราม่า"],
    palette: ["#261005", "#c46b16", "#ffd58a"],
  },
];

export const trendingMovies: MovieItem[] = [
  {
    id: "atomic-hour",
    title: "ATOMIC HOUR",
    thaiTitle: "ชั่วโมงปรมาณู",
    year: 2025,
    rating: 8.8,
    quality: "4K",
    genres: ["ดราม่า", "ประวัติศาสตร์"],
    palette: ["#1f0700", "#a83a00", "#ffb000"],
    rank: 1,
  },
  {
    id: "dark-city",
    title: "DARK CITY",
    thaiTitle: "เมืองเงา",
    year: 2019,
    rating: 9.0,
    quality: "Full HD",
    genres: ["อาชญากรรม", "ดราม่า"],
    palette: ["#04060d", "#173963", "#da6f2b"],
    rank: 2,
  },
  {
    id: "interstellar-mission",
    title: "INTERSTELLAR MISSION",
    thaiTitle: "ภารกิจเหนือกาลเวลา",
    year: 2021,
    rating: 8.6,
    quality: "4K",
    genres: ["ไซไฟ", "ดราม่า"],
    palette: ["#07141c", "#557a8b", "#dfefff"],
    rank: 3,
  },
  {
    id: "ring-of-fire",
    title: "RING OF FIRE",
    thaiTitle: "มหาศึกวงแหวนเพลิง",
    year: 2020,
    rating: 9.1,
    quality: "Full HD",
    genres: ["แฟนตาซี", "ผจญภัย"],
    palette: ["#140b05", "#61401f", "#e3a75b"],
    rank: 4,
  },
  {
    id: "inside-mind",
    title: "INSIDE MIND",
    thaiTitle: "มหัศจรรย์อารมณ์ใหม่",
    year: 2026,
    rating: 8.2,
    quality: "HD",
    genres: ["แอนิเมชัน", "ครอบครัว"],
    palette: ["#1a0e38", "#4f73d8", "#fa61b0"],
    rank: 5,
  },
  {
    id: "night-guardian",
    title: "NIGHT GUARDIAN",
    thaiTitle: "อัศวินรัตติกาล",
    year: 2022,
    rating: 8.0,
    quality: "4K",
    genres: ["แอคชัน", "อาชญากรรม"],
    palette: ["#02050a", "#1c3346", "#6388a6"],
    rank: 6,
  },
  {
    id: "paper-moon",
    title: "PAPER MOON",
    thaiTitle: "จันทร์กระดาษ",
    year: 2024,
    rating: 7.9,
    quality: "Full HD",
    genres: ["โรแมนติก", "ดราม่า"],
    palette: ["#180b1c", "#7b3f7d", "#ffc4d8"],
    rank: 7,
  },
  {
    id: "wild-river",
    title: "WILD RIVER",
    thaiTitle: "สายน้ำไม่หวนคืน",
    year: 2023,
    rating: 7.7,
    quality: "HD",
    genres: ["ผจญภัย", "ระทึกขวัญ"],
    palette: ["#03140f", "#27685c", "#7fe8c7"],
    rank: 8,
  },
];

export const genres = [
  "ทั้งหมด",
  "แอคชัน",
  "ผจญภัย",
  "คอมเมดี้",
  "ดราม่า",
  "แฟนตาซี",
  "สยองขวัญ",
  "โรแมนติก",
  "ไซไฟ",
  "สารคดี",
];

export const years = ["ทั้งหมด", "2026", "2025", "2024", "2023", "2020-2022", "ก่อน 2020"];
export const qualities = ["ทั้งหมด", "4K", "Full HD", "HD"];
