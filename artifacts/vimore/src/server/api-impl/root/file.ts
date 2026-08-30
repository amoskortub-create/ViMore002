import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const APPWRITE_ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1').replace(/\/$/, '');
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
const API_KEY = process.env.APPWRITE_API_KEY || '';

// Public buckets — served with admin key so files are always accessible regardless of bucket permissions
const PUBLIC_BUCKETS = new Set([
  'post_media',
  'story_media',
  'reel_media',
  'avatars',
  'covers',
  'album_covers',
  'music_tracks',
  'sounds',
  'event_flyers',
  'Marketplace_Images',
  'store_logos',
]);

// All allowed buckets (public + private)
const ALLOWED_BUCKETS = new Set([
  ...PUBLIC_BUCKETS,
  'message_media',
  'voice_messages',
  'payment_screenshots',
]);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, X-Appwrite-Project',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bucket: string; fileId: string }> }
) {
  const { bucket, fileId } = await params;

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return new NextResponse(null, { status: 404 });
  }

  if (!fileId || typeof fileId !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(fileId)) {
    return new NextResponse(null, { status: 400 });
  }

  if (!APPWRITE_ENDPOINT || !PROJECT_ID) {
    return new NextResponse(null, { status: 503 });
  }

  const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
  const rl = rateLimit(`file-proxy:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const rangeHeader = req.headers.get('range');
    const requestedPreview = ['width', 'height', 'quality', 'output']
      .some(key => req.nextUrl.searchParams.has(key));
    const appwriteUrl = new URL(
      `${APPWRITE_ENDPOINT}/storage/buckets/${bucket}/files/${fileId}/${requestedPreview ? 'preview' : 'view'}`
    );
    appwriteUrl.searchParams.set('project', PROJECT_ID);
    for (const key of ['width', 'height', 'quality', 'output']) {
      const value = req.nextUrl.searchParams.get(key);
      if (value) appwriteUrl.searchParams.set(key, value);
    }

    const upstreamHeaders: Record<string, string> = {
      'X-Appwrite-Project': PROJECT_ID,
    };

    // For public buckets, use admin key so files are always accessible
    if (PUBLIC_BUCKETS.has(bucket) && API_KEY) {
      upstreamHeaders['X-Appwrite-Key'] = API_KEY;
    } else if (cookieHeader) {
      upstreamHeaders['Cookie'] = cookieHeader;
    }

    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const upstream = await fetch(appwriteUrl, {
      headers: upstreamHeaders,
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(null, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
    const etag = upstream.headers.get('etag');
    const lastModified = upstream.headers.get('last-modified');

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    };

    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;
    if (etag) responseHeaders['ETag'] = etag;
    if (lastModified) responseHeaders['Last-Modified'] = lastModified;

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
