"use client";

import { useState, useRef, ChangeEvent, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePosts } from "@/context/PostContext";
import { createProduct, normalizePhoneE164, ProductCurrency } from "@/lib/marketplace";
import { getMyStore, StoreDoc, STORE_CATEGORIES, StoreCategory } from "@/lib/stores";
import { Camera, X, Loader2, Store } from "lucide-react";

const MAX_PHOTOS = 2;

export function ProductForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const { currentUser } = usePosts();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<ProductCurrency>("LRD");
  const [location, setLocation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [category, setCategory] = useState<StoreCategory | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [myStore, setMyStore] = useState<StoreDoc | null>(null);

  useEffect(() => {
    if (!currentUser?.$id) return;
    getMyStore(currentUser.$id).then(store => {
      if (store) {
        setMyStore(store);
        setCategory(store.category);
        if (!phoneNumber && currentUser.phone) setPhoneNumber(currentUser.phone);
      }
    });
  }, [currentUser?.$id]);

  const onFilesPicked = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const remaining = MAX_PHOTOS - files.length;
    if (remaining <= 0) {
      toast({ variant: "destructive", title: "Max 2 photos", description: "Remove a photo to add a different one." });
      e.target.value = "";
      return;
    }
    if (picked.length > remaining) {
      toast({ variant: "destructive", title: "Max 2 photos", description: `Only the first ${remaining} added.` });
    }
    const accepted = picked.slice(0, remaining);
    const newPreviews = accepted.map(f => URL.createObjectURL(f));
    setFiles(prev => [...prev, ...accepted]);
    setPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    try { URL.revokeObjectURL(previews[idx]); } catch {}
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Sign in required" });
      return;
    }
    if (name.trim().length < 3) return toast({ variant: "destructive", title: "Product name too short" });
    if (description.trim().length < 10) return toast({ variant: "destructive", title: "Add a longer description" });
    const price = Number(priceAmount);
    if (!price || price <= 0) return toast({ variant: "destructive", title: "Enter a valid price" });
    if (location.trim().length < 2) return toast({ variant: "destructive", title: "Enter your location" });
    const normalisedPhone = normalizePhoneE164(phoneNumber);
    if (!normalisedPhone || normalisedPhone.replace(/\D/g, '').length < 8) return toast({ variant: "destructive", title: "Enter a valid phone number" });
    if (files.length < 1) return toast({ variant: "destructive", title: "Add at least 1 photo" });
    if (files.length > 2) return toast({ variant: "destructive", title: "Max 2 photos" });

    setSubmitting(true);
    try {
      const product = await createProduct({
        sellerId: currentUser.$id,
        sellerName: currentUser.name,
        sellerUsername: currentUser.username,
        sellerAvatarFileId: currentUser.avatar || null,
        name: name.trim(),
        description: description.trim(),
        priceAmount: price,
        priceCurrency,
        location: location.trim(),
        phoneNumber: normalisedPhone,
        files,
        store_id: myStore?.$id || null,
        category: category || null,
      });
      previews.forEach(u => { try { URL.revokeObjectURL(u); } catch {} });
      toast({ title: "Listed!", description: "Your product is now live in your store." });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(myStore ? `/marketplace/store/${myStore.$id}` : `/marketplace/${product.$id}`);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not list product", description: err?.message || "Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {myStore && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
          <Store className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Listing to your store</p>
            <p className="text-xs font-bold truncate">{myStore.store_name}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest">Photos (max 2)</Label>
        <div className="grid grid-cols-2 gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square rounded-2xl overflow-hidden bg-secondary/40 border border-border/40">
              <img src={src} alt={`preview ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label="Remove photo"
                className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-1.5 text-primary"
            >
              <Camera className="h-6 w-6" />
              <span className="text-[10px] font-black uppercase tracking-widest">Add Photo</span>
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onFilesPicked} />
        <p className="text-[10px] text-muted-foreground">Photos are auto-compressed for fast loading on slow networks.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Product Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. iPhone 13 Pro" className="rounded-xl h-11" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-widest">Price</Label>
          <Input
            type="number" inputMode="decimal" min="0" step="0.01"
            value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)}
            placeholder="0.00" className="rounded-xl h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-widest">Currency</Label>
          <Select value={priceCurrency} onValueChange={(v) => setPriceCurrency(v as ProductCurrency)}>
            <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LRD">LRD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Category</Label>
        <Select value={category} onValueChange={v => setCategory(v as StoreCategory)}>
          <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select a category" /></SelectTrigger>
          <SelectContent>
            {STORE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Location</Label>
        <Input
          value={location} onChange={(e) => setLocation(e.target.value)}
          maxLength={120} placeholder="e.g. Paynesville, Montserrado"
          list="vimore-counties" className="rounded-xl h-11"
        />
        <datalist id="vimore-counties">
          <option value="Montserrado" /><option value="Margibi" /><option value="Bong" />
          <option value="Nimba" /><option value="Lofa" /><option value="Grand Bassa" />
          <option value="Grand Cape Mount" /><option value="Bomi" /><option value="Grand Gedeh" />
          <option value="Sinoe" /><option value="Maryland" /><option value="River Cess" />
          <option value="Gbarpolu" /><option value="Grand Kru" /><option value="River Gee" />
        </datalist>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Phone Number (for buyers)</Label>
        <Input
          type="tel" inputMode="tel"
          value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="0770000000 or +231770000000" className="rounded-xl h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Description</Label>
        <Textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          maxLength={2000} rows={5}
          placeholder="Condition, features, why you're selling..."
          className="rounded-xl resize-none"
        />
        <p className="text-[10px] text-muted-foreground text-right">{description.length}/2000</p>
      </div>

      <Button type="submit" disabled={submitting} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90">
        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Listing...</> : "List Product"}
      </Button>
    </form>
  );
}
