"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Star,
  Users,
  Copy,
  Share2,
  CheckCircle2,
  Loader2,
  Gift,
  Zap,
  ChevronRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePosts } from "@/context/PostContext";
import { useTranslation } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { databases, COL, DATABASE_ID, Query, avatarFallback } from "@/lib/appwrite";
import { formatTimeAgo } from "@/lib/appwrite";
import ProfileLoading from "../profile/loading";

interface ReferralEntry {
  id: string;
  name: string;
  username: string;
  avatar: string;
  joinedAt: string;
  starsAwarded: number;
}

const STEPS = [
  {
    icon: Share2,
    color: "from-violet-500 to-purple-600",
    title: "Share Your Link",
    desc: "Copy your unique invite link and send it to friends.",
  },
  {
    icon: Users,
    color: "from-blue-500 to-cyan-500",
    title: "Friend Joins",
    desc: "They tap the link, sign up, and become part of ViMore.",
  },
  {
    icon: Star,
    color: "from-amber-400 to-orange-500",
    title: "You Earn Stars",
    desc: "5,000 Stars land in your balance — instantly.",
  },
];

export default function ReferralHub() {
  const { currentUser, referralLink, triggerHaptic, isLoading } = usePosts();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState<ReferralEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [countAnim, setCountAnim] = useState(0);
  const [starsAnim, setStarsAnim] = useState(0);

  const totalReferrals = currentUser?.referralCount || 0;
  const totalStars = currentUser?.starBalance || 0;

  useEffect(() => {
    if (!currentUser) return;
    const targetRef = totalReferrals;
    const targetStars = totalStars;
    let frame = 0;
    const steps = 40;
    const id = setInterval(() => {
      frame++;
      const p = Math.min(frame / steps, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCountAnim(Math.round(ease * targetRef));
      setStarsAnim(Math.round(ease * targetStars));
      if (frame >= steps) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [totalReferrals, totalStars]);

  const loadHistory = useCallback(async () => {
    if (!currentUser?.$id) return;
    setHistoryLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.NOTIFICATIONS, [
        Query.equal("user_id", currentUser.$id),
        Query.equal("title", "Referral Bonus!"),
        Query.orderDesc("$createdAt"),
        Query.limit(20),
      ]);
      const entries: ReferralEntry[] = res.documents.map((doc: any) => {
        const match = doc.content?.match(/@([\w.]+)\)/);
        const nameMatch = doc.content?.match(/^(.*?)\s\(@/);
        return {
          id: doc.$id,
          name: nameMatch?.[1] || "ViMore User",
          username: match?.[1] || "user",
          avatar: "",
          joinedAt: doc.$createdAt,
          starsAwarded: 5000,
        };
      });
      setHistory(entries);
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, [currentUser?.$id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleCopy = () => {
    triggerHaptic(15);
    navigator.clipboard.writeText(referralLink);
    setIsCopied(true);
    toast({ title: "Link copied!", description: "Share it with your friends." });
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleShare = async () => {
    triggerHaptic(15);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on ViMore",
          text: `${currentUser?.name} invited you to ViMore — the high-velocity social network. Join and they earn 5,000 Stars!`,
          url: referralLink,
        });
      } catch { /* dismissed */ }
    } else {
      handleCopy();
    }
  };

  if (isLoading || !currentUser) return <ProfileLoading />;

  const earned = totalReferrals * 5000;

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#080808] overflow-x-hidden">

      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-[#7B2FBE] via-primary to-[#5B21B6] pb-28 pt-safe overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-10 w-48 h-48 bg-black/20 rounded-full blur-2xl" />
          <div className="absolute top-1/2 right-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        </div>

        <div className="relative z-10 px-5 pt-4 pb-0">
          <div className="flex items-center justify-between mb-8">
            <Link href="/menu">
              <button className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center active:scale-90 transition-all">
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">Star Network</span>
            </div>
            <Avatar className="h-9 w-9 border-2 border-white/20">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-white/20 text-white text-xs font-black">
                {avatarFallback(currentUser.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="text-center space-y-3 mb-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-1.5 rounded-full">
              <Zap className="h-3.5 w-3.5 text-amber-300 fill-current" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">5,000 Stars Per Referral</span>
            </div>
            <h1 className="text-[2.6rem] font-black italic uppercase tracking-tighter text-white leading-none drop-shadow-lg">
              Invite &<br />Earn Stars
            </h1>
            <p className="text-white/60 text-sm font-medium max-w-[260px] mx-auto">
              Share your link. Friends join. Stars flow to you instantly.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats Cards (overlap hero) ── */}
      <div className="relative z-20 -mt-20 px-5 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#161616] rounded-[1.5rem] p-4 shadow-xl shadow-black/10 flex flex-col items-center gap-1.5 border border-black/5 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-black text-foreground tabular-nums">{countAnim}</span>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider text-center leading-tight">Referred</p>
          </div>
          <div className="bg-white dark:bg-[#161616] rounded-[1.5rem] p-4 shadow-xl shadow-black/10 flex flex-col items-center gap-1.5 border border-black/5 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-500 fill-current" />
            </div>
            <span className="text-2xl font-black text-foreground tabular-nums">{starsAnim.toLocaleString()}</span>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider text-center leading-tight">Stars</p>
          </div>
          <div className="bg-white dark:bg-[#161616] rounded-[1.5rem] p-4 shadow-xl shadow-black/10 flex flex-col items-center gap-1.5 border border-black/5 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <span className="text-2xl font-black text-foreground tabular-nums">{(earned / 1000).toFixed(0)}K</span>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider text-center leading-tight">Total Earned</p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5 pb-24">

        {/* ── Referral Link Card ── */}
        <div className="bg-white dark:bg-[#161616] rounded-[2rem] shadow-xl shadow-black/5 border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                <Share2 className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-black text-foreground uppercase tracking-widest">Your Invite Link</span>
            </div>

            <div className="bg-[#F5F5F7] dark:bg-white/5 rounded-[1.25rem] p-4 flex items-center gap-3 mb-4">
              <p className="flex-1 text-[12px] font-bold text-foreground/70 truncate">{referralLink}</p>
              <button
                onClick={handleCopy}
                className={cn(
                  "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
                  isCopied ? "bg-green-500" : "bg-primary"
                )}
              >
                {isCopied
                  ? <CheckCircle2 className="h-5 w-5 text-white" />
                  : <Copy className="h-5 w-5 text-white" />}
              </button>
            </div>

            <button
              onClick={handleShare}
              className="w-full h-13 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all rounded-[1.25rem] font-black italic uppercase tracking-[0.15em] text-white flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 py-3.5"
            >
              <Share2 className="h-4.5 w-4.5" />
              Share Invite
            </button>
          </div>
        </div>

        {/* ── How It Works ── */}
        <div className="bg-white dark:bg-[#161616] rounded-[2rem] shadow-xl shadow-black/5 border border-black/5 dark:border-white/5 p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 bg-violet-500/10 rounded-lg flex items-center justify-center">
              <Gift className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <span className="text-[11px] font-black text-foreground uppercase tracking-widest">How It Works</span>
          </div>

          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className={cn("shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", step.color)}>
                  <step.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Step {i + 1}</span>
                  </div>
                  <p className="text-sm font-black text-foreground leading-tight">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 mt-3 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Referral History ── */}
        <div className="bg-white dark:bg-[#161616] rounded-[2rem] shadow-xl shadow-black/5 border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <span className="text-[11px] font-black text-foreground uppercase tracking-widest">Referral History</span>
              </div>
              {history.length > 0 && (
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                  {history.length} joined
                </span>
              )}
            </div>

            {historyLoading ? (
              <div className="py-10 flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Loading...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-[1.2rem] bg-primary/5 flex items-center justify-center">
                  <Users className="h-7 w-7 text-primary/30" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground/50 italic uppercase tracking-wide">No referrals yet</p>
                  <p className="text-[10px] font-medium text-muted-foreground mt-1">Share your link to start earning Stars</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-3 rounded-[1.2rem] bg-[#F5F5F7] dark:bg-white/5 border border-black/5 dark:border-white/5"
                  >
                    <Avatar className="h-10 w-10 border border-primary/10 shrink-0">
                      <AvatarImage src={entry.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                        {avatarFallback(entry.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground truncate">{entry.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">@{entry.username} · {formatTimeAgo(entry.joinedAt)}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 bg-amber-500/10 rounded-xl px-2.5 py-1.5">
                      <Star className="h-3 w-3 text-amber-500 fill-current" />
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">+{entry.starsAwarded.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
