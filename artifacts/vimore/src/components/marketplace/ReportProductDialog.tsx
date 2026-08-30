"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePosts } from "@/context/PostContext";
import { databases, COL, DATABASE_ID, ID } from "@/lib/appwrite";
import { Flag, Loader2 } from "lucide-react";
import { ProductDoc } from "@/lib/marketplace";

const REASONS = [
  "Scam / Fake item",
  "Prohibited item",
  "Misleading description",
  "Inappropriate images",
  "Spam",
  "Other",
];

const THROTTLE_KEY = (productId: string, userId: string) => `vimore_report_${productId}_${userId}`;

interface Props {
  product: ProductDoc;
  children: React.ReactNode;
}

export function ReportProductDialog({ product, children }: Props) {
  const { currentUser } = usePosts();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please sign in to report listings." });
      return;
    }
    if (!reason) {
      toast({ variant: "destructive", title: "Select a reason" });
      return;
    }
    if (details.trim().length < 10) {
      toast({ variant: "destructive", title: "Please add a few details (10+ characters)" });
      return;
    }

    const throttleKey = THROTTLE_KEY(product.$id, currentUser.$id);
    try {
      const last = typeof window !== 'undefined' ? localStorage.getItem(throttleKey) : null;
      if (last) {
        const lastTs = Number(last);
        if (Date.now() - lastTs < 24 * 60 * 60 * 1000) {
          toast({ variant: "destructive", title: "Already reported", description: "You've already reported this listing in the last 24 hours." });
          setOpen(false);
          return;
        }
      }
    } catch { /* ignore */ }

    setSubmitting(true);
    try {
      await databases.createDocument(DATABASE_ID, COL.REPORTS, ID.unique(), {
        reporter_id: currentUser.$id,
        target_id: product.$id,
        target_type: 'PRODUCT',
        reason,
        details: details.trim(),
        status: 'PENDING',
        target_meta: JSON.stringify({
          productName: product.name,
          sellerUsername: product.sellerUsername,
          sellerId: product.sellerId,
          thumbnailFileId: product.imageFileIds?.[0] || null,
        }),
      });
      try { localStorage.setItem(throttleKey, String(Date.now())); } catch { /* ignore */ }
      toast({ title: "Report submitted", description: "Our team will review it shortly." });
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not submit report", description: err?.message || "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-black italic uppercase tracking-tighter flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Listing
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl bg-secondary/40 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reporting</p>
            <p className="text-sm font-bold truncate">{product.name}</p>
            <p className="text-xs text-muted-foreground">@{product.sellerUsername}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest">Details</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What's wrong with this listing?"
              maxLength={500}
              rows={4}
              className="rounded-xl resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">{details.length}/500</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting} className="rounded-xl">Cancel</Button>
          <Button type="button" onClick={submit} disabled={submitting} className="rounded-xl bg-destructive hover:bg-destructive/90">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
