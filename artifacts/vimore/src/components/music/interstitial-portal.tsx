"use client";

import { useState, useEffect, useRef } from "react";
import { Music2, Volume2, VolumeX, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMusic } from "@/context/MusicContext";

const MAX_AD_DURATION = 45;

export function MusicAdPortal() {
  const { isMusicAdActive, currentMusicAd, closeMusicAd, togglePlay, isPlaying } = useMusic();
  const [timeLeft, setTimeLeft] = useState(MAX_AD_DURATION);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (isMusicAdActive) {
      if (isPlaying) {
        wasPlayingRef.current = true;
        togglePlay();
      }
      setTimeLeft(MAX_AD_DURATION);

      if (currentMusicAd?.media_url) {
        const audio = new Audio(currentMusicAd.media_url);
        audioRef.current = audio;
        audio.muted = isMuted;
        audio.play().catch(() => {});

        const onEnd = () => { closeMusicAd(); if (wasPlayingRef.current) { togglePlay(); wasPlayingRef.current = false; } };
        audio.addEventListener('ended', onEnd);

        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              audio.pause();
              closeMusicAd();
              if (wasPlayingRef.current) { togglePlay(); wasPlayingRef.current = false; }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => {
          clearInterval(timer);
          audio.removeEventListener('ended', onEnd);
          audio.pause();
          audioRef.current = null;
        };
      } else {
        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              closeMusicAd();
              if (wasPlayingRef.current) { togglePlay(); wasPlayingRef.current = false; }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      }
    }
  }, [isMusicAdActive, currentMusicAd]);

  const handleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  };

  if (!isMusicAdActive) return null;

  const percent = ((MAX_AD_DURATION - timeLeft) / MAX_AD_DURATION) * 100;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/97 backdrop-blur-3xl flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/15 blur-[180px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 blur-[150px] rounded-full animate-pulse delay-700" />
      </div>

      <header className="h-20 px-6 flex items-center justify-between shrink-0 relative z-10 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
            <Music2 className="h-5 w-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Audio Ad</h2>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Music resumes in {timeLeft}s</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white" onClick={handleMute}>
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 relative z-10 p-10 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-ping opacity-30" />
          <div className="relative h-40 w-40 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 border border-white/10 flex items-center justify-center shadow-2xl">
            <div
              className="absolute inset-2 rounded-full border-4 border-primary/30"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${percent}%, transparent ${percent}%)`
              }}
            />
            <div className="absolute inset-4 rounded-full bg-black flex items-center justify-center">
              <Music2 className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        <div className="space-y-2 max-w-sm">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-tight">
            {currentMusicAd?.title || 'Sponsored Audio'}
          </h3>
          {currentMusicAd?.content && (
            <p className="text-sm text-white/60 leading-relaxed">{currentMusicAd.content}</p>
          )}
        </div>

        {currentMusicAd?.action_url && (
          <a
            href={currentMusicAd.action_url}
            target={currentMusicAd.action_url.startsWith('http') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 font-black uppercase text-[11px] tracking-widest px-6 py-3 rounded-full hover:bg-white/20 active:scale-95 transition-all"
          >
            {currentMusicAd.action_label || 'Learn More'} <Zap className="h-3.5 w-3.5" />
          </a>
        )}

        <div className="w-full max-w-xs space-y-2">
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{timeLeft}s remaining</p>
        </div>
      </main>

      <footer className="h-14 px-6 flex items-center justify-center bg-black/40 border-t border-white/5 relative z-10">
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">ViMore • Sponsored Audio</p>
      </footer>
    </div>
  );
}
