"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/layout/main-nav";
import { ContactButtons } from "@/components/marketplace/ContactButtons";
import { StoreBoostDialog } from "@/components/marketplace/StoreBoostDialog";
import { StoreForm } from "@/components/marketplace/StoreForm";
import { ProductForm } from "@/components/marketplace/ProductForm";
import { usePosts } from "@/context/PostContext";
import { getStore, StoreDoc, getStoreLogoUrl, isStoreBoosted } from "@/lib/stores";
import { listProductsBySeller, ProductDoc, getProductImageUrl, formatPrice, isFeatured } from "@/lib/marketplace";
import {
  ArrowLeft, Store, MessageCircle, Zap, MapPin, Package,
  Loader2, ShoppingBag, Pencil, Link2, Check, Plus, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";

function StoreProductCard({ product }: { product: ProductDoc }) {
  const router = useRouter();
  const thumb = product.imageFileIds?.[0] ? getProductImageUrl(product.imageFileIds[0], "thumb") : null;
  const featured = isFeatured(product);

  return (
    <div className={cn(
      "rounded-2xl border bg-white dark:bg-card overflow-hidden flex flex-col",
      featured ? "border-amber-400/50 shadow-md shadow-amber-100 dark:shadow-amber-900/20" : "border-border/40"
    )}>
      <button
        onClick={() => router.push(`/marketplace/${product.$id}`)}
        className="block aspect-square w-full bg-secondary/20 overflow-hidden relative"
      >
        {thumb ? (
          <img src={thumb} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {featured && (
          <div className="absolute top-2 left-2 h-5 px-2 rounded-full bg-amber-400 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5 text-white fill-white" />
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Featured</span>
          </div>
        )}
      </button>
      <div className="p-2.5 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-[11px] font-black leading-tight line-clamp-2 text-foreground">{product.name}</p>
          <p className="text-sm font-black text-primary mt-0.5">{formatPrice(product.priceAmount, product.priceCurrency)}</p>
          {product.location && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground truncate">{product.location}</span>
            </div>
          )}
        </div>
        <ContactButtons product={product} compact />
      </div>
    </div>
  );
}

export default function StorefrontPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const searchParams = useSearchParams();
  const { currentUser } = usePosts();

  const [store, setStore] = useState<StoreDoc | null>(null);
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadProducts = useCallback(async (ownerId: string) => {
    const data = await listProductsBySeller(ownerId, 50);
    setProducts(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storeData = await getStore(storeId);
      if (cancelled) return;
      setStore(storeData);
      if (storeData) {
        const productsData = await listProductsBySeller(storeData.owner_id, 50);
        if (cancelled) return;
        setProducts(productsData);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  useEffect(() => {
    if (!loading && searchParams.get("addProduct") === "true") {
      setAddProductOpen(true);
    }
  }, [loading, searchParams]);

  const copyStoreLink = () => {
    const link = `${window.location.origin}/marketplace/store/${storeId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch {}
      document.body.removeChild(ta);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="max-w-[1440px] w-full grid grid-cols-1 md:grid-cols-[280px_1fr]">
          <aside className="hidden md:block border-r border-primary/5"><div className="sticky top-0 h-screen overflow-y-auto"><MainNav /></div></aside>
          <main className="flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></main>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Store className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Store not found</p>
        <Link href="/marketplace"><Button variant="secondary" className="rounded-xl">Back to Marketplace</Button></Link>
      </div>
    );
  }

  const { allUsers } = usePosts();
  const isOwner = currentUser?.$id === store.owner_id;
  const boosted = isStoreBoosted(store);
  const isOwnerVerified = allUsers.find(u => u.$id === store.owner_id)?.isVerified || false;
  const logoUrl = store.logo_file_id ? getStoreLogoUrl(store.logo_file_id) : null;
  const featuredFirst = [...products].sort((a, b) => Number(isFeatured(b)) - Number(isFeatured(a)));

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="max-w-[1440px] w-full grid grid-cols-1 md:grid-cols-[280px_1fr]">
        <aside className="hidden md:block border-r border-primary/5 bg-white dark:bg-card">
          <div className="sticky top-0 h-screen overflow-y-auto"><MainNav /></div>
        </aside>

        <main className="pb-24 md:pb-6">
          {/* ── Sticky top bar ── */}
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-background/80 backdrop-blur-md border-b border-primary/5 px-4 py-3 flex items-center gap-2">
            <Link href="/marketplace">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <p className="font-black text-base truncate flex-1">{store.store_name}</p>

            {/* Copy link — always visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={copyStoreLink}
              className={cn(
                "rounded-full h-9 w-9 shrink-0 transition-colors",
                copied ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-muted-foreground hover:text-foreground"
              )}
              title="Copy store link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </Button>

            {isOwner && (
              <div className="flex items-center gap-1.5 shrink-0">
                <StoreBoostDialog
                  store={store}
                  onBoosted={newUntil => setStore(prev => prev ? { ...prev, boost_until: newUntil } : null)}
                >
                  <Button size="sm" className={cn(
                    "h-8 rounded-xl gap-1.5 text-[10px] font-black uppercase tracking-widest border-none px-3",
                    boosted
                      ? "bg-amber-400 hover:bg-amber-500 text-white"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                  )}>
                    <Zap className={cn("h-3.5 w-3.5", boosted && "fill-white")} />
                    {boosted ? "Boosted" : "Boost"}
                  </Button>
                </StoreBoostDialog>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 rounded-xl gap-1.5 text-[10px] font-black uppercase tracking-widest px-3">
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogTitle className="font-black uppercase tracking-tighter text-lg">Edit Store</DialogTitle>
                    <StoreForm existing={store} onSaved={s => { setStore(s); setEditOpen(false); }} />
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* ── Brand hero ── */}
          <div className={cn(
            "relative overflow-hidden",
            boosted
              ? "bg-gradient-to-br from-amber-50 via-white to-primary/5 dark:from-amber-900/20 dark:via-background dark:to-primary/5"
              : "bg-gradient-to-br from-primary/5 via-white to-background dark:from-primary/10 dark:via-background dark:to-background"
          )}>
            {logoUrl && (
              <div
                className="absolute inset-0 opacity-10 blur-3xl scale-125"
                style={{ backgroundImage: `url(${logoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            )}
            <div className="relative px-6 py-10 flex flex-col items-center text-center gap-4">
              <div className="h-28 w-28 rounded-3xl overflow-hidden bg-white dark:bg-card shadow-xl border-4 border-white dark:border-card flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt={store.store_name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="h-12 w-12 text-primary/40" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black uppercase tracking-tighter">{store.store_name}</h1>
                  {isOwnerVerified && (
                    <div className="h-6 px-2 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-primary fill-primary" />
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest">Verified Store</span>
                    </div>
                  )}
                  {boosted && (
                    <div className="h-6 px-2 rounded-full bg-amber-400 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-white fill-white" />
                      <span className="text-[8px] font-black text-white uppercase">Boosted</span>
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-3">
                  {store.category}
                </Badge>
              </div>

              {store.motto && (
                <p className="text-sm font-bold italic text-muted-foreground max-w-sm">"{store.motto}"</p>
              )}
              {store.description && (
                <p className="text-[13px] text-muted-foreground max-w-md leading-relaxed">{store.description}</p>
              )}

              <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                {!isOwner && (
                  <Link href={`/marketplace/chat/${store.owner_id}?store=${storeId}&pname=${encodeURIComponent(store.store_name)}`}>
                    <Button variant="outline" className="rounded-2xl h-10 px-4 gap-2 text-[11px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5">
                      <MessageCircle className="h-4 w-4" /> Message Store
                    </Button>
                  </Link>
                )}
                {isOwner && (
                  <Link href={`/marketplace/store/${storeId}/inbox`}>
                    <Button variant="outline" className="rounded-2xl h-10 px-4 gap-2 text-[11px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5">
                      <MessageCircle className="h-4 w-4" /> Inbox
                    </Button>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  onClick={copyStoreLink}
                  className={cn(
                    "rounded-2xl h-10 px-4 gap-2 text-[11px] font-black uppercase tracking-widest transition-colors",
                    copied
                      ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Link2 className="h-4 w-4" /> Share Store</>}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Products section ── */}
          <div className="px-4 sm:px-6 py-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-tight">Products</h2>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  {products.length} listing{products.length !== 1 ? "s" : ""}
                </p>
              </div>
              {isOwner && (
                <Button
                  onClick={() => setAddProductOpen(true)}
                  size="sm"
                  className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest gap-1.5 bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </Button>
              )}
            </div>

            {featuredFirst.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No products yet</p>
                {isOwner && (
                  <Button
                    onClick={() => setAddProductOpen(true)}
                    className="rounded-2xl h-11 px-6 gap-2 text-[11px] font-black uppercase tracking-widest bg-primary mt-1"
                  >
                    <Package className="h-4 w-4" /> List Your First Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {featuredFirst.map(p => (
                  <StoreProductCard key={p.$id} product={p} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Add Product dialog (owner only) ── */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-0">
          <div className="sticky top-0 bg-white dark:bg-background border-b border-border/40 px-6 py-4 rounded-t-3xl flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-black uppercase tracking-tighter text-base">Add Product</DialogTitle>
              <p className="text-[9px] font-black text-primary uppercase tracking-widest">List to {store.store_name}</p>
            </div>
          </div>
          <div className="px-6 pb-6 pt-4">
            <ProductForm
              onSuccess={() => {
                setAddProductOpen(false);
                if (store) loadProducts(store.owner_id);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
