import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';

const NOTIFICATIONS_COLLECTION = 'notifications';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { notificationId } = await req.json().catch(() => ({}));
    if (!notificationId || typeof notificationId !== 'string') {
      return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });
    }

    const db = getAdminDatabases();
    const doc: any = await db.getDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, notificationId);
    if (doc.recipient_id !== session.userId && doc.user_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.deleteDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, notificationId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
