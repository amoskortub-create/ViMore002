import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

const ALLOWED_ROLES = new Set(['SUPER', 'MODERATOR']);

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rl = rateLimit(`payment:reject:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    const db = getAdminDatabases();

    let reqDoc: any;
    try {
      reqDoc = await db.getDocument(DATABASE_ID, 'payment_requests', requestId);
    } catch {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    if (reqDoc.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot reject a request with status: ${reqDoc.status}` },
        { status: 409 }
      );
    }

    await db.updateDocument(DATABASE_ID, 'payment_requests', requestId, {
      status: 'REJECTED',
      rejected_by: session.userId,
      rejected_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Rejection failed' }, { status: 500 });
  }
}
