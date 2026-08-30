
"use client";

import { useEffect, useState } from "react";
import { X, Download, ZoomIn, ZoomOut, Zap, ShieldCheck, ArrowLeft, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { cn, saveFileToDevice } from "@/lib/utils";
import { IOSImage } from "@/components/ui/ios-image";

export function ImageViewerPortal() {
  const { selectedImageUrl, setSelectedImageUrl } = usePosts();
  const { triggerHaptic, triggerDownloadWithAd } = useMusic();
  const [isVisible, setIsVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    setImgSrc(selectedImageUrl);
  }, [selectedImageUrl]);

  useEffect(() => {
    if (selectedImageUrl) {
      setIsVisible(true);
      setZoom(1);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
  }, [selectedImageUrl]);

  if (!selectedImageUrl && !isVisible) return null;

  const handleClose = () => {
    triggerHaptic?.(10);
    setSelectedImageUrl(null);
  };

  const handleDownload = () => {
    if (isDownloading || !selectedImageUrl) return;
    
    triggerDownloadWithAd('single', async () => {
      setIsDownloading(true);
      triggerHaptic(30);
      
      try {
        // BINARY HANDSHAKE: Physical Archival
        await saveFileToDevice(selectedImageUrl, `vimore_visual_${Date.now()}.jpg`);
      } catch (e) {
        console.error("Binary Archival Failure", e);
      } finally {
        setIsDownloading(false);
      }
    });
  };

  const toggleZoom = () => {
    triggerHaptic(5);
    setZoom(prev => prev === 1 ? 2 : 1);
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[700] flex flex-col transition-all duration-500 bg-black/95 backdrop-blur-3xl",
        selectedImageUrl ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <header className="h-20 px-6 flex items-center justify-between shrink-0 relative z-10 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white bg-white/10 rounded-full" onClick={handleClose}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Visual Inspector</h2>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">High-Fidelity Archival Node</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" size="icon" className="text-white bg-white/10 rounded-full" 
            onClick={toggleZoom}
          >
            {zoom === 1 ? <ZoomIn className="h-5 w-5" /> : <ZoomOut className="h-5 w-5" />}
          </Button>
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
        className="flex-1 relative flex items-center justify-center p-4 cursor-zoom-in overflow-hidden"
        onClick={toggleZoom}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/30 blur-[150px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/30 blur-[150px] rounded-full animate-pulse delay-700" />
        </div>

        <div 
          className="relative w-full h-full flex items-center justify-center transition-transform duration-500 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          {selectedImageUrl && imgSrc && (
            <IOSImage
              src={imgSrc}
              alt="Immersive Visual"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            />
          )}
        </div>
      </main>

      <footer className="h-16 px-6 flex items-center justify-center bg-black/40 border-t border-white/5 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">ViMore Immersive Visual Cluster</span>
        </div>
      </footer>
    </div>
  );
}
