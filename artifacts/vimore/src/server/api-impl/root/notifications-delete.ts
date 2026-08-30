import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.mediatechliberia.online/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'vimoreprod';
const API_KEY = process.env.APPWRITE_API_KEY || '';

export async function DELETE(req: NextRequest) {
  try {
    const { notificationId, userId } = await req.json();
    if (!notificationId || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(PROJECT_ID)
      .setKey(API_KEY);

    const db = new Databases(client);

    const doc = await db.getDocument(DATABASE_ID, 'NOTIFICATIONS', notificationId);
    if (doc.recipient_id !== userId && doc.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.deleteDocument(DATABASE_ID, 'NOTIFICATIONS', notificationId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
