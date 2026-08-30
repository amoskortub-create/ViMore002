
"use client";

import { useState, useRef, useEffect } from "react";
import { cn, isTextForeignToUser } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  ExternalLink, 
  UserPlus, 
  Eye, 
  Flame, 
  Lock,
  LayoutDashboard,
  Zap,
  EyeOff,
  Download,
  Loader2,
  Languages,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  Trash2,
  MoreVertical,
  Pencil,
  Check,
  X as XIcon,
  CornerUpLeft,
  Mic as MicIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMusic } from "@/context/MusicContext";
import { usePosts } from "@/context/PostContext";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview } from "@/lib/adaptive-media";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { aiTranslatePostAction } from "@/app/actions/ai";

interface LinkPreview {
  title: string;
  description: string;
  image: string;
  url: string;
}

interface SharedPostData {
  postId: string;
  postImage?: string;
  postVideo?: string;
  postContent?: string;
  postAuthorName?: string;
  postAuthorAvatar?: string;
  postAuthorUsername?: string;
}

interface ChatBubbleProps {
  id: string;
  isMe: boolean;
  text?: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  type?: "text" | "photo" | "video" | "link" | "voice" | "tag" | "workspace" | "post";
  mediaUrl?: string;
  voiceDuration?: string;
  linkData?: LinkPreview;
  reactions?: string[];
  isViewOnce?: boolean;
  isViewed?: boolean;
  isDownloaded?: boolean;
  taggedUser?: {
    name: string;
    username: string;
    avatar: string;
    category: string;
  };
  workspaceData?: {
    title: string;
    metrics: string;
    image: string;
  };
  postId?: string;
  sharedPostData?: SharedPostData;
  onReact?: (emoji: string) => void;
  onViewOnceOpen?: (id: string) => void;
  onMediaOpen?: (id: string) => void;
  onDownload?: (id: string) => void;
  onExternalLink?: (url: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newText: string) => void;
  seenByAvatars?: { name: string; avatar: string }[];
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
  replyToType?: string;
  onReply?: (id: string) => void;
  onScrollToReply?: (id: string) => void;
}

