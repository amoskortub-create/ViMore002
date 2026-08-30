import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { Query } from 'node-appwrite';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get('sellerId');

  if (!sellerId) {
    return NextResponse.json({ error: 'Missing sellerId' }, { status: 400 });
  }

  // IDOR protection: only the seller can list their own conversations
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (session.userId !== sellerId) {
    return NextResponse.json(
      { error: 'Access denied: you can only view your own conversations.' },
      { status: 403 }
    );
  }

  try {
    const db = getAdminDatabases();

    const result = await db.listDocuments(DATABASE_ID, 'messages', [
      Query.equal('receiver_id', sellerId),
      Query.orderDesc('$createdAt'),
      Query.limit(500),
    ]);

    const mktPrefix = `mkt_${sellerId}_`;
    const convMap = new Map<string, Record<string, unknown>>();
    for (const doc of result.documents) {
      const cid = String(doc.cluster_id || '');
      if (!cid.startsWith(mktPrefix)) continue;
      if (!convMap.has(cid)) {
        convMap.set(cid, doc as unknown as Record<string, unknown>);
      }
    }

    const conversations = Array.from(convMap.entries()).map(([cid, doc]) => {
      const buyerId = cid.slice(mktPrefix.length);
      return {
        clusterId: cid,
        buyerId,
        senderName: String(doc.sender_name || 'Buyer'),
        lastMessage: String(
          doc.text ||
          (doc.type === 'photo' ? '📷 Photo' : doc.type === 'voice' ? '🎙️ Voice message' : '📎 Media')
        ),
        lastTime: String(doc.$createdAt || ''),
        isRead: Boolean(doc.is_read),
        type: String(doc.type || 'text'),
      };
    });

    return NextResponse.json({ conversations });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch conversations';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
