"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePosts } from "@/context/PostContext";
import { databases, DATABASE_ID, COL, client, Query } from "@/lib/appwrite";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  Gem,
  Gift,
  Lock,
  Zap,
  ShoppingBag,
  Music2,
  Megaphone,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

async function sumTransactionsByTypes(types: string[]): Promise<{ total: number; count: number }> {
  let total = 0;
  let count = 0;
  for (const type of types) {
    const docs = await fetchAll(COL.TRANSACTIONS, [Query.equal("type", type)]);
    for (const d of docs) {
      total += d.amount || 0;
      count++;
    }
  }
  return { total, count };
}

async function deleteTransactionsByTypes(types: string[]): Promise<number> {
  let deleted = 0;
  for (const type of types) {
    const docs = await fetchAll(COL.TRANSACTIONS, [Query.equal("type", type)]);
    await Promise.all(
      docs.map((d) =>
        databases.deleteDocument(DATABASE_ID, COL.TRANSACTIONS, d.$id).then(() => deleted++)
      )
    );
  }
  return deleted;
}

interface RevenueMetric {
  id: string;
  label: string;
  description: string;
  icon: typeof Coins;
  color: string;
  bg: string;
  types: string[];
  isFromCampaigns?: boolean;
  total: number;
  count: number;
}

interface FinancialStats {
  totalGold: number;
  totalDiamond: number;
  userCount: number;
  metrics: RevenueMetric[];
  campaignRevenue: number;
  campaignCount: number;
  lastUpdated: Date;
}

const METRIC_DEFS: Omit<RevenueMetric, "total" | "count">[] = [
  {
    id: "gifts",
    label: "Revenue from Gifts",
    description: "Platform share from all user-to-user gifts sent",
    icon: Gift,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    types: ["GIFT_SENT"],
  },
  {
    id: "unlocks",
    label: "Revenue from Post Unlocks",
    description: "Platform fees collected when users unlock paid posts",
    icon: Lock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    types: ["POST_UNLOCK"],
  },
  {
    id: "subscriptions",
    label: "Revenue from Subscriptions",
    description: "Platform fees from creator subscription purchases",
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    types: ["SUBSCRIPTION"],
  },
  {
    id: "boosts",
    label: "Revenue from Boost Posts",
    description: "Currency spent to boost posts and sonic tracks",
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    types: ["BOOST", "POST_BOOST", "SONIC_BOOST"],
  },
  {
    id: "marketplace",
    label: "Revenue from Marketplace",
    description: "Fees from marketplace listing boosts and store promotions",
    icon: ShoppingBag,
    color: "text-green-400",
    bg: "bg-green-500/10",
    types: ["MARKETPLACE_BOOST", "STORE_BOOST", "MARKETPLACE"],
  },
  {
    id: "songs",
    label: "Revenue from Songs",
    description: "Revenue from track purchases and music transactions",
    icon: Music2,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    types: ["TRACK_PURCHASE", "SONG_REVENUE"],
  },
  {
    id: "campaigns",
    label: "Revenue from Ad Campaigns",
    description: "Total budget spent across all ad campaigns",
    icon: Megaphone,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    types: [],
    isFromCampaigns: true,
  },
];

