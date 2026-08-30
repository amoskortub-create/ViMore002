import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { ID, Query, Permission, Role } from 'node-appwrite';

export const maxDuration = 30;

const STORES_COL = 'stores';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      owner_id,
      owner_username,
      store_name,
      logo_file_id,
      description,
      motto,
      category,
    } = body;

    if (!owner_id || !owner_username || !store_name || !description || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getAdminDatabases();

    const existing = await db
      .listDocuments(DATABASE_ID, STORES_COL, [
        Query.equal('owner_id', owner_id),
        Query.limit(1),
      ])
      .catch(() => ({ documents: [] as any[] }));

    if ((existing as any).documents.length > 0) {
      return NextResponse.json({ error: 'You already have a store.' }, { status: 409 });
    }

    const doc = await db.createDocument(
      DATABASE_ID,
      STORES_COL,
      ID.unique(),
      {
        owner_id,
        owner_username,
        store_name: store_name.trim(),
        logo_file_id: logo_file_id || null,
        description: description.trim(),
        motto: (motto || '').trim(),
        category,
        is_active: true,
        boost_until: null,
      },
      [
        Permission.read(Role.any()),
        Permission.update(Role.user(owner_id)),
        Permission.delete(Role.user(owner_id)),
      ]
    );

    return NextResponse.json({ store: doc }, { status: 201 });
  } catch (err: any) {
    console.error('create-store error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create store' },
      { status: 500 }
    );
  }
}
