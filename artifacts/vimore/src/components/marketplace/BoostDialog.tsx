"use client";

import { useState } from "react";
import { Gem, Rocket, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { usePosts } from "@/context/PostContext";
import { useToast } from "@/hooks/use-toast";
import { BOOST_DAYS_PER_DIAMOND, BOOST_MIN_DIAMONDS, BOOST_MAX_DIAMONDS, isFeatured, ProductDoc } from "@/lib/marketplace";

interface Props {
  product: ProductDoc;
  children: React.ReactNode;
  onBoosted?: (newUntil: string) => void;
}

export function BoostDialog({ product, children, onBoosted }: Props) {
  const { currentUser, boostMarketplaceListing } = usePosts();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [diamonds, setDiamonds] = useState<number>(BOOST_MIN_DIAMONDS);
  const [submitting, setSubmitting] = useState(false);

  const days = diamonds * BOOST_DAYS_PER_DIAMOND;
  const balance = currentUser?.diamondBalance || 0;
  const insufficient = balance < diamonds;
  const alreadyFeatured = isFeatured(product);

  const adjust = (delta: number) => {
    setDiamonds(d => Math.min(BOOST_MAX_DIAMONDS, Math.max(BOOST_MIN_DIAMONDS, d + delta)));
  };

  const handleConfirm = async () => {
    if (insufficient) {
      toast({ variant: "destructive", title: "Not enough Credits", description: `You need ${diamonds} but have ${balance}.` });
      return;
    }
    setSubmitting(true);
    try {
      const newUntil = await boostMarketplaceListing(product.$id, diamonds);
      onBoosted?.(newUntil);
      setOpen(false);
    } catch { /* toast already shown */ }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto mb-2">
            <Rocket className="h-7 w-7" />
          </div>
          <DialogTitle className="font-black italic uppercase tracking-tighter text-center text-xl">Feature this listing</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Push your product to the top of the marketplace. <span className="font-bold text-foreground">{BOOST_MIN_DIAMONDS} Credits = {BOOST_MIN_DIAMONDS * BOOST_DAYS_PER_DIAMOND} days</span>.
          </DialogDescription>
        </DialogHeader>

        {alreadyFeatured && product.featuredUntil && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Currently Featured</p>
            <p className="text-xs text-muted-foreground">Active until {new Date(product.featuredUntil).toLocaleDateString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Adding more time stacks on top.</p>
          </div>
        )}

        <div className="bg-secondary/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Credits</p>
            <p className="text-[10px] text-muted-foreground">Balance: <span className="font-bold text-cyan-500">{balance}</span></p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => adjust(-1)} disabled={diamonds <= BOOST_MIN_DIAMONDS} className="h-12 w-12 rounded-full bg-background">
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 bg-cyan-500/10 px-6 py-3 rounded-2xl min-w-[120px] justify-center">
              <Gem className="h-6 w-6 text-cyan-500" />
              <span className="text-3xl font-black tabular-nums">{diamonds}</span>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => adjust(1)} disabled={diamonds >= BOOST_MAX_DIAMONDS} className="h-12 w-12 rounded-full bg-background">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center pt-1">
            <p className="text-2xl font-black italic uppercase tracking-tighter text-primary">{days} days</p>
            <p className="text-[10px] text-muted-foreground">Featured at the top of the marketplace</p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting} className="rounded-xl">Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || insufficient}
            className="rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white gap-2 font-black uppercase tracking-widest text-[10px]"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {insufficient ? "Not enough Credits" : `Boost · ${diamonds} Credits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
