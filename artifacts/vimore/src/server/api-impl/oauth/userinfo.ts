import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, getUserProfile } from '@/lib/oauth-server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401, headers: CORS });
  }

  const session = await verifyAccessToken(token);
  if (!session) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401, headers: CORS });
  }

  const profile = await getUserProfile(session.user_id) as any;
  const scopes = session.scopes.split(' ');

  const response: Record<string, any> = { sub: session.user_id };

  if (scopes.includes('profile')) {
    response.name = profile?.name || profile?.displayName || null;
    response.username = profile?.vimoreId || null;
    response.picture = profile?.avatar_id
      ? `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1'}/storage/buckets/avatars/files/${profile.avatar_id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123'}`
      : null;
    response.verified = profile?.is_verified || false;
  }

  if (scopes.includes('email')) {
    response.email = profile?.email || null;
  }

  return NextResponse.json(response, { headers: CORS });
}
