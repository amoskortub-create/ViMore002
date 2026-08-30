import { NextResponse } from 'next/server';
import { getAdminDatabases, DATABASE_ID } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET() {
  const db = getAdminDatabases();

  const [tracksRes, albumsRes, playlistsRes] = await Promise.allSettled([
    db.listDocuments(DATABASE_ID, 'tracks', [
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]),
    db.listDocuments(DATABASE_ID, 'albums', [
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ]),
    db.listDocuments(DATABASE_ID, 'playlists', [
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ]),
  ]);

  const tracks =
    tracksRes.status === 'fulfilled' ? tracksRes.value.documents : [];
  const albums =
    albumsRes.status === 'fulfilled' ? albumsRes.value.documents : [];
  let playlists =
    playlistsRes.status === 'fulfilled' ? playlistsRes.value.documents : [];

  // Filter public playlists (is_private field is optional)
  playlists = playlists.filter((p: any) => !p.is_private);

  const errors: Record<string, string> = {};
  if (tracksRes.status === 'rejected')
    errors.tracks = (tracksRes.reason as any)?.message ?? 'unknown';
  if (albumsRes.status === 'rejected')
    errors.albums = (albumsRes.reason as any)?.message ?? 'unknown';
  if (playlistsRes.status === 'rejected')
    errors.playlists = (playlistsRes.reason as any)?.message ?? 'unknown';

  // Fetch album-track mapping for albums that have tracks
  const albumIds = albums.map((a: any) => a.$id);
  let albumTracks: any[] = [];
  if (albumIds.length > 0) {
    try {
      const res = await db.listDocuments(DATABASE_ID, 'tracks', [
        Query.equal('album_id', albumIds),
        Query.orderAsc('track_number'),
        Query.limit(500),
      ]);
      albumTracks = res.documents;
    } catch { /* no album_id field or no data */ }
  }

  // Fetch playlist-track join rows
  const playlistIds = playlists.map((p: any) => p.$id);
  let playlistTrackRows: any[] = [];
  let playlistTrackDocs: any[] = [];
  if (playlistIds.length > 0) {
    try {
      const ptRes = await db.listDocuments(DATABASE_ID, 'playlist_tracks', [
        Query.equal('playlist_id', playlistIds),
        Query.orderAsc('order_index'),
        Query.limit(1000),
      ]);
      playlistTrackRows = ptRes.documents;
      const trackIds = [
        ...new Set(
          ptRes.documents.map((pt: any) => pt.track_id).filter(Boolean)
        ),
      ] as string[];
      if (trackIds.length > 0) {
        const tRes = await db.listDocuments(DATABASE_ID, 'tracks', [
          Query.equal('$id', trackIds),
          Query.limit(500),
        ]);
        playlistTrackDocs = tRes.documents;
      }
    } catch { /* playlist_tracks may not exist */ }
  }

  return NextResponse.json({
    tracks,
    albums,
    playlists,
    albumTracks,
    playlistTrackRows,
    playlistTrackDocs,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  });
}
