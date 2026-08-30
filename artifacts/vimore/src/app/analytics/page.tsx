
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import {
  databases, client, DATABASE_ID, COL, Query,
  getFilePreview, BUCKET, formatTimeAgo,
} from "@/lib/appwrite";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  BarChart2, TrendingUp, TrendingDown, Users, Eye, Heart,
  BadgeCheck, ArrowLeft, Zap, RefreshCw, ChevronRight,
  Star, Gem, DollarSign, MessageCircle, Share2, Crown,
  Activity, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MainNav } from "@/components/layout/main-nav";
import { RightSidebar } from "@/components/layout/right-sidebar";
import Image from "next/image";
import { LiteLink as Link } from "@/components/ui/lite-link";

type TimeFilter = "24h" | "7d" | "30d";

const TIME_LABELS: Record<TimeFilter, string> = {
  "24h": "24 Hours",
  "7d": "7 Days",
  "30d": "30 Days",
};

function getFromDate(filter: TimeFilter): Date {
  const now = new Date();
  if (filter === "24h") return new Date(now.getTime() - 24 * 3600 * 1000);
  if (filter === "7d") return new Date(now.getTime() - 7 * 86400 * 1000);
  return new Date(now.getTime() - 30 * 86400 * 1000);
}

function getPrevFromDate(filter: TimeFilter): Date {
  const now = new Date();
  if (filter === "24h") return new Date(now.getTime() - 48 * 3600 * 1000);
  if (filter === "7d") return new Date(now.getTime() - 14 * 86400 * 1000);
  return new Date(now.getTime() - 60 * 86400 * 1000);
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

interface Supporter {
  from_user_id: string;
  from_user_name: string;
  from_user_avatar: string;
  total: number;
}

interface AnalyticsData {
  followerCount: number;
  prevFollowerCount: number;
  followerGain: number;
  prevFollowerGain: number;
  views3sec: number;
  prevViews3sec: number;
  engagementRate: number;
  prevEngagementRate: number;
  totalEarnings: number;
  prevTotalEarnings: number;
  giftEarnings: number;
  premiumEarnings: number;
  subscriptionEarnings: number;
  topRevenuePosts: { title: string; revenue: number; id: string }[];
  subscriberGrowth: { date: string; count: number }[];
  topLikedPosts: any[];
  topViewedPosts: any[];
  topGifters: Supporter[];
  topUnlockers: Supporter[];
  topSubscribers: Supporter[];
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("bg-secondary/40 dark:bg-white/5 animate-pulse rounded-2xl", className)} />
  );
}

function PctBadge({ change }: { change: number | null }) {
  if (change === null) return null;
  const pos = change > 0;
  const zero = change === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full",
        zero
          ? "bg-secondary/60 text-muted-foreground"
          : pos
          ? "bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400"
          : "bg-red-100 dark:bg-red-950/40 text-red-500",
      )}
    >
      {zero ? (
        <Minus className="h-2 w-2" />
      ) : pos ? (
        <TrendingUp className="h-2 w-2" />
      ) : (
        <TrendingDown className="h-2 w-2" />
      )}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  change,
  prefix = "",
  suffix = "",
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  iconColor: string;
  iconBg: string;
  change: number | null;
  prefix?: string;
  suffix?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-card rounded-[1.5rem] p-4 border border-border/40 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("h-4.5 w-4.5", iconColor)} style={{ width: 18, height: 18 }} />
        </div>
        <PctBadge change={change} />
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground leading-none mb-1.5">
          {label}
        </p>
        <p className="text-[1.6rem] font-black leading-none tracking-tight text-foreground">
          {prefix}
          {typeof value === "number" ? fmt(value) : value}
          {suffix && <span className="text-base font-bold text-muted-foreground ml-0.5">{suffix}</span>}
        </p>
        {sub && <div className="mt-2">{sub}</div>}
      </div>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="bg-white dark:bg-card rounded-[1.5rem] p-4 border border-border/40 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Shimmer className="h-9 w-9" />
        <Shimmer className="h-5 w-12" />
      </div>
      <div className="space-y-1.5">
        <Shimmer className="h-2.5 w-20" />
        <Shimmer className="h-8 w-28" />
      </div>
    </div>
  );
}

