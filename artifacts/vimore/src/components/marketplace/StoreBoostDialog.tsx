"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePosts } from "@/context/PostContext";
import { boostStoreWithDiamonds, STORE_BOOST_DIAMONDS_PER_DAY, STORE_BOOST_MAX_DAYS, isStoreBoosted, StoreDoc } from "@/lib/stores";
import { Zap, Diamond, Loader2, CalendarDays, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreBoostDialogProps {
  store: StoreDoc;
  onBoosted?: (newUntil: string) => void;
  children: React.ReactNode;
}

export function StoreBoostDialog({ store, onBoosted, children }: StoreBoostDialogProps) {
  const { currentUser, setCurrentUserState } = usePosts() as any;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [boosting, setBoosting] = useState(false);

  const cost = days * STORE_BOOST_DIAMONDS_PER_DAY;
  const balance = currentUser?.diamondBalance || 0;
  const canAfford = balance >= cost;
  const alreadyBoosted = isStoreBoosted(store);
  const boostUntilDate = store.boost_until ? new Date(store.boost_until) : null;

  const handleBoost = async () => {
    if (!currentUser || !canAfford || boosting) return;
    setBoosting(true);
    try {
      const newUntil = await boostStoreWithDiamonds(store.$id, currentUser.$id, days, balance);
      if (setCurrentUserState) {
        setCurrentUserState((prev: any) => prev ? { ...prev, diamondBalance: balance - cost } : null);
      }
      toast({
        title: "Store Boosted!",
        description: `"${store.store_name}" will appear at the top for ${days} day${days > 1 ? 's' : ''}.`,
      });
      onBoosted?.(newUntil);
      setOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Boost failed", description: err?.message || "Try again." });
    } finally {
      setBoosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none">
        <div className="bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/20 dark:to-background p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md shadow-amber-200">
                <Zap className="h-5 w-5 text-white fill-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-tighter">Boost Store</DialogTitle>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pin to top of marketplace</p>
              </div>
            </div>
          </DialogHeader>

          {alreadyBoosted && boostUntilDate && (
            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                Currently boosted until {boostUntilDate.toLocaleDateString()}. Adding more days extends this.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-black">Duration</span>
              </div>
              <span className="text-sm font-black text-amber-500">{days} day{days > 1 ? 's' : ''}</span>
            </div>
            <input
              type="range"
              min={1}
              max={STORE_BOOST_MAX_DAYS}
              step={1}
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              <span>1 day</span>
              <span>{STORE_BOOST_MAX_DAYS} days</span>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-2xl border border-amber-200/60 dark:border-amber-800/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rate</span>
              <div className="flex items-center gap-1 text-sm font-black text-amber-600">
                <Diamond className="h-3.5 w-3.5 fill-current" />
                {STORE_BOOST_DIAMONDS_PER_DAY} / day
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 pt-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Cost</span>
              <div className={cn("flex items-center gap-1 text-lg font-black", !canAfford ? "text-destructive" : "text-foreground")}>
                <Diamond className="h-4 w-4 fill-current text-cyan-500" />
                {cost}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Balance</span>
              <div className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
                <Diamond className="h-3 w-3 fill-current text-cyan-500/60" />
                {balance}
              </div>
            </div>
          </div>

          {!canAfford && (
            <p className="text-[10px] font-bold text-destructive text-center">
              You need {cost - balance} more Credits to boost for {days} day{days > 1 ? 's' : ''}.
            </p>
          )}

          <Button
            onClick={handleBoost}
            disabled={!canAfford || boosting}
            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest bg-amber-400 hover:bg-amber-500 text-white border-none gap-2"
          >
            {boosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-white" />}
            {boosting ? "Boosting..." : `Boost for ${cost} Credits`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
