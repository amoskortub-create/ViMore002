"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  Plus, 
  Upload, 
  Lock, 
  Globe, 
  Music2, 
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMusic } from "@/context/MusicContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function CreatePlaylistModal() {
  const { isCreatePlaylistOpen, closeCreatePlaylist, confirmCreatePlaylist, trackForNewPlaylist, triggerHaptic } = useMusic();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverArt, setCoverArt] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect keyboard visibility to adjust layout on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight < 500) setIsKeyboardVisible(true);
      else setIsKeyboardVisible(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isCreatePlaylistOpen) return null;

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic(10);
      const reader = new FileReader();
      reader.onloadend = () => setCoverArt(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    confirmCreatePlaylist({
      title,
      description,
      isPrivate,
      cover: coverArt || undefined
    });
    // Reset local state
    setTitle("");
    setDescription("");
    setIsPrivate(false);
    setCoverArt(null);
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-background animate-in fade-in duration-300 overflow-hidden">
      {/* Dynamic Background Blur */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full animate-pulse delay-700" />
        {coverArt && (
          <Image src={coverArt} alt="Blur" fill className="object-cover opacity-10 blur-3xl scale-150" />
        )}
      </div>

      {/* Header - Glassmorphic */}
      <header className="h-16 px-4 flex items-center justify-between bg-background/40 backdrop-blur-xl border-b border-primary/5 sticky top-0 z-50">
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-secondary/50" onClick={closeCreatePlaylist}>
          <X className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-black italic uppercase tracking-[0.2em] leading-tight">Vibe Creation</h2>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Playlist Studio</span>
        </div>
        <Button 
          variant="ghost" 
          className={cn("font-black text-xs uppercase tracking-widest", title.trim() ? "text-primary" : "opacity-30")}
          disabled={!title.trim()}
          onClick={handleSubmit}
        >
          Launch
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-2xl mx-auto p-6 sm:p-10 space-y-10">
          
          {/* Cover Art Visual - Cinematic Centerpiece */}
          <div className="flex flex-col items-center gap-6">
            <div 
              className={cn(
                "relative aspect-square w-full max-w-[300px] rounded-[2.5rem] overflow-hidden group shadow-2xl transition-all duration-500",
                !coverArt && "bg-secondary/30 border-2 border-dashed border-primary/20 hover:border-primary/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {coverArt || (trackForNewPlaylist && !coverArt) ? (
                <>
                  <Image 
                    src={coverArt || trackForNewPlaylist!.cover} 
                    alt="Playlist Cover" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                      <Camera className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Change Visual</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4">
                  <div className="p-6 bg-primary/5 rounded-full group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-10 w-10 text-primary/40" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest">Tap to add cover</p>
                    <p className="text-[9px] font-medium opacity-50 mt-1">HQ Square Recommended</p>
                  </div>
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
            </div>
          </div>

          {/* Form Fields - Modern Clean Style */}
          <div className="space-y-8">
            <div className="space-y-2 group">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 group-focus-within:text-primary transition-colors">Vibe Title</Label>
              <Input 
                placeholder="Name your journey..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-16 rounded-2xl bg-secondary/20 border-none px-6 font-black italic uppercase text-2xl tracking-tighter placeholder:text-muted-foreground/30 focus-visible:ring-primary/20 focus-visible:bg-secondary/40 transition-all shadow-inner"
                autoFocus
              />
            </div>

            <div className="space-y-2 group">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 group-focus-within:text-primary transition-colors">The Description</Label>
              <Textarea 
                placeholder="What's the energy of this collection?" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] rounded-2xl bg-secondary/20 border-none px-6 py-4 text-base font-medium placeholder:text-muted-foreground/30 focus-visible:ring-primary/20 focus-visible:bg-secondary/40 transition-all resize-none shadow-inner"
              />
            </div>

            {/* Privacy Card */}
            <div className="p-6 rounded-[2rem] bg-secondary/10 border border-primary/5 flex items-center justify-between transition-all hover:bg-secondary/20">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                  isPrivate ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                )}>
                  {isPrivate ? <Lock className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
                </div>
                <div className="flex flex-col">
                  <span className="font-black italic uppercase tracking-tighter text-lg">{isPrivate ? "Private Vibe" : "Public Showcase"}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {isPrivate ? "Invisible to the community" : "Shared on your profile"}
                  </span>
                </div>
              </div>
              <Switch checked={isPrivate} onCheckedChange={(val) => { triggerHaptic(5); setIsPrivate(val); }} className="data-[state=checked]:bg-orange-500" />
            </div>

            {/* Seed Track Card - Tape Aesthetic */}
            {trackForNewPlaylist && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Seeding Track</Label>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[8px] font-black uppercase">Instant Add</Badge>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/10 blur-xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-4 p-4 bg-background border border-primary/10 rounded-3xl shadow-xl">
                    <div className="relative h-14 w-14 rounded-xl overflow-hidden shrink-0 shadow-lg rotate-[-2deg] group-hover:rotate-0 transition-transform">
                      <Image src={trackForNewPlaylist.cover} alt="Track" fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black italic uppercase tracking-tight truncate text-lg">{trackForNewPlaylist.title}</p>
                      <p className="text-xs font-bold text-primary">{trackForNewPlaylist.artist}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spacer for bottom button */}
          <div className="h-32" />
        </div>
      </main>

      {/* Floating Action Button - Locked at bottom */}
      {!isKeyboardVisible && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent pt-12 z-50">
          <div className="max-w-2xl mx-auto">
            <Button 
              className={cn(
                "w-full h-16 rounded-[1.75rem] font-black italic uppercase tracking-[0.2em] text-lg transition-all active:scale-[0.98]",
                title.trim() 
                  ? "bg-primary text-white shadow-[0_20px_40px_rgba(153,64,229,0.3)] hover:translate-y-[-2px] hover:shadow-[0_25px_50px_rgba(153,64,229,0.4)]" 
                  : "bg-secondary text-muted-foreground/40 cursor-not-allowed opacity-50"
              )}
              onClick={handleSubmit}
              disabled={!title.trim()}
            >
              <Sparkles className="mr-3 h-6 w-6" />
              Launch Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
