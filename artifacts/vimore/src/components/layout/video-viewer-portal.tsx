
"use client";

import { useEffect, useState, useRef } from "react";
import { IOSVideo } from "@/components/ui/ios-video";
import { X, Download, Zap, ShieldCheck, ArrowLeft, Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { cn, saveFileToDevice } from "@/lib/utils";

export function VideoViewerPortal() {
  const { selectedVideoUrl, setSelectedVideoUrl } = usePosts();
  const { triggerHaptic, triggerDownloadWithAd } = useMusic();
  const [isVisible, setIsVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (selectedVideoUrl) {
      setIsVisible(true);
      setIsPlaying(true);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
  }, [selectedVideoUrl]);

  if (!selectedVideoUrl && !isVisible) return null;

  const handleClose = () => {
    triggerHaptic?.(10);
    setSelectedVideoUrl(null);
  };

  const handleDownload = () => {
    if (isDownloading || !selectedVideoUrl) return;
    
    triggerDownloadWithAd('reel', async () => {
      setIsDownloading(true);
      triggerHaptic(30);
      
      try {
        await saveFileToDevice(selectedVideoUrl, `vimore_video_${Date.now()}.mp4`);
      } catch (e) {
        console.error("Binary Archival Failure", e);
      } finally {
        setIsDownloading(false);
      }
    });
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(5);
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(5);
    setIsMuted(!isMuted);
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[700] flex flex-col transition-all duration-500 bg-black/95 backdrop-blur-3xl",
        selectedVideoUrl ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <header className="h-20 px-6 flex items-center justify-between shrink-0 relative z-10 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white bg-white/10 rounded-full" onClick={handleClose}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Video Inspector</h2>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">High-Fidelity Archival Node</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            className={cn(
              "rounded-xl h-10 px-6 font-black italic uppercase tracking-widest text-[10px] transition-all",
              isDownloading ? "bg-white/10 text-white/40" : "bg-primary text-white shadow-lg shadow-primary/20"
            )}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Download Node
          </Button>
          <Button variant="ghost" size="icon" className="text-white bg-white/10 rounded-full" onClick={handleClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main 
        className="flex-1 relative flex items-center justify-center p-0 cursor-pointer overflow-hidden"
        onClick={togglePlay}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/30 blur-[150px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/30 blur-[150px] rounded-full animate-pulse delay-700" />
        </div>

        {selectedVideoUrl && (
          <IOSVideo
            ref={videoRef}
            src={selectedVideoUrl}
            className="max-w-full max-h-full object-contain shadow-2xl"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            controls
            preload="metadata"
          />
        )}

        {/* Overlay Controls */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20">
          <Button 
            variant="ghost" size="icon" 
            className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
          </Button>
          <Button 
            variant="ghost" size="icon" 
            className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </Button>
        </div>
      </main>

      <footer className="h-16 px-6 flex items-center justify-center bg-black/40 border-t border-white/5 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">ViMore Immersive Video Cluster</span>
        </div>
      </footer>
    </div>
  );
}
