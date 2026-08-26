type CatalogTitleCandidate = {
  thaiTitle: string;
  title: string;
  rating?: number;
  voteCount?: number;
  year?: number | null;
};

const MAX_DISTANCE_LENGTH = 64;

export function normalizeCatalogTitle(value: string) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactTitle(value: string) {
  return normalizeCatalogTitle(value).replace(/\s+/g, "");
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function sliceChars(value: string, start: number, end?: number) {
  return Array.from(value).slice(start, end).join("");
}

/**
 * Build a small set of robust title fragments for the existing Supabase request.
 * The goal is to tolerate one or two mistyped characters without adding another
 * network request or requiring a heavyweight fuzzy-search package in the client.
 */
export function buildFuzzyTitleFragments(value: string) {
  const normalized = normalizeCatalogTitle(value);
  if (!normalized) return [];

  const compact = normalized.replace(/\s+/g, "");
  const chars = Array.from(compact);
  if (chars.length < 3) return [normalized];

  const words = normalized
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => Array.from(word).length >= 3)
    .sort((a, b) => Array.from(b).length - Array.from(a).length)
    .slice(0, 2);

  const fragments = [normalized, ...words];

  if (chars.length >= 5) {
    const anchorLength = chars.length >= 10 ? 4 : 3;
    fragments.push(sliceChars(compact, 0, anchorLength));
    fragments.push(sliceChars(compact, -anchorLength));

    if (chars.length >= 8) {
      const middleStart = Math.max(0, Math.floor((chars.length - anchorLength) / 2));
      fragments.push(sliceChars(compact, middleStart, middleStart + anchorLength));
    }
  }

  return unique(fragments)
    .map((fragment) => fragment.trim())
    .filter((fragment) => Array.from(fragment.replace(/\s+/g, "")).length >= 3)
    .slice(0, 6);
}

export function buildFuzzyTitleOrFilter(value: string) {
  return buildFuzzyTitleFragments(value)
    .flatMap((fragment) => [
      `title_th.ilike.%${fragment}%`,
      `title_en.ilike.%${fragment}%`,
    ])
    .join(",");
}

function bigrams(value: string) {
  const chars = Array.from(value);
  if (chars.length < 2) return chars;
  const result: string[] = [];
  for (let index = 0; index < chars.length - 1; index += 1) {
    result.push(`${chars[index]}${chars[index + 1]}`);
  }
  return result;
}

function diceSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left === right) return 1;

  const leftPairs = bigrams(left);
  const rightPairs = bigrams(right);
  if (!leftPairs.length || !rightPairs.length) return 0;

  const counts = new Map<string, number>();
  leftPairs.forEach((pair) => counts.set(pair, (counts.get(pair) || 0) + 1));

  let overlap = 0;
  rightPairs.forEach((pair) => {
    const count = counts.get(pair) || 0;
    if (!count) return;
    overlap += 1;
    counts.set(pair, count - 1);
  });

  return (2 * overlap) / (leftPairs.length + rightPairs.length);
}

function levenshteinSimilarity(leftValue: string, rightValue: string) {
  const left = Array.from(leftValue).slice(0, MAX_DISTANCE_LENGTH);
  const right = Array.from(rightValue).slice(0, MAX_DISTANCE_LENGTH);
  if (!left.length || !right.length) return 0;
  if (left.join("") === right.join("")) return 1;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      const insertion = current[rightIndex - 1] + 1;
      const deletion = previous[rightIndex] + 1;
      current[rightIndex] = Math.min(substitution, insertion, deletion);
    }
    previous = current;
  }

  const distance = previous[right.length];
  return Math.max(0, 1 - distance / Math.max(left.length, right.length));
}

export function catalogTitleMatchScore(queryValue: string, thaiTitle: string, englishTitle: string) {
  const query = normalizeCatalogTitle(queryValue);
  const queryCompact = compactTitle(queryValue);
  if (!queryCompact) return 0;

  const candidates = unique([normalizeCatalogTitle(thaiTitle), normalizeCatalogTitle(englishTitle)]).filter(Boolean);
  let best = 0;

  candidates.forEach((candidate) => {
    const candidateCompact = candidate.replace(/\s+/g, "");
    if (!candidateCompact) return;

    if (candidateCompact === queryCompact) {
      best = Math.max(best, 1);
      return;
    }

    if (candidate === query) best = Math.max(best, 0.99);
    if (candidateCompact.startsWith(queryCompact)) best = Math.max(best, 0.92);
    if (candidateCompact.includes(queryCompact)) best = Math.max(best, 0.88);
    if (queryCompact.startsWith(candidateCompact)) best = Math.max(best, 0.84);

    const queryWords = query.split(" ").filter(Boolean);
    const candidateWords = candidate.split(" ").filter(Boolean);
    const exactWordHits = queryWords.filter((word) => candidateWords.includes(word)).length;
    if (queryWords.length && exactWordHits) {
      best = Math.max(best, 0.62 + 0.18 * (exactWordHits / queryWords.length));
    }

    const dice = diceSimilarity(queryCompact, candidateCompact);
    const edit = levenshteinSimilarity(queryCompact, candidateCompact);
    best = Math.max(best, dice * 0.62 + edit * 0.38);
  });

  return best;
}

export function rankCatalogTitleMatches<T extends CatalogTitleCandidate>(items: T[], queryValue: string) {
  if (!normalizeCatalogTitle(queryValue)) return items;

  return items
    .map((item, index) => ({
      item,
      index,
      score: catalogTitleMatchScore(queryValue, item.thaiTitle, item.title),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;

      const ratingDifference = Number(right.item.rating || 0) - Number(left.item.rating || 0);
      if (ratingDifference) return ratingDifference;

      const votesDifference = Number(right.item.voteCount || 0) - Number(left.item.voteCount || 0);
      if (votesDifference) return votesDifference;

      const yearDifference = Number(right.item.year || 0) - Number(left.item.year || 0);
      if (yearDifference) return yearDifference;

      return left.index - right.index;
    })
    .map(({ item }) => item);
}
