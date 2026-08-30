"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, ZoomIn, ZoomOut, Move, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ImageRefinementPortalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  mode: "avatar" | "cover";
  onApply: (refinedImage: string) => void;
}

export function ImageRefinementPortal({ isOpen, onClose, image, mode, onApply }: ImageRefinementPortalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsRecording] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  if (!isOpen || !image) return null;

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsRecording(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setPosition({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsRecording(false);
  };

  const handleApply = () => {
    // In a real app, we would use a canvas to crop based on zoom/position.
    // For this prototype, we'll pass back the image and assume the refinement is "applied" via preview logic.
    onApply(image);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
        <Button variant="ghost" size="icon" className="text-white rounded-full" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Refinement Studio</h2>
          <span className="text-[10px] font-bold text-primary uppercase">Frame your Identity</span>
        </div>
        <Button 
          variant="ghost" 
          className="text-primary font-black uppercase italic tracking-widest text-xs"
          onClick={handleApply}
        >
          Apply
        </Button>
      </header>

      {/* Main Studio Area */}
      <main 
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-move touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Background Grid - Aesthetic */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* Image Layer */}
        <div 
          className="relative transition-transform duration-75 ease-out pointer-events-none"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            width: mode === 'avatar' ? '400px' : '100%',
            aspectRatio: mode === 'avatar' ? '1/1' : '21/9'
          }}
        >
          <img src={image} alt="Refine" className="w-full h-full object-cover select-none" />
        </div>

        {/* Mask Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {mode === 'avatar' ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-[300px] h-[300px] rounded-full ring-[4000px] ring-black/60 border-2 border-primary/50 shadow-[0_0_40px_rgba(0,0,0,0.8)]" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="w-full max-w-4xl aspect-[21/9] ring-[4000px] ring-black/60 border-2 border-primary/50 shadow-[0_0_40px_rgba(0,0,0,0.8)]" />
            </div>
          )}
        </div>

        {/* Centering Indicator */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
          <div className="w-px h-10 bg-white" />
          <div className="h-px w-10 bg-white absolute" />
        </div>
      </main>

      {/* Control Deck */}
      <footer className="p-8 pb-12 bg-black/40 backdrop-blur-md border-t border-white/5 space-y-8 shrink-0">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider 
              value={[zoom]} 
              min={0.5} 
              max={3} 
              step={0.01} 
              onValueChange={(val) => setZoom(val[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 text-white rounded-xl h-12 flex-1 font-bold text-xs uppercase tracking-widest gap-2"
              onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 flex-[2] font-black italic uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/20"
              onClick={handleApply}
            >
              <Check className="h-4 w-4" /> Sync Identity
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
