export type SmartCatalogView = "movie" | "series" | "anime";
export type CatalogLanguageFilter = "ทั้งหมด" | "dub_th" | "sub_th" | "backup";
export type CatalogBrandFilter =
  | "ทั้งหมด"
  | "netflix"
  | "disney"
  | "hbo"
  | "marvel"
  | "dc"
  | "prime"
  | "apple"
  | "iqiyi"
  | "viu"
  | "wetv";
export type CatalogCountryFilter = "ทั้งหมด" | "TH" | "KR" | "CN" | "JP" | "US";
export type CatalogSortMode = "updated" | "release" | "rating" | "title";

export type SmartCatalogSearch = {
  text: string;
  year: string | null;
  viewMode: SmartCatalogView | null;
  genre: string | null;
  language: Exclude<CatalogLanguageFilter, "ทั้งหมด"> | null;
  brand: Exclude<CatalogBrandFilter, "ทั้งหมด"> | null;
  country: Exclude<CatalogCountryFilter, "ทั้งหมด"> | null;
  labels: string[];
};

type AliasRule<T extends string> = {
  value: T;
  label: string;
  aliases: string[];
};

const viewRules: Array<AliasRule<SmartCatalogView>> = [
  {
    value: "series",
    label: "ซีรีส์",
    aliases: ["ซีรีส์", "ซีรี่ส์", "ซีรี่ย์", "ซีรีย์", "ซีรี่", "ละครซีรีส์", "ละคร", "tv series", "series"],
  },
  { value: "anime", label: "อนิเมะ", aliases: ["อนิเมะ", "อะนิเมะ", "anime"] },
  { value: "movie", label: "ภาพยนตร์", aliases: ["ภาพยนตร์", "ภาพยนต์", "หนัง", "movie", "movies", "film"] },
];

const brandRules: Array<AliasRule<Exclude<CatalogBrandFilter, "ทั้งหมด">>> = [
  { value: "netflix", label: "Netflix", aliases: ["netflix", "net flix", "เน็ตฟลิกซ์", "เน็ตฟลิก", "เนตฟลิกซ์"] },
  { value: "disney", label: "Disney+", aliases: ["disney+", "disney plus", "disney", "ดิสนีย์พลัส", "ดิสนีย์"] },
  { value: "hbo", label: "HBO / Max", aliases: ["hbo max", "hbo", "max", "เอชบีโอ", "แม็กซ์"] },
  { value: "marvel", label: "Marvel", aliases: ["marvel", "มาร์เวล"] },
  { value: "dc", label: "DC", aliases: ["dc", "ดีซี"] },
  { value: "prime", label: "Prime Video", aliases: ["amazon prime video", "amazon prime", "prime video", "prime", "ไพรม์วิดีโอ", "ไพรม์"] },
  { value: "apple", label: "Apple TV+", aliases: ["apple tv+", "apple tv plus", "apple tv", "apple", "แอปเปิลทีวี", "แอปเปิล"] },
  { value: "iqiyi", label: "iQIYI", aliases: ["iqiyi", "i qiyi", "อ้ายฉีอี้", "อ้ายฉีอี"] },
  { value: "viu", label: "Viu", aliases: ["viu", "วิว"] },
  { value: "wetv", label: "WeTV", aliases: ["wetv", "we tv", "วีทีวี", "เวทีวี"] },
];

const countryRules: Array<AliasRule<Exclude<CatalogCountryFilter, "ทั้งหมด">>> = [
  { value: "TH", label: "ไทย", aliases: ["ประเทศไทย", "หนังไทย", "ไทย", "thai", "thailand"] },
  { value: "KR", label: "เกาหลี", aliases: ["เกาหลีใต้", "เกาหลี", "korean", "south korea", "korea", "k-drama", "kdrama"] },
  { value: "CN", label: "จีน", aliases: ["จีนแผ่นดินใหญ่", "จีน", "chinese", "mainland china", "china", "c-drama", "cdrama"] },
  { value: "JP", label: "ญี่ปุ่น", aliases: ["ญี่ปุ่น", "japanese", "japan", "j-drama", "jdrama"] },
  { value: "US", label: "อเมริกา", aliases: ["สหรัฐอเมริกา", "อเมริกา", "อเมริกัน", "american", "united states", "usa", "u.s."] },
];

const genreRules: Array<AliasRule<string>> = [
  { value: "Science Fiction", label: "ไซไฟ", aliases: ["science fiction", "sci-fi", "scifi", "ไซไฟ", "วิทยาศาสตร์"] },
  { value: "Animation", label: "แอนิเมชัน", aliases: ["แอนิเมชัน", "แอนิเมชั่น", "การ์ตูน", "animation", "animated"] },
  { value: "Adventure", label: "ผจญภัย", aliases: ["ผจญภัย", "adventure"] },
  { value: "Thriller", label: "ระทึกขวัญ", aliases: ["ระทึกขวัญ", "ทริลเลอร์", "thriller"] },
  { value: "Romance", label: "โรแมนติก", aliases: ["โรแมนติก", "โรแมนซ์", "รอมคอม", "rom-com", "romcom", "romance", "romantic"] },
  { value: "Fantasy", label: "แฟนตาซี", aliases: ["แฟนตาซี", "fantasy"] },
  { value: "Action", label: "แอ็กชัน", aliases: ["แอ็กชัน", "แอ็กชั่น", "แอคชั่น", "แอ็คชั่น", "บู๊", "action"] },
  { value: "Comedy", label: "ตลก", aliases: ["คอมเมดี้", "ตลก", "ฮา", "comedy"] },
  {
    value: "Horror",
    label: "สยองขวัญ",
    // Keep "หนัง" out of the genre alias so a query like "หนังผี" can still
    // be interpreted as both movie + horror instead of losing the movie intent.
    aliases: ["สยองขวัญ", "สยอง", "หลอน", "ผี", "horror", "ghost"],
  },
  { value: "Drama", label: "ดราม่า", aliases: ["ดราม่า", "ละครชีวิต", "drama"] },
  { value: "Crime", label: "อาชญากรรม", aliases: ["อาชญากรรม", "สืบสวนอาชญากรรม", "crime"] },
  { value: "Mystery", label: "ลึกลับ", aliases: ["ลึกลับ", "ปริศนา", "mystery"] },
  { value: "Family", label: "ครอบครัว", aliases: ["ครอบครัว", "family"] },
];

