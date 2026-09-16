import { NextRequest, NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { getAdminStorage } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';

const VOICE_BUCKET = 'voice_messages';
const MAX_VOICE_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A voice file is required.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_VOICE_BYTES) {
      return NextResponse.json({ error: 'Voice recording is empty or too large.' }, { status: 400 });
    }

    const safeName = (file.name || `voice-${Date.now()}.webm`)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-120);
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadFile = new File([bytes], safeName, {
      type: file.type || 'application/octet-stream',
    });
    const uploaded = await getAdminStorage().createFile(VOICE_BUCKET, ID.unique(), uploadFile);

    return NextResponse.json({
      ok: true,
      fileId: uploaded.$id,
      mediaUrl: `/api/file/${VOICE_BUCKET}/${encodeURIComponent(uploaded.$id)}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Voice upload failed.' },
      { status: 500 },
    );
  }
}