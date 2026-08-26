type PhraseAliasRule = {
  canonical: string;
  aliases: readonly string[];
};

type TokenAliasRule = {
  canonical: string;
  aliases: readonly string[];
  standalone?: boolean;
};

type AliasMatch = {
  start: number;
  end: number;
  canonical: string;
  standalone: boolean;
};

const PHRASE_ALIASES: readonly PhraseAliasRule[] = [
  { canonical: "harry potter", aliases: ["แฮร์รี่พอตเตอร์", "แฮรี่พอตเตอร์", "แฮรีพอตเตอร์"] },
  { canonical: "spider man", aliases: ["สไปเดอร์แมน", "สไปเดอแมน", "สไปเดอร์แมนน์"] },
  { canonical: "game of thrones", aliases: ["เกมออฟโธรนส์", "เกมออฟโธรน", "เกมออฟโทรน", "เกมออฟโทน"] },
  { canonical: "jurassic world", aliases: ["จูราสสิคเวิลด์", "จูราสสิกเวิลด์", "จูราสิคเวิลด์"] },
  { canonical: "avengers endgame", aliases: ["อเวนเจอร์สเอนด์เกม", "อเวนเจอร์เอนด์เกม", "อเวนเจอร์สเอนเกม"] },
  { canonical: "avengers", aliases: ["อเวนเจอร์ส", "อเวนเจอร์"] },
  { canonical: "captain america", aliases: ["กัปตันอเมริกา", "แคปเทนอเมริกา"] },
  { canonical: "iron man", aliases: ["ไอรอนแมน", "ไอออนแมน"] },
  { canonical: "doctor strange", aliases: ["ด็อกเตอร์สเตรนจ์", "ดอกเตอร์สเตรนจ์", "ด็อกเตอร์สเตรงจ์"] },
  { canonical: "black panther", aliases: ["แบล็คแพนเธอร์", "แบล็กแพนเธอร์"] },
  { canonical: "guardians of the galaxy", aliases: ["การ์เดียนส์ออฟเดอะกาแล็กซี", "การ์เดียนออฟเดอะกาแล็กซี"] },
  { canonical: "deadpool", aliases: ["เดดพูล", "เดดปูล"] },
  { canonical: "wolverine", aliases: ["วูล์ฟเวอรีน", "วูล์ฟเวอรีน", "วูฟเวอรีน"] },
  { canonical: "venom", aliases: ["เวนอม", "วีโนม"] },
  { canonical: "batman", aliases: ["แบทแมน", "แบตแมน"] },
  { canonical: "superman", aliases: ["ซูเปอร์แมน", "ซุปเปอร์แมน"] },
  { canonical: "star wars", aliases: ["สตาร์วอร์ส", "สตาร์วอร์"] },
  { canonical: "mission impossible", aliases: ["มิชชั่นอิมพอสซิเบิ้ล", "มิชชั่นอิมพอสซิเบิล", "มิชันอิมพอสซิเบิล"] },
  { canonical: "fast and furious", aliases: ["ฟาสต์แอนด์ฟิวเรียส", "ฟาสแอนด์ฟิวเรียส", "ฟาสต์แอนฟิวเรียส"] },
  { canonical: "transformers", aliases: ["ทรานส์ฟอร์เมอร์ส", "ทรานฟอร์เมอร์ส", "ทรานส์ฟอร์เมอร์"] },
  { canonical: "lord of the rings", aliases: ["ลอร์ดออฟเดอะริงส์", "ลอร์ดออฟเดอะริง", "เดอะลอร์ดออฟเดอะริงส์"] },
  { canonical: "pirates of the caribbean", aliases: ["ไพเรทส์ออฟเดอะแคริบเบียน", "ไพเรทออฟเดอะแคริบเบียน"] },
  { canonical: "john wick", aliases: ["จอห์นวิค", "จอนวิค"] },
  { canonical: "one piece", aliases: ["วันพีซ", "วันพีช"] },
  { canonical: "dragon ball", aliases: ["ดราก้อนบอล", "ดรากอนบอล"] },
  { canonical: "demon slayer", aliases: ["ดาบพิฆาตอสูร", "ดีมอนสเลเยอร์"] },
  { canonical: "attack on titan", aliases: ["ผ่าพิภพไททัน", "แอทแทคออนไททัน", "แอตแทคออนไททัน"] },
  { canonical: "pokemon", aliases: ["โปเกมอน", "โปเกม่อน"] },
  { canonical: "sonic", aliases: ["โซนิค", "โซนิก"] },
  { canonical: "toy story", aliases: ["ทอยสตอรี่", "ทอยสตอรี"] },
  { canonical: "kung fu panda", aliases: ["กังฟูแพนด้า", "กังฟูแพนดา"] },
  { canonical: "godzilla", aliases: ["ก็อดซิลล่า", "ก๊อดซิลล่า", "กอดซิลลา"] },
  { canonical: "the conjuring", aliases: ["เดอะคอนเจอริ่ง", "คอนเจอริ่ง", "คนเรียกผี"] },
  { canonical: "squid game", aliases: ["สควิดเกม", "สควิดเกมส์"] },
  { canonical: "stranger things", aliases: ["สเตรนเจอร์ธิงส์", "สเตรนเจอร์ทิงส์"] },
  { canonical: "money heist", aliases: ["มันนี่ไฮสต์", "ทรชนคนปล้นโลก"] },
  { canonical: "the walking dead", aliases: ["เดอะวอล์กกิงเดด", "วอล์กกิงเดด", "วอล์คกิ้งเดด"] },
];

