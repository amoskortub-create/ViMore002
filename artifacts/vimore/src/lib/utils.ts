import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * High-Velocity Follower Parser
 * Converts strings like "8.4k" or "1.2M" into raw integers for logical handshakes.
 */
export function parseFollowerCount(count: string | number | undefined | null): number {
  if (count === undefined || count === null) return 0;
  if (typeof count === 'number') return count;
  
  const clean = String(count).toLowerCase().trim();
  if (clean.endsWith('k')) {
    return parseFloat(clean.replace('k', '')) * 1000;
  }
  if (clean.endsWith('m')) {
    return parseFloat(clean.replace('m', '')) * 1000000;
  }
  return parseFloat(clean) || 0;
}

/**
 * Physical Archival Handshake
 * Fetches a file as a blob and triggers a native device download.
 */
export async function saveFileToDevice(url: string, filename: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (e) {
    console.error("Binary handshake failed:", e);
    // Fallback: Try direct link if fetch fails due to CORS in prototype
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return false;
  }
}

/**
 * Byte-Pulse Formatter
 * Converts raw bytes into human-readable strings for network sync feedback.
 */
export function formatBytes(bytes: number, decimals: number = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Language Detection — checks if text is in a different language than the browser.
 * Returns true when a Translate button should be shown.
 */
export function isTextForeignToUser(text: string, browserLang: string): boolean {
  if (!text || text.trim().length < 8) return false;
  const lang = browserLang.toLowerCase().split('-')[0];

  const arabicRe    = /[\u0600-\u06FF\u0750-\u077F]/;
  const chineseRe   = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
  const japaneseRe  = /[\u3040-\u30FF]/;
  const koreanRe    = /[\uAC00-\uD7AF\u1100-\u11FF]/;
  const cyrillicRe  = /[\u0400-\u04FF]/;
  const hindiRe     = /[\u0900-\u097F]/;
  const thaiRe      = /[\u0E00-\u0E7F]/;
  const greekRe     = /[\u0370-\u03FF]/;

  const hasArabic   = arabicRe.test(text);
  const hasChinese  = chineseRe.test(text);
  const hasJapanese = japaneseRe.test(text);
  const hasKorean   = koreanRe.test(text);
  const hasCyrillic = cyrillicRe.test(text);
  const hasHindi    = hindiRe.test(text);
  const hasThai     = thaiRe.test(text);
  const hasGreek    = greekRe.test(text);

  const nonLatinPresent = hasArabic || hasChinese || hasJapanese || hasKorean || hasCyrillic || hasHindi || hasThai || hasGreek;

  if (lang === 'ar') return !hasArabic;
  if (lang === 'zh') return !hasChinese;
  if (lang === 'ja') return !hasJapanese;
  if (lang === 'ko') return !hasKorean;
  if (['ru', 'uk', 'bg'].includes(lang)) return !hasCyrillic;
  if (lang === 'hi') return !hasHindi;
  if (lang === 'th') return !hasThai;
  if (lang === 'el') return !hasGreek;

  return nonLatinPresent;
}

/**
 * Identity Node Converter
 * Converts a data URL to a File node for vault archival.
 */
export function dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
