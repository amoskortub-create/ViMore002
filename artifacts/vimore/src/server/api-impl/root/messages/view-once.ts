import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { Query } from 'node-appwrite';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { messageId, chatId, isGroup } = await req.json().catch(() => ({}));
    if (!messageId || !chatId) {
      return NextResponse.json({ error: 'messageId and chatId are required.' }, { status: 400 });
    }

    const collection = isGroup ? 'group_messages' : 'messages';
    const db = getAdminDatabases();
    const message: any = await db.getDocument(DATABASE_ID, collection, messageId);

    if (message.sender_id === session.userId) {
      return NextResponse.json({ error: 'Only the recipient can view this message.' }, { status: 403 });
    }

    if (isGroup) {
      const membership = await db.listDocuments(DATABASE_ID, 'cluster_members', [
        Query.equal('cluster_id', chatId),
        Query.equal('user_id', session.userId),
        Query.limit(1),
      ]);
      if (membership.total < 1 || message.cluster_id !== chatId) {
        return NextResponse.json({ error: 'Not a member of this chat.' }, { status: 403 });
      }
    } else if (message.receiver_id !== session.userId || message.cluster_id !== chatId) {
      return NextResponse.json({ error: 'Not a recipient of this message.' }, { status: 403 });
    }

    await db.updateDocument(DATABASE_ID, collection, messageId, {
      is_viewed: true,
      is_read: true,
      media_id: '',
      media_url: '',
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Could not mark message as viewed.' }, { status: 400 });
  }
}