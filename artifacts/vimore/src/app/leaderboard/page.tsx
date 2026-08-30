"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, CheckCircle2, Crown, TrendingUp, Users, Star, Eye, Gem } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePosts } from "@/context/PostContext";
import { databases, COL, DATABASE_ID, Query } from "@/lib/appwrite";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ProfileLoading from "../profile/loading";

type SortKey = 'followers' | 'posts' | 'views';

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Users }[] = [
  { key: 'followers', label: 'Followers', icon: Users },
  { key: 'posts',     label: 'Posts',     icon: Eye },
  { key: 'views',     label: 'Views',     icon: TrendingUp },
];

export default function VerifiedLeaderboardPage() {
  const { allUsers, currentUser, isLoading } = usePosts();
  const [sortBy, setSortBy]       = useState<SortKey>('followers');
  const [viewTotals, setViewTotals] = useState<Record<string, number>>({});
  const [viewsLoading, setViewsLoading] = useState(false);

  const verifiedUsers = useMemo(
    () => allUsers.filter(u => u.isVerified),
    [allUsers]
  );

  useEffect(() => {
    if (verifiedUsers.length === 0) return;

    async function fetchViewTotals() {
      setViewsLoading(true);
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const sinceIso = since.toISOString();

        const verifiedIds = new Set(verifiedUsers.map(u => u.$id));
        const totals: Record<string, number> = {};

        let cursor: string | undefined = undefined;
        let keepGoing = true;

        while (keepGoing) {
          const queries = [
            Query.greaterThanEqual('$createdAt', sinceIso),
            Query.limit(100),
          ];
          if (cursor) queries.push(Query.cursorAfter(cursor));

          const res = await databases.listDocuments(DATABASE_ID, COL.POSTS, queries);

          for (const doc of res.documents) {
            if (!verifiedIds.has(doc.user_id)) continue;
            const views = doc.views_count ?? doc.view_count ?? 0;
            totals[doc.user_id] = (totals[doc.user_id] || 0) + Number(views);
          }

          if (res.documents.length < 100) {
            keepGoing = false;
          } else {
            cursor = res.documents[res.documents.length - 1].$id;
          }
        }

        setViewTotals(totals);
      } catch {
        // silently fail — views tab will just show 0
      } finally {
        setViewsLoading(false);
      }
    }

    fetchViewTotals();
  }, [verifiedUsers]);

  const getScore = (userId: string, followers: number, posts: number) => {
    if (sortBy === 'followers') return followers;
    if (sortBy === 'posts')     return posts;
    return viewTotals[userId] ?? 0;
  };

  const rankedCreators = useMemo(() => {
    return verifiedUsers
      .map(u => ({
        ...u,
        _followers: Number(u.followers ?? 0),
        _posts:     Number(u.posts ?? 0),
        _views:     viewTotals[u.$id] ?? 0,
      }))
      .sort((a, b) => {
        if (sortBy === 'followers') return b._followers - a._followers;
        if (sortBy === 'posts')     return b._posts     - a._posts;
        return b._views - a._views;
      })
      .slice(0, 50);
  }, [verifiedUsers, sortBy, viewTotals]);

  const myRank = useMemo(() => {
    if (!currentUser?.isVerified) return null;
    const idx = rankedCreators.findIndex(u => u.$id === currentUser.$id);
    return idx >= 0 ? idx + 1 : null;
  }, [rankedCreators, currentUser]);

  if (isLoading) return <ProfileLoading />;

  const medalColors = ['text-amber-400', 'text-slate-400', 'text-orange-600'];
  const medalBgs    = ['bg-amber-500/10', 'bg-slate-400/10', 'bg-orange-600/10'];

  const scoreLabel = (creator: typeof rankedCreators[0]) => {
    if (sortBy === 'followers') return `${creator._followers.toLocaleString()} followers`;
    if (sortBy === 'posts')     return `${creator._posts.toLocaleString()} posts`;
    return `${creator._views.toLocaleString()} views`;
  };

  const scoreValue = (creator: typeof rankedCreators[0]) => {
    if (sortBy === 'followers') return creator._followers.toLocaleString();
    if (sortBy === 'posts')     return creator._posts.toLocaleString();
    return creator._views.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#F4F0FA] dark:bg-[#06060e] transition-colors duration-300 overflow-x-hidden relative">

      {/* Background ambiance */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/12 blur-[140px] rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-amber-500/8 blur-[140px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#06060e]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/5 h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/verification/benefits">
            <button className="h-9 w-9 rounded-2xl bg-secondary/60 dark:bg-white/5 flex items-center justify-center hover:bg-secondary transition-all active:scale-90">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-base font-black tracking-tight">Creator Rankings</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Verified Leaderboard</p>
          </div>
        </div>
        {currentUser?.isVerified && myRank && (
          <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5">
            <Crown className="h-3 w-3 text-primary" />
            <span className="text-xs font-black text-primary">#{myRank}</span>
          </div>
        )}
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 pb-28 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Hero */}
        <section className="relative bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-3xl p-6 text-white overflow-hidden shadow-2xl shadow-amber-400/25">
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative text-center">
            <Crown className="h-8 w-8 text-white mx-auto mb-2" />
            <h2 className="text-xl font-black tracking-tight mb-1">Verified Creator Rankings</h2>
            <p className="text-white/75 text-xs font-medium max-w-xs mx-auto">
              Only verified creators appear here. Get your badge to join the leaderboard.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-white/20 border border-white/25 rounded-full px-4 py-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-white" />
              <span className="text-[11px] font-black uppercase tracking-wider">{rankedCreators.length} Verified Creator{rankedCreators.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </section>

        {/* Sort tabs */}
        <div className="flex gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                sortBy === opt.key
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "bg-white dark:bg-white/4 border border-black/5 dark:border-white/8 text-muted-foreground"
              )}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
              {opt.key === 'views' && viewsLoading && (
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Not verified call-out */}
        {currentUser && !currentUser.isVerified && (
          <div className="flex items-center gap-3 bg-primary/8 border border-primary/15 rounded-2xl p-4">
            <BadgeCheck className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-foreground">You're not on the board yet</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Get verified to join the rankings and let fans discover you here.</p>
            </div>
            <Link href="/verification">
              <button className="shrink-0 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 rounded-full px-3 py-1.5 hover:bg-primary/15 transition-colors">
                Get Badge
              </button>
            </Link>
          </div>
        )}

        {/* Top 3 podium */}
        {rankedCreators.length >= 3 && (
          <section className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Top Creators</p>
            <div className="grid grid-cols-3 gap-2">
              {[rankedCreators[1], rankedCreators[0], rankedCreators[2]].map((creator, podiumIdx) => {
                const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                if (!creator) return null;
                const isFirst = actualRank === 1;
                return (
                  <Link href={`/profile/${creator.username}`} key={creator.$id}>
                    <div className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl p-3 border transition-all",
                      isFirst
                        ? "bg-gradient-to-b from-amber-400/20 to-amber-500/5 border-amber-400/30 shadow-lg"
                        : "bg-white dark:bg-white/4 border-black/5 dark:border-white/8"
                    )}>
                      <div className={cn(
                        "text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5",
                        medalBgs[actualRank - 1], medalColors[actualRank - 1]
                      )}>
                        #{actualRank}
                      </div>
                      <div className="relative">
                        <Avatar className={cn(
                          "border-2",
                          isFirst ? "h-14 w-14 border-amber-400" : "h-11 w-11 border-primary/30"
                        )}>
                          <AvatarFallback>{creator.name?.[0] || '?'}</AvatarFallback>
                          <img src={creator.avatar} alt={creator.name} className="object-cover w-full h-full rounded-full" />
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-card rounded-full p-px shadow">
                          <CheckCircle2 className="h-3 w-3 text-primary fill-primary" />
                        </div>
                      </div>
                      <div className="text-center min-w-0 w-full">
                        <p className="text-[10px] font-black truncate">{creator.name}</p>
                        <p className="text-[9px] text-muted-foreground font-medium">{scoreLabel(creator)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Full ranked list */}
        <section className="space-y-2">
          {rankedCreators.length === 0 ? (
            <div className="bg-white dark:bg-white/4 border border-black/5 dark:border-white/8 rounded-2xl p-8 text-center">
              <BadgeCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-black text-foreground">No verified creators yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to get verified and top the board.</p>
            </div>
          ) : (
            rankedCreators.map((creator, idx) => {
              const rank   = idx + 1;
              const isMe   = creator.$id === currentUser?.$id;
              return (
                <Link href={`/profile/${creator.username}`} key={creator.$id}>
                  <div className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border transition-all",
                    isMe
                      ? "bg-primary/8 border-primary/20 shadow-sm"
                      : "bg-white dark:bg-white/4 border-black/5 dark:border-white/8"
                  )}>
                    {/* Rank */}
                    <div className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                      rank === 1 ? "bg-amber-500/15 text-amber-500" :
                      rank === 2 ? "bg-slate-400/15 text-slate-400" :
                      rank === 3 ? "bg-orange-600/15 text-orange-600" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {rank <= 3 ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : rank}
                    </div>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarFallback>{creator.name?.[0] || '?'}</AvatarFallback>
                        <img src={creator.avatar} alt={creator.name} className="object-cover w-full h-full rounded-full" />
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-card rounded-full p-px shadow">
                        <CheckCircle2 className="h-2.5 w-2.5 text-primary fill-primary" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-black truncate">{creator.name}</p>
                        {isMe && <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 rounded-full px-1.5 py-0.5">You</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">@{creator.username}</p>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-foreground tabular-nums">
                        {scoreValue(creator)}
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                        {sortBy === 'views' ? '30d views' : sortBy}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </section>

        {sortBy === 'views' && !viewsLoading && rankedCreators.length > 0 && (
          <p className="text-center text-[10px] text-muted-foreground/50 font-medium pb-2">
            Views calculated from posts in the last 30 days
          </p>
        )}

      </main>
    </div>
  );
}
