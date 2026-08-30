import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';
import { ID } from 'node-appwrite';

// cluster_id format: mkt_{sellerId}_{buyerId}
function parseClusterId(clusterId: string): { sellerId: string; buyerId: string } | null {
  if (!clusterId.startsWith('mkt_')) return null;
  const parts = clusterId.slice(4).split('_');
  if (parts.length < 2) return null;
  const buyerStart = parts.findIndex((_, i) => i > 0 && (parts.slice(i).join('_').startsWith('guest_') || i === parts.length - 1));
  if (buyerStart < 1) return null;
  const sellerId = parts.slice(0, buyerStart).join('_');
  const buyerId = parts.slice(buyerStart).join('_');
  return { sellerId, buyerId };
}

export async function POST(req: NextRequest) {
  try {
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`mkt-msg:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many messages. Slow down.' }, { status: 429 });
    }

    // Caller identity from session — never trust the body for senderId
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in to send messages.' }, { status: 401 });
    }

    const body = await req.json();
    const { clusterId, sellerId, text, type = 'text', mediaUrl, mediaId, voiceDuration } = body;

    if (!clusterId || !sellerId) {
      return NextResponse.json({ error: 'clusterId and sellerId are required.' }, { status: 400 });
    }
    if (!text && !mediaUrl) {
      return NextResponse.json({ error: 'Message has no content.' }, { status: 400 });
    }

    // IDOR protection: verify caller is actually a participant in this cluster
    const parsed = parseClusterId(clusterId);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid clusterId format.' }, { status: 400 });
    }

    const isParticipant =
      session.userId === parsed.sellerId || session.userId === parsed.buyerId;
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied: you are not a participant in this conversation.' },
        { status: 403 }
      );
    }

    const db = getAdminDatabases();

    // Look up sender's real display info from DB
    let senderName = '';
    let senderAvatar = '';
    try {
      const senderDoc: any = await db.getDocument(DATABASE_ID, 'users', session.userId);
      senderName = senderDoc?.name || senderDoc?.username || '';
      senderAvatar = senderDoc?.avatar || senderDoc?.avatar_id || '';
    } catch { /* best-effort */ }

    const docData: Record<string, unknown> = {
      cluster_id: clusterId,
      sender_id: session.userId,       // from session, not body
      sender_name: senderName,         // from DB, not body
      receiver_id: sellerId,
      type: ['text', 'photo', 'voice', 'file'].includes(type) ? type : 'text',
      is_read: false,
    };
    if (text) docData.text = String(text).slice(0, 5000);
    if (mediaUrl) docData.media_url = mediaUrl;
    if (mediaId) docData.media_id = mediaId;
    if (voiceDuration) docData.voice_duration = voiceDuration;

    const doc = await db.createDocument(DATABASE_ID, 'messages', ID.unique(), docData);
    return NextResponse.json({ message: doc }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send message';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
