
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Send, Heart, Eye, BellOff, VolumeX, Volume2, EyeOff, Zap, ShieldCheck, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePosts, StorySegment } from "@/context/PostContext";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview } from "@/lib/adaptive-media";
import { databases, DATABASE_ID, COL, ID } from "@/lib/appwrite";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiagnosticErrorBoundary } from "../layout/diagnostic-error-boundary";

const STORY_DURATION = 5000; // 5 seconds per segment
const AD_DURATION = 30000; // 30 seconds for ads
const QUICK_REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "👏"];

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number;
}

export function StoryViewer() {
  const { stories, activeStoryIndex, mutedUserNames = [], setActiveStoryIndex, voteOnStoryPoll, toggleMuteUser, currentUser, settings, recordStoryView, campaigns, sendChatMessage, recordCampaignImpression, recordCampaignClick, deleteStory } = usePosts();
  const { tier } = useNetwork();
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [replyText, setReplyText] = useState("");
  const [votedSegmentId, setVotedSegmentId] = useState<string | null>(null);
  
  // AD Logic State
  const [isAdActive, setIsAdActive] = useState(false);
  const [storiesSeenInSession, setStoriesSeenInSession] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAdMuted, setIsAdMuted] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  
  const requestRef = useRef<number | null>(null);
  const adRequestRef = useRef<number | null>(null);
  const hasRecordedCurrentSegment = useRef<string | null>(null);
  const storyCampaignIndexRef = useRef(0);
  const trackedAdImpressionRef = useRef<string | null>(null);

  const activeStoryCampaigns = useMemo(() => 
    campaigns.filter((c: any) => c.is_active && c.placement === 'story'),
    [campaigns]
  );

  const currentStoryCampaign = useMemo(() => {
    if (activeStoryCampaigns.length === 0) return null;
    return activeStoryCampaigns[storyCampaignIndexRef.current % activeStoryCampaigns.length];
  }, [activeStoryCampaigns, isAdActive]);

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;
  const isOwner = activeStory?.user.username === currentUser?.username;

  const handleClose = useCallback(() => {
    setActiveStoryIndex(null);
    setSegmentIndex(0);
    setProgress(0);
    setReactions([]);
    setVotedSegmentId(null);
    setIsAdActive(false);
    setStoriesSeenInSession(0);
    hasRecordedCurrentSegment.current = null;
  }, [setActiveStoryIndex]);

  const closeAd = useCallback(() => {
    storyCampaignIndexRef.current += 1;
    setIsAdActive(false);
    setAdProgress(0);
    if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setSegmentIndex(0);
      setProgress(0);
      setVotedSegmentId(null);
    } else {
      handleClose();
    }
  }, [activeStoryIndex, stories.length, setActiveStoryIndex, handleClose]);

  const nextSegment = useCallback(() => {
    if (!activeStory) return;
    
    if (segmentIndex < activeStory.segments.length - 1) {
      setSegmentIndex(prev => prev + 1);
      setProgress(0);
      setVotedSegmentId(null);
    } else {
      const nextSeenCount = storiesSeenInSession + 1;
      setStoriesSeenInSession(nextSeenCount);

      const shouldShowStoryAd = nextSeenCount === 2 || (nextSeenCount > 2 && (nextSeenCount - 2) % 5 === 0);
      if (shouldShowStoryAd && activeStoryIndex !== null && activeStoryIndex < stories.length - 1 && activeStoryCampaigns.length > 0) {
        setIsAdActive(true);
        setAdProgress(0);
      } else if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
        setActiveStoryIndex(activeStoryIndex + 1);
        setSegmentIndex(0);
        setProgress(0);
        setVotedSegmentId(null);
      } else {
        handleClose();
      }
    }
  }, [activeStory, segmentIndex, activeStoryIndex, stories.length, setActiveStoryIndex, handleClose, storiesSeenInSession]);

  const prevSegment = useCallback(() => {
    if (isAdActive) return;
    if (!activeStory) return;

    if (segmentIndex > 0) {
      setSegmentIndex(prev => prev - 1);
      setProgress(0);
      setVotedSegmentId(null);
    } else if (activeStoryIndex !== null && activeStoryIndex > 0) {
      const prevStory = stories[activeStoryIndex - 1];
      setActiveStoryIndex(activeStoryIndex - 1);
      setSegmentIndex(prevStory.segments.length - 1);
      setProgress(0);
      setVotedSegmentId(null);
    } else {
      setProgress(0);
    }
  }, [activeStory, segmentIndex, activeStoryIndex, stories, setActiveStoryIndex, isAdActive]);

  // AD TIMER HANDSHAKE
  useEffect(() => {
    if (!isAdActive) {
      if (adRequestRef.current) cancelAnimationFrame(adRequestRef.current);
      return;
    }

    const startTime = performance.now();
    const animateAd = (time: number) => {
      const elapsed = time - startTime;
      const nextProgress = Math.min((elapsed / AD_DURATION) * 100, 100);
      setAdProgress(nextProgress);

      if (nextProgress >= 100) {
        closeAd();
      } else {
        adRequestRef.current = requestAnimationFrame(animateAd);
      }
    };

    adRequestRef.current = requestAnimationFrame(animateAd);
    return () => {
      if (adRequestRef.current) cancelAnimationFrame(adRequestRef.current);
    };
  }, [isAdActive, closeAd]);

  useEffect(() => {
    if (activeStory && !isOwner && hasRecordedCurrentSegment.current !== activeStory.$id) {
      recordStoryView(activeStory.$id);
      hasRecordedCurrentSegment.current = activeStory.$id;
    }
  }, [activeStory, isOwner, recordStoryView]);

  useEffect(() => {
    if (isAdActive && currentStoryCampaign && trackedAdImpressionRef.current !== currentStoryCampaign.$id) {
      trackedAdImpressionRef.current = currentStoryCampaign.$id;
      recordCampaignImpression(currentStoryCampaign.$id);
    }
    if (!isAdActive) {
      trackedAdImpressionRef.current = null;
    }
  }, [isAdActive, currentStoryCampaign, recordCampaignImpression]);

  useEffect(() => {
    if (activeStoryIndex === null || isAdActive) return;

    if (isPaused) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const currentProgress = progress;
    const startTime = performance.now() - (currentProgress / 100 * STORY_DURATION);

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const nextProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      
      setProgress(nextProgress);

      if (nextProgress >= 100) {
        nextSegment();
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [activeStoryIndex, segmentIndex, isPaused, nextSegment, isAdActive, progress]);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPaused || isAdActive) return;

    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const width = window.innerWidth;

    if (x < width * 0.3) {
      prevSegment();
    } else {
      nextSegment();
    }
  };

  const addReaction = (emoji: string) => {
    const id = Date.now();
    setReactions(prev => [...prev, { id, emoji, x: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
    // Notify story owner of the reaction (skip if viewing own story)
    if (activeStory && currentUser && activeStory.user.$id !== currentUser.$id) {
      databases.createDocument(DATABASE_ID, COL.NOTIFICATIONS, ID.unique(), {
        user_id: activeStory.user.$id,
        from_user_id: currentUser.$id,
        from_user_name: currentUser.name || currentUser.username,
        from_user_avatar: currentUser.avatar || '',
        type: 'SOCIAL',
        title: 'Story Reaction',
        content: `${currentUser.name || '@' + currentUser.username} reacted ${emoji} to your story`,
        message: `${currentUser.name || '@' + currentUser.username} reacted ${emoji} to your story`,
        is_read: false,
      }).catch(() => {});
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeStory || !currentUser) return;
    const text = replyText.trim();
    setReplyText("");
    try {
      await sendChatMessage(activeStory.user.$id, { text, type: 'text' });
    } catch { /* ignore */ }
  };

  const currentSegment = activeStory?.segments[segmentIndex];

  const handlePollVote = (e: React.MouseEvent, optionIndex: number) => {
    e.stopPropagation();
    if (!activeStory || !currentSegment || votedSegmentId === currentSegment.$id || isOwner) return;
    voteOnStoryPoll(activeStory.$id, currentSegment.$id, optionIndex);
    setVotedSegmentId(currentSegment.$id);
  };

  const totalPollVotes = useMemo(() => {
    if (!currentSegment?.poll) return 0;
    return currentSegment.poll.options.reduce((acc: number, opt: { votes: number }) => acc + opt.votes, 0);
  }, [currentSegment]);

  if (!activeStory || !currentSegment) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-300"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative w-full max-w-[500px] h-full sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl flex flex-col">
        {isAdActive ? (
          <div className="relative flex-1 bg-black flex flex-col animate-in fade-in duration-500">
            <div className="absolute top-4 left-4 right-4 z-[60] px-1">
              <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-[0_0_10px_rgba(153,64,229,1)] transition-[width] duration-100 ease-linear"
                  style={{ width: `${adProgress}%` }}
                />
              </div>
            </div>

            <div className="absolute top-8 left-0 right-0 z-50 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20 backdrop-blur-md">
                  <Zap className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black italic uppercase text-white tracking-widest">Sponsored</span>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">ViMore Ad</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="bg-white/10 backdrop-blur-md text-white rounded-full font-black uppercase text-[10px] tracking-widest px-4 border border-white/10 hover:bg-white/20"
                onClick={closeAd}
              >
                Skip <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              {currentStoryCampaign ? (
                <>
                  {currentStoryCampaign.type === 'video' && currentStoryCampaign.media_url ? (
                    <>
                      <video
                        src={currentStoryCampaign.media_url}
                        preload={tier === 'lite' ? 'none' : 'metadata'}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted={isAdMuted}
                        loop
                        playsInline
                      />
                      <button
                        className="absolute bottom-24 right-4 z-30 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white"
                        onClick={(e) => { e.stopPropagation(); setIsAdMuted(m => !m); }}
                      >
                        {isAdMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    </>
                  ) : currentStoryCampaign.media_url ? (
                    <Image 
                      src={getAdaptivePreview(currentStoryCampaign.media_url, 'story', tier) || currentStoryCampaign.media_url}
                      alt={currentStoryCampaign.title || "Sponsored"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-tight drop-shadow-lg">
                        {currentStoryCampaign.title}
                      </h3>
                      {currentStoryCampaign.content && (
                        <p className="text-sm text-white/80 font-medium leading-relaxed line-clamp-2">
                          {currentStoryCampaign.content}
                        </p>
                      )}
                    </div>
                    {currentStoryCampaign.action_url && (
                      <a
                        href={currentStoryCampaign.action_url}
                        target={currentStoryCampaign.action_url.startsWith('http') ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        onClick={(e) => { e.stopPropagation(); recordCampaignClick(currentStoryCampaign.$id); }}
                        className="inline-flex items-center gap-2 bg-white text-black font-black uppercase text-[11px] tracking-widest px-6 py-3 rounded-full shadow-xl hover:bg-white/90 active:scale-95 transition-all"
                      >
                        {currentStoryCampaign.action_label || 'Learn More'} <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
                  <p className="text-white/40 text-sm font-bold uppercase tracking-widest">No sponsored content</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <DiagnosticErrorBoundary title="Story Pulse">
            <div className="absolute top-4 left-4 right-4 z-[60] flex gap-1.5 px-1">
              {activeStory.segments.map((_: unknown, i: number) => (
                <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full bg-white transition-[width] duration-100 ease-linear",
                      i < segmentIndex ? "w-full" : i === segmentIndex ? "" : "w-0"
                    )}
                    style={i === segmentIndex ? { width: `${progress}%` } : {}}
                  />
                </div>
              ))}
            </div>

            <div className={cn(
              "absolute top-8 left-0 right-0 z-50 px-6 flex items-start justify-between transition-opacity duration-300",
              isPaused ? "opacity-0" : "opacity-100"
            )}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <Link 
                    href={`/profile/${activeStory.user.username}`} 
                    onClick={handleClose}
                    className="transition-transform hover:scale-105 active:scale-95"
                  >
                    <Avatar className={cn(
                      "h-10 w-10 border-2",
                      activeStory.isCloseFriends ? "border-[#42b72a]" : "border-white/20"
                    )}>
                      <AvatarImage src={getAdaptivePreview(activeStory.user.avatar, 'avatar', tier) || activeStory.user.avatar} />
                      <AvatarFallback>{activeStory.user.name[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                  
                  <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full text-white/90 border border-white/10 shadow-lg animate-in slide-in-from-top-1">
                    <Eye className="h-2.5 w-2.5 text-primary" />
                    <span className="text-[10px] font-black tracking-tighter">{activeStory.viewCount || 0}</span>
                  </div>
                </div>

                <div className="flex flex-col pt-0.5">
                  <Link 
                    href={`/profile/${activeStory.user.username}`} 
                    onClick={handleClose} 
                    className="group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white drop-shadow-md group-hover:underline">{activeStory.user.name}</span>
                      {activeStory.isCloseFriends && (
                        <span className="text-[9px] bg-[#42b72a] text-white px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">Close Friends</span>
                      )}
                    </div>
                  </Link>
                  <span className="text-[10px] text-white/60 font-medium mt-0.5">Recently</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <DropdownMenu onOpenChange={(open) => setIsPaused(open)}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                    {isOwner ? (
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer font-bold text-destructive focus:text-destructive"
                        onClick={async () => {
                          const storyId = activeStory.$id;
                          handleClose();
                          try { await deleteStory(storyId); } catch { /* ignore */ }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Story
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem className="gap-2 cursor-pointer font-bold" onClick={() => toggleMuteUser(activeStory.user.name)}>
                          <VolumeX className="h-4 w-4" />
                          {mutedUserNames.includes(activeStory.user.name) ? "Unmute" : "Mute"} {activeStory.user.name}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer font-bold text-destructive focus:text-destructive">
                          <BellOff className="h-4 w-4" />
                          Notifications Off
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={handleClose}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div 
              className="relative flex-1 cursor-pointer select-none flex items-center justify-center overflow-hidden bg-black"
              onClick={handleTap}
            >
              <>
                  {currentSegment.type === 'video' ? (
                    <>
                      <video
                        src={(currentSegment as any).mediaUrl || (currentSegment as any).image}
                        preload={tier === 'lite' ? 'none' : 'metadata'}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted={isVideoMuted}
                        loop
                        playsInline
                      />
                      <button
                        className="absolute bottom-24 right-4 z-30 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white"
                        onClick={(e) => { e.stopPropagation(); setIsVideoMuted(m => !m); }}
                      >
                        {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    </>
                  ) : ((currentSegment as any).mediaUrl || (currentSegment as any).image) ? (
                    <Image 
                      src={getAdaptivePreview((currentSegment as any).mediaUrl || (currentSegment as any).image, 'story', tier) || (currentSegment as any).mediaUrl || (currentSegment as any).image} 
                      alt="Story Content" 
                      fill 
                      className={cn("object-cover", (currentSegment as any).filter)}
                      priority
                    />
                  ) : null}
                </>

              {currentSegment.textOverlays?.map((overlay: any, i: number) => (
                <div 
                  key={i}
                  className="absolute z-40 p-6 pointer-events-none w-full text-center"
                  style={{ 
                    top: `${overlay.y}%`, 
                    left: `${overlay.x}%`, 
                    transform: 'translate(-50%, -50%)',
                    color: overlay.color,
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  <span className="text-3xl font-black italic uppercase tracking-tighter leading-tight">
                    {overlay.text}
                  </span>
                </div>
              ))}

              {currentSegment.poll && (
                <div 
                  className="absolute z-40 w-[240px] bg-white rounded-2xl p-4 shadow-2xl animate-in zoom-in duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 className="text-center font-bold text-sm text-zinc-900 mb-3">{currentSegment.poll.question}</h4>
                  <div className="space-y-2">
                    {currentSegment.poll.options.map((opt: { votes: number; text: string }, i: number) => {
                      const percent = totalPollVotes > 0 ? (opt.votes / totalPollVotes) * 100 : 0;
                      const isVoted = votedSegmentId === currentSegment.$id || isOwner;
                      
                      return (
                        <button
                          key={i}
                          onClick={(e) => handlePollVote(e, i)}
                          disabled={isVoted}
                          className={cn(
                            "w-full h-10 rounded-xl border-2 relative overflow-hidden transition-all group",
                            isVoted ? "border-primary/20" : "border-primary/10 hover:border-primary/30"
                          )}
                        >
                          {isVoted && (
                            <div 
                              className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-1000"
                              style={{ width: `${percent}%` }}
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-between px-3 text-sm font-bold">
                            <span className={cn(isVoted ? "text-primary" : "text-zinc-800")}>{opt.text}</span>
                            {isVoted && <span className="text-primary/60">{Math.round(percent)}%</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(currentSegment as any).postId && (
                <Link
                  href={`/post/${(currentSegment as any).postId}`}
                  className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/20 text-white rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-black/70 transition-colors active:scale-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Post
                </Link>
              )}

              {reactions.map((r) => (
                <div
                  key={r.id}
                  className="absolute bottom-20 text-4xl animate-out fade-out slide-out-to-top-[300px] pointer-events-none"
                  style={{ left: `${r.x}%`, animationDuration: '2000ms' }}
                >
                  {r.emoji}
                </div>
              ))}
            </div>

            <div className={cn(
              "absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300",
              isPaused ? "opacity-0" : "opacity-100"
            )}>
              {!isOwner ? (
                <>
                  <div className="flex items-center justify-between mb-4 px-2">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          addReaction(emoji);
                        }}
                        className="text-2xl hover:scale-125 transition-transform active:scale-95 px-2"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 px-5 flex items-center text-white/60 text-sm transition-colors group">
                      <input 
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${activeStory.user.name}...`}
                        className="bg-transparent border-none focus:ring-0 w-full placeholder:text-white/40"
                        onClick={(e) => e.stopPropagation()}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => setIsPaused(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleSendReply(); }
                        }}
                      />
                      <Send
                        className="h-5 w-5 text-white/40 group-focus-within:text-white cursor-pointer hover:text-white transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleSendReply(); }}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full h-12 w-12 bg-white/10 border border-white/20 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        addReaction("❤️");
                      }}
                    >
                      <Heart className="h-6 w-6" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 mb-2 animate-in slide-in-from-bottom-2">
                  <div className="h-1 w-8 bg-white/20 rounded-full" />
                  <div className="flex items-center justify-between w-full px-1">
                    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      <span className="text-white text-xs font-black tracking-tight">{activeStory.viewCount || 0} views</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const storyId = activeStory.$id;
                        handleClose();
                        deleteStory(storyId).catch(() => {});
                      }}
                      className="flex items-center gap-2 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-red-500/30 transition-colors active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Story
                    </button>
                  </div>
                </div>
              )}
            </div>
          </DiagnosticErrorBoundary>
        )}

        <div className={cn("hidden sm:block", isAdActive && "opacity-0 pointer-events-none")}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute -left-16 top-1/2 -translate-y-1/2 text-white bg-white/5 hover:bg-white/10 rounded-full h-12 w-12 border border-white/10 z-50"
            onClick={(e) => { e.stopPropagation(); prevSegment(); }}
            disabled={activeStoryIndex === 0 && segmentIndex === 0}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute -right-16 top-1/2 -translate-y-1/2 text-white bg-white/5 hover:bg-white/10 rounded-full h-12 w-12 border border-white/10 z-50"
            onClick={(e) => { e.stopPropagation(); nextSegment(); }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
