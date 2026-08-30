'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { usePosts } from './PostContext';
import { databases, ID, Query, Permission, Role, BUCKET, DATABASE_ID, COL, getFileUrl, extractFileId } from '@/lib/appwrite';
import { saveCache, loadCache, pinMediaInSW, OFFLINE_KEYS } from '@/lib/offline-cache';


export interface Track {
  id: string | number;
  title: string;
  artist: string;
  artistUsername?: string;
  artistFollowers?: string | number;
  artistId?: string;
  artistIsVerified?: boolean;
  cover: string;
  audioUrl?: string;
  duration: number;
  streams?: string;
  likes?: number;
  unlikes?: number;
  isBoosted?: boolean;
  boostExpiry?: number;
  boostCurrentViews?: number;
  boostTargetViews?: number;
  comments?: number;
  isLocked?: boolean;
  unlockPrice?: number;
}

export interface Album {
  id: string | number;
  title: string;
  artist: string;
  artistUsername?: string;
  artistId?: string;
  artistIsVerified?: boolean;
  cover: string;
  year: string;
  tracks: number;
  totalStreams: string;
  songs: Track[];
  isLocked?: boolean;
  unlockPrice?: number;
}

export interface Playlist {
  id: string | number;
  title: string;
  creator: string;
  creatorId?: string;
  cover: string;
  totalStreams: string;
  songs: Track[];
  description?: string;
  isPrivate?: boolean;
}

export interface MusicReaction {
  id: number;
  emoji: string;
  x: number;
}

