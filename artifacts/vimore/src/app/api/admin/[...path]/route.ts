import { NextRequest, NextResponse } from 'next/server';

import * as ActiveUsers from '@/server/api-impl/admin/active-users';
import * as Ban from '@/server/api-impl/admin/ban';
import * as Check from '@/server/api-impl/admin/check';
import * as Login from '@/server/api-impl/admin/login';
import * as ProductsDelete from '@/server/api-impl/admin/products/delete';
import * as Suspend from '@/server/api-impl/admin/suspend';
import * as UsersWarn from '@/server/api-impl/admin/users/warn';
import * as Verifications from '@/server/api-impl/admin/verifications';
import * as VerifyApprove from '@/server/api-impl/admin/verify-approve';
import * as VerifyReject from '@/server/api-impl/admin/verify-reject';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Handler = Partial<Record<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS', (req: NextRequest) => Promise<Response> | Response>>;

const ROUTES: Record<string, Handler> = {
  'active-users': ActiveUsers,
  'ban': Ban,
  'check': Check,
  'login': Login,
  'products/delete': ProductsDelete,
  'suspend': Suspend,
  'users/warn': UsersWarn,
  'verifications': Verifications,
  'verify-approve': VerifyApprove,
  'verify-reject': VerifyReject,
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
