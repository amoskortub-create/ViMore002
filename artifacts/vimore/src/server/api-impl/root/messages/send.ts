import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { ID } from 'node-appwrite';

export const maxDuration = 20;

const MESSAGES_COLLECTION = 'messages';
const USERS_COLLECTION = 'users';

/**
 * Send a chat message.
 *
 * Primary path: called from the browser — session cookie provides identity.
 * Push-notification quick-reply path: the service worker sends the request on
 * the same origin so the session cookie is forwarded automatically.
 *
 * The senderId is ALWAYS derived from the session; it is never trusted from
 * the request body.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`msg-send:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many messages. Slow down.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const {
      receiverId,
      clusterId,
      text,
      type = 'text',
      mediaId,
      mediaUrl,
      voiceDuration,
    } = await req.json();

    const supportedTypes = new Set(['text', 'voice']);
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasMedia = typeof mediaId === 'string' || typeof mediaUrl === 'string';
    if (
      !receiverId ||
      !clusterId ||
      !supportedTypes.has(type) ||
      (!hasText && !(type === 'voice' && hasMedia))
    ) {
      return NextResponse.json(
        { error: 'receiverId, clusterId and message content are required.' },
        { status: 400 }
      );
    }

    // Prevent messaging yourself
    if (receiverId === session.userId) {
      return NextResponse.json({ error: 'Cannot send messages to yourself.' }, { status: 400 });
    }

    const db = getAdminDatabases();

    // Look up sender's display info from DB — not from the request body
    let senderName = '';
    let senderAvatar = '';
    try {
      const sender: any = await db.getDocument(DATABASE_ID, USERS_COLLECTION, session.userId);
      senderName = sender?.name || sender?.username || '';
      senderAvatar = sender?.avatar || sender?.avatar_id || '';
    } catch { /* best-effort */ }

    const messageData: Record<string, unknown> = {
      cluster_id: clusterId,
      sender_id: session.userId,      // from session, never from body
      sender_name: senderName,        // from DB, never from body
      sender_avatar: senderAvatar,
      receiver_id: receiverId,
      type,
      is_read: false,
    };
    if (hasText) messageData.text = String(text).trim().slice(0, 5000);
    if (typeof mediaId === 'string' && mediaId) messageData.media_id = mediaId;
    if (typeof mediaUrl === 'string' && mediaUrl) messageData.media_url = mediaUrl;
    if (typeof voiceDuration === 'string' && voiceDuration) messageData.voice_duration = voiceDuration;

    const created = await db.createDocument(DATABASE_ID, MESSAGES_COLLECTION, ID.unique(), messageData as any);

    return NextResponse.json({ ok: true, messageId: created.$id, createdAt: created.$createdAt });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bad request' }, { status: 400 });
  }
}
