import { NextRequest, NextResponse } from 'next/server';
import { getLinkPreview } from 'link-preview-js';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';

export const maxDuration = 15;

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254',
  '10.0.0.0',
  'metadata.google.internal',
]);

function isBlockedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const lower = hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(lower)) return true;
    if (/^10\./.test(lower)) return true;
    if (/^192\.168\./.test(lower)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
    if (/^fc00:/i.test(lower) || /^fe80:/i.test(lower)) return true;
    return false;
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
  const rl = rateLimit(`link-preview:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only http/https URLs are allowed.' }, { status: 400 });
  }

  if (isBlockedHost(url)) {
    return NextResponse.json({ error: 'URL not allowed.' }, { status: 403 });
  }

  try {
    const data = await getLinkPreview(url, {
      timeout: 8000,
      followRedirects: 'follow',
      handleRedirects: (baseURL: string, forwardedURL: string) => {
        if (isBlockedHost(forwardedURL)) return false;
        const urlObj = new URL(baseURL);
        const forwardedURLObj = new URL(forwardedURL);
        return (
          forwardedURLObj.hostname === urlObj.hostname ||
          forwardedURLObj.hostname.endsWith('.' + urlObj.hostname) ||
          urlObj.hostname.endsWith('.' + forwardedURLObj.hostname)
        );
      },
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ViMoreBot/1.0)',
        'accept-language': 'en-US,en;q=0.9',
      },
    }) as any;

    const preview = {
      url: data.url || url,
      title: String(data.title || '').slice(0, 200),
      description: String(data.description || '').slice(0, 500),
      image: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : '',
      siteName: String(data.siteName || parsedUrl.hostname.replace('www.', '')).slice(0, 100),
      favicon: data.favicons && data.favicons.length > 0 ? data.favicons[0] : '',
    };

    return NextResponse.json(preview, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Could not fetch preview', detail: err?.message }, { status: 422 });
  }
}
