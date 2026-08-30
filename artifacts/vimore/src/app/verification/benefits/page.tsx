"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  TrendingUp,
  Crown,
  Sparkles,
  Zap,
  DollarSign,
  Users,
  Star,
  Gem,
  ChevronRight,
  ShieldCheck,
  Heart,
  MessageCircle,
  Gift,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const EXAMPLE_AMOUNT = 100;
const PLATFORM_FEE = 10;
const CREATOR_KEEP = 100 - PLATFORM_FEE;
const creatorKeeps = EXAMPLE_AMOUNT * (CREATOR_KEEP / 100);

export default function VerifiedBenefitsPage() {
  return (
    <div className="min-h-screen bg-[#F4F0FA] dark:bg-[#06060e] transition-colors duration-300 overflow-x-hidden relative">

      {/* Background ambiance */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/12 blur-[140px] rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-violet-500/8 blur-[140px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#06060e]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/5 h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/verification">
            <button className="h-9 w-9 rounded-2xl bg-secondary/60 dark:bg-white/5 flex items-center justify-center hover:bg-secondary transition-all active:scale-90">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-base font-black tracking-tight">Verified Creator</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Badge Benefits</p>
          </div>
        </div>
        <Link href="/verification">
          <Button size="sm" className="rounded-full font-black uppercase text-[10px] tracking-widest h-8 px-4 bg-primary text-white shadow-lg shadow-primary/25">
            Get Verified
          </Button>
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Hero */}
        <section className="relative bg-gradient-to-br from-primary via-violet-600 to-indigo-700 rounded-3xl p-7 text-white overflow-hidden shadow-2xl shadow-primary/30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="relative flex flex-col items-center text-center gap-4">
            <div className="h-20 w-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center shadow-2xl">
              <BadgeCheck className="h-10 w-10 text-white fill-white/20" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight mb-1">The Verified Badge</h2>
              <p className="text-white/70 text-sm font-medium max-w-xs mx-auto leading-relaxed">
                More than a checkmark — it's a creator advantage that changes how your income, reach, and status work on ViMore.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 fill-white text-primary" />
              <span className="text-[11px] font-black uppercase tracking-wider">Active for 30 Days</span>
            </div>
          </div>
        </section>

        {/* Earnings comparison — the biggest perk */}
        <section className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Earnings Comparison</p>

          <div className="bg-white dark:bg-white/4 border border-black/5 dark:border-white/8 rounded-3xl p-5 shadow-sm space-y-5">
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Every time someone sends you a gift, unlocks your post, or subscribes — here's how much you keep:
            </p>

            {/* Example visual */}
            <div className="grid grid-cols-2 gap-3">
              {/* All creators */}
              <div className="bg-secondary/30 dark:bg-white/3 border border-black/5 dark:border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <Zap className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">All creators</span>
                </div>
                <div>
                   <p className="text-2xl font-black tabular-nums text-foreground">{creatorKeeps}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Gold kept of {EXAMPLE_AMOUNT}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-bold">You keep</span>
                     <span className="font-black text-foreground">{CREATOR_KEEP}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                     <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: `${CREATOR_KEEP}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-bold">Platform fee</span>
                     <span className="font-black text-red-400">{PLATFORM_FEE}%</span>
                  </div>
                </div>
              </div>

              {/* Verified */}
              <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-primary/15 rounded-full blur-lg" />
                <div className="flex items-center gap-1.5 relative">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Verified ✓</span>
                </div>
                <div className="relative">
                   <p className="text-2xl font-black tabular-nums text-primary">{creatorKeeps}</p>
                  <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">Gold kept of {EXAMPLE_AMOUNT}</p>
                </div>
                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-bold">You keep</span>
                     <span className="font-black text-primary">{CREATOR_KEEP}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                     <div className="h-full bg-primary rounded-full" style={{ width: `${CREATOR_KEEP}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-bold">Platform fee</span>
                    <span className="font-black text-green-500">10%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gift bonus callout */}
            <div className="flex items-center gap-3 bg-green-500/8 border border-green-500/15 rounded-2xl p-3.5">
              <div className="h-9 w-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <DollarSign className="h-4.5 w-4.5 text-green-500" style={{ height: '18px', width: '18px' }} />
              </div>
              <div>
                 <p className="text-xs font-black text-foreground">The same fair rate applies to every creator</p>
                 <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Gifts, post unlocks, and subscriptions use a 10% platform fee for both verified and unverified creators. Transactions under 10 Credits have a 1-Credit minimum fee.</p>
              </div>
            </div>
          </div>
        </section>

        {/* All perks grid */}
        <section className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Everything You Unlock</p>

          <div className="space-y-3">
            {[
              {
                icon: BadgeCheck,
                color: "text-primary",
                bg: "bg-primary/10",
                title: "Verified Badge on Everything",
                desc: "The purple checkmark appears on your profile, every post, every comment, and every story you share. Instant credibility.",
              },
              {
                icon: CheckCircle2,
                color: "text-violet-500",
                bg: "bg-violet-500/10",
                title: "Badge on Your Stories",
                desc: "A purple checkmark appears directly on your story avatar in the stories rail, so fans know it's you before they even tap.",
              },
              {
                icon: Trophy,
                color: "text-amber-500",
                bg: "bg-amber-500/10",
                title: "Verified Creator Leaderboard",
                desc: "Only verified creators appear on the weekly Creator Rankings board. Fans can discover and follow you there — non-verified users can't appear at all.",
                link: "/leaderboard",
                linkLabel: "View Rankings",
              },
              {
                icon: RefreshCw,
                color: "text-green-500",
                bg: "bg-green-500/10",
                title: "Loyalty Renewal Discount",
                desc: "Returning verified creators renew at a lower price — 6 Credits or 20,000 Stars instead of the usual 8 Credits / 25,000 Stars. Reward for staying committed.",
              },
              {
                icon: TrendingUp,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                title: "Priority in Search & Suggestions",
                desc: "Your profile appears before unverified users in search results, the Add Friends card, and the Friends page discovery list.",
              },
              {
                icon: Users,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
                title: "Feed Suggestion Priority",
                desc: "In the Add Friends suggestion card shown in the home feed, verified creators always appear at the very front of the scroll list.",
              },
              {
                icon: Crown,
                color: "text-amber-500",
                bg: "bg-amber-500/10",
                title: "Creator Status Label",
                desc: "Your category label and profile card reflect your verified creator status, distinguishing you from regular users across the platform.",
              },
              {
                icon: Sparkles,
                color: "text-violet-500",
                bg: "bg-violet-500/10",
                title: "Early Feature Access",
                desc: "Verified creators get access to new tools, beta programs, and platform features before they roll out to everyone else.",
              },
              {
                icon: ShieldCheck,
                color: "text-indigo-500",
                bg: "bg-indigo-500/10",
                title: "Trust Signal Everywhere",
                desc: "When fans see the badge on your posts or in search, it signals you are a real, committed creator — increasing engagement and follower trust.",
              },
            ].map((perk) => (
              <div
                key={perk.title}
                className="bg-white dark:bg-white/4 border border-black/5 dark:border-white/8 rounded-2xl p-4 shadow-sm flex items-start gap-4"
              >
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5", perk.bg)}>
                  <perk.icon className={cn("h-5 w-5", perk.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-foreground mb-1">{perk.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{perk.desc}</p>
                  {(perk as any).link && (
                    <Link href={(perk as any).link} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
                      {(perk as any).linkLabel} <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to earn your way to verification */}
        <section className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">How to Earn Your Badge</p>
          <div className="bg-white dark:bg-white/4 border border-black/5 dark:border-white/8 rounded-3xl p-5 shadow-sm space-y-4">
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              You need either <strong className="text-foreground">8 Credits</strong> or <strong className="text-foreground">25,000 Stars</strong> to activate your badge for 30 days. Here are the fastest ways to earn them:
            </p>
            <div className="space-y-3">
              {[
                { icon: Heart, label: "Collect Gifts", desc: "Fans send you Gold or Credits through your posts and reels. The more you post, the more you earn.", color: "text-rose-500", bg: "bg-rose-500/10" },
                { icon: Gift, label: "Premium Posts", desc: "Lock your best content and earn Gold when followers unlock it. Subscribers pay Credits.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
                { icon: Star, label: "Star Reactions", desc: "Fans can send Stars directly via your posts. Collect 25,000 to pay with Stars instead.", color: "text-amber-500", bg: "bg-amber-500/10" },
                { icon: MessageCircle, label: "Boost Engagement", desc: "More comments, shares and views increase your profile ranking and drive more gifting from fans.", color: "text-violet-500", bg: "bg-violet-500/10" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                    <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick cost recap */}
        <section className="bg-gradient-to-br from-primary/10 to-violet-500/5 border border-primary/15 rounded-3xl p-5 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-primary px-1">Monthly Cost</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 dark:bg-white/5 rounded-2xl p-3.5 text-center space-y-1 border border-cyan-500/15">
              <Gem className="h-5 w-5 text-cyan-500 mx-auto" />
              <p className="text-xl font-black text-foreground">8</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Credits / mo</p>
            </div>
            <div className="bg-white/60 dark:bg-white/5 rounded-2xl p-3.5 text-center space-y-1 border border-amber-500/15">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500 mx-auto" />
              <p className="text-xl font-black text-foreground">25K</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Stars / mo</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-green-500/8 border border-green-500/15 rounded-2xl p-3">
            <RefreshCw className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-green-700 dark:text-green-400 font-medium leading-relaxed">
              <strong>Loyalty discount:</strong> Returning creators renew for just <strong>6 Credits</strong> or <strong>20,000 Stars</strong> — automatically applied if you've been verified before.
            </p>
          </div>
        </section>

        {/* Leaderboard CTA */}
        <Link href="/leaderboard" className="block">
          <div className="flex items-center gap-4 bg-gradient-to-r from-amber-400/15 to-amber-500/5 border border-amber-400/25 rounded-2xl p-4 hover:border-amber-400/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground">See the Creator Rankings</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Only verified creators appear on the leaderboard. Check who's on top.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Link>

        {/* CTA */}
        <Link href="/verification" className="block">
          <Button
            className="w-full h-14 rounded-2xl font-black text-base tracking-wide shadow-lg shadow-primary/25 bg-primary text-white hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <BadgeCheck className="h-5 w-5" />
            Get Your Badge Now
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
        <div className="flex items-center justify-center gap-2 text-muted-foreground/50 font-bold text-[10px] uppercase tracking-widest">
          <ShieldCheck className="h-3 w-3" />
          Renews every 30 days · Cancel anytime
        </div>

      </main>
    </div>
  );
}
