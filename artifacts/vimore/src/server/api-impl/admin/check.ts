import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

export const maxDuration = 15;

const ADMIN_ROLES = new Set(['SUPER', 'FINANCIAL', 'MODERATOR']);

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ authorized: false, role: null }, { status: 401 });
    }
    const authorized = ADMIN_ROLES.has(session.role ?? '');
    return NextResponse.json({ authorized, role: session.role ?? 'USER' });
  } catch {
    return NextResponse.json({ authorized: false, role: null }, { status: 500 });
  }
}
