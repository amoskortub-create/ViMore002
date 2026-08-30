'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Music2, Play, Pause, Check, Loader2, Search } from 'lucide-react';
import { databases, DATABASE_ID, COL, BUCKET, getFileUrl, getFilePreview } from '@/lib/appwrite';
import { cn } from '@/lib/utils';

export interface SelectedSound {
  id: string;
  title: string;
  artist: string;
  fileId: string;
  duration: number;
  coverFileId?: string;
  startTime: number;
}

interface SoundPickerProps {
  onSelect: (sound: SelectedSound | null) => void;
  onClose: () => void;
  preloadSoundId?: string;
  currentSound?: SelectedSound | null;
}

interface SoundDoc {
  $id: string;
  title: string;
  artist: string;
  file_id: string;
  duration: number;
  cover_file_id?: string;
  use_count?: number;
  is_active?: boolean;
}

export function SoundPicker({ onSelect, onClose, preloadSoundId, currentSound }: SoundPickerProps) {
  const [sounds, setSounds] = useState<SoundDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(currentSound?.id || null);
  const [startTime, setStartTime] = useState(currentSound?.startTime || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    const fetchSounds = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COL.SOUNDS);
        setSounds((res.documents as unknown as SoundDoc[]).filter(s => s.is_active !== false));
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchSounds();
  }, []);

  useEffect(() => {
    if (preloadSoundId && sounds.length > 0) {
      setSelectedId(preloadSoundId);
    }
  }, [preloadSoundId, sounds]);

  const getSoundUrl = useCallback((fileId: string) => {
    if (fileId.startsWith('reel_media:')) {
      return getFileUrl(BUCKET.REEL_MEDIA, fileId.slice('reel_media:'.length));
    }
    return getFileUrl(BUCKET.SOUNDS, fileId);
  }, []);

  const togglePlay = useCallback((sound: SoundDoc) => {
    if (playingId === sound.$id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    const audio = new Audio(getSoundUrl(sound.file_id));
    audio.currentTime = 0;
    audio.ontimeupdate = () => setAudioProgress((audio.currentTime / (audio.duration || 1)) * 100);
    audio.onended = () => { setPlayingId(null); setAudioProgress(0); };
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingId(sound.$id);
  }, [playingId, getSoundUrl]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const filtered = sounds.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.artist.toLowerCase().includes(search.toLowerCase())
  );

  const handleUse = (sound: SoundDoc) => {
    audioRef.current?.pause();
    onSelect({
      id: sound.$id,
      title: sound.title,
      artist: sound.artist,
      fileId: sound.file_id,
      duration: sound.duration,
      coverFileId: sound.cover_file_id,
      startTime,
    });
    onClose();
  };

  const handleRemove = () => { onSelect(null); onClose(); };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d0d1a] rounded-t-[2rem] flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            <span className="font-black text-white text-lg tracking-tight">Add Sound</span>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sounds..."
              className="w-full bg-white/8 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {currentSound && (
          <div className="mx-4 mb-2 flex items-center justify-between px-4 py-3 bg-primary/20 border border-primary/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/30 flex items-center justify-center">
                <Music2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{currentSound.title}</p>
                <p className="text-white/50 text-xs">{currentSound.artist}</p>
              </div>
            </div>
            <button onClick={handleRemove} className="text-xs text-red-400 font-bold px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              Remove
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <Music2 className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-bold">{search ? 'No results' : 'No sounds yet'}</p>
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {filtered.map(sound => {
                const isPlaying = playingId === sound.$id;
                const isSelected = selectedId === sound.$id;
                return (
                  <div
                    key={sound.$id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl transition-all",
                      isSelected ? "bg-primary/20 border border-primary/30" : "hover:bg-white/5"
                    )}
                  >
                    <div className="relative shrink-0">
                      {sound.cover_file_id ? (
                        <img
                          src={getFilePreview(BUCKET.POST_MEDIA, sound.cover_file_id, { width: 48, height: 48, output: 'webp' })}
                          className="h-12 w-12 rounded-xl object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/40 to-purple-800/40 flex items-center justify-center">
                          <Music2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      {isPlaying && (
                        <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                          <div className="flex gap-0.5 items-end h-4">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-1 bg-primary rounded-full animate-[soundbar_0.8s_ease-in-out_infinite]"
                                style={{ height: `${[60, 100, 40][i]}%`, animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{sound.title}</p>
                      <p className="text-white/50 text-xs truncate">{sound.artist}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/30 text-[10px] font-mono">{fmt(sound.duration)}</span>
                        {sound.use_count ? (
                          <span className="text-white/30 text-[10px]">· {sound.use_count} reels</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => togglePlay(sound)}
                        className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center"
                      >
                        {isPlaying ? <Pause className="h-4 w-4 text-white" fill="white" /> : <Play className="h-4 w-4 text-white" fill="white" />}
                      </button>
                      <button
                        onClick={() => { setSelectedId(sound.$id); handleUse(sound); }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-black transition-all",
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-white/10 text-white hover:bg-primary/30"
                        )}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : 'Use'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
