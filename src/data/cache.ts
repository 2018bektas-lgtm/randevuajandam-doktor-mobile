/**
 * Module-list disk cache used by useModuleList in Modules.tsx.
 * Separate from api/offlineCache (HTTP GET fallback).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PREFIX = 'ra.module.cache.v1.';
const INDEX_KEY = 'ra.module.cache.v1.__index';
/** Default: 5 minutes before entry is marked stale (still returned). */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CacheRecord<T = unknown> = {
  value: T;
  savedAt: number;
  tags: string[];
};

type IndexEntry = { key: string; tags: string[]; savedAt: number };

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota */
    }
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {
      /* */
    }
    return;
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* */
  }
}

async function readIndex(): Promise<IndexEntry[]> {
  try {
    const raw = await storageGet(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(entries: IndexEntry[]): Promise<void> {
  await storageSet(INDEX_KEY, JSON.stringify(entries.slice(-200)));
}

/**
 * Read a module cache entry.
 * Returns null if missing / corrupt.
 * `stale: true` when older than ttl (caller should refresh in background).
 */
export async function readCache<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<{ value: T; stale: boolean } | null> {
  if (!key) return null;
  try {
    const raw = await storageGet(PREFIX + key);
    if (!raw) return null;
    const rec = JSON.parse(raw) as CacheRecord<T>;
    if (rec == null || typeof rec !== 'object' || !('value' in rec)) return null;
    const age = Date.now() - Number(rec.savedAt || 0);
    const ttl = ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
    return {
      value: rec.value,
      stale: !Number.isFinite(age) || age < 0 || age > ttl,
    };
  } catch {
    return null;
  }
}

/** Persist list data for a module key; optional tags for bulk invalidation. */
export async function writeCache(
  key: string,
  data: unknown,
  tags: string[] = [],
): Promise<void> {
  if (!key) return;
  const rec: CacheRecord = {
    value: data,
    savedAt: Date.now(),
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
  };
  try {
    await storageSet(PREFIX + key, JSON.stringify(rec));
    const index = await readIndex();
    const next = index.filter((e) => e.key !== key);
    next.push({ key, tags: rec.tags, savedAt: rec.savedAt });
    await writeIndex(next);
  } catch {
    /* ignore */
  }
}

/** Drop all entries that carry any of the given tags. */
export async function invalidateCacheByTags(tags: string[]): Promise<void> {
  if (!tags.length) return;
  const tagSet = new Set(tags);
  const index = await readIndex();
  const keep: IndexEntry[] = [];
  for (const entry of index) {
    const hit = (entry.tags || []).some((t) => tagSet.has(t));
    if (hit) {
      await storageRemove(PREFIX + entry.key);
    } else {
      keep.push(entry);
    }
  }
  await writeIndex(keep);
}

export async function clearModuleCache(): Promise<void> {
  const index = await readIndex();
  for (const entry of index) {
    await storageRemove(PREFIX + entry.key);
  }
  await storageRemove(INDEX_KEY);
}
