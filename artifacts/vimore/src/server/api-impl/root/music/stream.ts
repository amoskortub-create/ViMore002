import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const ipRl = rateLimit(`music-stream:${ip}`, 60, 60_000);
    if (!ipRl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const { songId } = await req.json();
    if (!songId || typeof songId !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(songId)) {
      return NextResponse.json({ error: 'Invalid songId' }, { status: 400 });
    }

    const songRl = rateLimit(`music-stream-song:${songId}:${ip}`, 3, 300_000);
    if (!songRl.allowed) {
      return NextResponse.json({ ok: true, streams: null, reason: 'already_counted' });
    }

    const db = getAdminDatabases();
    const doc = await db.getDocument(DATABASE_ID, 'tracks', songId);
    const newCount = (doc.plays_count || doc.streams_count || 0) + 1;
    await db.updateDocument(DATABASE_ID, 'tracks', songId, {
      plays_count: newCount,
    });

    return NextResponse.json({ ok: true, streams: newCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
