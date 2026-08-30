const FETCH_TIMEOUT_MS = 8000;

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isLegacyIOS(): boolean {
  if (!isIOSDevice()) return false;
  const match = navigator.userAgent.match(/OS (\d+)_/);
  if (!match) return false;
  return parseInt(match[1], 10) <= 12;
}

const blobCache = new Map<string, string>();

export async function fetchMediaAsBlob(url: string): Promise<string> {
  if (blobCache.has(url)) return blobCache.get(url)!;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'force-cache',
      credentials: 'omit',
      mode: 'cors',
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    blobCache.set(url, objectUrl);
    return objectUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function getMediaFallback(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23f3f4f6'/%3E%3Cpath d='M20 44l8-10 6 7 4-5 6 8H20z' fill='%23d1d5db'/%3E%3Ccircle cx='42' cy='22' r='5' fill='%23d1d5db'/%3E%3C/svg%3E";
}

export function getVideoFallback(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23f3f4f6'/%3E%3Cpolygon points='24,18 24,46 46,32' fill='%23d1d5db'/%3E%3C/svg%3E";
}
