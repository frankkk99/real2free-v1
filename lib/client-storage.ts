import { FAVORITES_KEY, HISTORY_KEY } from "./public-catalog";

export const THEME_KEY = "real2free-theme";
export const BROWSE_STATE_KEY = "real2free-browse-state-v1";
export const LAST_EPISODES_KEY = "real2free-last-episodes-v1";

const DEFAULT_LIST_LIMIT = 100;

function canUseStorage() {
  return typeof window !== "undefined";
}

function removeStoredValue(key: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Private browsing and blocked storage are valid browser states.
  }
}

export function readStoredJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    removeStoredValue(key);
    return null;
  }
}

export function readStoredString(key: string) {
  if (!canUseStorage()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredString(key: string, value: string) {
  if (!canUseStorage()) return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function writeStoredJson<T>(key: string, value: T) {
  if (!canUseStorage()) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readStoredIdList(key: string, limit = DEFAULT_LIST_LIMIT) {
  const value = readStoredJson<unknown>(key);
  if (!Array.isArray(value)) return [];

  return [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0))]
    .slice(0, limit);
}

export function writeStoredIdList(key: string, ids: string[], limit = DEFAULT_LIST_LIMIT) {
  return writeStoredJson(key, [...new Set(ids.filter(Boolean))].slice(0, limit));
}

export function toggleStoredId(key: string, id: string, limit = DEFAULT_LIST_LIMIT) {
  const ids = readStoredIdList(key, limit);
  const next = ids.includes(id) ? ids.filter((entry) => entry !== id) : [id, ...ids];
  writeStoredIdList(key, next, limit);
  return next;
}

export function addStoredId(key: string, id: string, limit = DEFAULT_LIST_LIMIT) {
  const next = [id, ...readStoredIdList(key, limit).filter((entry) => entry !== id)];
  writeStoredIdList(key, next, limit);
  return next;
}

export function readStoredStringMap(key: string): Record<string, string> {
  const value = readStoredJson<unknown>(key);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
  );
}

export function writeStoredStringMap(key: string, value: Record<string, string>) {
  return writeStoredJson(key, value);
}

export { FAVORITES_KEY, HISTORY_KEY };
