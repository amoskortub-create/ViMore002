import { extractFileId, getFileUrl } from '@/lib/appwrite';
import { getCurrentNetworkTier, NetworkTier } from '@/context/NetworkContext';

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1').replace(/\/$/, '');
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';

export type MediaRole = 'avatar' | 'thumb' | 'feed' | 'story' | 'cover' | 'fullscreen';

interface PreviewSpec { width: number; quality: number; }

const MATRIX: Record<MediaRole, Record<NetworkTier, PreviewSpec>> = {
  avatar:     { lite: { width: 48,  quality: 60 }, standard: { width: 72,  quality: 75 }, rich: { width: 128, quality: 85 } },
  thumb:      { lite: { width: 240, quality: 55 }, standard: { width: 360, quality: 70 }, rich: { width: 480, quality: 80 } },
  feed:       { lite: { width: 480, quality: 60 }, standard: { width: 720, quality: 75 }, rich: { width: 1080, quality: 85 } },
  story:      { lite: { width: 480, quality: 55 }, standard: { width: 720, quality: 70 }, rich: { width: 1080, quality: 85 } },
  cover:      { lite: { width: 720, quality: 60 }, standard: { width: 1080, quality: 75 }, rich: { width: 1440, quality: 85 } },
  fullscreen: { lite: { width: 720, quality: 65 }, standard: { width: 1080, quality: 80 }, rich: { width: 1600, quality: 90 } },
};

/**
 * Build an Appwrite preview URL with adaptive width + quality based on network tier.
 * Falls back to the original URL if the file id can't be extracted or for non-Appwrite URLs.
 */
export function getAdaptivePreview(url: string | undefined | null, role: MediaRole = 'feed', tierOverride?: NetworkTier): string {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  // Skip data URIs, blobs, and obvious non-image URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  // The same-origin file proxy handles private Appwrite buckets and already
  // returns a cacheable image/video response. Keep media on that origin so
  // private buckets do not bypass the proxy's admin-key access.

  const fileId = extractFileId(url);
  if (!fileId || !ENDPOINT || !PROJECT_ID) return url;

  // Try to find bucket id from URL
  const bucketMatch = url.match(/\/buckets\/([^/]+)\/files\//) || url.match(/^\/api\/file\/([^/]+)\//);
  const bucketId = bucketMatch ? bucketMatch[1] : null;
  if (!bucketId) return url;

  const tier: NetworkTier = tierOverride || getCurrentNetworkTier();
  const spec = MATRIX[role][tier];

  // The proxy accepts the same preview options and keeps the request
  // same-origin, which works on the Replit preview/deployed domain.
  return `/api/file/${encodeURIComponent(bucketId)}/${encodeURIComponent(fileId)}?width=${spec.width}&quality=${spec.quality}&output=webp`;
}

/**
 * Hook-free helper used inside non-React contexts (e.g. PostContext callbacks).
 */
export function adaptiveFeedPageSize(tier?: NetworkTier): number {
  const t = tier || getCurrentNetworkTier();
  if (t === 'lite') return 5;
  if (t === 'standard') return 10;
  return 15;
}

/**
 * Whether autoplay should be allowed for the current tier.
 */
export function shouldAutoplayVideo(tier?: NetworkTier): boolean {
  const t = tier || getCurrentNetworkTier();
  return t === 'rich';
}

/**
 * Whether non-critical real-time channels (likes / comments stream) should be opened.
 */
export function shouldOpenAmbientRealtime(tier?: NetworkTier): boolean {
  const t = tier || getCurrentNetworkTier();
  return t !== 'lite';
}

/**
 * Adaptive debounce window (ms) for search-as-you-type and similar.
 */
export function adaptiveDebounceMs(tier?: NetworkTier): number {
  const t = tier || getCurrentNetworkTier();
  if (t === 'lite') return 600;
  if (t === 'standard') return 350;
  return 200;
}

// Re-export for ergonomic imports
export { getCurrentNetworkTier };
export type { NetworkTier };

// Force the original full-quality URL when needed (e.g. download)
export function getFullUrl(bucketId: string, fileId: string): string {
  return getFileUrl(bucketId, fileId);
}