const TOKEN_ALIASES: readonly TokenAliasRule[] = [
  { canonical: "harry", aliases: ["แฮร์รี่", "แฮรี่", "แฮรี"], standalone: true },
  { canonical: "potter", aliases: ["พอตเตอร์", "พอตเตอ"], standalone: true },
  { canonical: "spider", aliases: ["สไปเดอร์", "สไปเดอ"], standalone: true },
  { canonical: "man", aliases: ["แมน"] },
  { canonical: "game", aliases: ["เกม"] },
  { canonical: "of", aliases: ["ออฟ"] },
  { canonical: "thrones", aliases: ["โธรนส์", "โธรน", "โทรน", "โทน"], standalone: true },
  { canonical: "jurassic", aliases: ["จูราสสิค", "จูราสสิก", "จูราสิค"], standalone: true },
  { canonical: "world", aliases: ["เวิลด์", "เวิลด"] },
  { canonical: "avengers", aliases: ["อเวนเจอร์ส", "อเวนเจอร์"], standalone: true },
  { canonical: "captain", aliases: ["กัปตัน", "แคปเทน"] },
  { canonical: "america", aliases: ["อเมริกา"] },
  { canonical: "iron", aliases: ["ไอรอน", "ไอออน"] },
  { canonical: "doctor", aliases: ["ด็อกเตอร์", "ดอกเตอร์"] },
  { canonical: "strange", aliases: ["สเตรนจ์", "สเตรงจ์"] },
  { canonical: "black", aliases: ["แบล็ค", "แบล็ก"] },
  { canonical: "panther", aliases: ["แพนเธอร์", "แพนเตอร์"] },
  { canonical: "deadpool", aliases: ["เดดพูล", "เดดปูล"], standalone: true },
  { canonical: "wolverine", aliases: ["วูล์ฟเวอรีน", "วูฟเวอรีน"], standalone: true },
  { canonical: "venom", aliases: ["เวนอม", "วีโนม"], standalone: true },
  { canonical: "batman", aliases: ["แบทแมน", "แบตแมน"], standalone: true },
  { canonical: "superman", aliases: ["ซูเปอร์แมน", "ซุปเปอร์แมน"], standalone: true },
  { canonical: "star", aliases: ["สตาร์"] },
  { canonical: "wars", aliases: ["วอร์ส", "วอร์"] },
  { canonical: "mission", aliases: ["มิชชั่น", "มิชัน"] },
  { canonical: "impossible", aliases: ["อิมพอสซิเบิ้ล", "อิมพอสซิเบิล"] },
  { canonical: "fast", aliases: ["ฟาสต์", "ฟาส"] },
  { canonical: "furious", aliases: ["ฟิวเรียส", "ฟิวเรียส"] },
  { canonical: "transformers", aliases: ["ทรานส์ฟอร์เมอร์ส", "ทรานฟอร์เมอร์ส"], standalone: true },
  { canonical: "john", aliases: ["จอห์น", "จอน"] },
  { canonical: "wick", aliases: ["วิค"] },
  { canonical: "one", aliases: ["วัน"] },
  { canonical: "piece", aliases: ["พีซ", "พีช"] },
  { canonical: "dragon", aliases: ["ดราก้อน", "ดรากอน"] },
  { canonical: "ball", aliases: ["บอล"] },
  { canonical: "demon", aliases: ["ดีมอน"] },
  { canonical: "slayer", aliases: ["สเลเยอร์"] },
  { canonical: "attack", aliases: ["แอทแทค", "แอตแทค"] },
  { canonical: "titan", aliases: ["ไททัน"] },
  { canonical: "pokemon", aliases: ["โปเกมอน", "โปเกม่อน"], standalone: true },
  { canonical: "sonic", aliases: ["โซนิค", "โซนิก"], standalone: true },
  { canonical: "godzilla", aliases: ["ก็อดซิลล่า", "ก๊อดซิลล่า", "กอดซิลลา"], standalone: true },
  { canonical: "kong", aliases: ["คอง"] },
  { canonical: "squid", aliases: ["สควิด"] },
  { canonical: "stranger", aliases: ["สเตรนเจอร์"] },
  { canonical: "things", aliases: ["ธิงส์", "ทิงส์"] },
];