interface MusicContextType {
  currentTrack: Track | null;
  queue: Track[];
  globalSongs: Track[];
  globalAlbums: Album[];
  globalPlaylists: Playlist[];
  forYouSongs: Track[];
  isPlaying: boolean;
  isExpanded: boolean;
  selectedAlbum: Album | null;
  selectedPlaylist: Playlist | null;
  progress: number;
  volume: number;
  reactions: MusicReaction[];
  likedSongIds: Set<string | number>;
  unlikedSongIds: Set<string | number>;
  downloadedSongIds: Set<string | number>;
  likedCollectionIds: Set<string | number>;
  likedTracks: Track[];
  userPlaylists: Playlist[];
  userSongs: Track[];
  userAlbums: Album[];
  isCreatePlaylistOpen: boolean;
  trackForNewPlaylist: Track | null;
  trackStats: Record<string | number, { likes: number; unlikes: number }>;
  isAdPortalOpen: boolean;
  adDuration: number;
  adUrl: string;
  triggerDownloadWithAd: (type: 'single' | 'album' | 'reel', task: () => Promise<void>) => void;
  onAdComplete: () => void;
  isMusicAdActive: boolean;
  currentMusicAd: any | null;
  closeMusicAd: () => void;
  isCaptureStudioOpen: boolean;
  captureTrack: Track | null;
  openCaptureStudio: (track?: Track) => void;
  closeCaptureStudio: () => void;
  setCaptureTrack: (track: Track | null) => void;
  setTrack: (track: Track) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setIsExpanded: (expanded: boolean) => void;
  setSelectedAlbum: (album: Album | null) => void;
  setSelectedPlaylist: (playlist: Playlist | null) => void;
  setProgress: (progress: number) => void;
  setVolume: (volume: number) => void;
  addReaction: (emoji: string) => void;
  clearPlayer: () => void;
  toggleLike: (track: Track) => void;
  toggleUnlike: (track: Track) => void;
  toggleCollectionLike: (id: string | number) => void;
  simulateDownload: (track: Track) => Promise<void>;
  isTrackLiked: (trackId: string | number) => boolean;
  isTrackUnliked: (trackId: string | number) => boolean;
  isTrackDownloaded: (trackId: string | number) => boolean;
  isCollectionLiked: (id: string | number) => boolean;
  playCollection: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  publishTrack: (track: any) => Promise<void>;
  publishAlbum: (album: Album) => Promise<void>;
  deleteUserTrack: (trackId: string | number) => void;
  deleteUserAlbum: (albumId: string | number) => void;
  openCreatePlaylist: (firstTrack?: Track) => void;
  closeCreatePlaylist: () => void;
  confirmCreatePlaylist: (data: { title: string; description: string; isPrivate: boolean; cover?: string }) => Promise<void>;
  addTrackToPlaylist: (playlistId: string | number, track: Track) => void;
  triggerHaptic: (intensity?: number) => void;
  refreshMusicVault: () => Promise<void>;
  recordSongStream: (songId: string | number) => Promise<void>;
  unlockedMusicIds: Set<string | number>;
  unlockMusic: (id: string | number, price: number, artistId: string, isVerified: boolean) => Promise<void>;
  isMusicUnlocked: (id: string | number) => boolean;
  audioDuration: number;
  isMusicLoading: boolean;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

function mapDocToTrack(doc: any): Track {
  return {
    id: doc.$id,
    title: doc.title || 'Untitled',
    artist: doc.artist || doc.artist_name || 'Unknown Artist',
    artistUsername: doc.artist_username || '',
    artistId: doc.user_id || '',
    cover: doc.cover_id ? getFileUrl(BUCKET.ALBUM_COVERS, doc.cover_id) : `https://picsum.photos/seed/${doc.$id}/300/300`,
    audioUrl: doc.file_id ? getFileUrl(BUCKET.MUSIC_TRACKS, doc.file_id) : (doc.audio_id ? getFileUrl(BUCKET.MUSIC_TRACKS, doc.audio_id) : undefined),
    duration: doc.duration || 0,
    streams: String(doc.plays_count || doc.streams_count || 0),
    likes: doc.likes_count || 0,
    comments: doc.comments_count || 0,
    isBoosted: doc.is_boosted || false,
    boostExpiry: doc.boost_expiry || undefined,
    isLocked: doc.is_locked || false,
    unlockPrice: doc.unlock_price || 0,
  };
}

function mapDocToAlbum(doc: any, songs: Track[]): Album {
  return {
    id: doc.$id,
    title: doc.title || 'Untitled Album',
    artist: doc.artist || doc.artist_name || 'Unknown Artist',
    artistUsername: doc.artist_username || '',
    artistId: doc.user_id || '',
    cover: doc.cover_id ? getFileUrl(BUCKET.ALBUM_COVERS, doc.cover_id) : `https://picsum.photos/seed/${doc.$id}/300/300`,
    year: doc.release_date ? new Date(doc.release_date).getFullYear().toString() : new Date().getFullYear().toString(),
    tracks: doc.tracks_count || songs.length,
    totalStreams: '0',
    songs,
    isLocked: doc.is_locked || false,
    unlockPrice: doc.unlock_price || 0,
  };
}

function mapDocToPlaylist(doc: any, songs: Track[]): Playlist {
  return {
    id: doc.$id,
    title: doc.title || 'Untitled Playlist',
    creator: doc.creator_username || '',
    creatorId: doc.creator_id || '',
    cover: doc.cover_id ? getFileUrl(BUCKET.ALBUM_COVERS, doc.cover_id) : `https://picsum.photos/seed/${doc.$id}/300/300`,
    totalStreams: '0',
    songs,
    description: doc.description || '',
    isPrivate: doc.is_private || false,
  };
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const { currentUser, campaigns } = usePosts();

  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null);
  const [globalSongs, setGlobalSongsState] = useState<Track[]>([]);
  const [globalAlbums, setGlobalAlbumsState] = useState<Album[]>([]);
  const [globalPlaylists, setGlobalPlaylistsState] = useState<Playlist[]>([]);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [isPlaying, setIsPlayingState] = useState(false);
  const [isExpanded, setIsExpandedState] = useState(false);
  const [selectedAlbum, setSelectedAlbumState] = useState<Album | null>(null);
  const [selectedPlaylist, setSelectedPlaylistState] = useState<Playlist | null>(null);
  const [progress, setProgressState] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [reactions, setReactionsState] = useState<MusicReaction[]>([]);
  const [isAdPortalOpen, setIsAdPortalOpenState] = useState(false);
  const [pendingDownloadTask, setPendingDownloadTask] = useState<(() => Promise<void>) | null>(null);
  const [isMusicAdActive, setIsMusicAdActiveState] = useState(false);
  const [currentMusicAd, setCurrentMusicAdState] = useState<any | null>(null);
  const songsPlayedCountRef = useRef(0);
  const musicAdIndexRef = useRef(0);
  const [isCaptureStudioOpen, setIsCaptureStudioOpenState] = useState(false);
  const [captureTrack, setCaptureTrackState] = useState<Track | null>(null);
  const [likedSongIds, setLikedSongIdsState] = useState<Set<string | number>>(new Set());
  const [unlikedSongIds, setUnlikedSongIdsState] = useState<Set<string | number>>(new Set());
  const [downloadedSongIds, setDownloadedSongIdsState] = useState<Set<string | number>>(new Set());
  const [likedCollectionIds, setLikedCollectionIdsState] = useState<Set<string | number>>(new Set());
  const [trackStats] = useState<Record<string | number, { likes: number; unlikes: number }>>({});
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpenState] = useState(false);
  const [trackForNewPlaylist, setTrackForNewPlaylistState] = useState<Track | null>(null);
  const [userPlaylists, setUserPlaylistsState] = useState<Playlist[]>([]);
  const [userSongs, setUserSongsState] = useState<Track[]>([]);
  const [userAlbums, setUserAlbumsState] = useState<Album[]>([]);
  const [unlockedMusicIds, setUnlockedMusicIdsState] = useState<Set<string | number>>(new Set());
  const [audioDuration, setAudioDurationState] = useState(0);
  const [isMusicLoading, setIsMusicLoadingState] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadMusicData = useCallback(async () => {
    try {
      // Use the server-side catalog route so music loads regardless of
      // client-side Appwrite collection permissions.
      const res = await fetch('/api/music/catalog');
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      const data = await res.json();

      if (data.errors) {
        console.warn('[MusicContext] catalog errors:', data.errors);
      }

      const trackDocs: any[] = data.tracks ?? [];
      const albumDocs: any[] = data.albums ?? [];
      const playlistDocs: any[] = data.playlists ?? [];
      const albumTrackDocs: any[] = data.albumTracks ?? [];
      const playlistTrackRows: any[] = data.playlistTrackRows ?? [];
      const playlistTrackDocs: any[] = data.playlistTrackDocs ?? [];

      // ── Tracks ──────────────────────────────────────────────────
      const tracks: Track[] = trackDocs.map(mapDocToTrack);
      setGlobalSongsState(tracks);
      setQueueState(tracks);
      setCurrentTrackState(prev => {
        if (!prev) return prev;
        const refreshed = tracks.find(t => t.id === prev.id);
        return refreshed ? { ...prev, ...refreshed } : prev;
      });
      try { localStorage.setItem('vm_offline_songs', JSON.stringify(tracks)); } catch { }

      // ── Albums ──────────────────────────────────────────────────
      const albumTracksMap: Record<string, Track[]> = {};
      albumTrackDocs.forEach((doc: any) => {
        const aId = doc.album_id;
        if (!aId) return;
        if (!albumTracksMap[aId]) albumTracksMap[aId] = [];
        albumTracksMap[aId].push(mapDocToTrack(doc));
      });
      const albums: Album[] = albumDocs.map((doc: any) =>
        mapDocToAlbum(doc, albumTracksMap[doc.$id] || [])
      );
      setGlobalAlbumsState(albums);
      try { localStorage.setItem('vm_offline_albums', JSON.stringify(albums)); } catch { }

      // ── Playlists ────────────────────────────────────────────────
      const trackDocsMap: Record<string, any> = Object.fromEntries(
        playlistTrackDocs.map((t: any) => [t.$id, t])
      );
      const playlistTracksMap: Record<string, Track[]> = {};
      playlistTrackRows.forEach((pt: any) => {
        const tDoc = trackDocsMap[pt.track_id];
        if (!tDoc) return;
        if (!playlistTracksMap[pt.playlist_id]) playlistTracksMap[pt.playlist_id] = [];
        playlistTracksMap[pt.playlist_id].push(mapDocToTrack(tDoc));
      });
      const playlists: Playlist[] = playlistDocs.map((doc: any) =>
        mapDocToPlaylist(doc, playlistTracksMap[doc.$id] || [])
      );
      setGlobalPlaylistsState(playlists);

    } catch (err) {
      console.error('[MusicContext] loadMusicData error:', err);
      // Fallback: try reading offline cache
      try {
        const cachedSongs = localStorage.getItem('vm_offline_songs');
        if (cachedSongs) setGlobalSongsState(JSON.parse(cachedSongs));
        const cachedAlbums = localStorage.getItem('vm_offline_albums');
        if (cachedAlbums) setGlobalAlbumsState(JSON.parse(cachedAlbums));
      } catch { }
    } finally {
      setIsMusicLoadingState(false);
    }
  }, []);

  const loadUserLikes = useCallback(async (userId: string) => {
    try {
      const lq = [Query.equal('user_id', userId), Query.limit(500)];
      const res = await databases.listDocuments(DATABASE_ID, COL.TRACK_LIKES, lq);
      setLikedSongIdsState(new Set(res.documents.map((d: any) => d.track_id).filter(Boolean)));
    } catch { /* ignore */ }
  }, []);

  const loadUnlockedIds = useCallback(async (userId: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.MUSIC_UNLOCKS, [
        Query.equal('user_id', userId),
        Query.limit(500),
      ]);
      const ids = new Set<string | number>();
      res.documents.forEach((d: any) => {
        if (d.track_id) ids.add(d.track_id);
        if (d.album_id) ids.add(d.album_id);
      });
      setUnlockedMusicIdsState(ids);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadMusicData();
  }, [loadMusicData]);

  useEffect(() => {
    if (currentUser) {
      loadUserLikes(currentUser.$id);
      loadUnlockedIds(currentUser.$id);
      setUserSongsState(globalSongs.filter(s => s.artistUsername === currentUser.username));
      setUserAlbumsState(globalAlbums.filter(a => a.artistUsername === currentUser.username));
      setUserPlaylistsState(globalPlaylists.filter(p => p.creator === currentUser.username));
    }
  }, [currentUser, globalSongs, globalAlbums, globalPlaylists, loadUserLikes, loadUnlockedIds]);

  const triggerHaptic = useCallback((intensity: number = 10) => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(intensity);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume / 100;
    }
    const audio = audioRef.current;
    const handleTimeUpdate = () => setProgressState(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    const handleEnded = () => nextTrack();
    const handleLoadedMetadata = () => setAudioDurationState(audio.duration || 0);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack?.audioUrl) return;
    if (audioRef.current.src !== currentTrack.audioUrl) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.load();
    }
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [currentTrack, isPlaying]);

  const startTrackPlayback = useCallback((track: Track) => {
    if (!track.audioUrl) {
      setIsPlayingState(false);
      return;
    }

    const audio = audioRef.current || new Audio();
    audioRef.current = audio;
    audio.volume = volume / 100;

    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
      audio.load();
    }

    setCurrentTrackState(track);
    setIsPlayingState(true);
    void audio.play().catch((err) => {
      console.warn('[MusicContext] audio playback failed:', err);
      setIsPlayingState(false);
    });
  }, [volume]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack?.id);
    const nextIdx = (idx + 1) % queue.length;
    setCurrentTrackState(queue[nextIdx]);
    setIsPlayingState(true);
  }, [queue, currentTrack]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;
    const idx = queue.findIndex(t => t.id === currentTrack?.id);
    const prevIdx = (idx - 1 + queue.length) % queue.length;
    setCurrentTrackState(queue[prevIdx]);
    setIsPlayingState(true);
  }, [queue, currentTrack]);

  const unlockMusic = useCallback(async (
    id: string | number,
    price: number,
    artistId: string,
    isVerified: boolean,
  ) => {
    if (!currentUser) throw new Error('Not logged in');
    const artistShare = isVerified ? 0.9 : 0.8;
    const artistAmount = Math.round(price * artistShare * 100) / 100;
    try {
      await databases.createDocument(DATABASE_ID, COL.MUSIC_UNLOCKS, ID.unique(), {
        user_id: currentUser.$id,
        track_id: String(id),
        price_paid: price,
        artist_id: artistId,
        artist_amount: artistAmount,
      }, [
        Permission.read(Role.user(currentUser.$id)),
      ]);
      setUnlockedMusicIdsState(prev => new Set(prev).add(id));
    } catch (err: any) {
      console.error('unlockMusic error:', err);
      throw err;
    }
  }, [currentUser]);

  const recordSongStream = useCallback(async (songId: string | number) => {
    setGlobalSongsState(prev => prev.map(s => {
      if (s.id !== songId) return s;
      const current = parseInt(s.streams || '0');
      return { ...s, streams: (current + 1).toString() };
    }));
    try {
      await fetch('/api/music/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: String(songId) }),
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vm_unliked_tracks');
      if (saved) setUnlikedSongIdsState(new Set(JSON.parse(saved)));
    } catch { }
  }, []);

  const toggleUnlike = useCallback(async (track: Track) => {
    if (!currentUser) return;
    setUnlikedSongIdsState(prev => {
      const n = new Set(prev);
      if (n.has(track.id)) n.delete(track.id); else n.add(track.id);
      try { localStorage.setItem('vm_unliked_tracks', JSON.stringify([...n])); } catch { }
      return n;
    });
  }, [currentUser]);

  const toggleLike = useCallback(async (track: Track) => {
    if (!currentUser) return;
    const wasLiked = likedSongIds.has(track.id);
    setLikedSongIdsState(prev => { const n = new Set(prev); if (n.has(track.id)) n.delete(track.id); else n.add(track.id); return n; });
    setGlobalSongsState(prev => prev.map(s => s.id === track.id ? { ...s, likes: Math.max(0, (s.likes || 0) + (wasLiked ? -1 : 1)) } : s));

    try {
      if (wasLiked) {
        const existing = await databases.listDocuments(DATABASE_ID, COL.TRACK_LIKES, [
          Query.equal('track_id', String(track.id)),
          Query.equal('user_id', currentUser.$id),
        ]);
        for (const doc of existing.documents) {
          await databases.deleteDocument(DATABASE_ID, COL.TRACK_LIKES, doc.$id);
        }
        await databases.updateDocument(DATABASE_ID, COL.TRACKS, String(track.id), {
          likes_count: Math.max(0, (track.likes || 1) - 1),
        });
      } else {
        await databases.createDocument(DATABASE_ID, COL.TRACK_LIKES, ID.unique(), {
          track_id: String(track.id),
          user_id: currentUser.$id,
        });
        await databases.updateDocument(DATABASE_ID, COL.TRACKS, String(track.id), {
          likes_count: (track.likes || 0) + 1,
        });
      }
    } catch { /* keep optimistic */ }
  }, [currentUser, likedSongIds]);

  const publishTrack = useCallback(async (track: any) => {
    if (!currentUser) return;
    try {
      let audioId: string | undefined;
      let coverId: string | undefined;

      if (track.audioFile instanceof File) {
        let audioFile = track.audioFile;
        const { uploadViaClient } = await import('@/lib/upload');
        audioId = await uploadViaClient(audioFile, BUCKET.MUSIC_TRACKS);
      } else if (track.audioUrl) {
        audioId = extractFileId(track.audioUrl) || undefined;
      }

      if (track.coverFile instanceof File) {
        let coverFile = track.coverFile;
        const { uploadViaClient } = await import('@/lib/upload');
        coverId = await uploadViaClient(coverFile, BUCKET.ALBUM_COVERS);
      } else if (track.cover) {
        coverId = extractFileId(track.cover) || undefined;
      }

      const docData: Record<string, any> = {
        user_id: currentUser.$id,
        title: track.title || 'Untitled',
        artist: track.artist || currentUser.name,
        artist_username: currentUser.username || '',
        duration: track.duration || 0,
        plays_count: 0,
        likes_count: 0,
        genre: track.genre || '',
        is_explicit: track.isExplicit || false,
        is_published: true,
      };
      if (audioId) docData.file_id = audioId;
      if (coverId) docData.cover_id = coverId;
      if (track.albumId) docData.album_id = track.albumId;
      if (track.isLocked) { docData.is_locked = true; docData.unlock_price = track.unlockPrice || 0; }

      const permissions = [
        Permission.read(Role.any()),
        Permission.update(Role.user(currentUser.$id)),
        Permission.delete(Role.user(currentUser.$id)),
      ];
      const doc = await databases.createDocument(DATABASE_ID, COL.TRACKS, ID.unique(), docData, permissions);
      const newTrack = mapDocToTrack(doc);
      if (track.audioUrl) newTrack.audioUrl = track.audioUrl;
      if (track.cover) newTrack.cover = track.cover;

      setGlobalSongsState(prev => [newTrack, ...prev]);
      setUserSongsState(prev => [newTrack, ...prev]);
      setQueueState(prev => [newTrack, ...prev]);
    } catch (err: any) {
      console.error('publishTrack error:', err);
      throw err;
    }
  }, [currentUser]);

  const publishAlbum = useCallback(async (album: any) => {
    if (!currentUser) return;
    try {
      let coverId: string | undefined;
      if (album.coverFile instanceof File) {
        let coverFile = album.coverFile;
        const { uploadViaClient } = await import('@/lib/upload');
        coverId = await uploadViaClient(coverFile, BUCKET.ALBUM_COVERS);
      } else if (album.cover) {
        coverId = extractFileId(album.cover) || undefined;
      }

      const docData: Record<string, any> = {
        user_id: currentUser.$id,
        title: album.title || 'Untitled Album',
        artist: album.artist || currentUser.name,
        artist_username: currentUser.username || '',
        tracks_count: album.songs?.length || 0,
        genre: album.genre || '',
        is_published: true,
      };
      if (coverId) docData.cover_id = coverId;
      if (album.isLocked) { docData.is_locked = true; docData.unlock_price = album.unlockPrice || 0; }

      const doc = await databases.createDocument(DATABASE_ID, COL.ALBUMS, ID.unique(), docData);

      const songsWithIds: Track[] = [];
      if (album.songs && album.songs.length > 0) {
        for (let i = 0; i < album.songs.length; i++) {
          const song = album.songs[i];
          const audioId = song.audioUrl ? extractFileId(song.audioUrl) || undefined : undefined;
          const songDocData: Record<string, any> = {
            user_id: currentUser.$id,
            title: song.title || 'Untitled',
            artist: album.artist || currentUser.name,
            artist_username: currentUser.username || '',
            duration: song.duration || 0,
            plays_count: 0,
            likes_count: 0,
            album_id: doc.$id,
            track_number: i + 1,
            genre: album.genre || '',
            is_explicit: false,
            is_published: true,
          };
          if (audioId) songDocData.file_id = audioId;
          if (coverId) songDocData.cover_id = coverId;

          try {
            const songDoc = await databases.createDocument(DATABASE_ID, COL.TRACKS, ID.unique(), songDocData);
            const newSong = mapDocToTrack(songDoc);
            if (song.audioUrl) newSong.audioUrl = song.audioUrl;
            if (song.cover) newSong.cover = song.cover;
            songsWithIds.push(newSong);
          } catch { /* ignore individual track errors */ }
        }
      }

      const newAlbum = mapDocToAlbum(doc, songsWithIds);
      if (album.cover) newAlbum.cover = album.cover;
      setGlobalAlbumsState(prev => [newAlbum, ...prev]);
      setUserAlbumsState(prev => [newAlbum, ...prev]);
      if (songsWithIds.length > 0) {
        setGlobalSongsState(prev => [...songsWithIds, ...prev]);
        setQueueState(prev => [...songsWithIds, ...prev]);
      }
    } catch (err: any) {
      console.error('publishAlbum error:', err);
      throw err;
    }
  }, [currentUser]);

  const deleteUserTrack = useCallback(async (id: string | number) => {
    setUserSongsState(prev => prev.filter(s => s.id !== id));
    setGlobalSongsState(prev => prev.filter(s => s.id !== id));
    try {
      await databases.deleteDocument(DATABASE_ID, COL.TRACKS, String(id));
    } catch { /* ignore */ }
  }, []);

  const deleteUserAlbum = useCallback(async (id: string | number) => {
    setUserAlbumsState(prev => prev.filter(a => a.id !== id));
    setGlobalAlbumsState(prev => prev.filter(a => a.id !== id));
    try {
      await databases.deleteDocument(DATABASE_ID, COL.ALBUMS, String(id));
    } catch { /* ignore */ }
  }, []);

  const confirmCreatePlaylist = useCallback(async (data: { title: string; description: string; isPrivate: boolean; cover?: string }) => {
    if (!currentUser) return;
    try {
      let coverId: string | undefined;
      if (data.cover) coverId = extractFileId(data.cover) || undefined;

      const docData: Record<string, any> = {
        user_id: currentUser.$id,
        title: data.title,
        is_public: !data.isPrivate,
        tracks_count: 0,
      };
      if (coverId) docData.cover_id = coverId;

      const doc = await databases.createDocument(DATABASE_ID, COL.PLAYLISTS, ID.unique(), docData);
      const newPlaylist = mapDocToPlaylist(doc, trackForNewPlaylist ? [trackForNewPlaylist] : []);

      if (trackForNewPlaylist) {
        await databases.createDocument(DATABASE_ID, COL.PLAYLIST_TRACKS, ID.unique(), {
          playlist_id: doc.$id,
          track_id: String(trackForNewPlaylist.id),
          order_index: 0,
        });
        await databases.updateDocument(DATABASE_ID, COL.PLAYLISTS, doc.$id, { tracks_count: 1 });
      }

      setGlobalPlaylistsState(prev => [newPlaylist, ...prev]);
      setUserPlaylistsState(prev => [newPlaylist, ...prev]);
      setIsCreatePlaylistOpenState(false);
    } catch (err: any) {
      console.error('confirmCreatePlaylist error:', err);
      throw err;
    }
  }, [currentUser, trackForNewPlaylist]);

  const addTrackToPlaylist = useCallback(async (playlistId: string | number, track: Track) => {
    setGlobalPlaylistsState(prev => prev.map(p =>
      p.id === playlistId ? { ...p, songs: [...p.songs, track] } : p
    ));
    try {
      const playlist = globalPlaylists.find(p => p.id === playlistId);
      const orderIndex = playlist ? playlist.songs.length : 0;
      await databases.createDocument(DATABASE_ID, COL.PLAYLIST_TRACKS, ID.unique(), {
        playlist_id: String(playlistId),
        track_id: String(track.id),
        order_index: orderIndex,
      });
      await databases.updateDocument(DATABASE_ID, COL.PLAYLISTS, String(playlistId), {
        tracks_count: (playlist?.songs.length || 0) + 1,
      });
    } catch { /* keep optimistic */ }
  }, [globalPlaylists]);

  const value: MusicContextType = {
    currentTrack, queue, globalSongs, globalAlbums, globalPlaylists,
    forYouSongs: globalSongs.slice(0, 10),
    isPlaying, isExpanded, selectedAlbum, selectedPlaylist, progress, volume, reactions,
    likedSongIds, unlikedSongIds, downloadedSongIds, likedCollectionIds,
    likedTracks: globalSongs.filter(s => likedSongIds.has(s.id)),
    userPlaylists, userSongs, userAlbums,
    isCreatePlaylistOpen, trackForNewPlaylist, trackStats,
    isAdPortalOpen, adDuration: 30,
    adUrl: "",
    triggerDownloadWithAd: (_type, task) => { setIsAdPortalOpenState(true); setPendingDownloadTask(() => task); },
    onAdComplete: () => { setIsAdPortalOpenState(false); if (pendingDownloadTask) pendingDownloadTask(); setPendingDownloadTask(null); },
    isMusicAdActive,
    currentMusicAd,
    closeMusicAd: () => { setIsMusicAdActiveState(false); setCurrentMusicAdState(null); },
    isCaptureStudioOpen, captureTrack,
    openCaptureStudio: (t?: Track) => { setCaptureTrackState(t || null); setIsCaptureStudioOpenState(true); },
    closeCaptureStudio: () => setIsCaptureStudioOpenState(false),
    setCaptureTrack: setCaptureTrackState,
    setTrack: (t: Track) => {
      songsPlayedCountRef.current += 1;
      if (songsPlayedCountRef.current >= 2) {
        const musicCampaigns = (campaigns || []).filter((c: any) => c.is_active && c.placement === 'music');
        if (musicCampaigns.length > 0) {
          const ad = musicCampaigns[musicAdIndexRef.current % musicCampaigns.length];
          musicAdIndexRef.current += 1;
          songsPlayedCountRef.current = 0;
          setCurrentMusicAdState(ad);
          setIsMusicAdActiveState(true);
        }
      }
      startTrackPlayback(t);
      setIsExpandedState(true);
      recordSongStream(t.id);

      // Save to "recently played" list (up to 15) for offline playback
      try {
        const played = loadCache<Track>(OFFLINE_KEYS.MUSIC_PLAYED);
        const filtered = played.filter(p => String(p.id) !== String(t.id));
        saveCache(OFFLINE_KEYS.MUSIC_PLAYED, [t, ...filtered], 15);
      } catch {}

      // Pin audio + cover in SW so they survive offline
      const urlsToPin = [t.audioUrl, t.cover].filter((u): u is string => Boolean(u));
      if (urlsToPin.length) pinMediaInSW(urlsToPin);
    },
    togglePlay: () => setIsPlayingState(prev => !prev),
    nextTrack, prevTrack,
    setIsExpanded: setIsExpandedState,
    setSelectedAlbum: setSelectedAlbumState,
    setSelectedPlaylist: setSelectedPlaylistState,
    setProgress: (p: number) => { setProgressState(p); if (audioRef.current) audioRef.current.currentTime = (p / 100) * audioRef.current.duration; },
    setVolume: (v: number) => { setVolumeState(v); if (audioRef.current) audioRef.current.volume = v / 100; },
    addReaction: (emoji: string) => {
      const id = Date.now();
      setReactionsState(prev => [...prev, { id, emoji, x: Math.random() * 80 + 10 }]);
      setTimeout(() => setReactionsState(prev => prev.filter(r => r.id !== id)), 2000);
    },
    clearPlayer: () => { setIsPlayingState(false); setCurrentTrackState(null); },
    toggleLike,
    toggleUnlike,
    toggleCollectionLike: (id) => setLikedCollectionIdsState(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    simulateDownload: async (t: Track) => { setDownloadedSongIdsState(prev => new Set(prev).add(t.id)); },
    isTrackLiked: (id) => likedSongIds.has(id),
    isTrackUnliked: (id) => unlikedSongIds.has(id),
    isTrackDownloaded: (id) => downloadedSongIds.has(id),
    isCollectionLiked: (id) => likedCollectionIds.has(id),
    playCollection: (ts: Track[], startIndex = 0) => {
      if (!ts.length) return;
      setQueueState(ts);
      startTrackPlayback(ts[startIndex]);
      setIsExpandedState(true);
      recordSongStream(ts[startIndex].id);
    },
    addToQueue: (t: Track) => setQueueState(prev => [...prev, t]),
    publishTrack, publishAlbum,
    deleteUserTrack,
    deleteUserAlbum,
    openCreatePlaylist: (t?: Track) => { setTrackForNewPlaylistState(t || null); setIsCreatePlaylistOpenState(true); },
    closeCreatePlaylist: () => setIsCreatePlaylistOpenState(false),
    confirmCreatePlaylist,
    addTrackToPlaylist,
    triggerHaptic,
    refreshMusicVault: loadMusicData,
    recordSongStream,
    unlockedMusicIds,
    unlockMusic,
    isMusicUnlocked: (id) => unlockedMusicIds.has(id),
    isMusicLoading,
    audioDuration,
  };

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within a MusicProvider');
  return context;
}
