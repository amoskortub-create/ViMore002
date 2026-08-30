"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePosts } from "@/context/PostContext";
import {
  createStore, updateStore, StoreDoc, STORE_CATEGORIES, StoreCategory, getStoreLogoUrl,
} from "@/lib/stores";
import { Camera, X, Loader2, Store } from "lucide-react";

interface StoreFormProps {
  existing?: StoreDoc;
  onSaved?: (store: StoreDoc) => void;
}

export function StoreForm({ existing, onSaved }: StoreFormProps) {
  const router = useRouter();
  const { currentUser } = usePosts();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storeName, setStoreName] = useState(existing?.store_name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [motto, setMotto] = useState(existing?.motto ?? "");
  const [category, setCategory] = useState<StoreCategory>(existing?.category ?? "Other");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    existing?.logo_file_id ? getStoreLogoUrl(existing.logo_file_id) : null
  );
  const [submitting, setSubmitting] = useState(false);

  const onLogoPicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview && !existing?.logo_file_id) {
      try { URL.revokeObjectURL(logoPreview); } catch {}
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const removeLogo = () => {
    if (logoPreview && !existing?.logo_file_id) {
      try { URL.revokeObjectURL(logoPreview); } catch {}
    }
    setLogoFile(null);
    setLogoPreview(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (storeName.trim().length < 2) return toast({ variant: "destructive", title: "Store name too short" });
    if (description.trim().length < 10) return toast({ variant: "destructive", title: "Add a longer description" });

    setSubmitting(true);
    try {
      let saved: StoreDoc;
      if (existing) {
        saved = await updateStore(existing.$id, currentUser.$id, {
          store_name: storeName,
          logo_file: logoFile,
          description,
          motto,
          category,
        }, existing.logo_file_id);
        toast({ title: "Store updated!" });
      } else {
        saved = await createStore({
          owner_id: currentUser.$id,
          owner_username: currentUser.username,
          store_name: storeName,
          logo_file: logoFile,
          description,
          motto,
          category,
        });
        toast({ title: "Store opened!", description: "Your store is now live on the ViMore Marketplace." });
      }
      onSaved?.(saved);
      router.push(`/marketplace/store/${saved.$id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: existing ? "Could not update store" : "Could not create store", description: err?.message || "Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest">Store Logo</Label>
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-secondary/40 border-2 border-dashed border-primary/20 flex items-center justify-center shrink-0">
            {logoPreview ? (
              <>
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 text-primary/40 hover:text-primary transition-colors">
                <Camera className="h-6 w-6" />
                <span className="text-[8px] font-black uppercase tracking-widest">Logo</span>
              </button>
            )}
          </div>
          {!logoPreview && (
            <div className="flex flex-col gap-1 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest gap-2">
                <Camera className="h-3.5 w-3.5" /> Upload Logo
              </Button>
              <p className="text-[9px] text-muted-foreground">Recommended: square image (PNG/JPG)</p>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onLogoPicked} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Store Name</Label>
        <Input
          value={storeName}
          onChange={e => setStoreName(e.target.value)}
          maxLength={100}
          placeholder="e.g. Konneh Fashion House"
          className="rounded-xl h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Business Category</Label>
        <Select value={category} onValueChange={v => setCategory(v as StoreCategory)}>
          <SelectTrigger className="rounded-xl h-11">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {STORE_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Store Motto <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          value={motto}
          onChange={e => setMotto(e.target.value)}
          maxLength={80}
          placeholder="e.g. Quality you can trust, prices you love"
          className="rounded-xl h-11"
        />
        <p className="text-[9px] text-muted-foreground text-right">{motto.length}/80</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest">Store Description</Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Tell customers what your store is about, what you sell, and why they should shop with you..."
          className="rounded-xl resize-none"
        />
        <p className="text-[9px] text-muted-foreground text-right">{description.length}/1000</p>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 gap-2"
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" />{existing ? "Saving..." : "Opening Store..."}</>
        ) : (
          <><Store className="h-4 w-4" />{existing ? "Save Changes" : "Open My Store"}</>
        )}
      </Button>
    </form>
  );
}