export function ChatBubble({ 
  id, isMe, text, time, status, type = "text", mediaUrl, voiceDuration, linkData, reactions = [], taggedUser, isViewOnce, isViewed, isDownloaded, workspaceData, postId, sharedPostData, onReact, onViewOnceOpen, onMediaOpen, onDownload, onExternalLink, onDelete, onEdit, seenByAvatars = [], replyToId, replyToText, replyToSenderName, replyToType, onReply, onScrollToReply
}: ChatBubbleProps) {
  const { triggerHaptic } = useMusic();
  const { setSelectedImageUrl, setSelectedVideoUrl, settings } = usePosts();
  const { tier } = useNetwork();
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const [voiceAccepted, setVoiceAccepted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text || '');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [browserLang, setBrowserLang] = useState<string>('en');
  const [swipeX, setSwipeX] = useState(0);
  const touchStartXRef = useRef<number>(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') setBrowserLang(window.navigator.language.split('-')[0]);
  }, []);

  const showTranslateButton = !isMe && type === 'text' && !!text && isTextForeignToUser(text, browserLang);

  const handleTranslate = async () => {
    if (translatedText) { setTranslatedText(null); return; }
    if (!text) return;
    setIsTranslating(true);
    try {
      const targetLang = new Intl.DisplayNames([browserLang], { type: 'language' }).of(browserLang) || 'English';
      const res = await aiTranslatePostAction({ postContent: text, targetLanguage: targetLang });
      setTranslatedText(res.translation);
    } catch {
      /* silently ignore */
    } finally {
      setIsTranslating(false);
    }
  };
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const isRead = status === "read";

  const stopVoice = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setIsPlayingVoice(false);
    setVoiceElapsed(0);
  };

  const playVoice = () => {
    if (!mediaUrl) return;
    triggerHaptic(10);
    setVoiceAccepted(true);

    if (isPlayingVoice) { stopVoice(); return; }

    if (!audioRef.current) {
      audioRef.current = new Audio(mediaUrl);
      audioRef.current.onended = () => { stopVoice(); };
      audioRef.current.onerror = () => { stopVoice(); };
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => { stopVoice(); });
    setIsPlayingVoice(true);
    setVoiceElapsed(0);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    voiceTimerRef.current = setInterval(() => {
      if (audioRef.current) setVoiceElapsed(audioRef.current.currentTime);
    }, 100);
  };

  const formatVoiceTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const parseDurationSecs = (dur?: string) => {
    if (!dur) return 0;
    const [m, s] = dur.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  };

  const voiceTotalSecs = parseDurationSecs(voiceDuration);
  const voiceProgress = voiceTotalSecs > 0 ? Math.min((voiceElapsed / voiceTotalSecs) * 100, 100) : 0;

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      if (typeof document !== 'undefined') document.body.style.pointerEvents = 'auto';
    };
  }, []);

  useEffect(() => {
    if (!isDeleteDialogOpen) {
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }
    }
  }, [isDeleteDialogOpen]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic(20);
    onReact?.("🔥");
  };

  const handleViewOnce = () => {
    if (isViewed) return;
    if (!isDownloaded && !isMe) {
      handleDownload();
      return;
    }
    triggerHaptic(30);
    onViewOnceOpen?.(id);
  };

  const handleMediaClick = () => {
    if (!mediaUrl) return;
    triggerHaptic(10);
    if (type === 'photo') {
      setSelectedImageUrl(mediaUrl);
    } else if (type === 'video') {
      setSelectedVideoUrl(mediaUrl);
    }
    onMediaOpen?.(id);
  };

  const handleDownload = async () => {
    if (isDownloaded || isDownloading) return;
    triggerHaptic(15);
    setIsDownloading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsDownloading(false);
    onDownload?.(id);
    triggerHaptic(25);
  };

  const handleDelete = () => {
    triggerHaptic(50);
    setIsDeleteDialogOpen(false);
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }
      onDelete?.(id);
    }, 100);
  };

  const toggleVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current || !mediaUrl) return;
    triggerHaptic(10);
    if (isPlayingVideo) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => {
        console.warn("Video playback failed:", err);
      });
    }
    setIsPlayingVideo(!isPlayingVideo);
  };

  const renderFormattedText = (content?: string) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <button 
            key={i} 
            className="text-[#6E96FF] underline hover:text-[#6E96FF]/80 transition-colors font-bold decoration-2 underline-offset-2 animate-pulse inline-flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(5);
              onExternalLink?.(part);
            }}
          >
            <LinkIcon className="h-3 w-3" />
            {part}
          </button>
        );
      }
      return part;
    });
  };

  const showMediaPlaceholder = isViewOnce && !isViewed && !isDownloaded && !isMe;

  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!onReply) return;
    const dx = e.touches[0].clientX - touchStartXRef.current;
    const swipeDir = isMe ? -1 : 1;
    const delta = dx * swipeDir;
    if (delta > 0) {
      isSwiping.current = true;
      setSwipeX(Math.min(delta, SWIPE_THRESHOLD + 10));
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping.current && swipeX >= SWIPE_THRESHOLD && onReply) {
      triggerHaptic(20);
      onReply(id);
    }
    setSwipeX(0);
    isSwiping.current = false;
  };

  return (
    <>
      <div 
        className={cn(
          "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 group relative",
          isMe ? "justify-end" : "justify-start"
        )}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={swipeX > 0 ? { transform: `translateX(${isMe ? -swipeX : swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' } : { transition: 'transform 0.2s ease' }}
      >
        {/* Reply hover button for "them" messages — appears to the right of the bubble */}
      {!isMe && onReply && (
        <button
          onClick={(e) => { e.stopPropagation(); triggerHaptic(10); onReply(id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity self-end mb-2 ml-1 h-7 w-7 rounded-full bg-white dark:bg-card border border-primary/10 shadow-sm flex items-center justify-center text-primary hover:bg-primary/10 active:scale-90 shrink-0"
        >
          <CornerUpLeft className="h-3.5 w-3.5" />
        </button>
      )}

      <div className={cn(
          "relative max-w-[85%] sm:max-w-[70%] shadow-md overflow-hidden",
          isMe 
            ? "bg-primary text-white rounded-2xl rounded-tr-none" 
            : "bg-white dark:bg-card text-foreground rounded-2xl rounded-tl-none border border-primary/5",
          (type === "photo" || type === "video" || type === "workspace") && "p-1 pb-0",
        )}>
          {isMe && (
            <div className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-black/20 text-white hover:bg-black/40">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {onReply && (
                    <DropdownMenuItem className="gap-2" onSelect={() => { triggerHaptic(10); onReply(id); }}>
                      <CornerUpLeft className="h-3.5 w-3.5" /> Reply
                    </DropdownMenuItem>
                  )}
                  {type === 'text' && !!text && (
                    <DropdownMenuItem className="gap-2" onSelect={() => { setEditText(text); setIsEditing(true); }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit Message
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Purge Message
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className={cn(
            "absolute top-0 w-4 h-4 z-10",
            isMe 
              ? "-right-2 bg-primary [clip-path:polygon(0_0,0_100%,100%_0)]" 
              : "-left-2 bg-white dark:bg-card [clip-path:polygon(100%_0,100%_100%,0_0)]"
          )} />

          <div className="flex flex-col">

            {/* ── Reply quote card ─────────────────────────────────────────── */}
            {replyToId && (
              <button
                onClick={(e) => { e.stopPropagation(); onScrollToReply?.(replyToId); }}
                className={cn(
                  "mx-2 mt-2 mb-0 flex items-start gap-2 rounded-xl text-left transition-opacity hover:opacity-75 border-l-[3px] pl-2 pr-3 py-1.5 w-[calc(100%-1rem)]",
                  isMe ? "border-white/60 bg-black/15" : "border-primary bg-primary/8"
                )}
              >
                <div className="flex flex-col min-w-0 gap-0.5 overflow-hidden flex-1">
                  <span className={cn("text-[10px] font-black uppercase tracking-wider truncate leading-none", isMe ? "text-white/80" : "text-primary")}>
                    {replyToSenderName || 'Unknown'}
                  </span>
                  <span className={cn("text-xs truncate leading-snug opacity-70", isMe ? "text-white" : "text-foreground")}>
                    {replyToType && replyToType !== 'text'
                      ? (replyToType === 'voice' ? '🎙 Voice message' : replyToType === 'photo' ? '🖼 Photo' : replyToType === 'video' ? '🎥 Video' : `📎 ${replyToType}`)
                      : (replyToText || '…')}
                  </span>
                </div>
                {replyToType === 'voice' && <MicIcon className={cn("h-3.5 w-3.5 shrink-0 self-center opacity-50", isMe ? "text-white" : "text-primary")} />}
                {replyToType === 'photo' && <ImageIcon className={cn("h-3.5 w-3.5 shrink-0 self-center opacity-50", isMe ? "text-white" : "text-primary")} />}
                {replyToType === 'video' && <VideoIcon className={cn("h-3.5 w-3.5 shrink-0 self-center opacity-50", isMe ? "text-white" : "text-primary")} />}
              </button>
            )}

            {type === "voice" && (
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 min-w-[220px] max-w-[280px]",
              )}>
                <button
                  onClick={playVoice}
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90",
                    isMe
                      ? "bg-white/20 hover:bg-white/30 text-white"
                      : "bg-primary/10 hover:bg-primary/20 text-primary"
                  )}
                >
                  {isPlayingVoice
                    ? <Pause className="h-4 w-4 fill-current" />
                    : <Play className="h-4 w-4 fill-current ml-0.5" />
                  }
                </button>

                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className={cn(
                    "relative h-1.5 rounded-full overflow-hidden",
                    isMe ? "bg-white/20" : "bg-primary/15"
                  )}>
                    <div
                      className={cn("h-full rounded-full transition-all duration-100", isMe ? "bg-white/80" : "bg-primary")}
                      style={{ width: `${voiceAccepted ? voiceProgress : 0}%` }}
                    />
                    {!voiceAccepted && (
                      <div className="absolute inset-0 flex gap-0.5 items-center px-0.5">
                        {Array.from({ length: 18 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn("flex-1 rounded-full", isMe ? "bg-white/30" : "bg-primary/25")}
                            style={{ height: `${30 + Math.sin(i * 0.8) * 50 + (i % 3) * 15}%` }}
                          />
                        ))}
                      </div>
                    )}
                    {voiceAccepted && isPlayingVoice && (
                      <div className="absolute inset-0 flex gap-0.5 items-center px-0.5 opacity-30">
                        {Array.from({ length: 18 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn("flex-1 rounded-full", isMe ? "bg-white" : "bg-primary")}
                            style={{ height: `${30 + Math.sin(i * 0.8) * 50 + (i % 3) * 15}%` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isMe ? "text-white/60" : "text-muted-foreground")}>
                      {isPlayingVoice ? formatVoiceTime(voiceElapsed) : (voiceDuration || '0:00')}
                    </span>
                    {!voiceAccepted && !isMe && (
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", "text-primary/60")}>
                        Tap to play
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isViewOnce && (type === "photo" || type === "video") && (
              <div className="p-3 min-w-[200px]">
                {isViewed ? (
                  <div className="flex items-center gap-3 text-white/60 dark:text-muted-foreground italic py-2">
                    <div className="h-10 w-10 rounded-full bg-black/10 flex items-center justify-center">
                      <Flame className="h-5 w-5 opacity-40" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-widest">Vibe Exploded</span>
                      <span className="text-[9px] uppercase font-bold opacity-50">Content Purged</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleViewOnce}
                    className={cn(
                      "w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-6 transition-all hover:scale-[1.02] active:scale-95",
                      isMe ? "border-white/20 hover:border-white/40 bg-white/5" : "border-primary/20 hover:border-primary/40 bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center shadow-lg",
                      isMe ? "bg-white/20" : "bg-primary text-white"
                    )}>
                      {isDownloading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Eye className="h-6 w-6" />}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest">
                        {isMe ? "Sent Disappearing Vibe" : isDownloaded ? "View Disappearing Vibe" : "Download to View"}
                      </p>
                      <p className="text-[9px] font-bold opacity-60 mt-1 uppercase tracking-tighter">One-time Playback Only</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {!isViewOnce && (type === "photo" || type === "video") && mediaUrl && (
              <div className="relative aspect-square sm:aspect-video min-w-[240px] rounded-xl overflow-hidden mb-1 bg-secondary/20">
                {showMediaPlaceholder ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 group/download cursor-pointer" onClick={handleDownload}>
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-md" />
                    <div className={cn(
                      "relative z-10 h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-xl",
                      isDownloading ? "bg-primary/20" : "bg-primary text-white group-hover/download:scale-110"
                    )}>
                      {isDownloading ? (
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      ) : (
                        <Download className="h-7 w-7" />
                      )}
                    </div>
                    <div className="relative z-10 text-center">
                      <p className="text-xs font-black uppercase tracking-widest drop-shadow-md text-white">
                        {isDownloading ? "Syncing Node..." : `Download ${type === 'photo' ? 'Vibe' : 'Video'}`}
                      </p>
                      <span className="text-[9px] font-bold uppercase text-white/60 tracking-widest">High-Velocity Encrypted</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {type === "photo" ? (
                      <div className="relative w-full h-full cursor-pointer" onClick={handleMediaClick}>
                        <Image src={mediaUrl} alt="Chat Media" fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="relative w-full h-full cursor-pointer" onClick={handleMediaClick}>
                        <video
                          key={mediaUrl}
                          ref={videoRef}
                          src={mediaUrl}
                          className="w-full h-full object-cover"
                          muted={!isPlayingVideo}
                          playsInline
                          preload="none"
                        />
                        <div className={cn(
                          "absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300",
                          isPlayingVideo ? "opacity-0" : "opacity-100"
                        )}>
                          <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30">
                            <Play className="h-6 w-6 text-white fill-current" />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {type === "workspace" && workspaceData && (
              <div className={cn(
                "m-1 mb-2 rounded-xl overflow-hidden border border-white/10 flex flex-col",
                isMe ? "bg-white/10" : "bg-primary/5"
              )}>
                <div className="relative h-24 w-full">
                  <Image src={workspaceData.image} alt="Workspace" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                    <LayoutDashboard className="h-8 w-8 text-white opacity-60" />
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs uppercase tracking-widest truncate">{workspaceData.title}</h4>
                    <p className={cn("text-[9px] font-black uppercase opacity-60", isMe ? "text-white" : "text-primary")}>{workspaceData.metrics}</p>
                  </div>
                  <Button size="sm" className={cn("h-8 rounded-lg text-[9px] font-black uppercase px-3", isMe ? "bg-white/20 text-white" : "bg-primary text-white")}>
                    VIEW HUB
                  </Button>
                </div>
              </div>
            )}

            {type === "post" && sharedPostData && (
              <Link
                href={`/post/${sharedPostData.postId}`}
                className={cn(
                  "m-1 mb-2 rounded-xl overflow-hidden border flex flex-col text-left group/post transition-transform active:scale-95",
                  isMe ? "bg-white/10 border-white/10" : "bg-secondary/30 border-primary/10"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {(sharedPostData.postImage || sharedPostData.postVideo) && (
                  <div className="relative aspect-video w-full">
                    {sharedPostData.postVideo && !sharedPostData.postImage ? (
                      <>
                        <video src={sharedPostData.postVideo} className="h-full w-full object-cover" muted playsInline preload="none" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <Image src={sharedPostData.postImage!} alt="Shared Post" fill className="object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 border border-white/20 shrink-0">
                      <AvatarImage src={getAdaptivePreview(sharedPostData.postAuthorAvatar, 'avatar', tier) || sharedPostData.postAuthorAvatar} />
                      <AvatarFallback>{sharedPostData.postAuthorName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className={cn("text-[11px] font-black uppercase tracking-widest truncate", isMe ? "text-white/80" : "text-foreground")}>
                      {sharedPostData.postAuthorName}
                    </span>
                    <span className={cn("text-[10px] shrink-0", isMe ? "text-white/40" : "text-muted-foreground")}>
                      @{sharedPostData.postAuthorUsername}
                    </span>
                  </div>
                  {sharedPostData.postContent && (
                    <p className={cn("text-[12px] leading-snug line-clamp-2", isMe ? "text-white/70" : "text-muted-foreground")}>
                      {sharedPostData.postContent}
                    </p>
                  )}
                  <div className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-widest", isMe ? "text-white/50" : "text-primary")}>
                    <ExternalLink className="h-3 w-3" />
                    View Post
                  </div>
                </div>
              </Link>
            )}

            {type === "link" && linkData && (
              <button 
                className={cn(
                  "m-1 mb-2 rounded-xl overflow-hidden border border-white/10 flex flex-col text-left group/link transition-transform active:scale-95",
                  isMe ? "bg-white/10" : "bg-secondary/30"
                )}
                onClick={() => onExternalLink?.(linkData.url)}
              >
                <div className="relative aspect-video w-full">
                  <Image src={linkData.image} alt="Link Preview" fill className="object-cover transition-transform group/link:scale-105" />
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="font-bold text-xs uppercase tracking-widest truncate">{linkData.title}</h4>
                  <p className="text-[10px] opacity-70 line-clamp-2 leading-tight">{linkData.description}</p>
                </div>
              </button>
            )}


            {type === "tag" && taggedUser && (
              <div className={cn(
                "m-1 mb-2 p-3 rounded-xl flex items-center gap-3 border border-white/10",
                isMe ? "bg-white/10" : "bg-primary/5"
              )}>
                <Avatar className="h-12 w-12 border-2 border-white/20">
                  <AvatarImage src={getAdaptivePreview(taggedUser.avatar, 'avatar', tier) || taggedUser.avatar} />
                  <AvatarFallback>{taggedUser.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{taggedUser.name}</p>
                  <p className={cn("text-[10px] font-black uppercase tracking-widest", isMe ? "text-white/60" : "text-primary")}>
                    {taggedUser.category}
                  </p>
                </div>
                <button className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  isMe ? "bg-white/20" : "bg-primary text-white"
                )}>
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            )}

            {text && (
              <div className="px-3 sm:px-4 py-2 sm:py-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className={cn(
                        "w-full min-h-[60px] resize-none rounded-xl p-2 text-sm font-medium leading-relaxed focus:outline-none",
                        isMe ? "bg-white/10 text-white placeholder:text-white/40" : "bg-secondary/40 text-foreground"
                      )}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (editText.trim()) { onEdit?.(id, editText.trim()); setIsEditing(false); } }
                        if (e.key === 'Escape') { setIsEditing(false); }
                      }}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setIsEditing(false)} className={cn("h-7 w-7 rounded-full flex items-center justify-center transition-colors", isMe ? "bg-white/10 hover:bg-white/20 text-white" : "bg-secondary hover:bg-secondary/80")}>
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (editText.trim()) { onEdit?.(id, editText.trim()); setIsEditing(false); } }}
                        disabled={!editText.trim() || editText.trim() === text}
                        className={cn("h-7 w-7 rounded-full flex items-center justify-center transition-colors", isMe ? "bg-white/20 hover:bg-white/30 text-white" : "bg-primary text-white hover:bg-primary/90", (!editText.trim() || editText.trim() === text) && "opacity-40 cursor-not-allowed")}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm sm:text-[15px] leading-relaxed break-words font-medium">
                      {renderFormattedText(translatedText || text)}
                    </div>
                    {showTranslateButton && (
                      <button
                        onClick={handleTranslate}
                        disabled={isTranslating}
                        className={cn(
                          "flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-widest transition-colors",
                          isMe ? "text-white/50 hover:text-white" : translatedText ? "text-primary" : "text-muted-foreground hover:text-primary"
                        )}
                      >
                        {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                        {isTranslating ? "Translating..." : translatedText ? "Show original" : "Translate"}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            <div className={cn(
              "flex items-center justify-end gap-1.5 px-3 pb-2",
              isMe ? "text-white/60" : "text-muted-foreground",
              (type === "photo" || type === "video") && !text && "absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/80",
            )}>
              <span className="text-[9px] font-bold uppercase tracking-wider">{time}</span>
              {isMe && settings.showReadReceipts && seenByAvatars.length > 0 && (
                <div className="flex items-center -space-x-1.5">
                  {seenByAvatars.slice(0, 5).map((u, i) => (
                    <Avatar key={i} className="h-[14px] w-[14px] border border-white/30 shrink-0 ring-0">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback className="text-[5px] bg-white/20 text-white">{u.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
            </div>
          </div>

          {reactions.length > 0 && (
            <div className={cn(
              "absolute -bottom-3 flex gap-1",
              isMe ? "right-2" : "left-2"
            )}>
              {reactions.map((emoji, i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-zinc-800 shadow-lg rounded-full px-1.5 py-0.5 text-xs border border-primary/10 animate-in zoom-in duration-300"
                >
                  {emoji}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] sm:max-w-[420px]">
          <AlertDialogHeader>
            <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-4">
              <Trash2 className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="font-black italic uppercase tracking-tighter text-3xl text-center">Purge Message?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium leading-relaxed text-center px-4">
              This will permanently remove this data node from the conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6">
            <AlertDialogCancel className="rounded-xl h-12 font-bold bg-secondary/50 border-none">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="rounded-xl h-12 font-black italic uppercase tracking-widest bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20"
            >
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
