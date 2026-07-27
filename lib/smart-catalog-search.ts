export type SmartCatalogView = "movie" | "series" | "anime";
export type CatalogLanguageFilter = "ทั้งหมด" | "dub_th" | "sub_th" | "backup";
export type CatalogSortMode = "updated" | "release" | "rating" | "title";

export type SmartCatalogSearch = {
  text: string;
  year: string | null;
  viewMode: SmartCatalogView | null;
  genre: string | null;
  language: Exclude<CatalogLanguageFilter, "ทั้งหมด"> | null;
  labels: string[];
};

type AliasRule<T extends string> = {
  value: T;
  label: string;
  aliases: string[];
};

const viewRules: Array<AliasRule<SmartCatalogView>> = [
  { value: "series", label: "ซีรีส์", aliases: ["ซีรีส์", "ซีรี่ส์", "ซีรี่ย์", "series"] },
  { value: "anime", label: "อนิเมะ", aliases: ["อนิเมะ", "anime"] },
  { value: "movie", label: "ภาพยนตร์", aliases: ["ภาพยนตร์", "หนัง", "movie", "film"] },
];

const genreRules: Array<AliasRule<string>> = [
  { value: "Science Fiction", label: "ไซไฟ", aliases: ["science fiction", "sci-fi", "scifi", "ไซไฟ", "วิทยาศาสตร์"] },
  { value: "Animation", label: "แอนิเมชัน", aliases: ["แอนิเมชัน", "แอนิเมชั่น", "การ์ตูน", "animation"] },
  { value: "Adventure", label: "ผจญภัย", aliases: ["ผจญภัย", "adventure"] },
  { value: "Thriller", label: "ระทึกขวัญ", aliases: ["ระทึกขวัญ", "thriller"] },
  { value: "Romance", label: "โรแมนติก", aliases: ["โรแมนติก", "ความรัก", "romance"] },
  { value: "Fantasy", label: "แฟนตาซี", aliases: ["แฟนตาซี", "fantasy"] },
  { value: "Action", label: "แอ็กชัน", aliases: ["แอ็กชัน", "แอ็กชั่น", "แอคชั่น", "แอ็คชั่น", "บู๊", "action"] },
  { value: "Comedy", label: "ตลก", aliases: ["คอมเมดี้", "ตลก", "comedy"] },
  { value: "Horror", label: "สยองขวัญ", aliases: ["สยองขวัญ", "หนังผี", "ผี", "horror"] },
  { value: "Drama", label: "ดราม่า", aliases: ["ดราม่า", "drama"] },
  { value: "Crime", label: "อาชญากรรม", aliases: ["อาชญากรรม", "crime"] },
  { value: "Mystery", label: "ลึกลับ", aliases: ["ลึกลับ", "mystery"] },
  { value: "Family", label: "ครอบครัว", aliases: ["ครอบครัว", "family"] },
];

const languageRules: Array<AliasRule<Exclude<CatalogLanguageFilter, "ทั้งหมด">>> = [
  { value: "dub_th", label: "พากย์ไทย", aliases: ["พากย์ไทย", "เสียงไทย", "thai audio", "thai dub", "dub thai"] },
  { value: "sub_th", label: "ซับไทย", aliases: ["ซับไทย", "บรรยายไทย", "thai sub", "thai subtitle", "sub thai"] },
  { value: "backup", label: "มีสำรอง", aliases: ["มีสำรอง", "ตัวสำรอง", "สำรอง", "backup"] },
];

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

  const genre = consumeRule(source, genreRules);
  source = genre.source;

  const view = consumeRule(source, viewRules);
  source = view.source;

  const labels = [view.label, genre.label, year, language.label].filter((label): label is string => Boolean(label));

  return {
    text: source.replace(/\s+/g, " ").trim(),
    year,
    viewMode: view.value,
    genre: genre.value,
    language: language.value,
    labels,
  };
}

export const languageFilterOptions: Array<{ value: CatalogLanguageFilter; label: string }> = [
  { value: "ทั้งหมด", label: "ทุกภาษา" },
  { value: "dub_th", label: "พากย์ไทย" },
  { value: "sub_th", label: "ซับไทย" },
  { value: "backup", label: "มีสำรอง" },
];

export const sortModeOptions: Array<{ value: CatalogSortMode; label: string }> = [
  { value: "updated", label: "อัปเดตล่าสุด" },
  { value: "release", label: "ปีฉายล่าสุด" },
  { value: "rating", label: "คะแนนสูง" },
  { value: "title", label: "เรียงตามชื่อ" },
];
