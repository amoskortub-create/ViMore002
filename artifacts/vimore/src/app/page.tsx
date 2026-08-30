
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { PostCard } from "@/components/post/post-card";
import { Stories } from "@/components/feed/stories";
import { SuggestedFollows } from "@/components/feed/suggested-follows";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { MainNav } from "@/components/layout/main-nav";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { Rocket, Loader2, Mail, ChevronUp, WifiOff, CheckCircle2, Zap, Play, Music2, Sparkles, Store } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { CreateStoryModal } from "@/components/feed/create-story-modal";
import { useFeedSignal } from "@/context/FeedSignalContext";
import { AcronymRibbon } from "@/components/branding/acronym-meaning";
import { listAllStores, isStoreBoosted, getStoreLogoUrl } from "@/lib/stores";
import { cached } from "@/lib/client-cache";

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function FeedMusicStrip() {
  const { globalSongs, playCollection, triggerHaptic } = useMusic();
  const router = useRouter();
  const seed = useRef(Math.floor(Math.random() * 0x7fffffff));

  const boostedTracks = useMemo(() => {
    const boosted = globalSongs.filter((s) => s.isBoosted);
    return seededShuffle(boosted, seed.current).slice(0, 10);
  }, [globalSongs]);

  if (boostedTracks.length === 0) return null;

  const handlePlay = (idx: number) => {
    triggerHaptic(20);
    playCollection(boostedTracks, idx);
    router.push("/music");
  };

  return (
    <div className="bg-white dark:bg-card rounded-[2rem] overflow-hidden border border-border/40 shadow-sm">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow">
            <Zap className="h-3.5 w-3.5 text-white fill-white" />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-tight leading-none">Trending Music</p>
            <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5">Boosted Tracks</p>
          </div>
        </div>
        <Link href="/music" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
          See All
        </Link>
      </div>
      <div className="overflow-x-auto pb-4 pt-2 px-4 scrollbar-none">
        <div className="flex gap-3 w-max">
          {boostedTracks.map((track, idx) => (
            <button
              key={track.id}
              onClick={() => handlePlay(idx)}
              className="flex flex-col items-start w-[120px] group active:scale-95 transition-transform"
            >
              <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-muted mb-2 shadow-sm">
                {track.cover ? (
                  <Image src={track.cover} alt={track.title} fill className="object-cover" sizes="120px" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-900/30 flex items-center justify-center">
                    <Music2 className="w-8 h-8 text-primary/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10 group-active:bg-black/30 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 text-primary fill-primary ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-1.5 left-1.5">
                  <span className="text-[7px] font-black uppercase tracking-widest bg-primary text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Zap className="w-2 h-2 fill-white" /> HOT
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-black truncate w-full text-left leading-tight">{track.title}</p>
              <p className="text-[10px] text-muted-foreground truncate w-full text-left">{track.artist}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedStoreStrip() {
  const router = useRouter();
  const [boostedStores, setBoostedStores] = useState<any[]>([]);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const seed = useRef(Math.floor(Math.random() * 0x7fffffff));

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '600px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isNearViewport) return;
    cached('feed:boosted-stores', () => listAllStores(60), 2 * 60 * 1000)
      .then((all) => {
        const boosted = all.filter(isStoreBoosted);
        setBoostedStores(seededShuffle(boosted, seed.current));
      })
      .catch(() => {});
  }, [isNearViewport]);

  if (!isNearViewport || boostedStores.length === 0) return <div ref={sectionRef} className="min-h-2" aria-hidden="true" />;

  return (
    <div ref={sectionRef} className="bg-white dark:bg-card rounded-[2rem] overflow-hidden border border-border/40 shadow-sm">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-tight leading-none">Featured Stores</p>
            <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-0.5">Boosted to top</p>
          </div>
        </div>
        <Link href="/marketplace" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
          See All
        </Link>
      </div>
      <div className="overflow-x-auto pb-4 pt-2 px-4 scrollbar-none">
        <div className="flex gap-3 w-max">
          {boostedStores.map((store) => (
            <button
              key={store.$id}
              onClick={() => router.push(`/marketplace/store/${store.$id}`)}
              className="flex flex-col items-start w-[140px] group active:scale-95 transition-transform"
            >
              <div className="relative w-[140px] h-[100px] rounded-2xl overflow-hidden bg-gradient-to-br from-amber-400/10 to-orange-500/10 border border-amber-200/40 dark:border-amber-700/30 mb-2 flex items-center justify-center">
                {store.logo_file_id ? (
                  <Image src={getStoreLogoUrl(store.logo_file_id)} alt={store.store_name} fill className="object-cover" sizes="140px" />
                ) : (
                  <Store className="w-8 h-8 text-amber-500/50" />
                )}
                <div className="absolute top-1.5 right-1.5">
                  <span className="text-[7px] font-black uppercase tracking-widest bg-amber-400 text-white px-1.5 py-0.5 rounded-full">
                    ✨ Featured
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-black truncate w-full text-left leading-tight">{store.store_name}</p>
              <p className="text-[9px] text-muted-foreground truncate w-full text-left">{store.category}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmailVerificationGate({ email }: { email?: string }) {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const { logout } = usePosts();
  const { t } = useTranslation();

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const verifyUrl = window.location.origin + '/auth/verify';
      await account.createVerification(verifyUrl);
      setResendSent(true);
    } catch { /* ignore */ } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="h-24 w-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500/20">
          <Mail className="h-12 w-12 text-amber-400" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{t('home_verify_title')}</h2>
          <p className="text-white/60 font-medium text-sm leading-relaxed">
            Your account is not verified yet.{email && <> Check <span className="font-bold text-white">{email}</span> for</>} the verification link we sent when you signed up.
          </p>
          <p className="text-white/30 text-xs font-medium">Check your spam folder if you don't see it.</p>
        </div>
        {resendSent ? (
          <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span className="text-sm font-bold text-green-400">Verification email sent! Check your inbox.</span>
          </div>
        ) : (
          <Button
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full h-12 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-sm"
          >
            {resendLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('home_resend_btn')}
          </Button>
        )}
        <button
          onClick={() => logout()}
          className="w-full text-sm font-bold text-white/30 hover:text-white/60 transition-colors py-1"
        >
          {t('home_sign_out')}
        </button>
      </div>
    </div>
  );
}

const FEED_CACHE_KEY = 'vimore_feed_cache_v1';
const MAX_CACHED_POSTS = 15;

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const { posts, campaigns, isLoading, initError, followingUsernames, friendUsernames, seenPostIds, isAuthenticated, isOffline, currentUser, triggerHaptic, loadMoreFeed, hasMoreFeed, isFeedLoading } = usePosts();
  const { currentTrack, isExpanded } = useMusic();
  const { newFollowingPostsCount, clearNewPosts, uploadProgress } = useFeedSignal();
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  const [cachedPosts, setCachedPosts] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(FEED_CACHE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const loadTriggerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const feedTopRef = useRef<HTMLDivElement | null>(null);
  const weights = useRef<Record<string, number>>({});
  const sessionSeen = useRef<Set<string>>(new Set());
  const isLoadingMoreRef = useRef(false);

  const isPlayerActive = currentTrack && !isExpanded;

  useEffect(() => {
    if (!isLoading && sessionSeen.current.size === 0) {
      seenPostIds.forEach(id => sessionSeen.current.add(id));
    }
  }, [isLoading, seenPostIds]);

  useEffect(() => {
    if (posts.length === 0 || isOffline) return;
    try {
      const toCache = posts.slice(0, MAX_CACHED_POSTS).map((p: any) => ({
        $id: p.$id,
        user: p.user,
        content: p.content,
        image: p.image,
        videoUrl: p.videoUrl,
        likes: p.likes,
        unlikes: p.unlikes,
        comments: p.comments,
        views: p.views,
        time: p.time,
        type: p.type,
        isBoosted: p.isBoosted,
        isLocked: p.isLocked,
        unlockPrice: p.unlockPrice,
        linkPreview: p.linkPreview,
      }));
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(toCache));
      setCachedPosts(toCache);
    } catch {}
  }, [posts, isOffline]);

  const shuffledBoostedRegular = useMemo(() => {
    const boosted = posts.filter(p => p.isBoosted && p.type !== 'reel');
    return [...boosted].sort(() => Math.random() - 0.5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  const shuffledBoostedReels = useMemo(() => {
    const boosted = posts.filter(p => p.isBoosted && p.type === 'reel');
    return [...boosted].sort(() => Math.random() - 0.5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  const organicSorted = useMemo(() => {
    const regular = posts.filter(p => !p.isBoosted);
    regular.forEach(p => { if (!(p.$id in weights.current)) weights.current[p.$id] = Math.random(); });

    const freshPosts = regular.filter(p => p.time === 'Just now');
    const freshIds = new Set(freshPosts.map(p => p.$id));

    const stableSort = (arr: any[]) => [...arr].sort((a, b) => weights.current[a.$id] - weights.current[b.$id]);

    // Unseen posts from users the current user follows OR is friends with
    const followingFriendUnseen = regular.filter(p =>
      !freshIds.has(p.$id) &&
      (followingUsernames.has(p.user.username) || friendUsernames.has(p.user.username) || p.user.username === currentUser?.username) &&
      !sessionSeen.current.has(p.$id)
    );
    const followingFriendIds = new Set(followingFriendUnseen.map(p => p.$id));

    // Unseen public posts (not from following/friends)
    const publicUnseen = regular.filter(p =>
      !freshIds.has(p.$id) &&
      !followingFriendIds.has(p.$id) &&
      !sessionSeen.current.has(p.$id)
    );

    // Already-seen posts (shown last)
    const seenNodes = regular.filter(p =>
      !freshIds.has(p.$id) &&
      sessionSeen.current.has(p.$id)
    );

    return [...freshPosts, ...stableSort(followingFriendUnseen), ...stableSort(publicUnseen), ...stableSort(seenNodes)];
  }, [posts, followingUsernames, friendUsernames, currentUser]);

  const shuffledFeedCampaigns = useMemo(() => {
    const active = campaigns.filter((c: any) => c.is_active && c.placement === 'feed');
    return [...active].sort(() => Math.random() - 0.5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length]);

  const feedItems = useMemo(() => {
    if (posts.length === 0) return [];
    const result: any[] = [];
    let totalOrganicCount = 0;
    let organicPostCount = 0;
    let organicReelCount = 0;
    let boostedRegularIdx = 0;
    let boostedReelIdx = 0;
    let campaignIdx = 0;
    let suggestionsInserted = false;
    let musicStripInserted = false;
    let storeStripInserted = false;

    // Pre-pick random insertion positions for suggestion cards so they feel natural
    const totalLen = Math.max(organicSorted.length, 9);
    const third = Math.floor(totalLen / 3);
    const storePos = 3 + Math.floor(Math.random() * Math.max(1, third - 3));
    const suggestPos = third + Math.floor(Math.random() * Math.max(1, third));
    const musicPos = third * 2 + Math.floor(Math.random() * Math.max(1, third));

    for (let i = 0; i < organicSorted.length; i++) {
      const item = organicSorted[i];
      const isReel = item.type === 'reel';
      result.push({ type: 'post', data: item });
      totalOrganicCount++;

      // Random placement for suggestion strips
      if (totalOrganicCount >= storePos && !storeStripInserted) {
        result.push({ type: 'store-strip', id: 'store-strip-rand' });
        storeStripInserted = true;
      }
      if (totalOrganicCount >= suggestPos && !suggestionsInserted) {
        result.push({ type: 'suggestions', id: 'suggested-follows-rand' });
        suggestionsInserted = true;
      }
      if (totalOrganicCount >= musicPos && !musicStripInserted) {
        result.push({ type: 'music-strip', id: 'music-strip-rand' });
        musicStripInserted = true;
      }

      // After every 3 organic items → campaign ad (randomized order)
      if (totalOrganicCount % 3 === 0 && shuffledFeedCampaigns.length > 0) {
        result.push({ type: 'campaign', data: shuffledFeedCampaigns[campaignIdx % shuffledFeedCampaigns.length] });
        campaignIdx++;
      }

      // Random ~1-in-5 chance to inject a boosted reel after at least 3 organic reels
      if (isReel) {
        organicReelCount++;
        if (organicReelCount > 2 && shuffledBoostedReels.length > 0 && Math.random() < 0.2) {
          result.push({ type: 'boost', data: shuffledBoostedReels[boostedReelIdx % shuffledBoostedReels.length] });
          boostedReelIdx++;
        }
      } else {
        // Random ~1-in-5 chance to inject a boosted post after at least 3 organic posts
        organicPostCount++;
        if (organicPostCount > 2 && shuffledBoostedRegular.length > 0 && Math.random() < 0.2) {
          result.push({ type: 'boost', data: shuffledBoostedRegular[boostedRegularIdx % shuffledBoostedRegular.length] });
          boostedRegularIdx++;
        }
      }
    }

    // Always place the load-more trigger at the end so it fires every time
    // the user reaches the bottom, regardless of how many posts are loaded.
    result.push({ type: 'load-trigger', id: 'load-trigger-end' });

    return result;
  }, [organicSorted, posts, shuffledFeedCampaigns, shuffledBoostedRegular, shuffledBoostedReels]);

  // Observe the load-trigger element (fires when user reaches the 14th post)
  useEffect(() => {
    const el = loadTriggerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreFeed && !isFeedLoading && !isLoadingMoreRef.current) {
        isLoadingMoreRef.current = true;
        triggerHaptic(5);
        loadMoreFeed().finally(() => { isLoadingMoreRef.current = false; });
      }
    }, { threshold: 0.1, rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [feedItems, hasMoreFeed, isFeedLoading, loadMoreFeed, triggerHaptic]);

  // Redirect unauthenticated users to login once loading finishes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isOffline) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, isOffline, router]);

  // MANDATORY HANDSHAKE: Do not materialize feed if profile fetch is pending or failed
  if (isLoading) {
    return null; // Let the AppLoadingGate handle the kinetic splash
  }

  // If a critical vault error occurred, the AppLoadingGate will show it.
  if (initError) {
    return null;
  }

  // Not authenticated and not in offline mode — redirect handled by effect above
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#080808] flex flex-col items-center transition-colors duration-300">
      <Header />
      <SubHeader />

      {isOffline && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
            {cachedPosts.length > 0
              ? `No internet access — showing ${cachedPosts.length} cached posts`
              : t('home_offline')}
          </span>
        </div>
      )}
      
      <div className={cn(
        "w-full max-w-[1440px] grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-8 px-4 transition-all duration-300",
        "pt-6"
      )}>
        <aside className={cn(
          "hidden lg:block sticky h-[calc(100vh-132px)] overflow-y-auto transition-all duration-300",
          "top-[132px]"
        )}>
          <MainNav />
        </aside>

        <main className="flex flex-col gap-4 w-full max-w-[680px] mx-auto">
          <div ref={feedTopRef} />
          <Stories onOpenCreate={() => setIsStoryModalOpen(true)} />

          {uploadProgress !== null && (
            <div className="px-4 pb-1 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {uploadProgress < 100 ? "Syncing node to vault..." : "Node synchronized!"}
                </span>
                <span className="text-[10px] font-black text-primary tabular-nums">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}

          {/* New Posts floating pill */}
          {newFollowingPostsCount > 0 && (
            <div className="sticky top-[76px] z-30 flex justify-center pointer-events-none">
              <button
                className="pointer-events-auto flex items-center gap-2 bg-primary text-white text-[11px] font-black uppercase tracking-[0.15em] px-5 py-2.5 rounded-full shadow-xl shadow-primary/30 animate-badge-pop hover:scale-105 active:scale-95 transition-transform"
                onClick={() => {
                  clearNewPosts();
                  feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <ChevronUp className="h-3.5 w-3.5" />
                {newFollowingPostsCount} New {newFollowingPostsCount === 1 ? 'Post' : 'Posts'}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {posts.length > 0 ? (
              <>
                {feedItems.map((item, idx) => {
                  if (item.type === 'suggestions') return <SuggestedFollows key={item.id} />;

                  if (item.type === 'music-strip') return <FeedMusicStrip key={item.id} />;

                  if (item.type === 'store-strip') return <FeedStoreStrip key={item.id} />;

                  if (item.type === 'load-trigger') {
                    return <div key={item.id} ref={loadTriggerRef} className="h-1" />;
                  }

                  if (item.type === 'campaign') {
                    return (
                      <PostCard
                        key={`campaign-${item.data.$id}-${idx}`}
                        $id={item.data.$id}
                        isCampaign={true}
                        user={{ name: "ViMore Official", username: "vimore", avatar: "/icon.svg", isVerified: true, role: "Global Node" }}
                        content={item.data.content}
                        image={item.data.type === 'photo' ? item.data.media_url : undefined}
                        videoUrl={item.data.type === 'video' ? item.data.media_url : undefined}
                        campaignTitle={item.data.title}
                        actionUrl={item.data.action_url}
                        actionLabel={item.data.action_label}
                        likes={1420}
                        unlikes={0}
                        comments={0}
                        views={0}
                        time="Now"
                      />
                    );
                  }

                  if (item.type === 'boost') {
                    return <PostCard key={`boost-${item.data.$id}-${idx}`} {...item.data} />;
                  }

                  return <PostCard key={`post-${item.data.$id}`} {...item.data} />;
                })}
                {isFeedLoading && (
                  <div className="flex flex-col gap-1 w-full">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`feed-skeleton-${i}`} className="bg-white dark:bg-card rounded-[2rem] overflow-hidden animate-pulse">
                        <div className="flex items-center gap-3 p-4">
                          <div className="w-10 h-10 rounded-full bg-secondary/50 flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-secondary/50 rounded-full w-32" />
                            <div className="h-2.5 bg-secondary/40 rounded-full w-20" />
                          </div>
                        </div>
                        <div className="aspect-[4/5] bg-secondary/30 w-full" />
                        <div className="p-4 space-y-2">
                          <div className="h-3 bg-secondary/40 rounded-full w-3/4" />
                          <div className="h-3 bg-secondary/30 rounded-full w-1/2" />
                          <div className="flex items-center gap-4 pt-2">
                            <div className="h-8 w-16 bg-secondary/30 rounded-full" />
                            <div className="h-8 w-16 bg-secondary/30 rounded-full" />
                            <div className="h-8 w-16 bg-secondary/30 rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={endRef} className="h-10 flex items-center justify-center">
                  {!isFeedLoading && !hasMoreFeed && (
                    <div className="text-muted-foreground/20 text-[8px] font-black uppercase tracking-[0.5em]">Network End</div>
                  )}
                </div>
                {!isFeedLoading && !hasMoreFeed && (
                  <AcronymRibbon className="mt-4 rounded-[1.5rem]" />
                )}
              </>
            ) : isOffline && cachedPosts.length > 0 ? (
              <>
                {cachedPosts.map((post: any) => (
                  <PostCard key={`cached-${post.$id}`} {...post} />
                ))}
                <div className="py-6 flex flex-col items-center gap-2 text-center">
                  <WifiOff className="h-6 w-6 text-amber-500/50" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                    End of cached feed — connect to load more
                  </p>
                </div>
              </>
            ) : !isLoading && (
              <div className="py-32 text-center bg-white dark:bg-card rounded-[2.5rem] border border-dashed border-primary/10 shadow-sm flex flex-col items-center justify-center space-y-6 px-12 animate-in fade-in zoom-in duration-700">
                <div className="h-24 w-24 bg-primary/5 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-primary/20">
                  <Rocket className="h-10 w-10 text-primary/40 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">{t('home_empty_title')}</h3>
                  <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">{t('home_empty_desc')}</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className={cn(
          "hidden lg:block sticky h-[calc(100vh-132px)] overflow-y-auto transition-all duration-300",
          "top-[132px]"
        )}>
          <RightSidebar />
        </aside>
      </div>

      <CreateStoryModal isOpen={isStoryModalOpen} onClose={() => setIsStoryModalOpen(false)} />
    </div>
  );
}