export default function FinancialAuditPage() {
  const { currentUser, addAuditLog } = usePosts();
  const { toast } = useToast();

  const role = currentUser?.role;
  const isAllowed = role === "SUPER" || role === "FINANCIAL";

  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetTarget, setResetTarget] = useState<(typeof METRIC_DEFS)[0] | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const allUsers = await fetchAll(COL.USERS, [
        Query.select(["$id", "gold_balance", "diamond_balance"]),
      ]);
      let totalGold = 0;
      let totalDiamond = 0;
      for (const u of allUsers) {
        totalGold += u.gold_balance || 0;
        totalDiamond += u.diamond_balance || 0;
      }

      const metricPromises = METRIC_DEFS.filter((m) => !m.isFromCampaigns).map((m) =>
        sumTransactionsByTypes(m.types).then((r) => ({ id: m.id, ...r }))
      );
      const metricResults = await Promise.all(metricPromises);

      const allCampaigns = await fetchAll(COL.AD_CAMPAIGNS, [Query.select(["$id", "budget"])]).catch(
        () => []
      );
      let campaignRevenue = 0;
      for (const c of allCampaigns) {
        campaignRevenue += c.budget || 0;
      }

      const metrics: RevenueMetric[] = METRIC_DEFS.map((def) => {
        if (def.isFromCampaigns) {
          return { ...def, total: campaignRevenue, count: allCampaigns.length };
        }
        const r = metricResults.find((m) => m.id === def.id);
        return { ...def, total: r?.total || 0, count: r?.count || 0 };
      });

      setStats({
        totalGold,
        totalDiamond,
        userCount: allUsers.length,
        metrics,
        campaignRevenue,
        campaignCount: allCampaigns.length,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error("Financial audit load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => loadStats(true), 1000);
  }, [loadStats]);

  useEffect(() => {
    if (!isAllowed) return;
    loadStats();

    const channels = [
      `databases.${DATABASE_ID}.collections.${COL.TRANSACTIONS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.USERS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.AD_CAMPAIGNS}.documents`,
    ];
    const unsub = client.subscribe(channels, () => scheduleRefresh());
    unsubRef.current = unsub;

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAllowed, loadStats, scheduleRefresh]);

  async function handleReset(metric: (typeof METRIC_DEFS)[0]) {
    setIsResetting(true);
    try {
      let deleted = 0;
      if (metric.isFromCampaigns) {
        const all = await fetchAll(COL.AD_CAMPAIGNS, [Query.select(["$id"])]);
        await Promise.all(
          all.map((c) =>
            databases.updateDocument(DATABASE_ID, COL.AD_CAMPAIGNS, c.$id, {
              budget: 0,
            })
          )
        );
        deleted = all.length;
      } else {
        deleted = await deleteTransactionsByTypes(metric.types);
      }

      addAuditLog(
        "FINANCIAL_AUDIT_RESET",
        `Revenue for "${metric.label}" reset by @${currentUser?.username}. ${deleted} records affected.`
      );
      toast({
        title: "Revenue reset",
        description: `${deleted} record${deleted !== 1 ? "s" : ""} cleared for "${metric.label}".`,
      });
      setResetTarget(null);
      await loadStats(true);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: err?.message || "Could not reset this revenue category.",
      });
    } finally {
      setIsResetting(false);
    }
  }

  if (!isAllowed && !loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <ShieldCheck className="h-16 w-16 text-muted-foreground/20 mx-auto" />
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Financial Admin Access Required
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
              <Coins className="h-4 w-4 text-amber-400" />
              <h1 className="font-black italic uppercase tracking-tighter text-base leading-none">
                Financial Audit
              </h1>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Platform Currency & Revenue
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className="text-[9px] font-bold text-muted-foreground/60 hidden sm:block">
              {stats.lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase text-green-500 hidden sm:block">Live</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 rounded-xl"
            onClick={() => loadStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-5 pb-20 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Auditing financial records...
            </p>
          </div>
        ) : stats ? (
          <>
            {/* Currency balances */}
            <div className="space-y-1 px-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Total Currency in Circulation
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card/60 border border-amber-500/20 rounded-3xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                    <Coins className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Total Gold
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground/50">
                      across {stats.userCount.toLocaleString()} users
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-400 tabular-nums">
                  {stats.totalGold.toLocaleString()}
                </p>
                <p className="text-[9px] font-black uppercase text-amber-500/60">GD · Gold Coins</p>
              </div>
              <div className="bg-card/60 border border-blue-500/20 rounded-3xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                    <Gem className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Total Credit
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground/50">
                      across {stats.userCount.toLocaleString()} users
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-black text-blue-400 tabular-nums">
                  {stats.totalDiamond.toLocaleString()}
                </p>
                <p className="text-[9px] font-black uppercase text-blue-500/60">C · Credits</p>
              </div>
            </div>

            {/* Revenue metrics */}
            <div className="space-y-1 px-1 pt-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Platform Revenue
              </h2>
              <p className="text-[10px] text-muted-foreground/50">
                All values in platform currency. Reset clears transaction history for that category.
              </p>
            </div>

            <div className="space-y-3">
              {stats.metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="bg-card/60 border border-border/50 rounded-3xl overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0",
                            metric.bg
                          )}
                        >
                          <metric.icon className={cn("h-5 w-5", metric.color)} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-sm">{metric.label}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {metric.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "border-none text-[9px] font-black shrink-0",
                          metric.count > 0
                            ? "bg-secondary/40 text-muted-foreground"
                            : "bg-muted text-muted-foreground/40"
                        )}
                      >
                        {metric.count} records
                      </Badge>
                    </div>

                    <div className="bg-secondary/20 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Total Revenue
                        </p>
                        <p className={cn("text-3xl font-black tabular-nums", metric.color)}>
                          {metric.total.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mt-0.5">
                          {metric.isFromCampaigns ? "USD Budget" : "Platform Currency"}
                        </p>
                      </div>
                      {metric.total > 0 && (
                        <div
                          className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center",
                            metric.bg
                          )}
                        >
                          <TrendingUp className={cn("h-6 w-6", metric.color)} />
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-10 rounded-2xl bg-destructive/5 text-destructive/60 hover:bg-destructive/10 hover:text-destructive font-black uppercase text-[10px] tracking-widest border border-destructive/10 transition-all"
                      onClick={() => setResetTarget(metric)}
                      disabled={metric.count === 0}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                      Reset to Zero
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 py-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Live — updates automatically
              </span>
            </div>
          </>
        ) : null}
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="rounded-3xl border-border max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="font-black italic uppercase tracking-tighter flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Reset
            </DialogTitle>
          </DialogHeader>
          {resetTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 space-y-1">
                <p className="font-bold text-sm">{resetTarget.label}</p>
                <p className="text-xs text-muted-foreground">
                  {resetTarget.isFromCampaigns
                    ? "This will set all campaign budgets to 0. The campaign records will remain but budget history is cleared."
                    : `This will permanently delete all ${stats?.metrics.find((m) => m.id === resetTarget.id)?.count || 0} transaction records for this category. This cannot be undone.`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground/70">
                An audit log entry will be created recording this action.
              </p>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 h-11 rounded-2xl"
              onClick={() => setResetTarget(null)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-black uppercase text-xs"
              onClick={() => resetTarget && handleReset(resetTarget)}
              disabled={isResetting}
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {isResetting ? "Resetting..." : "Confirm Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
