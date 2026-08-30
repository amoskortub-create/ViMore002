import { NextRequest, NextResponse } from 'next/server';
import { exchangeAuthCode } from '@/lib/oauth-server';

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
    let body: Record<string, string> = {};

    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      text.split('&').forEach((pair) => {
        const [k, v] = pair.split('=').map(decodeURIComponent);
        if (k) body[k] = v ?? '';
      });
    } else {
      body = await req.json();
    }

    const { grant_type, code, redirect_uri, client_id, client_secret } = body;

    if (grant_type !== 'authorization_code') {
      return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400, headers: CORS });
    }
    if (!code || !redirect_uri || !client_id || !client_secret) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: CORS });
    }

    const result = await exchangeAuthCode(code, client_id, redirect_uri, client_secret);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: CORS });
    }

    return NextResponse.json(
      {
        access_token: result.token,
        token_type: 'Bearer',
        expires_in: 30 * 24 * 60 * 60,
        scope: result.scopes,
      },
      { headers: CORS }
    );
  } catch (err: any) {
    return NextResponse.json({ error: 'server_error' }, { status: 500, headers: CORS });
  }
}
