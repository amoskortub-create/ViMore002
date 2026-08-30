"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MapPin, Trash2, Flag, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePosts } from "@/context/PostContext";
import { ProductDoc, deleteProduct, getProductImageUrl, formatPrice, isFeatured } from "@/lib/marketplace";
import { ContactButtons } from "./ContactButtons";
import { ReportProductDialog } from "./ReportProductDialog";

interface Props {
  product: ProductDoc;
  onDeleted?: (productId: string) => void;
}

export function ProductCard({ product, onDeleted }: Props) {
  const { currentUser, allUsers } = usePosts();
  const { toast } = useToast();
  const isSellerVerified = useMemo(
    () => allUsers.find(u => u.$id === product.sellerId)?.isVerified || false,
    [allUsers, product.sellerId]
  );
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUser?.$id === product.sellerId;
  const thumb = product.imageFileIds[0] ? getProductImageUrl(product.imageFileIds[0], 'thumb') : '';

  const handleDelete = async () => {
    if (!isOwner) return;
    setDeleting(true);
    try {
      await deleteProduct(product.$id);
      toast({ title: "Listing removed" });
      onDeleted?.(product.$id);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not delete", description: err?.message || "Try again." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="bg-white dark:bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col">
      <Link href={`/marketplace/${product.$id}`} className="block relative aspect-square bg-secondary/40">
        {thumb ? (
          <img
            src={thumb}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">No Image</div>
        )}
        {product.status !== 'active' && (
          <span className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">{product.status}</span>
        )}
        {product.status === 'active' && isFeatured(product) && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-cyan-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-md">
            <Sparkles className="h-2.5 w-2.5" /> Featured
          </span>
        )}
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link href={`/marketplace/${product.$id}`} className="block">
          <h3 className="text-sm font-bold line-clamp-1">{product.name}</h3>
          <p className="text-base font-black text-primary mt-0.5">{formatPrice(product.priceAmount, product.priceCurrency)}</p>
        </Link>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{product.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground truncate">@{product.sellerUsername}</span>
          {isSellerVerified && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              <CheckCircle2 className="h-2 w-2" /> Verified
            </span>
          )}
        </div>

        <div className="mt-1">
          <ContactButtons product={product} compact />
        </div>

        <div className="flex items-center justify-end gap-1 pt-1">
          {!isOwner && currentUser && (
            <ReportProductDialog product={product}>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive" aria-label="Report listing">
                <Flag className="h-3.5 w-3.5" />
              </Button>
            </ReportProductDialog>
          )}
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" aria-label="Delete listing" disabled={deleting}>
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black italic uppercase tracking-tighter">Delete listing?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes "{product.name}" and its photos. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </article>
  );
}
