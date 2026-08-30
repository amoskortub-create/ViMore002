'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useMusic } from '@/context/MusicContext';
import { usePosts } from '@/context/PostContext';
import { Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const DOWNLOAD_AD_DURATION = 30;

export function AdPortal() {
  const { isAdPortalOpen, onAdComplete, triggerHaptic } = useMusic();
  const { campaigns, recordCampaignImpression, recordCampaignClick } = usePosts();
  const [timeLeft, setTimeLeft] = useState(DOWNLOAD_AD_DURATION);
  const [campaignIndex, setCampaignIndex] = useState(0);
  const trackedImpressionRef = useRef<string | null>(null);

  const downloadCampaigns = useMemo(() =>
    campaigns.filter((c: any) => c.is_active && c.placement === 'download'),
    [campaigns]
  );

  const currentCampaign = downloadCampaigns.length > 0
    ? downloadCampaigns[campaignIndex % downloadCampaigns.length]
    : null;

  useEffect(() => {
    if (isAdPortalOpen && currentCampaign && trackedImpressionRef.current !== currentCampaign.$id) {
      trackedImpressionRef.current = currentCampaign.$id;
      recordCampaignImpression(currentCampaign.$id);
    }
    if (!isAdPortalOpen) {
      trackedImpressionRef.current = null;
    }
  }, [isAdPortalOpen, currentCampaign, recordCampaignImpression]);

  useEffect(() => {
    if (isAdPortalOpen) {
      setTimeLeft(DOWNLOAD_AD_DURATION);
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isAdPortalOpen]);

  useEffect(() => {
    if (isAdPortalOpen && timeLeft === 0) {
      setCampaignIndex(prev => prev + 1);
      onAdComplete();
    }
  }, [timeLeft, isAdPortalOpen, onAdComplete]);

  if (!isAdPortalOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/97 backdrop-blur-3xl flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/30 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/30 blur-[150px] rounded-full animate-pulse delay-1000" />
      </div>

      <header className="h-20 px-6 flex items-center justify-between shrink-0 relative z-[1010] bg-black/60 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Sponsored</h2>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">ViMore Ad — Download unlocks in {timeLeft}s</span>
          </div>
        </div>
        {timeLeft === 0 && (
          <Button
            className="bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-full px-6 h-10 shadow-lg shadow-primary/30 animate-in zoom-in duration-300"
            onClick={() => { triggerHaptic(30); onAdComplete(); }}
          >
            Continue Download
          </Button>
        )}
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
        {currentCampaign ? (
          <div className="relative w-full h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              {currentCampaign.type === 'video' && currentCampaign.media_url ? (
                <video
                  src={currentCampaign.media_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted={false}
                  loop
                  playsInline
                />
              ) : currentCampaign.media_url ? (
                <div className="relative w-full h-full">
                  <Image
                    src={currentCampaign.media_url}
                    alt={currentCampaign.title || 'Sponsored'}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
                  <Zap className="h-24 w-24 text-primary/30 animate-pulse" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="p-8 space-y-4 bg-black/80 relative z-10">
              <div className="space-y-1">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-tight">
                  {currentCampaign.title}
                </h3>
                {currentCampaign.content && (
                  <p className="text-sm text-white/70 leading-relaxed">{currentCampaign.content}</p>
                )}
              </div>
              {currentCampaign.action_url && (
                <a
                  href={currentCampaign.action_url}
                  target={currentCampaign.action_url.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  onClick={() => recordCampaignClick(currentCampaign.$id)}
                  className="inline-flex items-center gap-2 bg-primary text-white font-black uppercase text-[11px] tracking-widest px-6 py-3 rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
                >
                  {currentCampaign.action_label || 'Learn More'}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center p-12">
            <div className="h-24 w-24 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20">
              <Zap className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Preparing Download</h3>
              <p className="text-sm text-white/50">Your download will be ready in {timeLeft}s</p>
            </div>
          </div>
        )}
      </main>

      <footer className="h-14 px-6 flex items-center justify-center bg-black/40 border-t border-white/5 shrink-0 relative z-[1010]">
        <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000"
            style={{ width: `${((DOWNLOAD_AD_DURATION - timeLeft) / DOWNLOAD_AD_DURATION) * 100}%` }}
          />
        </div>
      </footer>
    </div>
  );
}
