"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePosts } from "@/context/PostContext";
import { databases, DATABASE_ID, COL, client, Query } from "@/lib/appwrite";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Activity,
  Globe,
  Megaphone,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Server,
  UserPlus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

async function fetchAll(collectionId: string, queries: string[] = []): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | null = null;
  const limit = 100;
  while (true) {
    const q: string[] = cursor
      ? [...queries, Query.limit(limit), Query.cursorAfter(cursor)]
      : [...queries, Query.limit(limit)];
    const res: any = await databases.listDocuments(DATABASE_ID, collectionId, q);
    results.push(...res.documents);
    if (res.documents.length < limit) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }
  return results;
}

interface PageStat { page: string; count: number; icon: string }
interface CountryStat { country: string; count: number }
interface MonthStat { month: string; count: number }

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  countriesData: CountryStat[];
  activeCampaigns: number;
  monthlyNewUsers: MonthStat[];
  mostUsedPages: PageStat[];
  lastUpdated: Date;
}

export default function SystemPage() {
  const { currentUser } = usePosts();
  const isSuper = currentUser?.role === "SUPER";

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signupsUnsubRef = useRef<(() => void) | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(60);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [recentSignupsLoading, setRecentSignupsLoading] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // "Online Now" = last heartbeat within 2 minutes (heartbeat fires every 30s).
      // Querying is_online=true gives phantom counts because the flag is never
      // reliably reset when users close the app without a clean disconnect.
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const [usersRes, activeRes, campaignsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COL.USERS, [Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, COL.USERS, [
          Query.greaterThan("last_seen_at", twoMinutesAgo),
          Query.limit(1),
        ]),
        databases.listDocuments(DATABASE_ID, COL.AD_CAMPAIGNS, [
          Query.equal("is_active", true),
          Query.limit(1),
        ]),
      ]);

      const totalUsers = usersRes.total;
      const activeUsers = activeRes.total;
      const activeCampaigns = campaignsRes.total;

      const allUsers = await fetchAll(COL.USERS, [Query.select(["$id", "nationality", "$createdAt"])]);

      const countryMap: Record<string, number> = {};
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const monthMap: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
        monthMap[key] = 0;
      }

      for (const u of allUsers) {
        const nat = u.nationality || "Unknown";
        countryMap[nat] = (countryMap[nat] || 0) + 1;

        if (u.$createdAt) {
          const d = new Date(u.$createdAt);
          if (d >= twelveMonthsAgo) {
            const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
            if (key in monthMap) monthMap[key]++;
          }
        }
      }

      const countriesData = Object.entries(countryMap)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      const monthlyNewUsers = Object.entries(monthMap).map(([month, count]) => ({
        month,
        count,
      }));

      const [postsRes, tracksRes, msgsRes, storiesRes, reelsRes, productsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COL.POSTS, [Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, COL.TRACKS, [Query.limit(1)]).catch(() => ({ total: 0 })),
        databases.listDocuments(DATABASE_ID, COL.MESSAGES, [Query.limit(1)]).catch(() => ({ total: 0 })),
        databases.listDocuments(DATABASE_ID, COL.STORIES, [Query.limit(1)]).catch(() => ({ total: 0 })),
        databases.listDocuments(DATABASE_ID, COL.POSTS, [
          Query.equal("type", "reel"),
          Query.limit(1),
        ]).catch(() => ({ total: 0 })),
        databases.listDocuments(DATABASE_ID, COL.PRODUCTS, [Query.limit(1)]).catch(() => ({ total: 0 })),
      ]);

      const mostUsedPages: PageStat[] = [
        { page: "Home Feed", count: (postsRes as any).total || 0, icon: "🏠" },
        { page: "Messages", count: (msgsRes as any).total || 0, icon: "💬" },
        { page: "Music", count: (tracksRes as any).total || 0, icon: "🎵" },
        { page: "Stories", count: (storiesRes as any).total || 0, icon: "⚡" },
        { page: "Reels", count: (reelsRes as any).total || 0, icon: "🎬" },
        { page: "Marketplace", count: (productsRes as any).total || 0, icon: "🛒" },
      ].sort((a, b) => b.count - a.count);

      setStats({
        totalUsers,
        activeUsers,
        countriesData,
        activeCampaigns,
        monthlyNewUsers,
        mostUsedPages,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error("System stats load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => loadStats(true), 1000);
  }, [loadStats]);

  const loadRecentSignups = useCallback(async () => {
    setRecentSignupsLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.USERS, [
        Query.orderDesc("$createdAt"),
        Query.limit(10),
        Query.select(["$id", "$createdAt", "name", "username", "nationality", "gender"]),
      ]);
      setRecentSignups(res.documents);
    } catch { } finally {
      setRecentSignupsLoading(false);
    }
  }, []);

  const startAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setNextRefreshIn(60);

    // Tick the countdown every second
    countdownRef.current = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) return 60;
        return prev - 1;
      });
    }, 1000);

    // Actually refresh every 60 seconds
    autoRefreshRef.current = setInterval(() => {
      loadStats(true);
      setNextRefreshIn(60);
    }, 60_000);
  }, [loadStats]);

  useEffect(() => {
    if (!isSuper) return;
    loadStats();
    startAutoRefresh();
    loadRecentSignups();

    // General stats listener (debounced)
    const channels = [
      `databases.${DATABASE_ID}.collections.${COL.USERS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.AD_CAMPAIGNS}.documents`,
    ];
    const unsub = client.subscribe(channels, () => scheduleRefresh());
    unsubRef.current = unsub;

    // Real-time signups listener — instantly prepends new users without a full refresh
    const signupsUnsub = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COL.USERS}.documents`,
      (response: any) => {
        const isCreate = response.events?.some((e: string) => e.includes(".create"));
        if (isCreate && response.payload) {
          const doc = response.payload;
          setRecentSignups(prev =>
            [doc, ...prev.filter(u => u.$id !== doc.$id)].slice(0, 10)
          );
          setStats(prev =>
            prev ? { ...prev, totalUsers: prev.totalUsers + 1 } : prev
          );
        }
      }
    );
    signupsUnsubRef.current = signupsUnsub;

    return () => {
      unsub();
      signupsUnsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isSuper, loadStats, scheduleRefresh, startAutoRefresh, loadRecentSignups]);

  if (!isSuper && !loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <ShieldCheck className="h-16 w-16 text-muted-foreground/20 mx-auto" />
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Super Admin Access Required
          </p>
          <Link href="/admin">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground">
      <header className="sticky top-0 z-50 bg-card/30 border-b border-border/60 backdrop-blur-md px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <h1 className="font-black italic uppercase tracking-tighter text-base leading-none">
                The System
              </h1>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Platform Intelligence Node
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className="text-[9px] font-bold text-muted-foreground/60 hidden sm:block">
              {stats.lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-xl px-2.5 py-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-[9px] font-black uppercase text-green-500 hidden sm:block">Live</span>
            <span className="text-[9px] font-black text-green-500/70 tabular-nums hidden sm:block">
              {refreshing ? '…' : `${nextRefreshIn}s`}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 rounded-xl"
            onClick={() => { loadStats(true); startAutoRefresh(); }}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-5 pb-20 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Syncing system data...
            </p>
          </div>
        ) : stats ? (
          <>
            {/* Top 4 stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Total Users",
                  value: stats.totalUsers.toLocaleString(),
                  icon: Users,
                  color: "text-blue-400",
                  bg: "bg-blue-500/10",
                },
                {
                  label: "Online Now",
                  value: stats.activeUsers.toLocaleString(),
                  icon: Activity,
                  color: "text-green-400",
                  bg: "bg-green-500/10",
                  sub:
                    stats.totalUsers > 0
                      ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% online`
                      : undefined,
                },
                {
                  label: "Live Campaigns",
                  value: stats.activeCampaigns.toLocaleString(),
                  icon: Megaphone,
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  label: "Countries",
                  value: stats.countriesData.length.toString(),
                  icon: Globe,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-card/60 border border-border/50 rounded-3xl p-4 flex items-center gap-3"
                >
                  <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0", s.bg)}>
                    <s.icon className={cn("h-5 w-5", s.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {s.label}
                    </p>
                    <p className={cn("text-xl font-black leading-tight", s.color)}>{s.value}</p>
                    {s.sub && (
                      <p className="text-[9px] font-bold text-muted-foreground">{s.sub}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly User Growth */}
            <div className="bg-card/60 border border-border/50 rounded-3xl p-5 space-y-4">
              <div>
                <h3 className="font-black italic uppercase tracking-tighter">Monthly Active Users</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  New registrations last 12 months
                </p>
              </div>
              <div className="h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.monthlyNewUsers}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="sysGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#777", fontSize: 9, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#777", fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="New Users"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#sysGrowth)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Users by Country */}
            <div className="bg-card/60 border border-border/50 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black italic uppercase tracking-tighter">Users by Country</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Top {Math.min(stats.countriesData.length, 10)} countries
                  </p>
                </div>
                <Badge className="bg-primary/10 text-primary border-none font-black text-[9px]">
                  {stats.totalUsers.toLocaleString()} total
                </Badge>
              </div>
              {stats.countriesData.length === 0 ? (
                <p className="text-center py-6 text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">
                  No country data recorded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.countriesData.slice(0, 10).map((c, i) => {
                    const pct =
                      stats.totalUsers > 0
                        ? Math.round((c.count / stats.totalUsers) * 100)
                        : 0;
                    const colors = [
                      "bg-primary",
                      "bg-blue-500",
                      "bg-amber-500",
                      "bg-green-500",
                      "bg-rose-500",
                      "bg-violet-500",
                      "bg-orange-500",
                      "bg-teal-500",
                      "bg-pink-500",
                      "bg-cyan-500",
                    ];
                    return (
                      <div key={c.country}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-muted-foreground/60 w-4 text-right">
                              {i + 1}
                            </span>
                            <span className="font-bold truncate max-w-[150px]">{c.country}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black">{c.count.toLocaleString()}</span>
                            <span className="text-[9px] text-muted-foreground w-7 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              colors[i] || "bg-primary"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Signups */}
            <div className="bg-card/60 border border-border/50 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black italic uppercase tracking-tighter">Recent Signups</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Latest 10 new members · live
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Live</span>
                </div>
              </div>

              {recentSignupsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                  <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">Loading...</span>
                </div>
              ) : recentSignups.length === 0 ? (
                <p className="text-center py-6 text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">
                  No signups recorded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recentSignups.map((u, i) => {
                    const joinedAt = u.$createdAt ? new Date(u.$createdAt) : null;
                    const now = new Date();
                    const diffMs = joinedAt ? now.getTime() - joinedAt.getTime() : 0;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHrs = Math.floor(diffMins / 60);
                    const diffDays = Math.floor(diffHrs / 24);
                    const timeAgo = diffDays > 0 ? `${diffDays}d ago`
                      : diffHrs > 0 ? `${diffHrs}h ago`
                      : diffMins > 0 ? `${diffMins}m ago`
                      : "just now";
                    const isNew = diffMins < 10;

                    return (
                      <div
                        key={u.$id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl transition-all",
                          i === 0 && isNew
                            ? "bg-green-500/10 border border-green-500/20 animate-in slide-in-from-top-2 duration-500"
                            : "bg-secondary/20"
                        )}
                      >
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <UserPlus className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{u.name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground font-medium truncate">
                            @{u.username || "unknown"}{u.nationality ? ` · ${u.nationality}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[9px] font-black text-muted-foreground/60 uppercase">{timeAgo}</span>
                          {i === 0 && isNew && (
                            <div className="flex items-center gap-1">
                              <Zap className="h-2.5 w-2.5 text-green-500 fill-current" />
                              <span className="text-[8px] font-black text-green-500 uppercase tracking-wide">New</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Most Used Pages */}
            <div className="bg-card/60 border border-border/50 rounded-3xl p-5 space-y-4">
              <div>
                <h3 className="font-black italic uppercase tracking-tighter">Most Used Pages</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Ranked by total content activity
                </p>
              </div>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.mostUsedPages}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="page"
                      tick={{ fill: "#777", fontSize: 9, fontWeight: 700 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#777", fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    />
                    <Bar
                      dataKey="count"
                      name="Activity"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {stats.mostUsedPages.map((p, i) => (
                  <div
                    key={p.page}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl",
                      i === 0 ? "bg-primary/10 border border-primary/20" : "bg-secondary/20"
                    )}
                  >
                    <span className="text-base">{p.icon}</span>
                    <span className="flex-1 font-bold text-sm">{p.page}</span>
                    <span
                      className={cn(
                        "font-black text-sm tabular-nums",
                        i === 0 ? "text-primary" : "text-foreground"
                      )}
                    >
                      {p.count.toLocaleString()}
                    </span>
                    {i === 0 && (
                      <Badge className="bg-primary text-white border-none text-[8px] font-black px-1.5">
                        #1
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
