"use client";

import { useState, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ChevronDown, AudioLines, Heart, ThumbsDown, Download,
  Share2, X, Send, MessageCircle, Loader2, CheckCircle2,
  Gift, Rocket, Music2, Zap, Clock, ListMusic, Shuffle, Repeat
} from "lucide-react";
import { databases, DATABASE_ID, COL } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusic } from "@/context/MusicContext";
import { useNotifications } from "@/context/NotificationContext";
import { usePosts } from "@/context/PostContext";
import { useTranslation } from "@/context/LanguageContext";
import { BoostPortal } from "@/components/post/boost-portal";
import { cn, parseFollowerCount } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const QUICK_REACTIONS = ["🔥", "❤️", "🙌", "💯", "🤯", "🚀"];

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatCount(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function MusicPlayer() {
  const pathname = usePathname();
  const { toast } = useToast();

  const {
    currentTrack, isPlaying, isExpanded, progress, volume, reactions, trackStats,
    togglePlay, nextTrack, prevTrack, setIsExpanded, setProgress, setVolume,
    addReaction, clearPlayer, toggleLike, toggleUnlike, isTrackLiked, isTrackUnliked,
    simulateDownload, isTrackDownloaded, triggerDownloadWithAd, triggerHaptic, audioDuration
  } = useMusic();

  const { addSignal } = useNotifications();
  const { currentUser, openGiftHub, settings, addComment: addVaultComment, activeComments, openCommentHub } = usePosts();
  const { t } = useTranslation();

  const [commentInput, setCommentInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [preMuteVolume, setPreMuteVolume] = useState(80);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activePanel, setActivePanel] = useState<"main" | "comments">("main");

  useEffect(() => {
    if (activePanel === "comments" && currentTrack) {
      openCommentHub(currentTrack.id.toString());
    }
  }, [activePanel, currentTrack?.id]);

  if (!currentTrack) return null;

  const effectiveDuration = audioDuration > 0 ? audioDuration : currentTrack.duration;
  const currentTime = (progress / 100) * effectiveDuration;

  const handleSendComment = () => {
    if (!commentInput.trim() || !currentTrack) return;
    addVaultComment(currentTrack.id.toString(), commentInput);
    setCommentInput("");
  };

  const handleMuteToggle = () => {
    if (isMuted) { setVolume(preMuteVolume); setIsMuted(false); }
    else { setPreMuteVolume(volume); setVolume(0); setIsMuted(true); }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleDownloadClick = async () => {
    if (isTrackDownloaded(currentTrack.id)) return;
    triggerDownloadWithAd("single", async () => {
      setIsDownloading(true);
      toast({ title: "Downloading…", description: `Fetching audio for ${currentTrack.title}` });
      await new Promise(r => setTimeout(r, 2500));
      await simulateDownload(currentTrack);
      setIsDownloading(false);
      toast({ title: "Saved offline", description: "Track is available without internet." });
      addSignal({ type: "SONIC", recipientId: currentUser?.$id || "", title: "Track Available Offline", content: `**${currentTrack.title}** by ${currentTrack.artist} has been saved.`, image: currentTrack.cover });
    });
  };

  const handleGiftClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(30);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.USERS, [
        Query.equal("username", currentTrack.artistUsername || ""),
        Query.limit(1),
      ]);
      if (res.documents.length > 0) {
        openGiftHub(res.documents[0] as any);
      } else {
        openGiftHub({ name: currentTrack.artist, username: currentTrack.artistUsername || "artist", avatar: currentTrack.cover } as any);
      }
    } catch {
      openGiftHub({ name: currentTrack.artist, username: currentTrack.artistUsername || "artist", avatar: currentTrack.cover } as any);
    }
  };

  const isLiked = isTrackLiked(currentTrack.id);
  const isUnliked = isTrackUnliked(currentTrack.id);
  const isDownloaded = isTrackDownloaded(currentTrack.id);
  const isEligibleForGift = true;
  const isOwner = currentUser ? currentTrack.artistUsername === currentUser.username : false;
  const stats = trackStats[currentTrack.id] || { likes: currentTrack.likes || 0, unlikes: currentTrack.unlikes || 0 };

  /* ── MINI PLAYER ────────────────────────────────────────────── */
  const isChatPage = pathname.startsWith('/chat/');
  const isMusicPage = pathname.startsWith('/music');
  const miniPlayerBottom = isMusicPage ? 'bottom-[148px]' : 'bottom-[76px]';

  if (!isExpanded) {
    if (isChatPage) return null;
    return (
      <div
        className={`fixed ${miniPlayerBottom} left-3 right-3 sm:left-4 sm:right-4 z-[45] cursor-pointer animate-in slide-in-from-bottom-4 duration-300`}
        onClick={() => setIsExpanded(true)}
      >
        <div className="relative rounded-2xl overflow-hidden bg-white/90 dark:bg-zinc-900/95 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-2xl shadow-black/20">
          {/* progress line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-black/5 dark:bg-white/5">
            <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5">
            {/* art */}
            <div className={cn(
              "relative h-11 w-11 rounded-xl overflow-hidden shrink-0 shadow-lg",
              isPlaying && "ring-2 ring-primary/40"
            )}>
              <Image src={currentTrack.cover} alt={currentTrack.title} fill className={cn("object-cover transition-transform duration-[3s]", isPlaying && "animate-spin")} style={{ animationDuration: "12s" }} />
            </div>

            {/* info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate leading-tight">{currentTrack.title}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight">{currentTrack.artist}</p>
            </div>

            {/* controls */}
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground" onClick={prevTrack}>
                <SkipBack className="h-4 w-4 fill-current" />
              </Button>
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl bg-primary text-white shadow-md shadow-primary/30 hover:bg-primary/90"
                onClick={togglePlay}
              >
                {isPlaying
                  ? <Pause className="h-4 w-4 fill-current" />
                  : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground" onClick={nextTrack}>
                <SkipForward className="h-4 w-4 fill-current" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); clearPlayer(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── EXPANDED PLAYER ────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Blurred background */}
      <div className="absolute inset-0 -z-10">
        <Image src={currentTrack.cover} alt="" fill className="object-cover scale-110" />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      </div>

      {/* Floating reaction emojis */}
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-32 text-4xl animate-out fade-out slide-out-to-top-[500px] pointer-events-none z-50"
          style={{ left: `${r.x}%`, animationDuration: "2500ms" }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12 pb-4 shrink-0">
        <Button variant="ghost" size="icon" className="rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setIsExpanded(false)}>
          <ChevronDown className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Now Playing</p>
          <div className="flex items-center gap-1.5 mt-0.5 justify-center">
            <AudioLines className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Vimore Music</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            className={cn("rounded-full bg-white/10 text-white hover:bg-white/20", isDownloaded && "text-green-400")}
            onClick={handleDownloadClick}
            disabled={isDownloading}
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : isDownloaded ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-white/10 text-white hover:bg-white/20">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {activePanel === "main" ? (
          <div className="px-5 pb-40 space-y-6">
            {/* Album art */}
            <div className="flex justify-center pt-2">
              <div className="relative">
                <div className={cn(
                  "absolute inset-0 bg-primary/40 blur-3xl rounded-full scale-75 transition-opacity duration-1000",
                  isPlaying ? "opacity-100" : "opacity-0"
                )} />
                <div className={cn(
                  "relative w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/10 transition-transform duration-[3s]",
                  isPlaying && "animate-spin"
                )} style={{ animationDuration: "12s" }}>
                  <Image src={currentTrack.cover} alt={currentTrack.title} fill className="object-cover" />
                </div>
                {/* Center hole */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={cn(
                    "h-10 w-10 rounded-full bg-zinc-900 border-4 border-zinc-700 flex items-center justify-center transition-all",
                    isPlaying && "shadow-lg shadow-primary/30"
                  )}>
                    <div className="h-2 w-2 rounded-full bg-zinc-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Track info */}
            <div className="space-y-1 text-center">
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white leading-tight line-clamp-2">
                {currentTrack.title}
              </h2>
              <Link href={`/profile/${currentTrack.artistUsername || "arivera"}`} onClick={() => setIsExpanded(false)}>
                <p className="text-base font-bold text-primary hover:underline">{currentTrack.artist}</p>
              </Link>
              <div className="flex items-center justify-center gap-3 pt-1">
                <span className="flex items-center gap-1 text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  <Zap className="h-3 w-3 text-primary" />
                  {formatCount(parseInt(currentTrack.streams || "0"))} plays
                </span>
                {effectiveDuration > 0 && (
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{formatTime(effectiveDuration)}</span>
                )}
                {isDownloaded && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] font-black uppercase">Saved</Badge>}
              </div>
            </div>

            {/* Badges */}
            {currentTrack.isBoosted && currentTrack.boostExpiry && currentTrack.boostExpiry > Date.now() && (
              <div className="mx-auto max-w-xs bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Zap className="h-3 w-3 animate-pulse" /> Boosted
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-primary/60">
                  <Clock className="h-3 w-3" />
                  {Math.ceil((currentTrack.boostExpiry - Date.now()) / 86400000)}d left
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="space-y-2">
              <Slider value={[progress]} max={100} step={0.1} onValueChange={(val) => setProgress(val[0])} className="[&>span:first-child]:bg-white/20 [&>span>span]:bg-white [&>span>span]:shadow-md" />
              <div className="flex justify-between text-[10px] font-bold text-white/50 uppercase tracking-widest">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(effectiveDuration)}</span>
              </div>
            </div>

            {/* Main controls */}
            <div className="flex items-center justify-between px-4">
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white/50 hover:text-white hover:bg-white/10">
                <Shuffle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={prevTrack}>
                <SkipBack className="h-7 w-7 fill-current" />
              </Button>
              <Button
                className="h-16 w-16 rounded-full bg-white text-black hover:bg-white/90 shadow-2xl shadow-black/30 hover:scale-105 active:scale-95 transition-transform"
                onClick={togglePlay}
              >
                {isPlaying
                  ? <Pause className="h-8 w-8 fill-current" />
                  : <Play className="h-8 w-8 fill-current ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={nextTrack}>
                <SkipForward className="h-7 w-7 fill-current" />
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full text-white/50 hover:text-white hover:bg-white/10">
                <Repeat className="h-5 w-5" />
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-5">
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="ghost" size="icon"
                  className={cn("h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all", isLiked && "bg-red-500/20 text-red-400")}
                  onClick={() => toggleLike(currentTrack)}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                </Button>
                <span className="text-[10px] font-bold text-white/50">{formatCount(stats.likes)}</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="ghost" size="icon"
                  className={cn("h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all", isUnliked && "bg-orange-500/20 text-orange-400")}
                  onClick={() => toggleUnlike(currentTrack)}
                >
                  <ThumbsDown className={cn("h-5 w-5", isUnliked && "fill-current")} />
                </Button>
                <span className="text-[10px] font-bold text-white/50">{stats.unlikes}</span>
              </div>

              <button
                className="flex flex-col items-center gap-1"
                onClick={() => setActivePanel("comments")}
              >
                <span className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                  <MessageCircle className="h-5 w-5 text-white" />
                </span>
                <span className="text-[10px] font-bold text-white/50">{activeComments?.length || currentTrack.comments || 0}</span>
              </button>

              {isEligibleForGift && !isOwner && settings?.isGiftingEnabled && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleGiftClick}
                    className="h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-pink-500 shadow-lg hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Gift className="h-5 w-5 text-white fill-white" />
                  </button>
                  <span className="text-[10px] font-bold text-white/50">Gift</span>
                </div>
              )}

              {isOwner && (
                <div className="flex flex-col items-center gap-1">
                  <BoostPortal nodeId={currentTrack.id.toString()} type="SONIC">
                    <button className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all",
                      currentTrack.isBoosted && "bg-primary/20 text-primary"
                    )}>
                      <Rocket className={cn("h-5 w-5 text-white", currentTrack.isBoosted && "text-primary animate-bounce")} />
                    </button>
                  </BoostPortal>
                  <span className="text-[10px] font-bold text-white/50">Boost</span>
                </div>
              )}
            </div>

            {/* Quick reactions */}
            <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addReaction(emoji)}
                  className="text-2xl hover:scale-150 transition-transform active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full text-white/50 hover:text-white shrink-0" onClick={handleMuteToggle}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider value={[volume]} max={100} onValueChange={(val) => handleVolumeChange(val[0])} className="w-full [&>span:first-child]:bg-white/20 [&>span>span]:bg-white" />
            </div>
          </div>
        ) : (
          /* Comments panel */
          <div className="px-5 pb-40 space-y-4 pt-2">
            {/* Back to player header */}
            <div className="flex items-center gap-3 pb-1">
              <Button
                variant="ghost" size="icon"
                className="rounded-full bg-white/10 text-white hover:bg-white/20 shrink-0"
                onClick={() => setActivePanel("main")}
              >
                <ChevronDown className="h-5 w-5 rotate-90" />
              </Button>
              <p className="text-sm font-black uppercase tracking-widest text-white/70">Comments</p>
              <span className="text-xs font-bold text-white/40 ml-auto">{activeComments?.length || 0}</span>
            </div>
            <ScrollArea className="h-[50vh] rounded-2xl">
              <div className="space-y-4">
                {(activeComments || []).length > 0 ? activeComments.map((comment) => (
                  <div key={comment.$id} className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                    <Link href={`/profile/${comment.userName}`} onClick={() => setIsExpanded(false)}>
                      <Avatar className="h-9 w-9 border-2 border-white/10 shrink-0">
                        <AvatarImage src={comment.userAvatar} />
                        <AvatarFallback>{comment.userName[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{comment.userName}</span>
                        <span className="text-[9px] text-white/40">{comment.time}</span>
                      </div>
                      <p className="text-sm text-white/70 bg-white/10 px-3 py-2 rounded-2xl rounded-tl-none leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <MessageCircle className="h-10 w-10 text-white mb-2" />
                    <p className="text-sm font-bold text-white uppercase tracking-widest">No reactions yet</p>
                    <p className="text-xs text-white/60 mt-1">Be the first to drop a vibe!</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Comment input */}
            <div className="relative">
              <Avatar className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 border border-white/10">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback>V</AvatarFallback>
              </Avatar>
              <Input
                placeholder="Drop a reaction…"
                className="pl-12 pr-12 h-12 bg-white/10 border-white/10 rounded-2xl text-white placeholder:text-white/40 focus-visible:ring-primary focus-visible:bg-white/15"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendComment()}
              />
              <Button
                size="icon"
                className={cn("absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl transition-all", commentInput.trim() ? "bg-primary text-white" : "bg-white/10 text-white/30")}
                onClick={handleSendComment}
                disabled={!commentInput.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
