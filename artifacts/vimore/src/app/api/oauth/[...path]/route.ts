import { NextRequest, NextResponse } from 'next/server';

import * as ClientsInfo from '@/server/api-impl/oauth/clients/info';
import * as Clients from '@/server/api-impl/oauth/clients';
import * as Connected from '@/server/api-impl/oauth/connected';
import * as Grant from '@/server/api-impl/oauth/grant';
import * as Revoke from '@/server/api-impl/oauth/revoke';
import * as Token from '@/server/api-impl/oauth/token';
import * as UserInfo from '@/server/api-impl/oauth/userinfo';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

type Handler = Partial<Record<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS', (req: NextRequest) => Promise<Response> | Response>>;

const ROUTES: Record<string, Handler> = {
  'clients/info': ClientsInfo,
  'clients': Clients,
  'connected': Connected,
  'grant': Grant,
  'revoke': Revoke,
  'token': Token,
  'userinfo': UserInfo,
};

async function dispatch(req: NextRequest, method: string, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = (path || []).join('/');
  const mod = ROUTES[key];
  const fn = mod?.[method as keyof Handler];
  if (!fn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return fn(req);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'GET', ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'POST', ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'PUT', ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'DELETE', ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return dispatch(req, 'PATCH', ctx);
}
