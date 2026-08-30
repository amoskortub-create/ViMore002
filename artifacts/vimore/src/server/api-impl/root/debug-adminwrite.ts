import 'server-only';
import { NextResponse } from 'next/server';

// Stub — this endpoint was referenced but never implemented.
export async function POST() {
  return NextResponse.json({ error: 'Not available' }, { status: 404 });
}
