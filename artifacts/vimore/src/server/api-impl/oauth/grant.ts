import { NextRequest, NextResponse } from 'next/server';
import { createAuthCode, getOAuthClient } from '@/lib/oauth-server';

export async function POST(req: NextRequest) {
  try {
    const { client_id, redirect_uri, scope, state, user_id } = await req.json();

    if (!client_id || !redirect_uri || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await getOAuthClient(client_id);
    if (!client) return NextResponse.json({ error: 'Invalid client' }, { status: 400 });

    const uris: string[] = Array.isArray(client.redirect_uris) ? client.redirect_uris : [];
    if (!uris.includes(redirect_uri)) {
      return NextResponse.json({ error: 'redirect_uri mismatch' }, { status: 400 });
    }

    const code = await createAuthCode({ client_id, user_id, scopes: scope || 'profile', redirect_uri });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return NextResponse.json({ redirect: redirectUrl.toString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
