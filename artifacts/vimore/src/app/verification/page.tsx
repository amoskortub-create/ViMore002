
"use client";

import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Gem, 
  Star, 
  Zap, 
  Clock, 
  Loader2, 
  Sparkles,
  ChevronRight,
  BadgeCheck,
  Crown,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useNotifications } from "@/context/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ProfileLoading from "../profile/loading";

export default function VerificationHub() {
  const { currentUser, verifyUser, triggerHaptic, isLoading } = usePosts();
  const { currentTrack, isExpanded } = useMusic();
  const { addSignal } = useNotifications();
  const { toast } = useToast();

  const [currencyChoice, setCurrencyChoice] = useState<'DIAMOND' | 'STAR'>('DIAMOND');
  const [isVerifying, setIsVerifying] = useState(false);

  const isPlayerActive = currentTrack && !isExpanded;

  // Returning verified creators get a loyalty discount on renewal
  const isRenewal = !!(currentUser && currentUser.hasEverBeenVerified && !currentUser.isVerified);

  const pricing = useMemo(() => {
    return isRenewal
      ? { diamond: 6, star: 20000 }
      : { diamond: 8, star: 25000 };
  }, [isRenewal]);

  const currentCost = currencyChoice === 'DIAMOND' ? pricing.diamond : pricing.star;

  const hasBalance = useMemo(() => {
    if (!currentUser) return false;
    return currencyChoice === 'DIAMOND'
      ? (currentUser.diamondBalance || 0) >= pricing.diamond
      : (currentUser.starBalance || 0) >= pricing.star;
  }, [currentUser, currencyChoice, pricing]);

  const diamondBalance = currentUser?.diamondBalance || 0;
  const starBalance = currentUser?.starBalance || 0;

  const handleVerificationRequest = async () => {
    if (!currentUser) return;
    if (!hasBalance) {
      triggerHaptic(50);
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: currencyChoice === 'DIAMOND'
          ? `You need ${pricing.diamond} Credits. You have ${diamondBalance}.`
          : `You need ${pricing.star.toLocaleString()} Stars. You have ${starBalance.toLocaleString()}.`
      });
      return;
    }

    setIsVerifying(true);
    triggerHaptic(20);

    try {
      await verifyUser(currentCost, currencyChoice);

      addSignal({
        type: 'SYSTEM',
        title: 'Verification Badge Activated',
        content: `Your verification badge is now live. **Valid for 30 days.**`,
        avatar: currentUser.avatar
      });

      toast({
        title: "You're Verified!",
        description: "Your verification badge is now active for 30 days."
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading || !currentUser) {
    return <ProfileLoading />;
  }

  const perks = [
    { icon: BadgeCheck, label: "Verified Badge", desc: "Purple checkmark on your profile and posts" },
    { icon: TrendingUp, label: "Priority Ranking", desc: "Appear higher in search and explore results" },
    { icon: Crown, label: "Creator Status", desc: "Unlock exclusive creator monetization tools" },
    { icon: Sparkles, label: "Special Access", desc: "Early access to new features and beta programs" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F0FA] dark:bg-[#06060e] transition-colors duration-300 overflow-x-hidden relative">

      {/* Background ambiance */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary/15 blur-[140px] rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-violet-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-400/5 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#06060e]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/5 h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="h-9 w-9 rounded-2xl bg-secondary/60 dark:bg-white/5 flex items-center justify-center hover:bg-secondary transition-all active:scale-90">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-base font-black tracking-tight">Get Verified</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Verification Badge</p>
          </div>
        </div>
        {/* Balance display */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5 bg-cyan-500/10 rounded-full px-2.5 py-1">
              <Gem className="h-3 w-3 text-cyan-500" />
              <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{diamondBalance}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-500/10 rounded-full px-2.5 py-1">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">{starBalance.toLocaleString()}</span>
            </div>
          </div>
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback>{currentUser.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className={cn(
        "max-w-xl mx-auto px-4 pb-28 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
        "pt-6"
      )}>

        {/* Loyalty renewal banner */}
        {isRenewal && (
          <div className="flex items-start gap-3 bg-green-500/8 border border-green-500/20 rounded-2xl p-4">
            <div className="h-8 w-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
              <BadgeCheck className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-black text-green-600 dark:text-green-400 mb-0.5">Loyalty Discount Applied</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Welcome back! As a returning creator your renewal is discounted — <strong className="text-foreground">6 Credits</strong> or <strong className="text-foreground">20,000 Stars</strong> instead of the usual price.
              </p>
            </div>
          </div>
        )}

        {/* Hero section */}
        <section className="relative bg-gradient-to-br from-primary via-violet-600 to-indigo-600 rounded-3xl p-6 text-white overflow-hidden shadow-2xl shadow-primary/30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />

          <div className="relative flex items-center gap-5">
            {/* Avatar with badge */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-white/30 rounded-full blur-sm" />
              <Avatar className="h-20 w-20 border-3 border-white/40 shadow-xl relative z-10">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="bg-white/20 text-white text-xl font-black">{currentUser.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 z-20 bg-white rounded-full p-1 shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-primary fill-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-black tracking-tight truncate">{currentUser.name}</h2>
                {currentUser.isVerified && <CheckCircle2 className="h-5 w-5 fill-white text-primary shrink-0" />}
              </div>
              <p className="text-white/70 text-xs font-medium mb-3">@{currentUser.username || currentUser.name}</p>
              {currentUser.isVerified ? (
                <div className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-full px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 fill-white text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Badge Active</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Not Verified</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Perks */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">What you get</p>
            <Link href="/verification/benefits" className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:opacity-80 transition-opacity">
              See all benefits <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {perks.map((perk) => (
              <div key={perk.label} className="bg-white dark:bg-white/4 border border-black/5 dark:border-white/8 rounded-2xl p-4 shadow-sm">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <perk.icon className="h-4.5 w-4.5 text-primary" style={{ height: '18px', width: '18px' }} />
                </div>
                <p className="text-xs font-black text-foreground mb-0.5">{perk.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{perk.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Payment method selection */}
        <section className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Choose payment method</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Credit option */}
            <button
              onClick={() => { triggerHaptic(10); setCurrencyChoice('DIAMOND'); }}
              className={cn(
                "relative p-5 rounded-3xl border-2 transition-all duration-200 text-left overflow-hidden",
                currencyChoice === 'DIAMOND'
                  ? "bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-500 shadow-xl shadow-cyan-500/25 scale-[1.02] text-white"
                  : "bg-white dark:bg-white/4 border-black/8 dark:border-white/8 hover:border-cyan-400/50 text-foreground"
              )}
            >
              {currencyChoice === 'DIAMOND' && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
              )}
              <div className="relative z-10">
                <div className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center mb-4",
                  currencyChoice === 'DIAMOND' ? "bg-white/20" : "bg-cyan-500/10"
                )}>
                  <Gem className={cn("h-5 w-5", currencyChoice === 'DIAMOND' ? "text-white" : "text-cyan-500")} />
                </div>
                <p className={cn("text-2xl font-black tabular-nums tracking-tight", currencyChoice === 'DIAMOND' ? "text-white" : "text-foreground")}>
                  {pricing.diamond}
                </p>
                <p className={cn("text-[10px] font-black uppercase tracking-widest mt-0.5", currencyChoice === 'DIAMOND' ? "text-white/70" : "text-muted-foreground")}>
                  Credits / mo
                </p>
                <div className={cn(
                  "mt-3 text-[10px] font-bold",
                  currencyChoice === 'DIAMOND' ? "text-white/60" : "text-muted-foreground/70"
                )}>
                  Balance: {diamondBalance}
                  {diamondBalance >= pricing.diamond
                    ? <span className={cn("ml-1 font-black", currencyChoice === 'DIAMOND' ? "text-white" : "text-green-500")}> ✓</span>
                    : <span className="ml-1 text-red-400"> ✗</span>
                  }
                </div>
              </div>
              {currencyChoice === 'DIAMOND' && (
                <div className="absolute top-3 right-3">
                  <div className="h-5 w-5 rounded-full bg-white/30 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-white fill-white" />
                  </div>
                </div>
              )}
            </button>

            {/* Star option */}
            <button
              onClick={() => { triggerHaptic(10); setCurrencyChoice('STAR'); }}
              className={cn(
                "relative p-5 rounded-3xl border-2 transition-all duration-200 text-left overflow-hidden",
                currencyChoice === 'STAR'
                  ? "bg-gradient-to-br from-amber-400 to-amber-500 border-amber-400 shadow-xl shadow-amber-400/25 scale-[1.02] text-white"
                  : "bg-white dark:bg-white/4 border-black/8 dark:border-white/8 hover:border-amber-400/50 text-foreground"
              )}
            >
              {currencyChoice === 'STAR' && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
              )}
              <div className="relative z-10">
                <div className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center mb-4",
                  currencyChoice === 'STAR' ? "bg-white/20" : "bg-amber-500/10"
                )}>
                  <Star className={cn("h-5 w-5 fill-current", currencyChoice === 'STAR' ? "text-white" : "text-amber-500")} />
                </div>
                <p className={cn("text-2xl font-black tabular-nums tracking-tight", currencyChoice === 'STAR' ? "text-white" : "text-foreground")}>
                  {pricing.star.toLocaleString()}
                </p>
                <p className={cn("text-[10px] font-black uppercase tracking-widest mt-0.5", currencyChoice === 'STAR' ? "text-white/70" : "text-muted-foreground")}>
                  Stars / mo
                </p>
                <div className={cn(
                  "mt-3 text-[10px] font-bold",
                  currencyChoice === 'STAR' ? "text-white/60" : "text-muted-foreground/70"
                )}>
                  Balance: {starBalance.toLocaleString()}
                  {starBalance >= pricing.star
                    ? <span className={cn("ml-1 font-black", currencyChoice === 'STAR' ? "text-white" : "text-green-500")}> ✓</span>
                    : <span className="ml-1 text-red-400"> ✗</span>
                  }
                </div>
              </div>
              {currencyChoice === 'STAR' && (
                <div className="absolute top-3 right-3">
                  <div className="h-5 w-5 rounded-full bg-white/30 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-white fill-white" />
                  </div>
                </div>
              )}
            </button>
          </div>
        </section>

        {/* Summary card */}
        <div className="bg-white dark:bg-white/4 border border-black/5 dark:border-white/8 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currencyChoice === 'DIAMOND'
                ? <Gem className="h-4 w-4 text-cyan-500" />
                : <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              }
              <span className="text-sm font-black">Monthly Cost</span>
            </div>
            <span className="text-sm font-black text-primary">
              {currencyChoice === 'DIAMOND' ? `${pricing.diamond} Credits` : `${pricing.star.toLocaleString()} Stars`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-black">Duration</span>
            </div>
            <span className="text-sm font-black">30 Days</span>
          </div>
          <div className="h-px bg-black/5 dark:bg-white/5" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Your balance after</span>
            <span className={cn("text-xs font-black", hasBalance ? "text-green-500" : "text-red-400")}>
              {hasBalance
                ? currencyChoice === 'DIAMOND'
                  ? `${(diamondBalance - pricing.diamond)} Credits left`
                  : `${(starBalance - pricing.star).toLocaleString()} Stars left`
                : "Insufficient balance"
              }
            </span>
          </div>
        </div>

        {/* Validity notice */}
        <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/15 rounded-2xl p-4">
          <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
            Your verification badge stays active for <strong>30 days</strong>. After expiry, your profile will return to unverified status until renewed.
          </p>
        </div>

        {/* CTA Button */}
        <div className="space-y-3">
          <Button
            className={cn(
              "w-full h-14 rounded-2xl font-black text-base tracking-wide shadow-lg transition-all duration-200 active:scale-[0.98]",
              hasBalance && !isVerifying && !currentUser.isVerified
                ? "bg-primary text-white shadow-primary/25 hover:-translate-y-0.5 hover:shadow-primary/35"
                : "bg-secondary text-muted-foreground/50 cursor-not-allowed shadow-none"
            )}
            disabled={!hasBalance || isVerifying || currentUser.isVerified}
            onClick={handleVerificationRequest}
          >
            {isVerifying ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
            ) : currentUser.isVerified ? (
              <><CheckCircle2 className="mr-2 h-5 w-5 fill-current" /> Badge Already Active</>
            ) : !hasBalance ? (
              <><Zap className="mr-2 h-5 w-5" /> Insufficient Balance</>
            ) : (
              <><BadgeCheck className="mr-2 h-5 w-5" /> Get Verified — {currencyChoice === 'DIAMOND' ? `${pricing.diamond} Credits` : `${pricing.star.toLocaleString()} Stars`}</>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-muted-foreground/50 font-bold text-[10px] uppercase tracking-widest">
            <ShieldCheck className="h-3 w-3" />
            Secured · Balance deducted instantly · 30-day access
          </div>
        </div>

      </main>
    </div>
  );
}
