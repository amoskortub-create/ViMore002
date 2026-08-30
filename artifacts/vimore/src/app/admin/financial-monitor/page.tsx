'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePosts } from '@/context/PostContext';
import {
  databases,
  DATABASE_ID,
  COL,
  client,
  Query,
  getFileUrl,
  BUCKET,
  avatarFallback,
} from '@/lib/appwrite';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Users,
  CreditCard,
  ArrowDownCircle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Gem,
  Star,
  TrendingUp,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type MonitorTab = 'admins' | 'payments' | 'payouts';

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const STATUS_ICON: Record<string, typeof Clock> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export default function FinancialMonitorPage() {
  const { currentUser } = usePosts();
  const { toast } = useToast();

  const role = currentUser?.role;
  const isSuper = role === 'SUPER';

  const [activeTab, setActiveTab] = useState<MonitorTab>('admins');
  const [financialAdmins, setFinancialAdmins] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [realtimePulse, setRealtimePulse] = useState(0);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const [adminsRes, paymentsRes, withdrawalsRes] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, COL.USERS, [
          Query.equal('role', 'FINANCIAL'),
          Query.limit(50),
        ]),
        databases.listDocuments(DATABASE_ID, COL.PAYMENT_REQUESTS, [
          Query.orderDesc('$createdAt'),
          Query.limit(200),
        ]),
        databases.listDocuments(DATABASE_ID, COL.WITHDRAWAL_REQUESTS, [
          Query.orderDesc('$createdAt'),
          Query.limit(200),
        ]),
      ]);

      if (adminsRes.status === 'fulfilled') {
        setFinancialAdmins(adminsRes.value.documents.map((doc: any) => ({
          $id: doc.$id,
          name: doc.name || doc.username,
          username: doc.username,
          avatar: doc.avatar_id
            ? getFileUrl(BUCKET.AVATARS, doc.avatar_id)
            : (doc.avatar || avatarFallback(doc.name || doc.username || 'FA')),
          isVerified: doc.is_verified || false,
          joinedAt: doc.$createdAt,
          goldBalance: doc.gold_balance || 0,
          diamondBalance: doc.diamond_balance || 0,
          starBalance: doc.star_balance || 0,
        })));
      }

      if (paymentsRes.status === 'fulfilled') {
        setPaymentRequests(paymentsRes.value.documents.map((doc: any) => ({
          $id: doc.$id,
          username: doc.username || '—',
          name: doc.name || doc.username || '—',
          packageName: doc.package_name || doc.message || 'Package',
          amount: doc.amount || 0,
          currency: doc.currency || 'USD',
          coinType: doc.coin_type || '—',
          coinAmount: doc.coin_amount || 0,
          status: doc.status || 'PENDING',
          createdAt: doc.$createdAt,
          screenshotId: doc.screenshot_id,
        })));
      }

      if (withdrawalsRes.status === 'fulfilled') {
        setWithdrawalRequests(withdrawalsRes.value.documents.map((doc: any) => ({
          $id: doc.$id,
          username: doc.username || '—',
          accountName: doc.account_name || doc.accountName || '—',
          payoutAmount: doc.payout_amount ?? doc.payoutAmount ?? 0,
          payoutCurrency: doc.payout_currency || doc.payoutCurrency || 'USD',
          method: doc.method || doc.payment_method || '—',
          amount: doc.amount ?? 0,
          currency: doc.currency || 'USD',
          status: doc.status || 'PENDING',
          createdAt: doc.$createdAt,
          proofImageUrl: doc.proof_image_url,
          adminMessage: doc.admin_message,
        })));
      }

      setLastUpdated(new Date());
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load data' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isSuper) return;
    loadData();
  }, [isSuper, loadData]);

  useEffect(() => {
    if (!isSuper) return;

    const channels = [
      `databases.${DATABASE_ID}.collections.${COL.PAYMENT_REQUESTS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.WITHDRAWAL_REQUESTS}.documents`,
      `databases.${DATABASE_ID}.collections.${COL.USERS}.documents`,
    ];

    const unsubscribe = client.subscribe(channels, (response) => {
      const events = response.events as string[];
      const isCreate = events.some(e => e.endsWith('.create'));
      const isUpdate = events.some(e => e.endsWith('.update'));
      const isDelete = events.some(e => e.endsWith('.delete'));

      if (isCreate || isUpdate || isDelete) {
        setRealtimePulse(p => p + 1);
        loadData(true);
      }
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [isSuper, loadData]);

  if (!isSuper) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="h-20 w-20 bg-destructive/10 rounded-3xl flex items-center justify-center text-destructive border border-destructive/20 shadow-2xl">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Access Denied</h1>
          <p className="text-muted-foreground text-sm max-w-xs">This page is restricted to Super Administrators only.</p>
        </div>
        <Link href="/admin">
          <Button variant="outline" className="rounded-2xl border-white/10 text-white font-black uppercase text-[10px] tracking-widest">
            Return to Admin Core
          </Button>
        </Link>
      </div>
    );
  }

  const pendingPayments = paymentRequests.filter(p => p.status === 'PENDING');
  const pendingWithdrawals = withdrawalRequests.filter(w => w.status === 'PENDING');
  const totalPending = pendingPayments.length + pendingWithdrawals.length;

  const coinIcon = (type: string) => {
    if (type === 'Credit') return <Gem className="w-3.5 h-3.5 text-cyan-400" />;
    if (type === 'Star') return <Star className="w-3.5 h-3.5 text-amber-400" />;
    return <Coins className="w-3.5 h-3.5 text-yellow-400" />;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-3xl border-b border-white/5">
        <div className="flex items-center gap-4 px-4 sm:px-8 h-16">
          <Link href="/admin">
            <button className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-black italic uppercase tracking-tighter leading-none">Financial Monitor</h1>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Super Admin · Restricted</p>
          </div>
          <div className="flex items-center gap-3">
            {realtimePulse > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Live</span>
              </div>
            )}
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 disabled:opacity-40"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 px-4 sm:px-8 pb-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 shrink-0">
            <Users className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[11px] font-black text-white/70">{financialAdmins.length} Financial Admins</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 shrink-0">
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-black text-amber-400">{pendingPayments.length} Pending Payments</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 shrink-0">
            <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-black text-cyan-400">{pendingWithdrawals.length} Pending Payouts</span>
          </div>
          {totalPending > 0 && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[11px] font-black text-destructive">{totalPending} Require Action</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/3 rounded-xl px-3 py-2 shrink-0 ml-auto">
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[105px] sm:top-[112px] z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8">
        <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
          {([
            { id: 'admins', label: 'Financial Admins', icon: Users, count: financialAdmins.length },
            { id: 'payments', label: 'Payment Requests', icon: CreditCard, count: pendingPayments.length },
            { id: 'payouts', label: 'Payout Requests', icon: ArrowDownCircle, count: pendingWithdrawals.length },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all shrink-0',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-white/30 hover:text-white/60'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  'min-w-[18px] h-4.5 px-1.5 rounded-full text-[9px] font-black flex items-center justify-center',
                  tab.id === 'admins'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'bg-destructive/20 text-destructive'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-8 pb-32 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Financial Admins tab ── */}
            {activeTab === 'admins' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter">Financial Administrators</h2>
                    <p className="text-xs text-white/30 mt-0.5">{financialAdmins.length} active financial node{financialAdmins.length !== 1 ? 's' : ''} on the platform</p>
                  </div>
                </div>

                {financialAdmins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                      <Users className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/30 text-sm font-bold">No financial administrators found</p>
                    <p className="text-white/15 text-xs text-center max-w-xs">Promote users to the FINANCIAL role from the Staff tab on the main admin dashboard.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {financialAdmins.map(admin => {
                      const adminPayments = paymentRequests.filter(p => p.username === admin.username);
                      const adminWithdrawals = withdrawalRequests.filter(w => w.username === admin.username);
                      const pendingCount = [...adminPayments, ...adminWithdrawals].filter(r => r.status === 'PENDING').length;

                      return (
                        <div key={admin.$id} className="bg-white/5 border border-white/8 rounded-3xl p-5 hover:bg-white/8 transition-all">
                          <div className="flex items-start gap-3 mb-4">
                            <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                              <AvatarImage src={admin.avatar} />
                              <AvatarFallback className="bg-primary/10 text-primary font-black">
                                {admin.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-black text-sm truncate">{admin.name}</p>
                                {admin.isVerified && (
                                  <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                    <svg viewBox="0 0 8 8" fill="white" className="w-2 h-2"><path d="M1.5 4L3 5.5L6.5 2"/></svg>
                                  </div>
                                )}
                              </div>
                              <p className="text-white/40 text-xs font-bold">@{admin.username}</p>
                              <Badge className="mt-1 bg-violet-500/15 text-violet-400 border-violet-500/20 text-[8px] font-black uppercase tracking-widest border h-4 px-1.5">
                                Financial Admin
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-white/5 rounded-xl p-2 text-center">
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <Coins className="w-3 h-3 text-yellow-400" />
                              </div>
                              <p className="text-xs font-black text-yellow-400">{fmt(admin.goldBalance)}</p>
                              <p className="text-[9px] text-white/30 font-bold">Gold</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 text-center">
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <Gem className="w-3 h-3 text-cyan-400" />
                              </div>
                              <p className="text-xs font-black text-cyan-400">{fmt(admin.diamondBalance)}</p>
                              <p className="text-[9px] text-white/30 font-bold">Credit</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 text-center">
                              <div className="flex items-center justify-center gap-1 mb-0.5">
                                <Star className="w-3 h-3 text-amber-400" />
                              </div>
                              <p className="text-xs font-black text-amber-400">{fmt(admin.starBalance)}</p>
                              <p className="text-[9px] text-white/30 font-bold">Star</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1.5 flex-1 bg-white/5 rounded-xl px-2.5 py-1.5">
                              <CreditCard className="w-3 h-3 text-white/30" />
                              <span className="font-bold text-white/50">{adminPayments.length} payments</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-1 bg-white/5 rounded-xl px-2.5 py-1.5">
                              <ArrowDownCircle className="w-3 h-3 text-white/30" />
                              <span className="font-bold text-white/50">{adminWithdrawals.length} payouts</span>
                            </div>
                          </div>

                          {pendingCount > 0 && (
                            <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/15 rounded-xl px-3 py-2">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] font-black text-amber-400">{pendingCount} pending request{pendingCount !== 1 ? 's' : ''}</span>
                            </div>
                          )}

                          <p className="text-[9px] text-white/20 font-bold mt-3">Joined {timeAgo(admin.joinedAt)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Payment Requests tab ── */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter">Payment Requests</h2>
                  <p className="text-xs text-white/30 mt-0.5">{paymentRequests.length} total · {pendingPayments.length} pending</p>
                </div>

                <div className="space-y-3">
                  {paymentRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                        <CreditCard className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-white/30 text-sm font-bold">No payment requests yet</p>
                    </div>
                  ) : paymentRequests.map(req => {
                    const StatusIcon = STATUS_ICON[req.status] || Clock;
                    return (
                      <div
                        key={req.$id}
                        className={cn(
                          'bg-white/5 border rounded-2xl p-4 transition-all hover:bg-white/8',
                          req.status === 'PENDING' ? 'border-amber-500/20' : 'border-white/8'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <CreditCard className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <p className="font-black text-sm">@{req.username}</p>
                                <p className="text-white/40 text-xs font-bold">{req.packageName}</p>
                              </div>
                              <Badge className={cn('border text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0', STATUS_STYLE[req.status] || STATUS_STYLE.PENDING)}>
                                <StatusIcon className="w-2.5 h-2.5" />
                                {req.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1">
                                <span className="text-[10px] text-white/50 font-bold">${req.amount} {req.currency}</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1">
                                {coinIcon(req.coinType)}
                                <span className="text-[10px] text-white/50 font-bold">{fmt(req.coinAmount)} {req.coinType}</span>
                              </div>
                              <span className="text-[9px] text-white/25 font-bold">{timeAgo(req.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        {req.screenshotId && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                            <a
                              href={getFileUrl(BUCKET.PAYMENT_SCREENSHOTS, req.screenshotId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                            >
                              View Screenshot →
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Payout Requests tab ── */}
            {activeTab === 'payouts' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter">Payout Requests</h2>
                  <p className="text-xs text-white/30 mt-0.5">{withdrawalRequests.length} total · {pendingWithdrawals.length} pending</p>
                </div>

                <div className="space-y-3">
                  {withdrawalRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                        <ArrowDownCircle className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-white/30 text-sm font-bold">No payout requests yet</p>
                    </div>
                  ) : withdrawalRequests.map(req => {
                    const StatusIcon = STATUS_ICON[req.status] || Clock;
                    return (
                      <div
                        key={req.$id}
                        className={cn(
                          'bg-white/5 border rounded-2xl p-4 transition-all hover:bg-white/8',
                          req.status === 'PENDING' ? 'border-cyan-500/20' : 'border-white/8'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                            <ArrowDownCircle className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <p className="font-black text-sm">@{req.username}</p>
                                <p className="text-white/40 text-xs font-bold">{req.accountName} · {req.method}</p>
                              </div>
                              <Badge className={cn('border text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0', STATUS_STYLE[req.status] || STATUS_STYLE.PENDING)}>
                                <StatusIcon className="w-2.5 h-2.5" />
                                {req.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1">
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] text-white/50 font-bold">{req.payoutAmount} {req.payoutCurrency} payout</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span className="text-[10px] text-white/50 font-bold">{fmt(req.amount)} {req.currency} coins</span>
                              </div>
                              <span className="text-[9px] text-white/25 font-bold">{timeAgo(req.createdAt)}</span>
                            </div>
                            {req.adminMessage && (
                              <div className="mt-2 bg-white/5 rounded-xl px-2.5 py-1.5">
                                <p className="text-[10px] text-white/40 font-bold">Admin note: {req.adminMessage}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {req.proofImageUrl && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                            <a
                              href={req.proofImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-black text-cyan-400 hover:underline uppercase tracking-widest"
                            >
                              View Payment Proof →
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Real-time indicator bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-center py-2 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5 md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
            Real-time · Super Admin Only
          </span>
        </div>
      </div>
    </div>
  );
}