const languageRules: Array<AliasRule<Exclude<CatalogLanguageFilter, "ทั้งหมด">>> = [
  {
    value: "dub_th",
    label: "พากย์ไทย",
    aliases: ["พากย์ไทย", "พากษ์ไทย", "ไทยพากย์", "เสียงไทย", "เสียงภาษาไทย", "thai audio", "thai dub", "dub thai"],
  },
  {
    value: "sub_th",
    label: "ซับไทย",
    aliases: ["ซับไทย", "ซับภาษาไทย", "บรรยายไทย", "คำบรรยายไทย", "thai sub", "thai subtitle", "sub thai"],
  },
  {
    value: "backup",
    label: "มีสำรอง",
    aliases: ["มีสำรอง", "ตัวสำรอง", "ลิงก์สำรอง", "ลิ้งสำรอง", "เซิร์ฟสำรอง", "สำรอง", "backup"],
  },
];

export const SMART_SEARCH_EXAMPLES = [
  "หนังเกาหลี 2025 พากย์ไทย",
  "ซีรีส์จีนโรแมนติก",
  "Netflix 2026",
  "หนังผี 2026",
  "อนิเมะญี่ปุ่น ซับไทย",
  "หนังแอ็กชัน 2025",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function consumeRule<T extends string>(
  source: string,
  rules: Array<AliasRule<T>>,
): { source: string; value: T | null; label: string | null } {
  let nextSource = source;

  for (const rule of rules) {
    for (const alias of [...rule.aliases].sort((a, b) => b.length - a.length)) {
      const containsThai = /[\u0E00-\u0E7F]/u.test(alias);

      if (containsThai) {
        const index = nextSource.indexOf(alias);
        if (index < 0) continue;
        nextSource = `${nextSource.slice(0, index)} ${nextSource.slice(index + alias.length)}`;
        return { source: nextSource, value: rule.value, label: rule.label };
      }

      const pattern = new RegExp(`(^|\\s)${escapeRegExp(alias)}(?=\\s|$)`, "iu");
      if (!pattern.test(nextSource)) continue;
      nextSource = nextSource.replace(pattern, " ");
      return { source: nextSource, value: rule.value, label: rule.label };
    }
  }

  return { source: nextSource, value: null, label: null };
}

export function parseSmartCatalogSearch(value: string): SmartCatalogSearch {
  let source = value
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/[|,;/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const yearMatch = source.match(/((?:19|20)\d{2})/u);
  const year = yearMatch?.[1] ?? null;
  if (year) source = source.replace(year, " ");

  const language = consumeRule(source, languageRules);
  source = language.source;

  const brand = consumeRule(source, brandRules);
  source = brand.source;

  const country = consumeRule(source, countryRules);
  source = country.source;

  const genre = consumeRule(source, genreRules);
  source = genre.source;

  const view = consumeRule(source, viewRules);
  source = view.source;

  const labels = [view.label, genre.label, year, language.label, brand.label, country.label]
    .filter((label): label is string => Boolean(label));

  return {
    text: source.replace(/\s+/g, " ").trim(),
    year,
    viewMode: view.value,
    genre: genre.value,
    language: language.value,
    brand: brand.value,
    country: country.value,
    labels,
  };
}

export const languageFilterOptions: Array<{ value: CatalogLanguageFilter; label: string }> = [
  { value: "ทั้งหมด", label: "ทุกภาษา" },
  { value: "dub_th", label: "พากย์ไทย" },
  { value: "sub_th", label: "ซับไทย" },
  { value: "backup", label: "มีสำรอง" },
];

export const brandFilterOptions: Array<{ value: CatalogBrandFilter; label: string }> = [
  { value: "ทั้งหมด", label: "ทุกค่าย" },
  { value: "netflix", label: "Netflix" },
  { value: "disney", label: "Disney+" },
  { value: "hbo", label: "HBO / Max" },
  { value: "marvel", label: "Marvel" },
  { value: "dc", label: "DC" },
  { value: "prime", label: "Prime Video" },
  { value: "apple", label: "Apple TV+" },
  { value: "iqiyi", label: "iQIYI" },
  { value: "viu", label: "Viu" },
  { value: "wetv", label: "WeTV" },
];

export const countryFilterOptions: Array<{ value: CatalogCountryFilter; label: string }> = [
  { value: "ทั้งหมด", label: "ทุกประเทศ" },
  { value: "TH", label: "ไทย" },
  { value: "KR", label: "เกาหลี" },
  { value: "CN", label: "จีน" },
  { value: "JP", label: "ญี่ปุ่น" },
  { value: "US", label: "อเมริกา" },
];

export const sortModeOptions: Array<{ value: CatalogSortMode; label: string }> = [
  { value: "updated", label: "ใหม่ก่อน • คะแนนสูง" },
  { value: "release", label: "ปีฉายล่าสุด" },
  { value: "rating", label: "คะแนนสูง" },
  { value: "title", label: "เรียงตามชื่อ" },
];
