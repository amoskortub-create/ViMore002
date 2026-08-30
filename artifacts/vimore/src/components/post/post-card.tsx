
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { IOSImage } from "@/components/ui/ios-image";
import { IOSVideo } from "@/components/ui/ios-video";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview } from "@/lib/adaptive-media";
import Link from "next/link";
import { 
  ThumbsUp, 
  ThumbsDown,
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  CheckCircle2, 
  Heart,
  Send,
  Bookmark,
  EyeOff,
  Flag,
  Languages,
  Loader2,
  Pin,
  Archive,
  GalleryVerticalEnd,
  Link as LinkIcon,
  Trash2,
  Download,
  PlusSquare,
  Play,
  Video,
  Volume2,
  VolumeX,
  Gift,
  Lock,
  Zap,
  ShieldCheck,
  Coins,
  ChevronRight,
  ExternalLink,
  Eye,
  Rocket,
  UserRoundPlus,
  UserRoundCheck,
  UserPlus,
  Check,
  UserRoundX,
  Gauge,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineIndicator } from "@/components/ui/online-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn, parseFollowerCount, saveFileToDevice, isTextForeignToUser } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { aiTranslatePostAction } from "@/app/actions/ai";
import { useToast } from "@/hooks/use-toast";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useNotifications } from "@/context/NotificationContext";
import { useTranslation } from "@/context/LanguageContext";
import dynamic from "next/dynamic";
const ShareHub = dynamic(() => import("./share-hub").then(m => ({ default: m.ShareHub })), { ssr: false });
const BoostPortal = dynamic(() => import("./boost-portal").then(m => ({ default: m.BoostPortal })), { ssr: false });
import { RichText } from "./rich-text";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  $id: string;
  user: {
    name: string;
    avatar: string;
  };
  text: string;
  time: string;
  replies?: Comment[];
}

interface PostCardProps {
  $id: string;
  user: {
    $id?: string;
    name: string;
    username: string;
    avatar: string;
    role?: string;
    isVerified?: boolean;
    followers?: string | number;
  };
  collaborator?: {
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  };
  content: string;
  image?: string;
  images?: string[];
  imageFilter?: string;
  theme?: string;
  language?: string;
  likes: number;
  unlikes: number;
  comments: number;
  shares?: number;
  views: number;
  time: string;
  feeling?: { emoji: string; text: string } | string;
  location?: string;
  themeClass?: string;
  commentsDisabled?: boolean;
  isPinned?: boolean;
  isSeries?: boolean;
  seriesTitle?: string;
  isLocked?: boolean;
  unlockPrice?: number;
  poll?: {
    question: string;
    options: { text: string; votes: number }[];
    voters?: Record<string, number>;
    totalVotes: number;
    duration?: string;
  };
  initialComments?: Comment[];
  isShared?: boolean;
  sharedPost?: PostCardProps;
  videoUrl?: string;
  isCampaign?: boolean;
  campaignTitle?: string;
  actionUrl?: string;
  actionLabel?: string;
  isBoosted?: boolean;
  boostTargetViews?: number;
  boostCurrentViews?: number;
  boostExpiry?: number;
  taggedUsers?: string[];
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
  } | null;
  hashtags?: string[];
  type?: string;
}

