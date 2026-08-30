"use client";

import { useState, useMemo } from "react";
import {
  X,
  Zap,
  Gem,
  Star,
  Clock,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Rocket,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Info,
  ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BoostPortalProps {
  children: React.ReactNode;
  nodeId: string;
  type: 'POST' | 'SONIC';
}

const CREDIT_RATE = 2;

const DAY_TIERS = [
  { days: 1, label: '1 Day', sublabel: 'Pulse' },
  { days: 3, label: '3 Days', sublabel: 'Surge' },
  { days: 7, label: '7 Days', sublabel: 'Wave' },
  { days: 14, label: '14 Days', sublabel: 'Dominate' },
];

export function BoostPortal({ children, nodeId, type }: BoostPortalProps) {
  const { currentUser, boostNode, triggerHaptic } = usePosts();
  const { refreshMusicVault } = useMusic();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [days, setDays] = useState(3);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const rate = CREDIT_RATE;
  const totalCost = days * rate;
  const currentBalance = currentUser?.creditBalance ?? currentUser?.diamondBalance ?? 0;
  const hasBalance = currentBalance >= totalCost;

  const handleLaunch = async () => {
    if (!hasBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You need ${totalCost.toLocaleString()} Credits for this boost.`,
      });
      return;
    }

    setIsSyncing(true);
    triggerHaptic(30);

    try {
      await boostNode(nodeId, days, 'CREDIT', type);
      if (type === 'SONIC') await refreshMusicVault();
      setIsSuccess(true);
      triggerHaptic(100);
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
      }, 2800);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Boost Failed", description: e.message || "Something went wrong. Try again." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setIsSuccess(false);
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-t-[3rem] p-0 border-primary/10 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-3xl h-[90vh] flex flex-col top-auto bottom-0 translate-y-0 translate-x-[-50%] overflow-hidden">
        <div className="mx-auto w-12 h-1.5 bg-primary/20 rounded-full mt-4 mb-2 shrink-0" />

        <DialogHeader className="px-6 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
                {type === 'SONIC' ? 'Boost Track' : 'Boost Post'}
              </DialogTitle>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">
                {type === 'SONIC' ? 'Pulse your music into discovery' : 'Amplify your node in the feed'}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => handleOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500 px-8 text-center">
            <div className="relative">
              <div className="absolute -inset-10 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <div className="h-28 w-28 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-primary/30 relative z-10">
                <Rocket className="h-14 w-14" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">Boost Active!</h3>
              <p className="text-base font-bold text-muted-foreground">
                Your {type === 'SONIC' ? 'track' : 'post'} is now live for <span className="text-primary">{days} {days === 1 ? 'day' : 'days'}</span>
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 bg-primary/5 rounded-2xl px-4 py-2 border border-primary/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
                  {totalCost.toLocaleString()} Credits deducted
                </span>
              </div>
              {type === 'POST' && (
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  Your profile is now showing in Suggested Follows for non-followers
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 space-y-6 py-4 scrollbar-hide">

              {/* Duration Tier Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Boost Duration</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {DAY_TIERS.map((tier) => (
                    <button
                      key={tier.days}
                      onClick={() => { triggerHaptic(8); setDays(tier.days); }}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl p-3 gap-0.5 border-2 transition-all",
                        days === tier.days
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : "bg-secondary/20 text-foreground border-transparent hover:border-primary/20"
                      )}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{tier.sublabel}</span>
                      <span className="text-xl font-black italic">{tier.days}</span>
                      <span className="text-[8px] font-bold uppercase">{tier.days === 1 ? 'day' : 'days'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit balance */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Pay With</span>
                </div>
                <div className="rounded-2xl p-4 border-2 border-cyan-500/40 bg-cyan-500/10">
                  <div className="flex items-center gap-2"><Gem className="h-5 w-5 text-cyan-500" /><span className="text-[10px] font-black uppercase tracking-widest">Credits</span></div>
                  <span className="text-[10px] font-bold text-muted-foreground">{CREDIT_RATE} per day</span>
                  <span className={cn("block text-[9px] font-black uppercase", hasBalance ? "text-green-500" : "text-red-400")}>Balance: {currentBalance.toLocaleString()}</span>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="bg-primary/5 border-2 border-primary/15 rounded-[2rem] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Duration</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-black text-foreground">{days} {days === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rate</span>
                  <span className="text-sm font-black text-foreground">
                    {rate.toLocaleString()} Credits/day
                  </span>
                </div>
                <div className="border-t border-primary/10 pt-3 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-primary">Total Cost</span>
                  <div className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-cyan-500" />
                    <span className="text-2xl font-black italic tracking-tighter text-foreground tabular-nums">
                      {totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>
                {!hasBalance && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-red-400 uppercase">Insufficient balance</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        You need {(totalCost - currentBalance).toLocaleString()} more Credits.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* What Boost Does */}
              <div className="bg-secondary/10 border border-white/5 rounded-[2rem] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">What you get</span>
                </div>
                <ul className="space-y-2">
                  {[
                    type === 'POST'
                      ? 'Your post appears every 5 posts in the home feed for non-followers'
                      : 'Your track appears in the Trending section on the Music page (position randomized each load)',
                    'Your profile is added to Suggested Follows for all users not following you',
                    `Boost runs for exactly ${days} ${days === 1 ? 'day' : 'days'}, then stops automatically`,
                    'No minimum views required — time-based guarantee',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-[11px] font-medium text-muted-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            <div className="p-6 bg-white dark:bg-[#050505] border-t border-primary/5 pb-10 space-y-3">
              <Button
                className={cn(
                  "w-full h-14 rounded-2xl font-black italic uppercase tracking-[0.2em] text-base shadow-2xl transition-all active:scale-[0.98]",
                  hasBalance && !isSyncing
                    ? "bg-primary text-white shadow-primary/20 hover:shadow-primary/30"
                    : "bg-secondary/40 text-muted-foreground/40 cursor-not-allowed"
                )}
                disabled={!hasBalance || isSyncing}
                onClick={handleLaunch}
              >
                {isSyncing ? (
                  <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Activating...</>
                ) : (
                  <><Rocket className="mr-2 h-5 w-5" /> Boost for {days} {days === 1 ? 'Day' : 'Days'}</>
                )}
              </Button>
              <p className="text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                Balance is verified before activation • No refunds after launch
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
