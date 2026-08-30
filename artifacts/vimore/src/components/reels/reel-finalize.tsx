'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { aiGenerateCaptionAction } from '@/app/actions/ai';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Wand2, Globe, Users, Lock, Check, Loader2,
  MessageCircle, Download, Users2, Play, Pause, Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReelUpload } from '@/context/ReelUploadContext';
import type { SelectedSound } from './sound-picker';

interface ReelFinalizeProps {
  clips: Blob[];
  totalDuration: number;
  effect: string;
  selectedSound: SelectedSound | null;
  onBack: () => void;
  currentUser: { $id: string; username?: string; name?: string } | null;
}

type Visibility = 'public' | 'friends' | 'private';

export function ReelFinalize({
  clips, totalDuration, effect, selectedSound, onBack, currentUser,
}: ReelFinalizeProps) {
  const router = useRouter();
  const { startUpload } = useReelUpload();

  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState('');
  const [coverTime, setCoverTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const coverCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (clips.length === 0) return;
    const combined = new Blob(clips, { type: clips[0].type || 'video/webm' });
    const url = URL.createObjectURL(combined);
    setVideoBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [clips]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else { videoRef.current.play(); setIsPlaying(true); }
  };

  const extractCover = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      if (!videoRef.current || !coverCanvasRef.current) return resolve(null);
      const video = videoRef.current;
      const canvas = coverCanvasRef.current;
      video.currentTime = coverTime;
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => resolve(b), 'image/jpeg', 0.8);
      };
      video.addEventListener('seeked', onSeeked);
      /* If video is already at this time, seeked won't fire — resolve immediately */
      setTimeout(() => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        try {
          ctx.drawImage(video, 0, 0, canvas.width || 720, canvas.height || 1280);
          canvas.toBlob(b => resolve(b), 'image/jpeg', 0.8);
        } catch { resolve(null); }
      }, 600);
    });
  }, [coverTime]);

  const generateCaption = async () => {
    setAiLoading(true);
    try {
      const { caption: generated } = await aiGenerateCaptionAction({
        content: caption || 'short video reel',
        hasMedia: true,
      });
      if (generated) setCaption(generated.replace(/^"|"$/g, '').trim());
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  };

  const handlePost = async () => {
    if (!currentUser || isPosting) return;
    setIsPosting(true);

    try {
      /* Extract cover frame first (quick, local) */
      const coverBlob = await extractCover();

      /* Wait for the upload to fully complete before navigating away.
         This keeps the network request in the foreground so the browser
         never throttles or kills it mid-transfer. */
      await startUpload({
        clips,
        totalDuration,
        effect,
        caption,
        visibility,
        allowComments,
        allowDuet,
        allowDownloads,
        selectedSound,
        userId: currentUser.$id,
        username: currentUser.username || currentUser.name || 'unknown',
        coverBlob,
        skipCompression: true, // camera-recorded clips are already at target bitrate
      });

      router.push('/reels');
    } catch {
      /* Upload failed — stay on this page so the user can see the error
         banner and try again without losing their recording. */
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#09090f] z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/8 shrink-0">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <span className="text-white font-black text-base tracking-tight">New Reel</span>
        <button
          onClick={handlePost}
          disabled={isPosting}
          className="px-5 py-2 rounded-xl bg-primary text-white font-black text-sm disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-transform"
        >
          {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          POST
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Video preview + Caption row */}
        <div className="flex gap-3 p-4">
          <div className="relative h-40 w-24 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
            {videoBlobUrl ? (
              <video
                ref={videoRef}
                src={videoBlobUrl}
                className="w-full h-full object-cover"
                loop playsInline
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div className="w-full h-full bg-white/5 animate-pulse" />
            )}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              {isPlaying
                ? <Pause className="h-8 w-8 text-white drop-shadow-lg" fill="white" />
                : <Play className="h-8 w-8 text-white drop-shadow-lg" fill="white" />
              }
            </button>
            <canvas ref={coverCanvasRef} className="hidden" />
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, 2200))}
              placeholder="Write a caption…"
              rows={5}
              className="w-full flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none resize-none leading-relaxed"
            />
            <button
              onClick={generateCaption}
              disabled={aiLoading}
              className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-bold active:scale-95 transition-transform"
            >
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              AI Caption
            </button>
          </div>
        </div>

        {/* Cover frame picker */}
        {videoBlobUrl && totalDuration > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4 text-white/50" />
              <span className="text-white/70 text-xs font-bold">Cover frame</span>
              <span className="text-white/30 text-xs ml-auto">{coverTime.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={totalDuration}
              step={0.1}
              value={coverTime}
              onChange={e => {
                setCoverTime(Number(e.target.value));
                if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
              }}
              className="w-full accent-primary h-1 rounded-full"
            />
          </div>
        )}

        <div className="h-px bg-white/8 mx-4 my-2" />

        {/* Settings */}
        <div className="px-4 space-y-0">
          {/* Visibility */}
          <div className="py-4 border-b border-white/8">
            <p className="text-white font-bold text-sm mb-3">Who can watch</p>
            <div className="flex gap-2">
              {([['public', 'Everyone', Globe], ['friends', 'Friends', Users], ['private', 'Only me', Lock]] as const).map(([val, label, Icon]) => (
                <button
                  key={val}
                  onClick={() => setVisibility(val)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-bold transition-all",
                    visibility === val
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-white/10 text-white/40"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          {([
            ['Allow comments', allowComments, setAllowComments, MessageCircle],
            ['Allow duet', allowDuet, setAllowDuet, Users2],
            ['Allow downloads', allowDownloads, setAllowDownloads, Download],
          ] as const).map(([label, val, setter, Icon]) => (
            <div key={label} className="flex items-center justify-between py-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-white/40" />
                <span className="text-white/70 text-sm font-medium">{label}</span>
              </div>
              <button
                onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(!val)}
                className={cn("w-11 h-6 rounded-full transition-colors relative", val ? "bg-primary" : "bg-white/15")}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200", val ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
          ))}

          {/* Sound info */}
          {selectedSound && (
            <div className="py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary text-base">♪</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{selectedSound.title}</p>
                <p className="text-white/40 text-xs">{selectedSound.artist}</p>
              </div>
            </div>
          )}
        </div>

        {/* Spacer so nothing hides behind bottom banner */}
        <div className="h-24" />
      </div>
    </div>
  );
}
