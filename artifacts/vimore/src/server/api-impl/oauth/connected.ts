import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { OAUTH_COL } from '@/lib/oauth-server';

// GET /api/oauth/connected?user_id=xxx
// Returns all active connected apps for a user.
// Fetches all tokens and filters client-side — no index required.
export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const db = getAdminDatabases();

  try {
    // Fetch all access tokens and filter client-side
    const tokensRes = await db.listDocuments(DATABASE_ID, OAUTH_COL.ACCESS_TOKENS, []);
    const now = new Date();

    const activeTokens = tokensRes.documents.filter(
      (d: any) =>
        d.user_id === user_id &&
        !d.revoked &&
        new Date(d.expires_at) > now,
    );

    // Deduplicate client IDs
    const clientIds: string[] = [...new Set(activeTokens.map((d: any) => d.client_id as string))];

    // Direct getDocument() per client — $id === client_id, no query needed
    const clients: Record<string, any> = {};
    await Promise.all(
      clientIds.map(async (cid) => {
        try {
          clients[cid] = await db.getDocument(DATABASE_ID, OAUTH_COL.CLIENTS, cid);
        } catch {}
      }),
    );

    const grouped = clientIds.map((cid) => {
      const tokens = activeTokens.filter((d: any) => d.client_id === cid);
      const latestToken = tokens[0];
      const client = clients[cid] || {};
      return {
        client_id:  cid,
        name:       client.name || cid,
        logo_url:   client.logo_url || '',
        website_url: client.website_url || '',
        scopes:     latestToken?.scopes || 'profile',
        granted_at: latestToken?.$createdAt || '',
        token_ids:  tokens.map((t: any) => t.$id),
      };
    });

    return NextResponse.json({ connected: grouped });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/oauth/connected
// Revokes all tokens a user has granted to a specific app.
// Fetches all tokens and filters client-side — no index required.
export async function DELETE(req: NextRequest) {
  const db = getAdminDatabases();
  try {
    const { client_id, user_id } = await req.json();
    if (!client_id || !user_id) {
      return NextResponse.json({ error: 'client_id and user_id required' }, { status: 400 });
    }

    // Fetch all tokens and filter client-side
    const tokensRes = await db.listDocuments(DATABASE_ID, OAUTH_COL.ACCESS_TOKENS, []);
    const toRevoke = tokensRes.documents.filter(
      (d: any) => d.client_id === client_id && d.user_id === user_id,
    );

    // $id === token — direct update per token, no query needed
    await Promise.all(
      toRevoke.map((d: any) =>
        db.updateDocument(DATABASE_ID, OAUTH_COL.ACCESS_TOKENS, d.$id, { revoked: true }),
      ),
    );

    return NextResponse.json({ ok: true, revoked: toRevoke.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
