import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { getSessionUser } from '@/lib/session';
import { ID } from 'node-appwrite';
import { Query } from 'node-appwrite';

export const maxDuration = 20;

const COL_REACTIONS = 'post_reactions';
const COL_POSTS = 'posts';

/**
 * POST /api/post/reaction
 * Body: { postId, action: "like"|"unlike"|"remove-like"|"remove-unlike" }
 * Returns: { ok: true, likesCount: number, unlikesCount: number }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { postId, action } = await req.json();
    if (!postId || !action) {
      return NextResponse.json({ error: 'postId and action are required.' }, { status: 400 });
    }

    const db = getAdminDatabases();

    // Get current post state
    const postDoc = await db.getDocument(DATABASE_ID, COL_POSTS, postId);
    let likesCount: number = postDoc.likes_count || 0;
    let unlikesCount: number = postDoc.unlikes_count || 0;

    if (action === 'like') {
      // Remove any existing UNLIKE first
      const existingUnlikes = await db.listDocuments(DATABASE_ID, COL_REACTIONS, [
        Query.equal('post_id', postId),
        Query.equal('user_id', session.userId),
        Query.equal('reaction_type', 'UNLIKE'),
      ]);
      for (const doc of existingUnlikes.documents) {
        await db.deleteDocument(DATABASE_ID, COL_REACTIONS, doc.$id);
      }
      if (existingUnlikes.total > 0) {
        unlikesCount = Math.max(0, unlikesCount - existingUnlikes.total);
      }

      // Check if already liked (avoid duplicates)
      const existingLikes = await db.listDocuments(DATABASE_ID, COL_REACTIONS, [
        Query.equal('post_id', postId),
        Query.equal('user_id', session.userId),
        Query.equal('reaction_type', 'LIKE'),
      ]);
      if (existingLikes.total === 0) {
        await db.createDocument(DATABASE_ID, COL_REACTIONS, ID.unique(), {
          post_id: postId,
          user_id: session.userId,
          reaction_type: 'LIKE',
        });
        likesCount = likesCount + 1;
      }
    } else if (action === 'remove-like') {
      const existing = await db.listDocuments(DATABASE_ID, COL_REACTIONS, [
        Query.equal('post_id', postId),
        Query.equal('user_id', session.userId),
        Query.equal('reaction_type', 'LIKE'),
      ]);
      for (const doc of existing.documents) {
        await db.deleteDocument(DATABASE_ID, COL_REACTIONS, doc.$id);
      }
      likesCount = Math.max(0, likesCount - existing.total);
    } else if (action === 'unlike') {
      // Remove any existing LIKE first
      const existingLikes = await db.listDocuments(DATABASE_ID, COL_REACTIONS, [
        Query.equal('post_id', postId),
        Query.equal('user_id', session.userId),
        Query.equal('reaction_type', 'LIKE'),
      ]);
      for (const doc of existingLikes.documents) {
        await db.deleteDocument(DATABASE_ID, COL_REACTIONS, doc.$id);
      }
      if (existingLikes.total > 0) {
        likesCount = Math.max(0, likesCount - existingLikes.total);
      }

      const existingUnlikes = await db.listDocuments(DATABASE_ID, COL_REACTIONS, [
        Query.equal('post_id', postId),
        Query.equal('user_id', session.userId),
        Query.equal('reaction_type', 'UNLIKE'),
      ]);
      if (existingUnlikes.total === 0) {
        await db.createDocument(DATABASE_ID, COL_REACTIONS, ID.unique(), {
          post_id: postId,
          user_id: session.userId,
          reaction_type: 'UNLIKE',
        });
        unlikesCount = unlikesCount + 1;
      }
    } else if (action === 'remove-unlike') {
      const existing = await db.listDocuments(DATABASE_ID, COL_REACTIONS, [
        Query.equal('post_id', postId),
        Query.equal('user_id', session.userId),
        Query.equal('reaction_type', 'UNLIKE'),
      ]);
      for (const doc of existing.documents) {
        await db.deleteDocument(DATABASE_ID, COL_REACTIONS, doc.$id);
      }
      unlikesCount = Math.max(0, unlikesCount - existing.total);
    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    // Persist updated counts
    await db.updateDocument(DATABASE_ID, COL_POSTS, postId, {
      likes_count: likesCount,
      unlikes_count: unlikesCount,
    });

    return NextResponse.json({ ok: true, likesCount, unlikesCount });
  } catch (err: any) {
    console.error('[post/reaction]', err);
    return NextResponse.json({ error: err?.message || 'Reaction failed' }, { status: 500 });
  }
}
