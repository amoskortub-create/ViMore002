
"use client";

import { useState, useEffect, useMemo } from "react";
import { MainNav } from "@/components/layout/main-nav";
import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OnlineIndicator } from "@/components/ui/online-indicator";
import { useMusic } from "@/context/MusicContext";
import { usePosts } from "@/context/PostContext";
import { useTranslation } from "@/context/LanguageContext";
import { databases, Query, COL, DATABASE_ID, BUCKET, getFileUrl } from "@/lib/appwrite";
import { 
  Search, 
  TrendingUp, 
  Users, 
  ChevronRight,
  Flame,
  Star,
  Rocket,
  UserRoundPlus,
  Check,
  UserRoundX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview } from "@/lib/adaptive-media";

export default function ExplorePage() {
  const router = useRouter();
  const { currentTrack, isExpanded, triggerHaptic } = useMusic();
  const { settings, posts, currentUser, isFriend, isRequestSent, isRequestReceived, sendFriendRequest, cancelFriendRequest } = usePosts();
  const { t } = useTranslation();
  const { tier } = useNetwork();
  const isPlayerActive = currentTrack && !isExpanded;

  const [realCreators, setRealCreators] = useState<{
    $id: string;
    name: string;
    username: string;
    avatar: string;
    category: string;
    isVerified: boolean;
    isOnline: boolean;
    lastSeenAt: string | null;
  }[]>([]);

  useEffect(() => {
    databases.listDocuments(DATABASE_ID, COL.USERS, [
      Query.orderDesc('followers_count'),
      Query.limit(20),
    ]).then(res => {
      setRealCreators(res.documents.map((u: any) => ({
        $id: u.$id,
        name: u.name || 'User',
        username: u.username || 'user',
        avatar: u.avatar_id ? getFileUrl(BUCKET.AVATARS, u.avatar_id) : '',
        category: u.category || 'Creator',
        isVerified: u.is_verified || false,
        isOnline: u.is_online || false,
        lastSeenAt: u.last_seen_at || null,
      })));
    }).catch(() => {});
  }, []);

  const trendingTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach(p => {
      const tags = p.content.match(/#[\w]+/g) || [];
      tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });
    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag]) => tag);
    return sorted.length > 0 ? sorted : ['#ViMoreVibes', '#Creators', '#Connect', '#Digital'];
  }, [posts]);

  const hubCategories = useMemo(() => {
    const catCounts: Record<string, number> = {};
    posts.forEach(p => { if (p.user.category) catCounts[p.user.category] = (catCounts[p.user.category] || 0) + 1; });
    const icons: Record<string, string> = { Music: '🎵', Tech: '💻', Art: '🎨', Design: '🎨', Photography: '📸', Writing: '✍️', Fashion: '👗', Sports: '⚽', Comedy: '😂', Gaming: '🎮' };
    const entries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (entries.length > 0) {
      return entries.map(([name, count]) => ({ name: `${name} Hub`, members: count > 999 ? `${(count / 1000).toFixed(1)}k` : String(count), icon: icons[name] || '🌟' }));
    }
    return [{ name: 'Creators Hub', members: String(realCreators.length), icon: '🌟' }];
  }, [posts, realCreators]);

  // Filter out self, existing friends, and pending requests in either direction
  const suggestedCreators = useMemo(() => {
    if (!currentUser) return realCreators;
    return realCreators.filter(c =>
      c.username !== currentUser.username &&
      !isFriend(c.username) &&
      !isRequestSent(c.username) &&
      !isRequestReceived(c.username)
    );
  }, [realCreators, currentUser, isFriend, isRequestSent, isRequestReceived]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#080808] transition-colors duration-300">
      <Header />
      <SubHeader />

      <div className={cn(
        "max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 px-4 transition-all duration-300",
        "pt-6"
      )}>
        {/* Left Navigation */}
        <aside className={cn(
          "hidden lg:block sticky h-[calc(100vh-132px)] transition-all duration-300",
          "top-[132px]"
        )}>
          <MainNav />
        </aside>

        {/* Explore Hub */}
        <main className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Top Search Bar (Mobile/Explore specific) */}
          <div className="relative group max-w-2xl mx-auto w-full lg:hidden">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={t('explore_search')} 
              className="pl-12 h-14 rounded-2xl bg-white dark:bg-card border-none shadow-sm focus-visible:ring-2 ring-primary/20 text-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Trending Tags */}
            <div className="md:col-span-1 bg-white dark:bg-card border border-primary/10 rounded-3xl p-6 flex flex-col shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="font-black italic uppercase tracking-tighter text-lg">{t('explore_trending')}</h3>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                {trendingTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => router.push(`/hashtag/${encodeURIComponent(tag.replace('#', ''))}`)}
                    className="flex items-center justify-between group"
                  >
                    <span className="font-bold text-sm text-muted-foreground group-hover:text-primary transition-colors">{tag}</span>
                    <TrendingUp className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-primary font-bold text-xs uppercase tracking-widest">{t('explore_see_all_tags')}</Button>
            </div>

            {/* 2. Rising Stars compact tile */}
            <div className="md:col-span-1 bg-white dark:bg-card border border-primary/10 rounded-3xl p-6 flex items-center justify-between shadow-lg group hover:bg-primary/5 transition-colors">
               <div className="space-y-1">
                 <div className="flex items-center gap-2">
                   <Star className="h-4 w-4 text-yellow-500 fill-current" />
                   <h3 className="font-black italic uppercase tracking-tighter">{t('explore_rising_stars')}</h3>
                 </div>
                 <p className="text-xs text-muted-foreground font-medium">{t('explore_rising_stars_desc')}</p>
               </div>
               <div className="flex -space-x-3">
                 {realCreators.slice(0, 3).map((c, i) => (
                   <div key={i} className="relative">
                     <Avatar className="h-10 w-10 border-4 border-white dark:border-card">
                       <AvatarImage src={getAdaptivePreview(c.avatar, 'avatar', tier) || c.avatar} />
                       <AvatarFallback>{c.name[0]}</AvatarFallback>
                     </Avatar>
                     <OnlineIndicator
                       isOnline={c.isOnline && !settings.isGhostMode}
                       lastSeenAt={c.lastSeenAt}
                       dotClassName="h-2.5 w-2.5"
                       className="absolute -bottom-0.5 -right-0.5"
                     />
                   </div>
                 ))}
               </div>
            </div>

            {/* 3. Growth Hub */}
            <Link href="/referrals" className="md:col-span-1 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 rounded-3xl p-6 flex flex-col justify-between text-white shadow-xl group hover:shadow-yellow-500/20 transition-all">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                  <Rocket className="h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-white/20 border-none text-[10px] font-black uppercase">{t('explore_earn_stars')}</Badge>
              </div>
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter">{t('explore_growth_hub')}</h3>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{t('explore_growth_hub_desc')}</p>
              </div>
            </Link>

            {/* 4. Communities Hub */}
            <div className="md:col-span-3 bg-white dark:bg-card border border-primary/10 rounded-3xl p-6 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-black italic uppercase tracking-tighter text-lg">{t('explore_active_hubs')}</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {hubCategories.map((hub) => (
                  <div key={hub.name} className="p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group flex flex-col items-center text-center gap-2">
                    <span className="text-2xl transition-transform group-hover:scale-125 duration-300">{hub.icon}</span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold truncate max-w-[100px]">{hub.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{hub.members} creators</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* People You May Know — filtered, Add Friend buttons */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black italic uppercase tracking-tighter text-xl">{t('explore_people_know')}</h3>
              <Link href="/friends?tab=add">
                <Button variant="ghost" size="sm" className="text-primary font-bold text-xs uppercase tracking-widest">See all</Button>
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
              {suggestedCreators.length === 0 ? (
                <div className="w-full py-12 text-center">
                  <p className="text-sm text-muted-foreground font-bold">You're all caught up — no new people to add right now.</p>
                </div>
              ) : suggestedCreators.map((creator) => {
                const sent = isRequestSent(creator.username);
                return (
                  <div key={creator.username} className="min-w-[180px] bg-white dark:bg-card p-6 rounded-3xl border border-primary/5 shadow-sm flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow group">
                    <div className="relative">
                      <Link href={`/profile/${creator.username}`}>
                        <Avatar className="h-16 w-16 border-2 border-primary/10 transition-transform group-hover:scale-110">
                          <AvatarImage src={getAdaptivePreview(creator.avatar, 'avatar', tier) || creator.avatar} />
                          <AvatarFallback>{creator.name[0]}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <OnlineIndicator
                        isOnline={creator.isOnline && !settings.isGhostMode}
                        lastSeenAt={creator.lastSeenAt}
                        dotClassName="h-3 w-3"
                        className="absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-card rounded-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Link href={`/profile/${creator.username}`} className="font-bold text-sm block hover:underline">{creator.name}</Link>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{creator.category}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={sent ? "outline" : "default"}
                      className={cn(
                        "w-full rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest gap-1.5 group/hs",
                        sent
                          ? "border-primary/20 text-primary hover:bg-destructive hover:text-white hover:border-destructive"
                          : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                      )}
                      onClick={() => {
                        triggerHaptic(15);
                        sent ? cancelFriendRequest(creator.username) : sendFriendRequest(creator.username);
                      }}
                    >
                      <span className={cn(sent && "group-hover/hs:hidden flex items-center gap-1")}>
                        {sent ? <><Check className="h-3 w-3" /> Sent</> : <><UserRoundPlus className="h-3 w-3" /> Add Friend</>}
                      </span>
                      {sent && (
                        <span className="hidden group-hover/hs:flex items-center gap-1">
                          <UserRoundX className="h-3 w-3" /> Cancel
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
