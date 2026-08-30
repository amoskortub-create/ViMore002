"use client";

import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Heart, 
  ThumbsDown, 
  Download, 
  MoreHorizontal,
  Plus,
  Share2,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  ListMusic
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMusic, Track } from "@/context/MusicContext";
import { usePosts } from "@/context/PostContext";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function PlaylistDetail() {
  const { 
    selectedPlaylist, setSelectedPlaylist, currentTrack, isPlaying, setTrack, togglePlay, playCollection, 
    toggleLike, toggleUnlike, toggleCollectionLike, isTrackLiked, isTrackUnliked, isTrackDownloaded, isCollectionLiked, simulateDownload, trackStats, triggerHaptic, triggerDownloadWithAd 
  } = useMusic();
  const { settings } = usePosts();
  const { toast } = useToast();
  const [downloadingIds, setDownloadingIds] = useState<Set<string | number>>(new Set());
  const [isFullDownloading, setIsFullDownloading] = useState(false);

  if (!selectedPlaylist) return null;

  const handleClose = () => setSelectedPlaylist(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayAll = () => {
    triggerHaptic(20);
    playCollection(selectedPlaylist.songs);
  };

  const handleShare = () => {
    triggerHaptic(5);
    const url = typeof window !== 'undefined' ? `${window.location.origin}/music/playlist/${selectedPlaylist.id}` : '';
    navigator.clipboard.writeText(url);
    toast({ title: "Playlist Shared", description: "Link copied to your clipboard." });
  };

  const handleTrackDownload = async (track: Track) => {
    if (isTrackDownloaded(track.id)) return;
    
    triggerDownloadWithAd('single', async () => {
      setDownloadingIds(prev => new Set(prev).add(track.id));
      toast({ title: "Sonic Fetch", description: `Archiving ${track.title} to hardware...` });
      
      // Binary Handshake via simulateDownload
      await simulateDownload(track);
      
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
      toast({ title: "Hardware Node Synced", description: `${track.title} saved.` });
    });
  };

  const handleFullDownload = async () => {
    if (isFullDownloading) return;
    
    triggerDownloadWithAd('album', async () => {
      triggerHaptic(30);
      setIsFullDownloading(true);
      toast({ title: "Mass Fetch Initialized", description: "Starting hardware synchronization for full vibe." });
      
      // Sequential Binary Handshake
      for (const song of selectedPlaylist.songs) {
        if (!isTrackDownloaded(song.id)) {
          setDownloadingIds(prev => new Set(prev).add(song.id));
          await simulateDownload(song);
          await new Promise(r => setTimeout(r, 800)); // Stagger archival
          setDownloadingIds(prev => {
            const next = new Set(prev);
            next.delete(song.id);
            return next;
          });
        }
      }
      
      setIsFullDownloading(false);
      toast({ title: "Vibe Materialized", description: "Entire playlist node is now stored on your device." });
    });
  };

  const isLiked = isCollectionLiked(selectedPlaylist.id);

  return (
    <div className="fixed inset-0 z-[120] bg-background flex flex-col animate-in fade-in duration-500 overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-primary/10 blur-[150px] opacity-40" />
        <Image 
            src={selectedPlaylist.cover} 
            alt="Playlist Blur" 
            fill 
            className="object-cover blur-[100px] opacity-20"
          />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl" />
      </div>

      <header className="p-6 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="rounded-full bg-secondary/20" onClick={handleClose}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full bg-secondary/20" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-secondary/20">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-40">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-12 pt-8">
          
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 lg:w-1/3">
            <div className="relative w-full aspect-square max-w-[320px] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image src={selectedPlaylist.cover} alt={selectedPlaylist.title} fill className="object-cover" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-none">{selectedPlaylist.title}</h1>
              <Link href={`/profile/${selectedPlaylist.creator}`} onClick={handleClose}>
                <div className="flex items-center justify-center lg:justify-start gap-2 text-primary font-bold hover:underline transition-all underline-offset-4">
                  <User className="h-4 w-4" />
                  <span>@{selectedPlaylist.creator}</span>
                </div>
              </Link>
              <div className="flex items-center justify-center lg:justify-start gap-4 text-xs font-black uppercase tracking-widest text-muted-foreground pt-2">
                <span>{selectedPlaylist.isPrivate ? "Private Vibe" : "Public Showcase"}</span>
                <span>•</span>
                <span>{selectedPlaylist.songs.length} Tracks</span>
                <span>•</span>
                <span>{selectedPlaylist.totalStreams} Total Plays</span>
              </div>
              {selectedPlaylist.description && (
                <p className="text-sm text-muted-foreground mt-4 line-clamp-3 font-medium italic">
                  "{selectedPlaylist.description}"
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 w-full">
              <Button 
                className="flex-1 h-14 rounded-2xl bg-primary text-white font-black text-lg gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                onClick={handlePlayAll}
              >
                <Play className="h-6 w-6 fill-current" />
                PLAY VIBE
              </Button>
              <Button 
                variant="secondary" 
                className={cn("h-14 w-14 rounded-2xl", isFullDownloading && "animate-pulse")}
                onClick={handleFullDownload}
                disabled={isFullDownloading}
              >
                {isFullDownloading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
              </Button>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
              <button 
                className="flex flex-col items-center gap-1 group" 
                onClick={() => toggleCollectionLike(selectedPlaylist.id)}
              >
                <div className={cn(
                  "p-3 rounded-full transition-all",
                  isLiked ? "bg-primary/20 text-primary" : "bg-secondary/20 group-hover:bg-primary/10"
                )}>
                  <Heart className={cn("h-6 w-6 transition-colors", isLiked && "fill-current")} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Like Vibe</span>
              </button>
              <button className="flex flex-col items-center gap-1 group">
                <div className="p-3 bg-secondary/20 rounded-full group-hover:bg-destructive/10 transition-colors">
                  <ThumbsDown className="h-6 w-6 group-hover:text-destructive transition-colors" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Dislike</span>
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Sonic Journey</h2>
              <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <span># TITLE</span>
                <Clock className="h-3 w-3" />
              </div>
            </div>

            <div className="space-y-1">
              {selectedPlaylist.songs.map((song, idx) => {
                const isCurrent = currentTrack?.id === song.id;
                const isLiked = isTrackLiked(song.id);
                const isUnliked = isTrackUnliked(song.id);
                const isDownloaded = isTrackDownloaded(song.id);
                const isDownloading = downloadingIds.has(song.id);
                const stats = trackStats[song.id] || { likes: 0, unlikes: 0 };
                
                return (
                  <div 
                    key={`${selectedPlaylist.id}-${song.id}-${idx}`} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl transition-all group cursor-pointer",
                      isCurrent ? "bg-primary/10" : "hover:bg-secondary/10"
                    )}
                    onClick={() => playCollection(selectedPlaylist.songs, idx)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className={cn(
                        "w-4 text-[10px] font-black text-muted-foreground",
                        isCurrent && "text-primary"
                      )}>
                        {idx + 1}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold text-sm truncate",
                            isCurrent ? "text-primary" : "text-foreground"
                          )}>
                            {song.title}
                          </span>
                          {isDownloaded && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-medium hover:text-primary transition-colors">
                            {song.artist}
                          </span>
                          <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest">{(stats.likes / 1000).toFixed(1)}K Likes</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-[10px] font-black text-muted-foreground">{formatDuration(song.duration)}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full", isLiked && "text-red-500")}
                          onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                        >
                          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                        </Button>
                        <Button 
                          variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full", isUnliked && "text-primary")}
                          onClick={(e) => { e.stopPropagation(); toggleUnlike(song); }}
                        >
                          <ThumbsDown className={cn("h-4 w-4", isUnliked && "fill-current")} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer font-bold" 
                              disabled={isDownloading || isDownloaded}
                              onClick={(e) => { e.stopPropagation(); handleTrackDownload(song); }}
                            >
                              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 
                              {isDownloaded ? "Stored on Hardware" : "Save Single to Device"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer font-bold" onClick={(e) => { e.stopPropagation(); toast({ title: "Removed", description: "Track removed from playlist." }); }}>
                              <Plus className="h-4 w-4 rotate-45" /> Remove from Playlist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
