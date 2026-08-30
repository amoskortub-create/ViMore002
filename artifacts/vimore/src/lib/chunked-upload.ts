'use client';

import { account } from './appwrite';

const ENDPOINT = (
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1'
).replace(/\/$/, '');

const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

export const UPLOAD_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per chunk

// ── JWT cache ──────────────────────────────────────────────────────────────
// Avoids creating a new JWT for every single chunk while still refreshing
// before the 15-minute Appwrite default expiry.
let cachedJwt = '';
let jwtExpiresAt = 0;

async function getJwt(): Promise<string> {
  // Refresh 60 s before expiry so mid-upload refreshes are seamless
  if (Date.now() < jwtExpiresAt - 60_000) return cachedJwt;
  const { jwt } = await account.createJWT();
  cachedJwt = jwt;
  jwtExpiresAt = Date.now() + 14 * 60 * 1000; // 14 min
  return jwt;
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface ChunkUploadOptions {
  bucketId: string;
  fileId: string;
  file: File;
  chunkSize?: number;
  maxRetries?: number;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

// ── Main upload ────────────────────────────────────────────────────────────
export async function chunkedUploadToAppwrite(
  opts: ChunkUploadOptions
): Promise<{ $id: string }> {
  const {
    bucketId,
    fileId,
    file,
    chunkSize = UPLOAD_CHUNK_SIZE,
    maxRetries = 3,
    onProgress,
    signal,
  } = opts;

  const totalSize = file.size;

  // Small files (≤ chunkSize): single request, no range header needed.
  // This is the fast path and also the fallback when ChunkedUpload header
  // is not supported by the Appwrite instance.
  if (totalSize <= chunkSize) {
    return uploadSingleChunk({ bucketId, fileId, file, onProgress, maxRetries, signal });
  }

  let offset = 0;

  while (offset < totalSize) {
    if (signal?.aborted) throw new Error('Upload cancelled');

    const chunkEnd = Math.min(offset + chunkSize, totalSize);
    const chunk = file.slice(offset, chunkEnd);
    const chunkFile = new File([chunk], file.name, { type: file.type });

    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('file', chunkFile);

    let attempt = 0;
    let lastErr: Error | null = null;

    while (attempt < maxRetries) {
      if (signal?.aborted) throw new Error('Upload cancelled');
      try {
        const jwt = await getJwt();
        const res = await fetch(`${ENDPOINT}/storage/buckets/${bucketId}/files`, {
          method: 'POST',
          headers: {
            'x-appwrite-project': PROJECT_ID,
            'x-appwrite-jwt': jwt,
            'content-range': `bytes ${offset}-${chunkEnd - 1}/${totalSize}`,
            'x-appwrite-id': fileId,
          },
          body: formData,
          signal,
        });

        if (res.status === 201 || res.status === 200) {
          lastErr = null;
          break;
        }
        // Appwrite returns 204 for intermediate chunks and 201 for the final one
        if (res.status === 204) { lastErr = null; break; }

        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      } catch (e: any) {
        if (signal?.aborted || e?.name === 'AbortError') throw new Error('Upload cancelled');
        lastErr = e instanceof Error ? e : new Error(String(e));
        attempt++;
        if (attempt < maxRetries) {
          // Exponential back-off: 1.5 s, 3 s, 4.5 s…
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
    }

    if (lastErr) throw lastErr;

    offset = chunkEnd;
    onProgress?.(offset / totalSize);
  }

  return { $id: fileId };
}

// ── Single-chunk helper (no Content-Range) ─────────────────────────────────
async function uploadSingleChunk({
  bucketId,
  fileId,
  file,
  onProgress,
  maxRetries = 3,
  signal,
}: {
  bucketId: string;
  fileId: string;
  file: File;
  onProgress?: (pct: number) => void;
  maxRetries?: number;
  signal?: AbortSignal;
}): Promise<{ $id: string }> {
  const formData = new FormData();
  formData.append('fileId', fileId);
  formData.append('file', file);

  let attempt = 0;
  let lastErr: Error | null = null;

  while (attempt < maxRetries) {
    if (signal?.aborted) throw new Error('Upload cancelled');
    try {
      const jwt = await getJwt();
      const res = await fetch(`${ENDPOINT}/storage/buckets/${bucketId}/files`, {
        method: 'POST',
        headers: {
          'x-appwrite-project': PROJECT_ID,
          'x-appwrite-jwt': jwt,
        },
        body: formData,
        signal,
      });

      if (res.ok) {
        onProgress?.(1);
        return { $id: fileId };
      }
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    } catch (e: any) {
      if (signal?.aborted || e?.name === 'AbortError') throw new Error('Upload cancelled');
      lastErr = e instanceof Error ? e : new Error(String(e));
      attempt++;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }

  throw lastErr ?? new Error('Upload failed');
}
