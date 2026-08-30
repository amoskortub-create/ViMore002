import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit, sanitizeIp } from '@/lib/rate-limit';
import { Query } from 'node-appwrite';

const AI_CONVERSATIONS = 'AI_CONVERSATIONS';
const AI_MESSAGES = 'AI_MESSAGES';

export async function DELETE(req: NextRequest) {
  try {
    const ip = sanitizeIp(req.headers.get('x-forwarded-for')?.split(',')[0].trim());
    const rl = rateLimit(`intelligent-delete:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await req.json();
    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    const db = getAdminDatabases();

    const conv = await db.getDocument(DATABASE_ID, AI_CONVERSATIONS, conversationId);
    if (conv.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let cursor: string | null = null;
    while (true) {
      const q: string[] = [
        Query.equal('conversation_id', conversationId),
        Query.limit(100),
      ];
      if (cursor) q.push(Query.cursorAfter(cursor));
      const msgs = await db.listDocuments(DATABASE_ID, AI_MESSAGES, q);
      for (const msg of msgs.documents) {
        await db.deleteDocument(DATABASE_ID, AI_MESSAGES, msg.$id);
      }
      if (msgs.documents.length < 100) break;
      cursor = msgs.documents[msgs.documents.length - 1].$id;
    }

    await db.deleteDocument(DATABASE_ID, AI_CONVERSATIONS, conversationId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
