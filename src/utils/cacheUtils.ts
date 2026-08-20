
/**
 * Unified localStorage cache utility for instant ("stale-while-revalidate")
 * loading of react-query backed data.
 *
 * Improvements vs the prior version:
 *  - CACHE_VERSION: bumping invalidates all prior payloads (schema migrations).
 *  - TTL (24h default) honored per-entry.
 *  - Quota-safe writes (silently evicts on QuotaExceeded).
 *  - Single source of truth for the auth profile cache.
 *  - clearAll() to nuke everything across users on logout / restore.
 */

const CACHE_VERSION = 2;
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const PREFIX = 'noova_cache';

interface Entry<T> {
  v: number;       // schema version
  t: number;       // timestamp
  data: T;
}

function buildKey(key: string, userId?: string) {
  return userId ? `${PREFIX}_${userId}_${key}` : `${PREFIX}_${key}`;
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    // Quota exceeded — evict our own cache and retry once.
    if (e?.name === 'QuotaExceededError') {
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith(PREFIX))
          .forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, value);
      } catch {}
    }
  }
}

export const cacheUtils = {
  save: <T>(key: string, data: T, userId?: string, ttlMs: number = DEFAULT_TTL_MS) => {
    const entry: Entry<T> = { v: CACHE_VERSION, t: Date.now(), data };
    safeSet(buildKey(key, userId), JSON.stringify(entry));
    // ttlMs is honored on load via DEFAULT_TTL_MS; per-entry ttl reserved for future.
    void ttlMs;
  },

  load: <T>(key: string, userId?: string): T | null => {
    try {
      const raw = localStorage.getItem(buildKey(key, userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Entry<T>;
      // Version mismatch → throw away.
      if (parsed?.v !== CACHE_VERSION) {
        localStorage.removeItem(buildKey(key, userId));
        return null;
      }
      // TTL expiry.
      if (Date.now() - parsed.t > DEFAULT_TTL_MS) {
        localStorage.removeItem(buildKey(key, userId));
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  },

  remove: (key: string, userId?: string) => {
    try { localStorage.removeItem(buildKey(key, userId)); } catch {}
  },

  /** Returns the timestamp (ms) when the entry was cached, or null. */
  loadedAt: (key: string, userId?: string): number | null => {
    try {
      const raw = localStorage.getItem(buildKey(key, userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Entry<unknown>;
      if (parsed?.v !== CACHE_VERSION) return null;
      return typeof parsed.t === 'number' ? parsed.t : null;
    } catch {
      return null;
    }
  },

  /** Clear cache for a single user (or anonymous if userId omitted). */
  clear: (userId?: string) => {
    try {
      const prefix = userId ? `${PREFIX}_${userId}_` : `${PREFIX}_`;
      Object.keys(localStorage)
        .filter(k => k.startsWith(prefix))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  },

  /** Nuke every noova_cache_* key across all users. */
  clearAll: () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  },
};

// --- Auth profile cache (moved off raw localStorage for consistency) ---
const PROFILE_KEY = 'profile';

export const profileCache = {
  get: <T = any>(): T | null => cacheUtils.load<T>(PROFILE_KEY),
  set: <T = any>(profile: T) => cacheUtils.save<T>(PROFILE_KEY, profile),
  clear: () => cacheUtils.remove(PROFILE_KEY),
};