function normalizeAliasText(value: string) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactAliasText(value: string) {
  return normalizeAliasText(value).replace(/\s+/g, "");
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function findOccurrences(haystack: string, needle: string) {
  const indexes: number[] = [];
  if (!needle) return indexes;

  let fromIndex = 0;
  while (fromIndex <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, fromIndex);
    if (index < 0) break;
    indexes.push(index);
    fromIndex = index + Math.max(1, needle.length);
  }
  return indexes;
}

function phraseAliases(compactQuery: string) {
  const aliases: string[] = [];

  PHRASE_ALIASES.forEach((rule) => {
    const matched = rule.aliases.some((alias) => compactAliasText(alias) === compactQuery);
    if (matched) aliases.push(rule.canonical);
  });

  return aliases;
}

function tokenAliases(compactQuery: string) {
  const matches: AliasMatch[] = [];

  TOKEN_ALIASES.forEach((rule) => {
    rule.aliases.forEach((alias) => {
      const compactAlias = compactAliasText(alias);
      if (compactAlias.length < 2) return;

      findOccurrences(compactQuery, compactAlias).forEach((start) => {
        matches.push({
          start,
          end: start + compactAlias.length,
          canonical: rule.canonical,
          standalone: Boolean(rule.standalone),
        });
      });
    });
  });

  matches.sort((left, right) => {
    if (left.start !== right.start) return left.start - right.start;
    const leftLength = left.end - left.start;
    const rightLength = right.end - right.start;
    if (rightLength !== leftLength) return rightLength - leftLength;
    return left.canonical.localeCompare(right.canonical);
  });

  const selected: AliasMatch[] = [];
  let cursor = 0;
  matches.forEach((match) => {
    if (match.start < cursor) return;
    selected.push(match);
    cursor = match.end;
  });

  if (!selected.length) return [];
  if (selected.length === 1 && !selected[0].standalone) return [];

  const coveredLength = selected.reduce((total, match) => total + match.end - match.start, 0);
  const coverage = compactQuery.length ? coveredLength / compactQuery.length : 0;
  if (selected.length < 2 && coverage < 0.6) return [];
  if (selected.length >= 2 && coverage < 0.42) return [];

  const canonicalTokens = selected.map((match) => match.canonical);
  const phrase = canonicalTokens.join(" ");
  const compactPhrase = canonicalTokens.join("");

  return unique([
    phrase,
    compactPhrase,
    ...canonicalTokens.filter((token) => token.length >= 4),
  ]);
}

/**
 * Expands Thai phonetic spellings into English title candidates without a second
 * network request. The output is intentionally small because it is appended to
 * the existing Supabase OR filter and is also reused for client-side ranking.
 */
export function buildThaiTitleTransliterationAliases(value: string) {
  const normalized = normalizeAliasText(value);
  if (!normalized || !/[ก-๙]/u.test(normalized)) return [];

  const compact = normalized.replace(/\s+/g, "");
  return unique([
    ...phraseAliases(compact),
    ...tokenAliases(compact),
  ]).slice(0, 8);
}