function FeedVideo({ videoUrl, postId, isShared, isReel }: { videoUrl: string; postId: string; isShared: boolean; isReel: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const router = useRouter();
  const { tier } = useNetwork();
  const allowAutoplay = tier === 'rich';

  useEffect(() => {
    if (!allowAutoplay) return;
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => {});
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [videoUrl, allowAutoplay]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    setIsMuted(prev => {
      video.muted = !prev;
      return !prev;
    });
  };

  return (
    <div
      className={cn("relative mt-2 rounded-lg overflow-hidden bg-black cursor-pointer aspect-[4/5]", isShared ? "-mx-1" : "-mx-3 sm:mx-0")}
      onClick={toggleMute}
    >
      <IOSVideo
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        playsInline
        loop
        muted={isMuted}
        controls
        preload="none"
      />
      <button
        onClick={toggleMute}
        className="absolute bottom-2 right-2 p-1.5 bg-black/50 rounded-full text-white z-10 backdrop-blur-sm transition-opacity"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      {isReel && (
        <Link
          href="/reels"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded-full z-10 active:scale-95 transition-transform"
        >
          <Play className="h-3 w-3 fill-white" />
          Watch Reel
        </Link>
      )}
    </div>
  );
}

export function PostCard(props: PostCardProps) {
  const { 
    $id, user, collaborator, content, image, images = [], imageFilter, theme, language,
    likes = 0, unlikes = 0, comments = 0, shares = 0, views = 0, time, hashtags, feeling, location, commentsDisabled, isPinned, 
    isSeries, seriesTitle, poll, isShared = false, videoUrl, sharedPost, isLocked, unlockPrice, isCampaign, campaignTitle, actionUrl, actionLabel,
    isBoosted, boostTargetViews, boostCurrentViews, boostExpiry, taggedUsers, linkPreview, type: postType
  } = props;

  const { 
    currentUser, connections, isPostLiked, isPostUnliked, isPostSaved, isPostUnlocked, toggleLikePost, toggleUnlikePost, toggleSavePost, archivePost, togglePinPost, deletePost, openCommentHub, setSelectedPostId, setSelectedImageUrl, openGiftHub, unlockPost, voteOnPostPoll, settings, recordCampaignClick, recordCampaignImpression, recordView, isFriend, isRequestSent, isRequestReceived, sendFriendRequest, confirmFriendRequest, cancelFriendRequest, unfriendUser, submitReport,
    postCountOverrides,
  } = usePosts();

  const authorConn = connections.find(c => c.username === user.username);
  const authorIsOnline = !isCampaign && !settings.isGhostMode && (authorConn?.isOnline || false);
  const authorLastSeenAt = authorConn?.lastSeenAt || null;
  const { tier } = useNetwork();

  const { addSignal } = useNotifications();
  const { triggerHaptic } = useMusic();
  const { t } = useTranslation();
  const router = useRouter();

  const isLiked = isPostLiked($id);
  const isUnliked = isPostUnliked($id);
  const isBookmarked = isPostSaved($id);
  const isUnlocked = isPostUnlocked($id);
  const isOwner = currentUser ? user.username === currentUser.username : false;
  
  const amIFriend = isFriend(user.username);
  const sent = isRequestSent(user.username);
  const received = isRequestReceived(user.username);

  const effectiveIsVerified = isOwner ? currentUser?.isVerified : user.isVerified;
  const isEligibleForGift = settings.isGiftingEnabled;
  const isHiddenByLock = isLocked && !isUnlocked && !isOwner && !isShared;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isRevealedManually, setIsRevealedManually] = useState(false);
  const [viewerLanguage, setViewerLanguage] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [isShareHubOpen, setIsShareHubOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const hasRecordedView = useRef(false);
  const hasRecordedImpression = useRef(false);
  const isVisibleRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ likes?: number; unlikes?: number; comments?: number; shares?: number } | null>(null);
  const { toast } = useToast();

  const override = postCountOverrides[$id] ?? {};
  const [liveCounts, setLiveCounts] = useState({
    likes:    override.likes    ?? likes,
    unlikes:  override.unlikes  ?? unlikes,
    comments: override.comments ?? comments,
    shares:   override.shares   ?? shares,
  });
  const [animField, setAnimField] = useState<'likes' | 'unlikes' | 'comments' | 'shares' | null>(null);

  useEffect(() => {
    const newOverride = postCountOverrides[$id] ?? {};
    const next = {
      likes:    newOverride.likes    ?? likes,
      unlikes:  newOverride.unlikes  ?? unlikes,
      comments: newOverride.comments ?? comments,
      shares:   newOverride.shares   ?? shares,
    };
    pendingRef.current = next;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const p = pendingRef.current;
      if (!p) return;
      setLiveCounts(prev => {
        let changed: 'likes' | 'unlikes' | 'comments' | 'shares' | null = null;
        if (p.likes !== prev.likes) changed = 'likes';
        else if (p.unlikes !== prev.unlikes) changed = 'unlikes';
        else if (p.comments !== prev.comments) changed = 'comments';
        else if (p.shares !== prev.shares) changed = 'shares';
        if (changed && isVisibleRef.current) {
          setAnimField(changed);
          setTimeout(() => setAnimField(null), 400);
        }
        return {
          likes: p.likes ?? prev.likes,
          unlikes: p.unlikes ?? prev.unlikes,
          comments: p.comments ?? prev.comments,
          shares: p.shares ?? prev.shares,
        };
      });
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [postCountOverrides[$id], likes, unlikes, comments, shares, $id]);

  useEffect(() => {
    setLiveCounts({ likes, unlikes, comments, shares });
  }, [likes, unlikes, comments, shares]);

  const userVote = useMemo(() => {
    if (!poll || !poll.voters || !currentUser) return null;
    return poll.voters[currentUser.username] ?? null;
  }, [poll, currentUser]);

  const rankedPollOptions = useMemo(() => {
    if (!poll) return [];
    return [...poll.options]
      .map((option, idx) => ({ ...option, originalIndex: idx }))
      .sort((a, b) => b.votes - a.votes);
  }, [poll]);

  useEffect(() => {
    if (isShared || isCampaign) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !hasRecordedView.current) {
          hasRecordedView.current = true;
          recordView($id);
        }
      });
    }, { threshold: 0.3 });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [$id, isShared, isCampaign, recordView]);

  useEffect(() => {
    if (!isCampaign || isShared) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasRecordedImpression.current) {
          hasRecordedImpression.current = true;
          recordCampaignImpression($id);
        }
      });
    }, { threshold: 0.5 });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [$id, isCampaign, isShared, recordCampaignImpression]);

  useEffect(() => { if (typeof window !== 'undefined') setViewerLanguage(window.navigator.language.split('-')[0]); }, []);

  const showTranslateButton = !isShared && !!content && !!viewerLanguage && isTextForeignToUser(content, viewerLanguage);

  const handleTranslate = async () => {
    if (translatedText) { setTranslatedText(null); return; }
    if (!content) return;
    setIsTranslating(true);
    try {
      const targetLang = new Intl.DisplayNames([viewerLanguage || 'en'], { type: 'language' }).of(viewerLanguage || 'en') || 'English';
      const res = await aiTranslatePostAction({ postContent: content, targetLanguage: targetLang });
      setTranslatedText(res.translation);
    } catch {
      toast({ variant: 'destructive', description: 'Translation failed' });
    } finally {
      setIsTranslating(false);
    }
  };

  const allImages = useMemo(() => {
    const list = [...images].filter(Boolean);
    if (image && !list.includes(image)) list.unshift(image);
    return list.filter(Boolean);
  }, [image, images]);

  const isSensitiveNode = settings.isSensitivityFilterActive && !isRevealedManually && !isOwner && !isCampaign && (allImages.length > 0 || !!videoUrl);

  const handleLike = () => { triggerHaptic(20); toggleLikePost($id); };
  const handleUnlike = () => { triggerHaptic(15); toggleUnlikePost($id); };
  const handleSave = () => { triggerHaptic(5); toggleSavePost($id); toast({ description: isBookmarked ? "Removed" : "Noted ✨" }); };

  const handleDelete = async () => {
    triggerHaptic(50);
    setIsDeleteDialogOpen(false);
    try {
      await deletePost($id);
      toast({ title: "Node Purged", description: "The vibe has been removed from the network." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Purge Failed", description: e.message });
    }
  };

  const handleVote = (optionIndex: number) => {
    if (isShared) return;
    triggerHaptic(10);
    voteOnPostPoll($id, optionIndex);
  };

  const handleHandshakeAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (amIFriend) unfriendUser(user.username);
    else if (sent) cancelFriendRequest(user.username);
    else if (received) confirmFriendRequest(user.username);
    else sendFriendRequest(user.username);
  };

  const renderHandshakeButton = () => {
    if (isOwner || isCampaign || isShared) return null;
    
    let label = t('friends_add_friend');
    let variant: "default" | "outline" | "secondary" = "default";
    let Icon = UserRoundPlus;

    if (amIFriend) {
      label = "Friends";
      variant = "secondary";
      Icon = UserRoundCheck;
    } else if (sent) {
      label = t('friends_request_sent');
      variant = "outline";
      Icon = Check;
    } else if (received) {
      label = t('friends_confirm').split(' ')[0];
      variant = "default";
      Icon = UserPlus;
    }

    return (
      <Button 
        size="sm" 
        variant={variant}
        className={cn(
          "h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-widest gap-1.5 transition-all group/hs",
          variant === "default" && "bg-primary text-white hover:bg-primary/90",
          (amIFriend || sent) && "hover:bg-destructive hover:text-white hover:border-destructive"
        )}
        onClick={handleHandshakeAction}
      >
        <span className={cn((amIFriend || sent) && "group-hover/hs:hidden")}>
          <Icon className="h-3 w-3" /> {label}
        </span>
        {(amIFriend || sent) && (
          <span className="hidden group-hover/hs:inline flex items-center gap-1">
            <UserRoundX className="h-3 w-3" /> {amIFriend ? "Unfriend" : "Cancel"}
          </span>
        )}
      </Button>
    );
  };

  if (isHidden) return null;

  return (
    <>
      <Card ref={cardRef} className={cn(
        "border-none shadow-sm overflow-hidden mb-4 transition-colors relative ring-1 ring-black/5 dark:ring-white/5",
        isShared ? "bg-secondary/20 shadow-none ring-0 border border-primary/10 rounded-2xl" : "bg-white dark:bg-card",
        isCampaign && "border-2 border-primary/20 shadow-xl shadow-primary/5",
        isBoosted && !isShared && "ring-2 ring-primary/20 shadow-lg shadow-primary/5"
      )}>
        {isPinned && !isShared && <div className="absolute top-0 right-0 z-10 p-1 px-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-bl-lg flex items-center gap-1 shadow-md"><Pin className="h-2 w-2 fill-current" /> {t('post_pin').split(' ')[0]}</div>}
        {isBoosted && !isShared && <div className="absolute top-0 left-0 z-10 p-1 px-3 bg-gradient-to-r from-primary to-accent text-white text-[8px] font-black uppercase tracking-widest rounded-br-lg flex items-center gap-1.5 shadow-md"><Zap className="h-2.5 w-2.5 fill-current animate-pulse" />{t('boost_active')}</div>}

        <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 p-3", isShared ? "pb-1" : "bg-white dark:bg-card")}>
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <Link href={isCampaign ? "#" : `/profile/${user.username}`}><Avatar className={cn("border border-primary/10 hover:opacity-80 transition-opacity", isShared ? "h-7 w-7" : "h-10 w-10")}><AvatarImage src={isCampaign ? "/icon.svg" : getAdaptivePreview(user.avatar, 'avatar', tier) || user.avatar} /><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar></Link>
              {!isShared && (authorIsOnline || authorLastSeenAt) && (
                <OnlineIndicator
                  isOnline={authorIsOnline}
                  lastSeenAt={authorLastSeenAt}
                  dotClassName="h-2.5 w-2.5"
                  className="absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-card rounded-full"
                />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <Link href={isCampaign ? "#" : `/profile/${user.username}`} className={cn("font-bold text-foreground hover:underline", isShared ? "text-xs" : "text-sm")}>{user.name}</Link>
                  {effectiveIsVerified && <CheckCircle2 className="h-3 w-3 text-primary fill-primary text-white" />}
                  {isCampaign && <Badge className="bg-primary text-white border-none text-[8px] font-black h-4 px-1.5 rounded ml-1 uppercase">{t('post_global_node')}</Badge>}
                </div>
                {renderHandshakeButton()}
              </div>
              {!isShared && <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><span>{time === "Just now" ? t('post_now') : time}</span><span>•</span><Badge variant="outline" className="p-0 h-auto font-normal text-[10px] uppercase border-0">{isCampaign ? t('post_global_node') : t('post_public')}</Badge></div>}
            </div>
          </div>
          
          {!isShared && !isCampaign && (
            <div className="flex items-center gap-0.5">
              {settings.playbackQuality === 'pro-hd' && videoUrl && (
                <Badge variant="outline" className="h-5 border-primary/20 bg-primary/5 text-primary text-[7px] font-black uppercase px-1.5 gap-1 mr-1">
                  <Gauge className="h-2 w-2" /> HD
                </Badge>
              )}
              <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full", isBookmarked && "text-primary")} onClick={handleSave}><Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} /></Button>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5"><DropdownMenuItem className="gap-2" onClick={() => setIsHidden(true)}><EyeOff className="h-4 w-4" />{t('post_hide')}</DropdownMenuItem>{isOwner && <DropdownMenuItem className="gap-2" onClick={() => { triggerHaptic(); togglePinPost($id); }}><Pin className="h-4 w-4" />{isPinned ? t('post_unpin') : t('post_pin')}</DropdownMenuItem>}{!isOwner && <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => { triggerHaptic(); setIsReportDialogOpen(true); }}><Flag className="h-4 w-4" />{t('post_report')}</DropdownMenuItem>}{isOwner && <><DropdownMenuSeparator /><DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={() => setIsDeleteDialogOpen(true)}><Trash2 className="h-4 w-4" />{t('post_purge')}</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>
            </div>
          )}
        </CardHeader>

        <CardContent className={cn("px-3 pb-2 space-y-2 relative", theme && !isShared ? theme + " py-12 px-8 text-center" : "bg-transparent")}>
          {isHiddenByLock ? (
            <div className="relative min-h-[380px] w-full rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center p-8 bg-secondary/20">
              <div className="absolute inset-0 bg-black/10 backdrop-blur-3xl" />
              <div className="relative z-10 flex flex-col items-center text-center space-y-5">
                <div className="h-16 w-16 bg-cyan-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-cyan-500/30"><Lock className="h-8 w-8" /></div>
                <div className="space-y-2"><h3 className="text-2xl font-black italic uppercase tracking-tighter">{t('post_locked_node')}</h3><p className="text-xs font-bold text-muted-foreground uppercase tracking-widest max-w-[240px]">Unlock this vibe to access the hub.</p></div>
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl h-14 px-10 font-black italic uppercase tracking-widest text-sm shadow-xl shadow-cyan-500/20 active:scale-95 gap-3" onClick={async () => { setIsUnlocking(true); try { await unlockPost($id, unlockPrice!); } catch (e: any) { toast({ variant: "destructive", title: "Unlock Failed", description: e.message }); } finally { setIsUnlocking(false); } }} disabled={isUnlocking}>{isUnlocking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}{t('post_unlock_for')} {unlockPrice} LD</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <RichText
                  content={translatedText || content || ''}
                  isShared={isShared}
                  theme={theme && !isShared ? theme : undefined}
                  linkPreview={!isShared && !translatedText ? linkPreview : undefined}
                />
                {showTranslateButton && (
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors mt-1", translatedText ? "text-primary" : "text-muted-foreground hover:text-primary")}
                  >
                    {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                    {isTranslating ? "Translating..." : translatedText ? "Show original" : "Translate"}
                  </button>
                )}
              </div>
              {poll && !theme && (
                <div className={cn("mt-3 p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-3", isShared && "p-2 scale-95 origin-top-left")}>
                  <div className="flex items-center justify-between">
                    <h4 className={cn("font-bold", isShared ? "text-xs" : "text-sm")}>{poll.question}</h4>
                    <span className={cn("text-muted-foreground font-bold tabular-nums", isShared ? "text-[9px]" : "text-[10px]")}>{(poll.totalVotes || 0).toLocaleString()} {poll.totalVotes === 1 ? "vote" : "votes"}</span>
                  </div>
                  <div className="space-y-2">{rankedPollOptions.map((option, i) => {
                    const p = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                    const isSelected = userVote === option.originalIndex;
                    return (
                      <button key={option.originalIndex} onClick={() => !isShared && handleVote(option.originalIndex)} className={cn("w-full relative h-10 rounded-lg border overflow-hidden transition-all", isSelected ? "border-primary bg-primary/10" : "border-primary/20 bg-white/40 dark:bg-white/5 hover:border-primary/40")}>
                        <div className="absolute inset-y-0 left-0 bg-primary/25 transition-all duration-700" style={{ width: `${p}%` }} />
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-sm">
                          <div className="flex items-center gap-2">
                            {isSelected && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                            <span className="font-medium truncate">{option.text}</span>
                          </div>
                          <span className="font-black text-primary text-[11px] flex-shrink-0 ml-2">{Math.round(p)}%</span>
                        </div>
                      </button>
                    );
                  })}</div>
                  {userVote !== null && !isShared && (
                    <p className="text-[9px] text-muted-foreground text-center font-bold uppercase tracking-widest">Tap your choice again to remove vote · Tap another to change</p>
                  )}
                </div>
              )}
              {allImages.length > 0 && (
                  <div className={cn("relative mt-2", isShared ? "-mx-1" : "-mx-3 sm:mx-0")}>
                    {allImages.length > 1 && <div className="absolute top-3 right-3 z-20 bg-black/40 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 text-white text-[10px] font-black">{currentSlide + 1}/{allImages.length}</div>}
                    <Carousel className="w-full" setApi={(api) => api?.on("select", () => setCurrentSlide(api.selectedScrollSnap()))}><CarouselContent>{allImages.map((img, i) => (<CarouselItem key={i}><div className="relative aspect-[4/5] overflow-hidden rounded-lg cursor-pointer" onClick={() => setSelectedImageUrl(img)}><IOSImage src={getAdaptivePreview(img, 'feed', tier) || img} alt="Post" className="w-full h-full object-cover" /></div></CarouselItem>))}</CarouselContent></Carousel>
                  </div>
              )}
              {videoUrl && (
                  <FeedVideo videoUrl={videoUrl} postId={$id} isShared={isShared} isReel={postType === 'reel'} />
              )}
            </>
          )}

          {sharedPost && !isShared && (
            <Link
              href={`/post/${sharedPost.$id}`}
              className="block mt-3 rounded-2xl overflow-hidden border border-primary/10 bg-secondary/20 hover:bg-secondary/40 transition-colors active:scale-[0.99] group/shared"
              onClick={(e) => e.stopPropagation()}
            >
              {(sharedPost.image || sharedPost.videoUrl) && (
                <div className="relative aspect-video w-full overflow-hidden">
                  {sharedPost.videoUrl && !sharedPost.image ? (
                    <>
                      <video
                        src={sharedPost.videoUrl}
                        className="h-full w-full object-cover group-hover/shared:scale-105 transition-transform duration-500"
                        muted
                        playsInline
                        preload="none"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <Image
                      src={getAdaptivePreview(sharedPost.image!, 'thumb', tier) || sharedPost.image!}
                      alt="Shared post"
                      fill
                      className="object-cover group-hover/shared:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              )}
              <div className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border border-primary/10 shrink-0">
                    <AvatarImage src={getAdaptivePreview(sharedPost.user?.avatar, 'avatar', tier) || sharedPost.user?.avatar} />
                    <AvatarFallback>{sharedPost.user?.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-black text-foreground uppercase tracking-widest truncate">{sharedPost.user?.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">@{sharedPost.user?.username}</span>
                </div>
                {sharedPost.content && (
                  <p className="text-[12px] text-muted-foreground line-clamp-2 leading-snug">{sharedPost.content}</p>
                )}
                <div className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest">
                  <ExternalLink className="h-3 w-3" />
                  View Original Post
                </div>
              </div>
            </Link>
          )}
        </CardContent>

        {isCampaign && !isShared && (
          <div className="px-3 pb-4 pt-1 bg-white dark:bg-card space-y-2.5">
            {campaignTitle && (
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary animate-pulse shrink-0" />
                <p className="text-[11px] font-black text-primary uppercase tracking-widest truncate">{campaignTitle}</p>
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black h-4 px-1.5 uppercase shrink-0">Sponsored</Badge>
              </div>
            )}
            {actionUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <LinkIcon className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  <span className="text-[10px] text-muted-foreground/60 truncate">{actionUrl}</span>
                </div>
                <a
                  href={actionUrl}
                  target={actionUrl.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); recordCampaignClick($id); }}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-white py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {actionLabel || 'Learn More'}
                </a>
              </div>
            ) : (
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); recordCampaignClick($id); }}
                className="flex items-center justify-center gap-2 w-full bg-primary/10 text-primary border border-primary/20 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-primary/20 active:scale-[0.98] transition-all"
              >
                <Zap className="h-3.5 w-3.5" />
                {actionLabel || 'Learn More'}
              </a>
            )}
          </div>
        )}

        {!isShared && !isCampaign && (
          <CardFooter className="p-1 px-3 flex flex-col gap-1 relative bg-white dark:bg-card">
            {isOwner && (
              <div className="w-full mb-2">
                {isBoosted && boostExpiry && boostExpiry > Date.now() ? (
                  <div className="bg-primary/10 rounded-xl p-3 flex items-center justify-between border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary animate-pulse" />
                      <span className="text-[9px] font-black text-primary uppercase">{t('boost_active')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/70">
                      <Clock className="h-3 w-3" />
                      <span>{Math.ceil((boostExpiry - Date.now()) / 86400000)} {Math.ceil((boostExpiry - Date.now()) / 86400000) === 1 ? 'day' : 'days'} left</span>
                    </div>
                  </div>
                ) : (
                  <BoostPortal nodeId={$id} type='POST'>
                    <Button variant="outline" className="w-full h-9 rounded-xl border-dashed border-primary/20 text-primary font-black uppercase text-[10px] gap-2 hover:bg-primary/5 transition-all">
                      <Rocket className="h-3 w-3" />{t('boost_title')}
                    </Button>
                  </BoostPortal>
                )}
              </div>
            )}
            <div className="px-1 pt-2 pb-1 flex items-center justify-between w-full text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/50 border-t border-primary/5">
              <div className="flex items-center gap-3">
                <span className={cn("flex items-center gap-1.5", isLiked && "text-primary")}>
                  <ThumbsUp className={cn("h-3 w-3 transition-transform duration-200", isLiked && "fill-current", animField === 'likes' && "scale-125")} />
                  <span className={cn(animField === 'likes' && "animate-count-pop")} key={`likes-${liveCounts.likes}`}>{liveCounts.likes.toLocaleString()}</span>
                </span>
                <span className={cn("flex items-center gap-1.5", isUnliked && "text-destructive")}>
                  <ThumbsDown className={cn("h-3 w-3 transition-transform duration-200", isUnliked && "fill-current", animField === 'unlikes' && "scale-125")} />
                  <span className={cn(animField === 'unlikes' && "animate-count-pop")} key={`unlikes-${liveCounts.unlikes}`}>{liveCounts.unlikes.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors" onClick={() => openCommentHub($id)}>
                  <MessageCircle className={cn("h-3 w-3 transition-transform duration-200", animField === 'comments' && "scale-125")} />
                  <span className={cn(animField === 'comments' && "animate-count-pop")} key={`comments-${liveCounts.comments}`}>{liveCounts.comments.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1.5"><Eye className="h-3 w-3" />{views.toLocaleString()}</span>
                <span className="flex items-center gap-1.5">
                  <Share2 className={cn("h-3 w-3 transition-transform duration-200", animField === 'shares' && "scale-125")} />
                  <span className={cn(animField === 'shares' && "animate-count-pop")} key={`shares-${liveCounts.shares}`}>{liveCounts.shares.toLocaleString()}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1 w-full pt-1">
              <button className={cn("flex-1 flex items-center justify-center gap-2 rounded-md h-9 font-bold text-xs transition-all", isLiked ? "text-primary bg-primary/5" : "text-muted-foreground")} onClick={handleLike}><ThumbsUp className="h-4 w-4" /> {t('post_like')}</button>
              <button className={cn("flex-1 flex items-center justify-center gap-2 rounded-md h-9 font-bold text-xs transition-all", isUnliked ? "text-destructive bg-destructive/5" : "text-muted-foreground")} onClick={handleUnlike}><ThumbsDown className="h-4 w-4" /> {t('post_unlike')}</button>
              <button className="flex-1 flex items-center justify-center gap-2 rounded-md h-9 font-bold text-xs text-muted-foreground" onClick={() => openCommentHub($id)}><MessageCircle className="h-4 w-4" /> {t('post_comment')}</button>
              {isEligibleForGift && !isOwner && (
                <button className="flex-1 flex items-center justify-center gap-2 rounded-md h-9 font-bold text-xs text-muted-foreground hover:text-primary transition-all" onClick={() => openGiftHub({ $id: user.$id || user.username, name: user.name, username: user.username, avatar: user.avatar, role: user.role as any, isVerified: user.isVerified, followers: user.followers })}><Gift className="h-4 w-4" /> {t('post_gift')}</button>
              )}
              <button className="flex-1 flex items-center justify-center gap-2 rounded-md h-9 font-bold text-xs text-muted-foreground" onClick={() => setIsShareHubOpen(true)}><Share2 className="h-4 w-4" /> {t('post_share')}</button>
            </div>
          </CardFooter>
        )}
      </Card>
      <ShareHub isOpen={isShareHubOpen} onClose={() => setIsShareHubOpen(false)} post={props} />

      <Dialog open={isReportDialogOpen} onOpenChange={(open) => { setIsReportDialogOpen(open); if (!open) { setReportReason(''); setReportDetails(''); } }}>
        <DialogContent className="rounded-[2rem] sm:max-w-[420px]">
          <DialogHeader>
            <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-4">
              <Flag className="h-8 w-8" />
            </div>
            <DialogTitle className="font-black italic uppercase tracking-tighter text-2xl text-center">{t('post_report')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('post_report_reason')} *</label>
              <select
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
              >
                <option value="">{t('post_report_placeholder')}</option>
                <option value="spam">Spam or misleading</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="hate_speech">Hate speech</option>
                <option value="violence">Violence or dangerous content</option>
                <option value="misinformation">Misinformation</option>
                <option value="nudity">Nudity or sexual content</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('post_report_details')}</label>
              <Textarea
                placeholder={t('post_report_placeholder')}
                className="rounded-xl resize-none min-h-[90px] text-sm"
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-2">
            <Button variant="secondary" className="rounded-xl h-12 font-bold" onClick={() => { setIsReportDialogOpen(false); setReportReason(''); setReportDetails(''); }}>{t('post_cancel')}</Button>
            <Button
              className="rounded-xl h-12 font-black italic uppercase bg-destructive hover:bg-destructive/90 text-white"
              disabled={!reportReason || isReportSubmitting}
              onClick={async () => {
                if (!reportReason) return;
                setIsReportSubmitting(true);
                try {
                  await submitReport({ reportedUsername: user.username, reason: reportReason, details: reportDetails });
                  setIsReportDialogOpen(false);
                  setReportReason('');
                  setReportDetails('');
                } finally {
                  setIsReportSubmitting(false);
                }
              }}
            >
              {isReportSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('post_report_submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent className="rounded-[2rem] sm:max-w-[420px]"><AlertDialogHeader><div className="mx-auto h-16 w-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-4"><Trash2 className="h-8 w-8" /></div><AlertDialogTitle className="font-black italic uppercase tracking-tighter text-3xl text-center">{t('post_purge')}?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6"><AlertDialogCancel className="rounded-xl h-12 font-bold bg-secondary/50">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="rounded-xl h-12 font-black italic uppercase bg-destructive text-white">Confirm Purge</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

    </>
  );
}
