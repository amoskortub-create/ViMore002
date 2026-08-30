import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { ID } from 'node-appwrite';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const COL_POSTS = 'posts';
const COL_USERS = 'users';
const COL_SOUNDS = 'sounds';

export async function POST(req: NextRequest) {
  try {
    // Auth guard — derive identity from session, never trust body
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      videoFileId,
      coverFileId,
      userId,
      username,
      caption,
      totalDuration,
      effect,
      selectedSound,
    } = body;

    if (!videoFileId || !userId) {
      return NextResponse.json({ error: 'Missing videoFileId or userId' }, { status: 400 });
    }

    const adminDb = getAdminDatabases();

    /* ── Round duration to integer to match Appwrite Integer attribute ── */
    const durationInt = totalDuration ? Math.round(totalDuration) : 0;

    /* ── Resolve sound ── */
    let resolvedSoundId: string | null = null;
    let resolvedSoundTitle: string | null = null;
    let resolvedSoundArtist: string | null = null;
    let resolvedSoundStartTime = 0;

    if (selectedSound?.id) {
      /* User picked an existing sound — use it and increment its use_count */
      resolvedSoundId = selectedSound.id;
      resolvedSoundTitle = selectedSound.title || 'Sound';
      resolvedSoundArtist = selectedSound.artist || username || 'Creator';
      resolvedSoundStartTime = selectedSound.startTime || 0;
      try {
        const soundDoc = await adminDb.getDocument(DATABASE_ID, COL_SOUNDS, selectedSound.id);
        await adminDb.updateDocument(DATABASE_ID, COL_SOUNDS, selectedSound.id, {
          use_count: (Number(soundDoc.use_count) || 0) + 1,
        });
      } catch { /* non-critical */ }
    } else {
      /* No sound selected — auto-create a sound entry using the reel's own audio.
         We use the reel_media: prefix convention so the SoundPicker knows which
         Appwrite bucket to stream from. */
      try {
        const autoTitle = (caption || '').trim().split(' ').slice(0, 4).join(' ') || 'Original Sound';
        const soundDoc = await adminDb.createDocument(DATABASE_ID, COL_SOUNDS, ID.unique(), {
          title: autoTitle.slice(0, 80),
          artist: username || 'Creator',
          file_id: `reel_media:${videoFileId}`,
          duration: durationInt || 30,
          use_count: 1,
          is_active: true,
        });
        resolvedSoundId = soundDoc.$id;
        resolvedSoundTitle = autoTitle;
        resolvedSoundArtist = username || 'Creator';
      } catch { /* non-critical — don't block upload if sounds collection is missing */ }
    }

    /* ── Build post document ── */
    const docData: Record<string, unknown> = {
      user_id: userId,
      content: (caption || '').trim(),
      type: 'reel',
      media_url: videoFileId,
      likes_count: 0,
      unlikes_count: 0,
      comments_count: 0,
      shares_count: 0,
      views_count: 0,
    };

    if (coverFileId) docData.reel_cover_file_id = coverFileId;
    if (durationInt > 0) docData.duration = durationInt;
    if (effect && effect !== 'none') docData.effects_applied = [effect];
    if (resolvedSoundId) {
      docData.sound_id = resolvedSoundId;
      docData.sound_title = resolvedSoundTitle;
      docData.sound_artist = resolvedSoundArtist;
      docData.sound_start_time = resolvedSoundStartTime;
    }

    await adminDb.createDocument(DATABASE_ID, COL_POSTS, ID.unique(), docData);

    /* ── Increment posts_count on user (non-critical) ── */
    try {
      const userDoc = await adminDb.getDocument(DATABASE_ID, COL_USERS, userId);
      const currentCount = Number(userDoc.posts_count || 0);
      await adminDb.updateDocument(DATABASE_ID, COL_USERS, userId, {
        posts_count: currentCount + 1,
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    console.error('[/api/upload/reel]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
