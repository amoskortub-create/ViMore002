"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  PhoneOff, 
  Radio, 
  Zap,
  Maximize2,
  Minimize2,
  Users2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Connection, usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";

interface AudioLoungeProps {
  contact: Connection;
  onLeave: () => void;
}

export function AudioLounge({ contact, onLeave }: AudioLoungeProps) {
  const { triggerHaptic } = useMusic();
  const { currentUser } = usePosts();
  const myInitials = currentUser?.name
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME';
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    // Generate static wave heights on client mount to avoid hydration mismatch
    setWaveHeights([...Array(24)].map(() => 20 + Math.random() * 80));
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMic = () => {
    triggerHaptic(5);
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050505] text-white relative animate-in fade-in zoom-in-95 duration-500">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/10 blur-[100px] rounded-full animate-pulse delay-700" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      <header className="p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20">
            <Radio className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-black italic uppercase tracking-widest">Audio Lounge</h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{formatTime(elapsedTime)} Connected</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full bg-white/5 text-white hover:bg-white/10" onClick={onLeave}>
          <Minimize2 className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <div className="flex flex-col items-center gap-12 w-full max-w-lg">
          
          <div className="relative">
            {/* Wave Visualizer Simulation */}
            <div className="absolute -inset-16 flex items-center justify-center pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute border border-primary/20 rounded-full animate-ping"
                  style={{ 
                    width: `${200 + i * 100}px`, 
                    height: `${200 + i * 100}px`,
                    animationDuration: `${3 + i}s`,
                    animationDelay: `${i * 0.5}s`
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-8 relative">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary shadow-2xl relative">
                    <AvatarImage src={currentUser?.avatar || ''} alt={currentUser?.name || 'Me'} />
                    <AvatarFallback>{myInitials}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 h-6 w-6 rounded-full border-4 border-[#050505]" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-primary">Me</span>
              </div>

              <div className="h-px w-12 bg-white/10 relative">
                <Zap className="h-4 w-4 text-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-accent/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-accent shadow-2xl relative">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback>{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 h-6 w-6 rounded-full border-4 border-[#050505]" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-accent">{contact.name}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-center">
            <h3 className="text-xl font-black italic uppercase tracking-tighter">Sonic Brainstorm</h3>
            <p className="text-sm text-muted-foreground max-w-xs font-medium">Syncing digital signatures at sub-second latency for high-velocity creation.</p>
          </div>

          {/* Dynamic Waveform Simulation */}
          <div className="w-full flex items-end justify-center gap-1 h-12 px-12">
            {waveHeights.map((height, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1 rounded-full transition-all duration-300",
                  !isMuted ? "bg-primary/40 animate-pulse" : "bg-white/5 h-1"
                )}
                style={{ 
                  height: !isMuted ? `${height}%` : '4px',
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="p-8 pb-16 flex items-center justify-center gap-6 relative z-10 bg-gradient-to-t from-black to-transparent">
        <Button 
          variant="ghost" size="icon" 
          className={cn("h-14 w-14 rounded-2xl transition-all", isSpeakerOn ? "bg-white/10 text-white" : "bg-white/5 text-white/40")}
          onClick={() => { triggerHaptic(5); setIsSpeakerOn(!isSpeakerOn); }}
        >
          <Volume2 className="h-6 w-6" />
        </Button>

        <Button 
          variant="ghost" size="icon" 
          className={cn("h-20 w-20 rounded-[2rem] transition-all shadow-xl", isMuted ? "bg-destructive text-white shadow-destructive/20" : "bg-primary text-white shadow-primary/20")}
          onClick={handleToggleMic}
        >
          {isMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </Button>

        <Button 
          variant="ghost" size="icon" 
          className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
          onClick={onLeave}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </footer>
    </div>
  );
}