function PostMiniCard({
  post,
  rank,
  metric,
}: {
  post: any;
  rank: number;
  metric: "likes" | "views";
}) {
  const router = useRouter();
  const thumbFileId = post.image_ids?.[0] ?? null;
  const thumb = thumbFileId
    ? getFilePreview(BUCKET.POST_MEDIA, thumbFileId, { width: 200, height: 200, quality: 70, output: "webp" })
    : null;
  const metricValue =
    metric === "likes"
      ? post.likes_count || 0
      : post.views_count || post.views || post.boost_current_views || 0;

  return (
    <button
      onClick={() => router.push(`/post/${post.$id}`)}
      className="flex flex-col w-[116px] flex-shrink-0 group active:scale-[0.96] transition-transform"
    >
      <div className="relative w-[116px] h-[116px] rounded-2xl overflow-hidden bg-secondary/20 mb-2">
        {thumb ? (
          <Image src={thumb} alt="Post" fill className="object-cover" sizes="116px" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 flex items-center justify-center">
            <BarChart2 className="h-7 w-7 text-primary/25" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-black px-1.5 py-[2px] rounded-full">
          #{rank}
        </div>
        {rank === 1 && (
          <div className="absolute top-1.5 right-1.5 bg-amber-400 text-white p-0.5 rounded-full">
            <Crown className="h-2.5 w-2.5" />
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-foreground line-clamp-2 leading-tight mb-1 text-left">
        {post.content?.trim() || "Post"}
      </p>
      <div className="flex items-center gap-1 text-left">
        {metric === "likes" ? (
          <Heart className="h-3 w-3 text-rose-500 fill-rose-500 flex-shrink-0" />
        ) : (
          <Eye className="h-3 w-3 text-blue-500 flex-shrink-0" />
        )}
        <span className="text-[10px] font-black text-muted-foreground">{fmt(metricValue)}</span>
      </div>
    </button>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-card border border-border/50 shadow-xl rounded-2xl px-3 py-2 text-[11px]">
      <p className="font-black text-muted-foreground mb-0.5">{label}</p>
      <p className="font-black text-foreground">{fmt(payload[0].value)}</p>
    </div>
  );
};

function SupporterLeaderboard({
  title,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  rankColor,
  supporters,
  loading,
  valueSuffix,
  valueSuffixPlural,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  rankColor: string;
  supporters: Supporter[];
  loading: boolean;
  valueSuffix: string;
  valueSuffixPlural?: string;
  emptyMessage: string;
}) {
  const router = useRouter();
  return (
    <div className="bg-white dark:bg-card rounded-[2rem] p-5 border border-border/40 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-foreground">
            {title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="h-5 w-5 rounded-full flex-shrink-0" />
              <Shimmer className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Shimmer className="h-3 w-28" />
                <Shimmer className="h-2.5 w-16" />
              </div>
              <Shimmer className="h-5 w-10 rounded-full" />
            </div>
          ))}
        </div>
      ) : supporters.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2">
          <Icon className={cn("h-8 w-8 opacity-15", iconColor)} />
          <p className="text-xs text-muted-foreground/40 font-bold">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {supporters.map((s, i) => {
            const label =
              s.total === 1
                ? `1 ${valueSuffix}`
                : `${fmt(s.total)} ${valueSuffixPlural ?? valueSuffix}`;
            const initials = (s.from_user_name || "?")[0].toUpperCase();
            return (
              <button
                key={s.from_user_id}
                onClick={() => router.push(`/profile/${s.from_user_name}`)}
                className="w-full flex items-center gap-3 group active:scale-[0.98] transition-transform"
              >
                {/* Rank badge */}
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-black text-white bg-gradient-to-br",
                    rankColor,
                    i >= 3 && "opacity-60",
                  )}
                >
                  {i === 0 ? "👑" : i + 1}
                </div>

                {/* Avatar */}
                <Avatar className="h-8 w-8 flex-shrink-0 border border-border/30">
                  <AvatarImage src={s.from_user_avatar} />
                  <AvatarFallback className="text-[10px] font-black bg-secondary/50">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Name + tap hint */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[12px] font-black text-foreground truncate group-hover:text-primary transition-colors">
                    @{s.from_user_name}
                  </p>
                </div>

                {/* Value pill */}
                <span
                  className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r text-white flex-shrink-0",
                    rankColor,
                    i >= 3 && "opacity-70",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { currentUser, isLoading: userLoading } = usePosts();
  const { currentTrack, isExpanded } = useMusic();
  const [filter, setFilter] = useState<TimeFilter>("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isPlayerActive = currentTrack && !isExpanded;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeUnsub = useRef<(() => void) | null>(null);

  const fetchAnalytics = useCallback(
    async (userId: string, f: TimeFilter) => {
      setLoading(true);
      try {
        const fromDate = getFromDate(f);
        const prevFromDate = getPrevFromDate(f);
        const fromStr = fromDate.toISOString();
        const prevFromStr = prevFromDate.toISOString();

        const monthStart = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        ).toISOString();

        const [
          postsRes,
          prevPostsRes,
          followsRes,
          prevFollowsRes,
          allFollowsRes,
          txRes,
          prevTxRes,
          subsRes,
        ] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COL.POSTS, [
            Query.equal("user_id", userId),
            Query.greaterThanEqual("$createdAt", fromStr),
            Query.orderDesc("likes_count"),
            Query.limit(100),
          ]),
          databases.listDocuments(DATABASE_ID, COL.POSTS, [
            Query.equal("user_id", userId),
            Query.greaterThanEqual("$createdAt", prevFromStr),
            Query.lessThan("$createdAt", fromStr),
            Query.limit(100),
          ]),
          databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [
            Query.equal("following_id", userId),
            Query.greaterThanEqual("$createdAt", fromStr),
            Query.limit(500),
          ]),
          databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [
            Query.equal("following_id", userId),
            Query.greaterThanEqual("$createdAt", prevFromStr),
            Query.lessThan("$createdAt", fromStr),
            Query.limit(500),
          ]),
          databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [
            Query.equal("following_id", userId),
            Query.limit(1),
          ]),
          databases.listDocuments(DATABASE_ID, COL.TRANSACTIONS, [
            Query.equal("user_id", userId),
            Query.greaterThanEqual("$createdAt", fromStr),
            Query.limit(500),
          ]),
          databases.listDocuments(DATABASE_ID, COL.TRANSACTIONS, [
            Query.equal("user_id", userId),
            Query.greaterThanEqual("$createdAt", prevFromStr),
            Query.lessThan("$createdAt", fromStr),
            Query.limit(500),
          ]),
          databases.listDocuments(DATABASE_ID, COL.SUBSCRIPTIONS, [
            Query.equal("creator_id", userId),
            Query.greaterThanEqual("$createdAt", monthStart),
            Query.orderAsc("$createdAt"),
            Query.limit(500),
          ]),
        ]);

        const posts = postsRes.documents;
        const prevPosts = prevPostsRes.documents;

        const sumViews = (docs: any[]) =>
          docs.reduce((s, p) => s + (p.views_count ?? p.views ?? p.boost_current_views ?? 0), 0);
        const views3sec = sumViews(posts);
        const prevViews3sec = sumViews(prevPosts);

        const sumEngagement = (docs: any[], totalViews: number) => {
          const likes = docs.reduce((s, p) => s + (p.likes_count || 0), 0);
          const comments = docs.reduce((s, p) => s + (p.comments_count || 0), 0);
          const shares = docs.reduce((s, p) => s + (p.shares_count || 0), 0);
          return totalViews > 0 ? ((likes + comments + shares) / totalViews) * 100 : 0;
        };
        const engagementRate = sumEngagement(posts, views3sec);
        const prevEngagementRate = sumEngagement(prevPosts, prevViews3sec);

        const calcEarnings = (docs: any[]) => {
          let gift = 0, premium = 0, sub = 0;
          docs.forEach((tx) => {
            const amt = Number(tx.amount) || 0;
            const t = tx.type || "";
            if (t === "GIFT_RECEIVED") gift += amt;
            else if (t === "POST_UNLOCK_EARNING") premium += amt;
            else if (t === "SUBSCRIPTION_EARNING") sub += amt;
          });
          return { gift, premium, sub, total: gift + premium + sub };
        };
        const earnings = calcEarnings(txRes.documents);
        const prevEarnings = calcEarnings(prevTxRes.documents);

        // ── Top Supporters leaderboards (from new from_user_* fields) ──
        const buildLeaderboard = (
          docs: any[],
          type: string,
          mode: "sum" | "count",
        ): Supporter[] => {
          const map: Record<string, Supporter> = {};
          docs.forEach((tx) => {
            if (tx.type !== type) return;
            const id = tx.from_user_id;
            if (!id) return;
            if (!map[id]) {
              map[id] = {
                from_user_id: id,
                from_user_name: tx.from_user_name || id,
                from_user_avatar: tx.from_user_avatar || "",
                total: 0,
              };
            }
            map[id].total += mode === "sum" ? (Number(tx.amount) || 0) : 1;
          });
          return Object.values(map)
            .sort((a, b) => b.total - a.total)
            .slice(0, 20);
        };
        const topGifters = buildLeaderboard(txRes.documents, "GIFT_RECEIVED", "sum");
        const topUnlockers = buildLeaderboard(txRes.documents, "POST_UNLOCK_EARNING", "count");
        const topSubscribers = buildLeaderboard(txRes.documents, "SUBSCRIPTION_EARNING", "count");

        const postRevMap: Record<string, number> = {};
        txRes.documents.forEach((tx) => {
          if (tx.reference_id) {
            postRevMap[tx.reference_id] =
              (postRevMap[tx.reference_id] || 0) + (Number(tx.amount) || 0);
          }
        });

        const topRevenuePosts = [...posts]
          .map((p) => ({
            id: p.$id,
            title:
              (p.content?.slice(0, 28) || "Post") +
              (p.content?.length > 28 ? "…" : ""),
            revenue: postRevMap[p.$id] || 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        const today = new Date().getDate();
        const growthMap: Record<number, number> = {};
        subsRes.documents.forEach((s) => {
          const day = new Date(s.$createdAt).getDate();
          growthMap[day] = (growthMap[day] || 0) + 1;
        });
        let cumulative = 0;
        const subscriberGrowth = Array.from({ length: today }, (_, i) => {
          cumulative += growthMap[i + 1] || 0;
          return { date: String(i + 1), count: cumulative };
        });

        const topLikedPosts = [...posts]
          .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
          .slice(0, 10);
        const topViewedPosts = [...posts]
          .sort(
            (a, b) =>
              (b.views_count || b.views || b.boost_current_views || 0) -
              (a.views_count || a.views || a.boost_current_views || 0),
          )
          .slice(0, 10);

        setData({
          followerCount: allFollowsRes.total,
          prevFollowerCount: Math.max(
            0,
            allFollowsRes.total - followsRes.documents.length,
          ),
          followerGain: followsRes.documents.length,
          prevFollowerGain: prevFollowsRes.documents.length,
          views3sec,
          prevViews3sec,
          engagementRate,
          prevEngagementRate,
          totalEarnings: earnings.total,
          prevTotalEarnings: prevEarnings.total,
          giftEarnings: earnings.gift,
          premiumEarnings: earnings.premium,
          subscriptionEarnings: earnings.sub,
          topRevenuePosts,
          subscriberGrowth,
          topLikedPosts,
          topViewedPosts,
          topGifters,
          topUnlockers,
          topSubscribers,
        });
        setLastUpdated(new Date());
      } catch (err) {
        console.error("[Analytics]", err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!currentUser?.$id) return;
    fetchAnalytics(currentUser.$id, filter);
  }, [currentUser?.$id, filter, fetchAnalytics]);

  useEffect(() => {
    if (!currentUser?.$id) return;
    if (realtimeUnsub.current) realtimeUnsub.current();

    const channels = [
      `databases.${DATABASE_ID}.collections.${COL.POSTS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.FOLLOWS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.TRANSACTIONS}.documents`,
    ];

    const unsub = client.subscribe(channels, () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchAnalytics(currentUser.$id, filter);
      }, 3000);
    });

    realtimeUnsub.current = unsub;
    return () => {
      if (realtimeUnsub.current) realtimeUnsub.current();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentUser?.$id, filter, fetchAnalytics]);

  const followerPct = data ? pct(data.followerCount, data.prevFollowerCount) : null;
  const gainPct = data ? pct(data.followerGain, data.prevFollowerGain) : null;
  const viewsPct = data ? pct(data.views3sec, data.prevViews3sec) : null;
  const engPct = data ? pct(data.engagementRate, data.prevEngagementRate) : null;
  const earnPct = data ? pct(data.totalEarnings, data.prevTotalEarnings) : null;

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] dark:bg-[#050505]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 animate-pulse" />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#050505]">
      <div className="flex">
        <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 min-h-screen sticky top-0 h-screen overflow-y-auto shrink-0">
          <MainNav />
        </aside>

        <main
          className={cn(
            "flex-1 max-w-2xl mx-auto w-full px-3 pb-28 space-y-4",
            "pt-4",
          )}
        >
          {/* ── Header ── */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary via-violet-600 to-purple-700 rounded-[2rem] p-5 shadow-2xl shadow-primary/30">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex items-center gap-2 mb-5">
              <button
                onClick={() => router.back()}
                className="h-8 w-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-white/70" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                  Creator Analytics
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">
                  Live
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push(`/profile/${currentUser.username}`)}
              className="relative z-10 flex items-center justify-between w-full group"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-0.5 rounded-full bg-white/30 blur-sm" />
                  <Avatar className="h-14 w-14 border-2 border-white/40 relative">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-white/20 text-white font-black">
                      {currentUser.name?.[0] || "V"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-black text-lg text-white leading-tight">
                      {currentUser.name}
                    </span>
                    {currentUser.isVerified && (
                      <BadgeCheck className="h-4 w-4 text-white/80" />
                    )}
                  </div>
                  <span className="text-white/60 text-xs font-bold">
                    @{currentUser.username}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 group-active:scale-95 transition-transform">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-wider">
                  Profile
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-white/60" />
              </div>
            </button>

            {lastUpdated && (
              <div className="relative z-10 flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
                <button
                  onClick={() => fetchAnalytics(currentUser.$id, filter)}
                  className="flex items-center gap-1 text-[9px] font-black text-white/60 active:text-white transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>
            )}
          </div>

          {/* ── Time Filter ── */}
          <div className="bg-white dark:bg-card rounded-[1.5rem] p-1.5 border border-border/40 shadow-sm flex gap-1">
            {(Object.keys(TIME_LABELS) as TimeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95",
                  filter === f
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TIME_LABELS[f]}
              </button>
            ))}
          </div>

          {/* ── Metrics Grid ── */}
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
            ) : data ? (
              <>
                <MetricCard
                  label="Followers"
                  value={data.followerCount}
                  icon={Users}
                  iconColor="text-primary"
                  iconBg="bg-primary/10"
                  change={followerPct}
                />
                <MetricCard
                  label="Follower Gain"
                  value={data.followerGain}
                  prefix="+"
                  icon={TrendingUp}
                  iconColor="text-green-500"
                  iconBg="bg-green-100 dark:bg-green-950/30"
                  change={gainPct}
                />
                <MetricCard
                  label="3-Sec Views"
                  value={data.views3sec}
                  icon={Eye}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-100 dark:bg-blue-950/30"
                  change={viewsPct}
                />
                <MetricCard
                  label="Engagement"
                  value={data.engagementRate.toFixed(1)}
                  suffix="%"
                  icon={Zap}
                  iconColor="text-amber-500"
                  iconBg="bg-amber-100 dark:bg-amber-950/30"
                  change={engPct}
                />
              </>
            ) : null}
          </div>

          {/* ── Earnings Card (full width) ── */}
          {loading ? (
            <Shimmer className="h-44" />
          ) : data ? (
            <div className="bg-white dark:bg-card rounded-[2rem] p-5 border border-border/40 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center">
                    <DollarSign className="h-4.5 w-4.5 text-violet-600" style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                      Total Earnings
                    </p>
                    <p className="text-2xl font-black text-foreground leading-tight">
                      {fmt(data.totalEarnings)}{" "}
                      <span className="text-sm font-bold text-muted-foreground">units</span>
                    </p>
                  </div>
                </div>
                <PctBadge change={earnPct} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-2xl p-3 text-center">
                  <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
                    Gifts
                  </p>
                  <p className="text-base font-black text-foreground">{fmt(data.giftEarnings)}</p>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-950/20 rounded-2xl p-3 text-center">
                  <div className="h-8 w-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Gem className="h-4 w-4 text-cyan-500" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
                    Premium
                  </p>
                  <p className="text-base font-black text-foreground">
                    {fmt(data.premiumEarnings)}
                  </p>
                </div>
                <div className="bg-primary/5 rounded-2xl p-3 text-center">
                  <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Crown className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
                    Subs
                  </p>
                  <p className="text-base font-black text-foreground">
                    {fmt(data.subscriptionEarnings)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Bar Chart — Top Revenue Posts ── */}
          <div className="bg-white dark:bg-card rounded-[2rem] p-5 border border-border/40 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-black uppercase tracking-widest text-foreground">
                Top Revenue Posts
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Highest-grossing content this period
              </p>
            </div>
            {loading ? (
              <Shimmer className="h-52" />
            ) : data?.topRevenuePosts && data.topRevenuePosts.some((p) => p.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.topRevenuePosts}
                  layout="vertical"
                  margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#9940E5" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 8, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fontSize: 8, fill: "#888" }}
                    width={72}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(153,64,229,0.04)" }} />
                  <Bar dataKey="revenue" fill="url(#revGrad)" radius={[0, 8, 8, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center gap-2">
                <BarChart2 className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground/40 font-bold">No revenue data yet</p>
              </div>
            )}
          </div>

          {/* ── Area Chart — Subscriber Growth ── */}
          <div className="bg-white dark:bg-card rounded-[2rem] p-5 border border-border/40 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-black uppercase tracking-widest text-foreground">
                Subscriber Growth
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Cumulative active subscribers this month
              </p>
            </div>
            {loading ? (
              <Shimmer className="h-44" />
            ) : data?.subscriberGrowth && data.subscriberGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  data={data.subscriberGrowth}
                  margin={{ left: -20, right: 8, top: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9940E5" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#9940E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 8, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 8, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#9940E5", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#9940E5"
                    strokeWidth={2.5}
                    fill="url(#subGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#9940E5", stroke: "white", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center gap-2">
                <Activity className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground/40 font-bold">
                  No subscribers yet this month
                </p>
              </div>
            )}
          </div>

          {/* ── Top Liked Posts ── */}
          <div className="bg-white dark:bg-card rounded-[2rem] p-5 border border-border/40 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-foreground">
                  Most Liked
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Top 10 posts by likes
                </p>
              </div>
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
                <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              </div>
            </div>
            {loading ? (
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="w-[116px] h-[156px] flex-shrink-0" />
                ))}
              </div>
            ) : data?.topLikedPosts.length ? (
              <div className="overflow-x-auto scrollbar-none -mx-5 px-5">
                <div className="flex gap-3 w-max pb-2">
                  {data.topLikedPosts.map((post, i) => (
                    <PostMiniCard key={post.$id} post={post} rank={i + 1} metric="likes" />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40 font-bold text-center py-8">
                No posts in this period
              </p>
            )}
          </div>

          {/* ── Top Viewed Posts ── */}
          <div className="bg-white dark:bg-card rounded-[2rem] p-5 border border-border/40 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-foreground">
                  Most Viewed
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Top 10 posts by view count
                </p>
              </div>
              <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                <Eye className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            {loading ? (
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="w-[116px] h-[156px] flex-shrink-0" />
                ))}
              </div>
            ) : data?.topViewedPosts.length ? (
              <div className="overflow-x-auto scrollbar-none -mx-5 px-5">
                <div className="flex gap-3 w-max pb-2">
                  {data.topViewedPosts.map((post, i) => (
                    <PostMiniCard key={post.$id} post={post} rank={i + 1} metric="views" />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40 font-bold text-center py-8">
                No posts in this period
              </p>
            )}
          </div>

          {/* ── Top 20 Gifters ── */}
          <SupporterLeaderboard
            title="Top Gifters"
            subtitle="Highest credit gifts received"
            icon={Gem}
            iconBg="bg-violet-100 dark:bg-violet-950/30"
            iconColor="text-violet-500"
            rankColor="from-violet-500 to-purple-600"
            supporters={data?.topGifters ?? []}
            loading={loading}
            valueSuffix="◆"
            emptyMessage="No gifts received yet in this period"
          />

          {/* ── Top 20 Unlockers ── */}
          <SupporterLeaderboard
            title="Top Unlockers"
            subtitle="Fans who unlocked your premium posts"
            icon={Star}
            iconBg="bg-amber-100 dark:bg-amber-950/30"
            iconColor="text-amber-500"
            rankColor="from-amber-500 to-orange-500"
            supporters={data?.topUnlockers ?? []}
            loading={loading}
            valueSuffix="unlock"
            valueSuffixPlural="unlocks"
            emptyMessage="No post unlocks yet in this period"
          />

          {/* ── Top 20 Subscribers ── */}
          <SupporterLeaderboard
            title="Top Subscribers"
            subtitle="Your most loyal paying subscribers"
            icon={Crown}
            iconBg="bg-emerald-100 dark:bg-emerald-950/30"
            iconColor="text-emerald-500"
            rankColor="from-emerald-500 to-teal-500"
            supporters={data?.topSubscribers ?? []}
            loading={loading}
            valueSuffix="renewal"
            valueSuffixPlural="renewals"
            emptyMessage="No subscription earnings yet in this period"
          />
        </main>

        <aside
          className={cn(
            "hidden lg:block sticky h-screen shrink-0 transition-all duration-300",
            "top-0",
          )}
        >
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
