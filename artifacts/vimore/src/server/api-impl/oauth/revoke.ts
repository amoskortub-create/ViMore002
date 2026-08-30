import { NextRequest, NextResponse } from 'next/server';
import { revokeAccessToken } from '@/lib/oauth-server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token;
    if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400, headers: CORS });
    await revokeAccessToken(token);
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500, headers: CORS });
  }
}
