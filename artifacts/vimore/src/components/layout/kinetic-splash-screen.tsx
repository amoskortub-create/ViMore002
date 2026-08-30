"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * @fileOverview ViMore Kinetic Splash Screen
 * The primary visual entry point for the network.
 * Features a branded logo pulse, sequenced loading dots, and the MTL signature.
 */

export function KineticSplashScreen() {
  const [activeDots, setActiveDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDots((prev) => (prev >= 5 ? 0 : prev + 1));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F2ECF7] dark:bg-[#050505] flex flex-col items-center justify-center transition-colors duration-500">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
        {/* The ViMore Node */}
        <div className="relative group">
          <div className="absolute -inset-6 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-20 h-20 bg-primary rounded-[1.75rem] flex items-center justify-center text-white shadow-2xl shadow-primary/30 transform transition-transform group-hover:scale-105 duration-500">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
              <path d="M3 7L10 19L17 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 15L17 7L21 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Brand Presence */}
        <div className="text-center space-y-5">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-foreground leading-none">
            ViMore
          </h1>
          
          {/* Kinetic Pulse Dots */}
          <div className="flex items-center justify-center gap-3">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-500 ease-out",
                  i < activeDots 
                    ? "bg-primary scale-110 shadow-[0_0_12px_rgba(153,64,229,0.8)]" 
                    : "bg-muted-foreground/20 scale-100"
                )} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Branded Footer Handshake */}
      <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-1000 delay-500">
        <p className="text-[9px] font-black uppercase tracking-[0.6em] text-muted-foreground/40">FROM</p>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-black italic uppercase tracking-[0.25em] text-primary">MEDIA TECH LIBERIA</p>
        </div>
      </div>
    </div>
  );
}
