'use client';

import { FILE_CACHE_NAME, CACHE_TTL_MS } from './constants';

function isCacheSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

function buildCacheKey(bucketId: string, fileId: string): string {
  return `/__vimore_file_cache__/${bucketId}/${fileId}`;
}

function buildAppwriteUrl(bucketId: string, fileId: string): string {
  const endpoint = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1').replace(/\/$/, '');
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
}

async function getCacheTimestamp(
  cache: Cache,
  cacheKey: string
): Promise<number | null> {
  const metaResponse = await cache.match(`${cacheKey}/__meta__`);
  if (!metaResponse) return null;
  const meta = await metaResponse.json();
  return meta.cachedAt ?? null;
}

async function setCacheTimestamp(cache: Cache, cacheKey: string): Promise<void> {
  const meta = { cachedAt: Date.now() };
  await cache.put(
    `${cacheKey}/__meta__`,
    new Response(JSON.stringify(meta), {
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

async function evictExpiredEntry(cache: Cache, cacheKey: string): Promise<void> {
  await cache.delete(cacheKey);
  await cache.delete(`${cacheKey}/__meta__`);
}

/**
 * Cache-First file retrieval.
 *
 * 1. Checks the browser CacheStorage for the file.
 * 2. If present and within TTL, returns a Blob URL pointing to the cached bytes.
 * 3. If missing or expired, downloads from Appwrite Storage, caches it, then returns a Blob URL.
 *
 * @returns A temporary Blob URL (valid for the lifetime of the current page) or null on failure.
 */
export async function getCachedFile(
  bucketId: string,
  fileId: string
): Promise<string | null> {
  if (!isCacheSupported() || !bucketId || !fileId) return null;

  const cacheKey = buildCacheKey(bucketId, fileId);

  try {
    const cache = await caches.open(FILE_CACHE_NAME);
    const cachedAt = await getCacheTimestamp(cache, cacheKey);

    if (cachedAt !== null) {
      const age = Date.now() - cachedAt;
      if (age < CACHE_TTL_MS) {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          return URL.createObjectURL(blob);
        }
      } else {
        await evictExpiredEntry(cache, cacheKey);
      }
    }

    const remoteUrl = buildAppwriteUrl(bucketId, fileId);
    const response = await fetch(remoteUrl);
    if (!response.ok) return null;

    const responseToCache = response.clone();
    await cache.put(cacheKey, responseToCache);
    await setCacheTimestamp(cache, cacheKey);

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Explicitly removes a single file from the local cache (e.g. after re-upload).
 */
export async function evictCachedFile(
  bucketId: string,
  fileId: string
): Promise<void> {
  if (!isCacheSupported()) return;
  try {
    const cache = await caches.open(FILE_CACHE_NAME);
    const cacheKey = buildCacheKey(bucketId, fileId);
    await evictExpiredEntry(cache, cacheKey);
  } catch {
    // silently ignore
  }
}

/**
 * Clears the entire file cache (useful for a hard logout / storage reset).
 */
export async function clearFileCache(): Promise<void> {
  if (!isCacheSupported()) return;
  try {
    await caches.delete(FILE_CACHE_NAME);
  } catch {
    // silently ignore
  }
}
