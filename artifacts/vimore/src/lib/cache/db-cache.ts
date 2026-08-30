'use client';

import {
  DB_CACHE_NAME,
  DB_CACHE_VERSION,
  DB_CACHE_STORE,
  CACHE_TTL_MS,
  COLLECTION_FIELDS,
} from './constants';

interface CacheEntry<T> {
  key: string;
  documents: T[];
  total: number;
  cachedAt: number;
}

function buildKey(
  databaseId: string,
  collectionId: string,
  queries: string[]
): string {
  const sorted = [...queries].sort().join('|');
  return `${databaseId}::${collectionId}::${sorted}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CACHE_NAME, DB_CACHE_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_CACHE_STORE)) {
        db.createObjectStore(DB_CACHE_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet<T>(db: IDBDatabase, key: string): Promise<CacheEntry<T> | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CACHE_STORE, 'readonly');
    const req = tx.objectStore(DB_CACHE_STORE).get(key);
    req.onsuccess = () => resolve(req.result as CacheEntry<T> | undefined);
    req.onerror = () => reject(req.error);
  });
}

function dbPut<T>(db: IDBDatabase, entry: CacheEntry<T>): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CACHE_STORE, 'readwrite');
    const req = tx.objectStore(DB_CACHE_STORE).put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CACHE_STORE, 'readwrite');
    const req = tx.objectStore(DB_CACHE_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function pickFields<T extends Record<string, unknown>>(
  doc: T,
  fields: string[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const field of fields) {
    if (field in doc) {
      result[field as keyof T] = doc[field as keyof T];
    }
  }
  return result;
}

function slimDocument<T extends Record<string, unknown>>(
  collectionId: string,
  doc: T
): T {
  const allowed = COLLECTION_FIELDS[collectionId];
  if (!allowed) return doc;
  return pickFields(doc, allowed) as T;
}

function documentsAreEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const serialize = (v: unknown) => JSON.stringify(v);
  const setA = new Set(a.map(serialize));
  return b.every((item) => setA.has(serialize(item)));
}

interface ListDocumentsCachedOptions<T> {
  fields?: string[];
  onUpdate?: (documents: T[], total: number) => void;
}

/**
 * Cache-First wrapper for Appwrite `databases.listDocuments`.
 *
 * Behaviour:
 * 1. Immediately returns locally-cached data (if present and within TTL).
 * 2. Fires a background Appwrite fetch in parallel.
 * 3. When the background fetch completes:
 *    - If the data differs from the cache, updates IndexedDB and calls `onUpdate`.
 *    - If the cache is expired (> 35 h), waits for Appwrite before returning.
 *
 * @param fetcher   An async function that calls `databases.listDocuments(...)` and returns `{ documents, total }`.
 * @param cacheKey  A stable, unique string identifying this query (use `buildCacheKey`).
 * @param collectionId  The Appwrite collection ID (used to apply the field allowlist).
 * @param options   Optional field override and UI update callback.
 */
export async function listDocumentsCached<T extends Record<string, unknown>>(
  fetcher: () => Promise<{ documents: T[]; total: number }>,
  cacheKey: string,
  collectionId: string,
  options: ListDocumentsCachedOptions<T> = {}
): Promise<{ documents: T[]; total: number }> {
  if (typeof window === 'undefined') {
    const result = await fetcher();
    return result;
  }

  const { onUpdate } = options;

  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
  } catch {
    const result = await fetcher();
    return result;
  }

  const slim = (docs: T[]): T[] =>
    docs.map((d) => slimDocument(collectionId, d) as T);

  const cached = await dbGet<T>(db, cacheKey);
  const now = Date.now();
  const isExpired = !cached || now - cached.cachedAt >= CACHE_TTL_MS;

  const backgroundFetch = async () => {
    try {
      const fresh = await fetcher();
      const slimmed = slim(fresh.documents);

      const entry: CacheEntry<T> = {
        key: cacheKey,
        documents: slimmed,
        total: fresh.total,
        cachedAt: now,
      };

      if (cached) {
        if (!documentsAreEqual(cached.documents, slimmed)) {
          await dbPut(db!, entry);
          onUpdate?.(slimmed, fresh.total);
        }
      } else {
        await dbPut(db!, entry);
      }

      return { documents: slimmed, total: fresh.total };
    } catch {
      return null;
    }
  };

  if (!isExpired && cached) {
    // Cache is fresh — return immediately with no network call to save data.
    return { documents: cached.documents, total: cached.total };
  }

  if (isExpired && cached) {
    await dbDelete(db, cacheKey);
  }

  const freshResult = await backgroundFetch();
  if (freshResult) {
    return freshResult;
  }

  if (cached) {
    return { documents: cached.documents, total: cached.total };
  }

  return { documents: [], total: 0 };
}

/**
 * Convenience helper: builds a stable cache key from databaseId + collectionId + queries.
 */
export function buildCacheKey(
  databaseId: string,
  collectionId: string,
  queries: string[] = []
): string {
  return buildKey(databaseId, collectionId, queries);
}

/**
 * Manually evict a single query's cache entry (e.g. after a mutation).
 */
export async function evictDocumentCache(cacheKey: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDb();
    await dbDelete(db, cacheKey);
  } catch {
    // silently ignore
  }
}

/**
 * Clears the entire document cache (e.g. on logout).
 */
export async function clearDocumentCache(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_CACHE_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // silently ignore
  }
}
