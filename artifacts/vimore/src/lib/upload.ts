/** Browser-only Appwrite Storage upload helpers. */

import { ID, storage, BUCKET, getFileUrl } from './appwrite';
import { authFetch } from './auth-fetch';

function normalizeUploadFile(file: File, fallbackName: string): File {
  // Capacitor/WebView can return a File-like object from a different realm,
  // making `instanceof File` unreliable. Re-wrap it in the current realm.
  if (typeof File !== 'undefined' && file instanceof File) return file;
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    return new File([file], fallbackName, { type: file.type || 'application/octet-stream' });
  }
  throw new Error('A browser File is required for upload');
}

/**
 * Upload a file directly from the browser through the Appwrite Web SDK.
 *
 * The Appwrite project must include the current browser origin as a Web
 * platform. The API key must never be used in this client-side function.
 *
 * @param file     The File object to upload.
 * @param bucketId The Appwrite storage bucket ID (use BUCKET.* constants).
 * @param fileId   Optional desired file ID; auto-generated if omitted.
 * @returns        The Appwrite fileId (use getFileUrl() to build a URL from it).
 */
export async function uploadViaClient(
  file: File,
  bucketId: string,
  fileId?: string,
): Promise<string> {
  const normalizedFile = normalizeUploadFile(file, 'upload.bin');
  const uploaded = await storage.createFile(bucketId, fileId || ID.unique(), normalizedFile);
  return uploaded.$id;
}

export interface ClientUploadOptions {
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Upload a file through the browser SDK. Appwrite handles the multipart
 * request; the optional progress callback is completed when the request
 * finishes. Abort is checked before starting because the SDK request itself
 * does not expose a cancellation signal.
 *
 * @param file     The File object to upload.
 * @param bucketId The Appwrite storage bucket ID (use BUCKET.* constants).
 * @param fileId   The Appwrite file ID for this upload session.
 * @param options  Progress callback and AbortSignal.
 * @returns        The Appwrite fileId.
 */
export async function uploadLargeViaClient(
  file: File,
  bucketId: string,
  fileId: string | undefined,
  options: ClientUploadOptions = {},
): Promise<string> {
  if (options.signal?.aborted) throw new Error('Upload cancelled');
  const normalizedFile = normalizeUploadFile(file, 'upload.bin');
  const timeoutMs = options.timeoutMs ?? 180_000;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Upload timed out. Please check your connection and try again.')), timeoutMs);
  });
  const upload = storage.createFile(bucketId, fileId || ID.unique(), normalizedFile);
  const uploaded = await Promise.race([upload, timeout]);
  if (timeoutHandle) clearTimeout(timeoutHandle);
  options.onProgress?.(1);
  return uploaded.$id;
}

/**
 * Upload voice recordings through the same-origin server route. This avoids
 * Appwrite CORS and cross-realm File issues in Capacitor Android WebViews.
 */
export async function uploadVoiceViaServer(file: File): Promise<{ fileId: string; mediaUrl: string }> {
  const normalizedFile = normalizeUploadFile(file, 'voice.webm');
  const formData = new FormData();
  formData.append('file', normalizedFile, normalizedFile.name || 'voice.webm');

  const response = await authFetch('/api/upload/voice', {
    method: 'POST',
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.fileId) {
    throw new Error(data?.error || 'Could not save the voice message.');
  }
  return {
    fileId: data.fileId,
    mediaUrl: data.mediaUrl || getFileUrl(BUCKET.VOICE_MESSAGES, data.fileId),
  };
}
