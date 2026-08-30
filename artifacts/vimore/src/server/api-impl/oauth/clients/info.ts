import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/oauth-server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const client_id = req.nextUrl.searchParams.get('client_id');
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400, headers: CORS });

  const client = await getOAuthClient(client_id);
  if (!client) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: CORS });

  return NextResponse.json({
    name: client.name,
    logo_url: client.logo_url || '',
    website_url: client.website_url || '',
    redirect_uris: client.redirect_uris,
  }, { headers: CORS });
}
