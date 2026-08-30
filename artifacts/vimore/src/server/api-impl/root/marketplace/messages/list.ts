import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { Query } from 'node-appwrite';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clusterId = searchParams.get('clusterId');

  if (!clusterId) {
    return NextResponse.json({ error: 'Missing clusterId' }, { status: 400 });
  }

  const parsed = parseClusterId(clusterId);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid clusterId format' }, { status: 400 });
  }

  // IDOR protection: caller must be one of the two participants
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { sellerId, buyerId } = parsed;
  const isParticipant = session.userId === sellerId || session.userId === buyerId;
  if (!isParticipant) {
    return NextResponse.json(
      { error: 'Access denied: you are not a participant in this conversation.' },
      { status: 403 }
    );
  }

  try {
    const db = getAdminDatabases();

    const [buyerToSeller, sellerToBuyer] = await Promise.all([
      db.listDocuments(DATABASE_ID, 'messages', [
        Query.equal('sender_id', buyerId),
        Query.equal('receiver_id', sellerId),
        Query.orderDesc('$createdAt'),
        Query.limit(150),
      ]),
      db.listDocuments(DATABASE_ID, 'messages', [
        Query.equal('sender_id', sellerId),
        Query.equal('receiver_id', buyerId),
        Query.orderDesc('$createdAt'),
        Query.limit(150),
      ]),
    ]);

    const all = [
      ...buyerToSeller.documents,
      ...sellerToBuyer.documents,
    ]
      .filter(doc => doc.cluster_id === clusterId)
      .sort((a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());

    return NextResponse.json({ messages: all });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch messages';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clusterId = searchParams.get('clusterId');
  if (!clusterId) return NextResponse.json({ error: 'Missing clusterId' }, { status: 400 });

  const parsed = parseClusterId(clusterId);
  if (!parsed) return NextResponse.json({ error: 'Invalid clusterId format' }, { status: 400 });

  // Only participants can mark messages read
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { sellerId, buyerId } = parsed;
  if (session.userId !== sellerId && session.userId !== buyerId) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  try {
    const db = getAdminDatabases();
    const result = await db.listDocuments(DATABASE_ID, 'messages', [
      Query.equal('sender_id', buyerId),
      Query.equal('receiver_id', sellerId),
      Query.equal('is_read', false),
      Query.limit(100),
    ]);
    const mktMsgs = result.documents.filter(doc => doc.cluster_id === clusterId);
    await Promise.all(
      mktMsgs.map(doc => db.updateDocument(DATABASE_ID, 'messages', doc.$id, { is_read: true }))
    );
    return NextResponse.json({ updated: mktMsgs.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark read';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
