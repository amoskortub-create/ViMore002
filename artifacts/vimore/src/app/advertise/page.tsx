"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, CheckCircle2, AlertTriangle, Gem, Shield, Video,
  Phone, Link as LinkIcon, MessageCircle, X, Play, Pause,
  Calendar, Zap, Loader2, Film, LayoutList, Trash2, ArrowLeft,
  BarChart2, TrendingUp, MousePointerClick, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useToast } from "@/hooks/use-toast";
import { databases, storage, Query, DATABASE_ID, COL, BUCKET, getFileUrl } from "@/lib/appwrite";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { authFetch } from "@/lib/auth-fetch";

const CREDITS_PER_DAY = 3;
const MIN_DAYS = 5;
const MAX_VIDEO_SECONDS = 45;

type ContactType = "url" | "whatsapp" | "call";
type Placement = "feed" | "reel";
type Tab = "create" | "campaigns" | "analytics";

export default function AdvertisePage() {
  const { currentUser } = usePosts();
  const { triggerHaptic } = useMusic();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("create");

  const [businessName, setBusinessName] = useState("");
  const [details, setDetails] = useState("");
  const [contactType, setContactType] = useState<ContactType>("url");
  const [contactValue, setContactValue] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [placement, setPlacement] = useState<Placement>("feed");
  const [days, setDays] = useState(MIN_DAYS);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "verifying" | "creating">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isInsufficient, setIsInsufficient] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verifiedBalance, setVerifiedBalance] = useState<number | null>(null);

  const [myAds, setMyAds] = useState<any[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);

  const totalCost = days * CREDITS_PER_DAY;
  const expiresAt = addDays(new Date(), days);
  const displayBalance = verifiedBalance ?? currentUser?.creditBalance ?? currentUser?.diamondBalance ?? 0;

  const loadMyAds = useCallback(async () => {
    if (!currentUser?.$id) { setIsLoadingAds(false); return; }
    setIsLoadingAds(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.AD_CAMPAIGNS, [
        Query.equal("user_id", currentUser.$id),
        Query.orderDesc("$createdAt"),
        Query.limit(25),
      ]);
      const now = new Date();
      const active: any[] = [];
      for (const doc of res.documents) {
        if (doc.expires_at && new Date(doc.expires_at) < now) {
          try { await databases.deleteDocument(DATABASE_ID, COL.AD_CAMPAIGNS, doc.$id); } catch { /* ignore */ }
        } else {
          active.push(doc);
        }
      }
      setMyAds(active);
    } catch { /* ignore */ } finally {
      setIsLoadingAds(false);
    }
  }, [currentUser?.$id]);

  useEffect(() => { loadMyAds(); }, [loadMyAds]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { setError("Please upload a video file."); return; }
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_VIDEO_SECONDS) {
        setError(`Video must be ${MAX_VIDEO_SECONDS} seconds or less. Yours is ${Math.round(vid.duration)}s.`);
        URL.revokeObjectURL(url);
        e.target.value = "";
        return;
      }
      setVideoDuration(Math.round(vid.duration));
      setVideoFile(file);
      setVideoPreviewUrl(url);
      setError(null);
      setIsInsufficient(false);
    };
    vid.onerror = () => { setError("Could not read video file."); URL.revokeObjectURL(url); };
    vid.src = url;
    e.target.value = "";
  };

  const removeVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(0);
    setIsVideoPlaying(false);
  };

  const toggleVideoPlay = () => {
    const v = videoPreviewRef.current;
    if (!v) return;
    if (isVideoPlaying) { v.pause(); setIsVideoPlaying(false); }
    else { v.play(); setIsVideoPlaying(true); }
  };

  const buildActionUrl = (): string => {
    const val = contactValue.trim();
    if (contactType === "whatsapp") return `https://wa.me/${val.replace(/\D/g, "")}`;
    if (contactType === "call") return `tel:${val}`;
    return val.startsWith("http") ? val : `https://${val}`;
  };

  const handleSubmit = async () => {
    setError(null);
    setIsInsufficient(false);
    setSuccessMsg(null);

    if (!currentUser) { router.push("/login"); return; }
    if (!businessName.trim()) { setError("Business name is required."); return; }
    if (!details.trim()) { setError("Ad description is required."); return; }
    if (!contactValue.trim()) { setError("Contact URL or number is required."); return; }
    if (!actionLabel.trim()) { setError("Action button label is required."); return; }
    if (!videoFile) { setError("Please upload a video (max 45 seconds)."); return; }
    if (days < MIN_DAYS) { setError(`Minimum campaign duration is ${MIN_DAYS} days.`); return; }

    setIsUploading(true);
    triggerHaptic(10);

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let uploadedFileId: string | null = null;

    try {
      setUploadStep("uploading");
      setUploadProgress(5);
      progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 6, 75));
      }, 300);

      const { uploadLargeViaClient } = await import('@/lib/upload');
      const fileId = await uploadLargeViaClient(videoFile, BUCKET.POST_MEDIA, undefined, {
        timeoutMs: 180_000,
        onProgress: (pct) => setUploadProgress(Math.min(75, 5 + Math.round(pct * 70))),
      });
      uploadedFileId = fileId;
      const mediaUrl = getFileUrl(BUCKET.POST_MEDIA, fileId);

      clearInterval(progressInterval);
      progressInterval = null;
      setUploadProgress(80);
      setUploadStep("verifying");

      const res = await authFetch("/api/advertise/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.$id,
          businessName: businessName.trim(),
          details: details.trim(),
          actionUrl: buildActionUrl(),
          actionLabel: actionLabel.trim(),
          placement,
          days,
          mediaUrl,
          mediaId: fileId,
          contactType,
        }),
      });

      setUploadProgress(92);
      setUploadStep("creating");

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "INSUFFICIENT_BALANCE") {
          setIsInsufficient(true);
          setVerifiedBalance(data.current ?? null);
          setError(data.message);
          try { await storage.deleteFile(BUCKET.POST_MEDIA, fileId); } catch { /* best-effort cleanup */ }
          uploadedFileId = null;
          return;
        }
        throw new Error(data.error || "Submission failed.");
      }

      setUploadProgress(100);
      triggerHaptic(30);

      if (typeof data.newBalance === "number") {
        setVerifiedBalance(data.newBalance);
      }

      const savedName = businessName.trim();
      const savedPlacement = placement;
      const savedDays = days;

      setBusinessName("");
      setDetails("");
      setContactValue("");
      setActionLabel("");
      setDays(MIN_DAYS);
      setPlacement("feed");
      setContactType("url");
      removeVideo();

      setSuccessMsg(
        `"${savedName}" is now live in the ${savedPlacement === "feed" ? "Home Feed" : "Reels"} for ${savedDays} days and will auto-delete when the campaign ends.`
      );

      await loadMyAds();
      setActiveTab("campaigns");
      toast({ title: "Ad Campaign Launched!", description: "Your ad is now live." });

    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      if (uploadedFileId) {
        try { await storage.deleteFile(BUCKET.POST_MEDIA, uploadedFileId); } catch { /* ignore */ }
      }
      setError(err?.message || "Failed to submit ad. Please try again.");
      triggerHaptic(50);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStep("idle");
    }
  };

  const handleDeleteAd = async (id: string) => {
    triggerHaptic(20);
    try {
      await databases.deleteDocument(DATABASE_ID, COL.AD_CAMPAIGNS, id);
      setMyAds(prev => prev.filter(a => a.$id !== id));
      toast({ title: "Ad removed." });
    } catch {
      toast({ variant: "destructive", title: "Failed to remove ad." });
    }
  };

  const daysRemaining = (exp: string) => {
    const diff = new Date(exp).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  const uploadStepLabel: Record<string, string> = {
    uploading: "Uploading video...",
    verifying: "Verifying balance on server...",
    creating: "Creating campaign...",
    idle: "",
  };

  const totalImpressions = myAds.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalClicks = myAds.reduce((s, a) => s + (a.clicks || 0), 0);
  const totalSpend = myAds.reduce((s, a) => s + (a.credits_spent || a.diamonds_spent || a.budget || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";
  const maxImpressionsInSet = Math.max(...myAds.map(a => a.impressions || 0), 1);

  const TABS: { id: Tab; label: string }[] = [
    { id: "create", label: "Create Ad" },
    { id: "campaigns", label: `My Campaigns${myAds.length > 0 ? ` (${myAds.length})` : ""}` },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-background/95 backdrop-blur-md border-b border-primary/10 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/" className="h-9 w-9 rounded-xl bg-secondary/40 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black italic uppercase tracking-tighter text-base leading-none truncate">Advertise Your Business</h1>
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Self-Service · 3 Credits / day · Min 5 days</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-secondary/40 px-3 py-1.5 rounded-xl">
            <Gem className="h-3.5 w-3.5 text-cyan-500" />
            <span className="font-black text-sm tabular-nums">{displayBalance.toLocaleString()}</span>
            <span className="text-[9px] text-muted-foreground font-black">Credits</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-primary/5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* ── CREATE TAB ── */}
        {activeTab === "create" && (
          <div className="space-y-5">
            {/* Policy notice */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex gap-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-tight">Advertise Your Business or Products</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed mt-1">
                  Your video ad must comply with ViMore's content policy. No misleading claims, explicit content, hate speech, counterfeit goods, or illegal services.
                  Ads that violate policy will be removed without a refund. By submitting, you confirm your content is accurate, legal, and compliant.
                </p>
              </div>
            </div>

            {/* Success */}
            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 flex gap-3 animate-in zoom-in-95 duration-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-tight">Campaign Live!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">{successMsg}</p>
                </div>
                <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Form card */}
            <div className="bg-white dark:bg-card border border-primary/10 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="bg-primary/5 border-b border-primary/10 px-6 py-4">
                <h2 className="font-black italic uppercase tracking-tighter text-base">Create Ad Campaign</h2>
                <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                  {CREDITS_PER_DAY} Credits per day · Min {MIN_DAYS} days · Video only · Max {MAX_VIDEO_SECONDS}s
                </p>
              </div>

              <div className="p-5 sm:p-6 space-y-5">

                {/* Business Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Business / Brand Name</label>
                  <Input
                    placeholder="e.g. Amos Clothing Store"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    className="h-12 rounded-2xl bg-secondary/20 border-none text-sm font-bold"
                    maxLength={60}
                  />
                  <p className="text-[9px] text-muted-foreground font-bold text-right">{businessName.length}/60</p>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ad Description / Details</label>
                  <Textarea
                    placeholder="Describe your product or service — what makes it special and why people should act now..."
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    className="rounded-2xl bg-secondary/20 border-none text-sm resize-none"
                    rows={3}
                    maxLength={300}
                  />
                  <p className="text-[9px] text-muted-foreground font-bold text-right">{details.length}/300</p>
                </div>

                {/* Contact Type */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Contact / Redirect Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "url" as ContactType, label: "Website URL", icon: LinkIcon },
                        { id: "whatsapp" as ContactType, label: "WhatsApp", icon: MessageCircle },
                        { id: "call" as ContactType, label: "Direct Call", icon: Phone },
                      ] as const
                    ).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => { setContactType(id); setContactValue(""); setActionLabel(""); }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center active:scale-95",
                          contactType === id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-secondary/10 text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Value */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {contactType === "url" ? "Website URL" : contactType === "whatsapp" ? "WhatsApp Number (with country code)" : "Phone Number (with country code)"}
                  </label>
                  <Input
                    placeholder={
                      contactType === "url" ? "https://yourbusiness.com" : "+231 xxx xxx xxxx"
                    }
                    value={contactValue}
                    onChange={e => setContactValue(e.target.value)}
                    type={contactType === "url" ? "url" : "tel"}
                    className="h-12 rounded-2xl bg-secondary/20 border-none text-sm font-bold"
                  />
                </div>

                {/* Action Label */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Action Button Label</label>
                  <Input
                    placeholder={
                      contactType === "url" ? "Visit Website" :
                      contactType === "whatsapp" ? "Chat on WhatsApp" : "Call Now"
                    }
                    value={actionLabel}
                    onChange={e => setActionLabel(e.target.value)}
                    className="h-12 rounded-2xl bg-secondary/20 border-none text-sm font-bold"
                    maxLength={30}
                  />
                  <p className="text-[9px] text-muted-foreground font-bold">
                    Users tap this button to{" "}
                    {contactType === "url" ? "visit your site" : contactType === "whatsapp" ? "message you on WhatsApp" : "call you directly"}.
                  </p>
                </div>

                {/* Placement */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ad Placement</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        { id: "feed" as Placement, label: "Home Feed", sub: "Appears every 3 posts", icon: LayoutList },
                        { id: "reel" as Placement, label: "Reels", sub: "Full-screen between reels", icon: Film },
                      ] as const
                    ).map(({ id, label, sub, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setPlacement(id)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left active:scale-95",
                          placement === id ? "border-primary bg-primary/5" : "border-border bg-secondary/10 hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", placement === id ? "text-primary" : "text-muted-foreground")} />
                        <div>
                          <p className={cn("text-xs font-black uppercase tracking-tight", placement === id ? "text-primary" : "text-foreground")}>{label}</p>
                          <p className="text-[9px] text-muted-foreground font-bold mt-0.5">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Days */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Campaign Duration</label>
                    <span className="text-[9px] text-muted-foreground font-black">Min {MIN_DAYS} · Max 90 days</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setDays(d => Math.max(MIN_DAYS, d - 1))}
                      className="h-12 w-12 rounded-2xl bg-secondary/40 flex items-center justify-center text-xl font-black text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-90 shrink-0"
                    >−</button>
                    <div className="flex-1 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center gap-1">
                      <span className="text-2xl font-black tabular-nums">{days}</span>
                      <span className="text-sm text-muted-foreground font-bold">days</span>
                    </div>
                    <button
                      onClick={() => setDays(d => Math.min(90, d + 1))}
                      className="h-12 w-12 rounded-2xl bg-secondary/40 flex items-center justify-center text-xl font-black text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-90 shrink-0"
                    >+</button>
                  </div>
                  <div className="flex items-center justify-between px-1 text-[9px] text-muted-foreground font-bold">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(), "MMM d")} → {format(expiresAt, "MMM d, yyyy")}
                    </span>
                    <span>Auto-deleted when expired</span>
                  </div>
                </div>

                {/* Video Upload */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ad Video (Max {MAX_VIDEO_SECONDS}s)</label>
                  {!videoFile ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-36 rounded-2xl border-2 border-dashed border-primary/25 hover:border-primary/60 bg-secondary/10 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group active:scale-[0.98]"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center text-primary transition-all">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-tight">Tap to upload video</p>
                        <p className="text-[9px] text-muted-foreground font-bold mt-0.5">MP4, MOV, WebM · Max {MAX_VIDEO_SECONDS} seconds</p>
                      </div>
                    </button>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoPreviewRef}
                        src={videoPreviewUrl!}
                        className="w-full h-full object-cover"
                        playsInline
                        onEnded={() => setIsVideoPlaying(false)}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={toggleVideoPlay}
                          className="h-14 w-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all active:scale-90"
                        >
                          {isVideoPlaying
                            ? <Pause className="h-6 w-6 fill-current" />
                            : <Play className="h-6 w-6 fill-current ml-0.5" />}
                        </button>
                      </div>
                      <div className="absolute top-3 left-3">
                        <div className="bg-primary/90 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                          Sponsored
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 flex gap-2">
                        <div className="bg-black/60 backdrop-blur-sm text-white text-[9px] font-black px-2 py-1 rounded-full">{videoDuration}s</div>
                        <button
                          onClick={removeVideo}
                          className="h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
                </div>

                {/* Cost summary */}
                <div className="rounded-2xl p-4 space-y-3 border bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gem className="h-4 w-4 text-cyan-500" />
                      <span className="text-xs font-black uppercase tracking-tight">Campaign Cost</span>
                    </div>
                    <span className="text-xl font-black tabular-nums text-cyan-600 dark:text-cyan-400">{totalCost} Credits</span>
                  </div>
                  <div className="space-y-1 text-[9px] font-bold text-muted-foreground border-t border-cyan-200/60 dark:border-cyan-800/30 pt-2">
                    <div className="flex justify-between"><span>Rate</span><span>{CREDITS_PER_DAY} Credits × {days} days</span></div>
                    <div className="flex justify-between">
                      <span>Balance (shown)</span>
                      <span className="text-foreground">{displayBalance} Credits</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground font-bold border-t border-cyan-200/60 dark:border-cyan-800/30 pt-2">
                    Your actual balance is verified securely on our server at the moment you submit — not from the browser.
                  </p>
                </div>

                {/* Error block */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2 duration-200">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-destructive uppercase tracking-tight">
                        {isInsufficient ? "Insufficient Balance" : "Error"}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 leading-relaxed break-words">{error}</p>
                      {isInsufficient && (
                        <Link href="/currency" className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary">
                          Buy Credits <LinkIcon className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <button onClick={() => { setError(null); setIsInsufficient(false); }} className="text-red-400 hover:text-red-600 shrink-0 self-start">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Upload progress */}
                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {uploadStepLabel[uploadStep] || "Processing..."}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    {uploadStep === "verifying" && (
                      <p className="text-[9px] text-muted-foreground font-bold text-center">
                        Checking your Credit balance on the server…
                      </p>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-sm gap-2 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> {uploadStepLabel[uploadStep] || "Processing..."}</>
                  ) : (
                    <><Zap className="h-5 w-5" /> Launch Ad — {totalCost} Credits for {days} days</>
                  )}
                </Button>

              </div>
            </div>
          </div>
        )}

        {/* ── MY CAMPAIGNS TAB ── */}
        {activeTab === "campaigns" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-black italic uppercase tracking-tighter text-base">My Ad Campaigns</h2>
              <button onClick={loadMyAds} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">
                Refresh
              </button>
            </div>

            {isLoadingAds ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : myAds.length === 0 ? (
              <div className="bg-white dark:bg-card border border-primary/10 rounded-2xl p-10 text-center space-y-3">
                <Video className="h-10 w-10 text-muted-foreground mx-auto opacity-25" />
                <p className="text-sm font-black uppercase tracking-tight text-muted-foreground">No Active Campaigns</p>
                <p className="text-xs text-muted-foreground/60">Your launched campaigns will appear here.</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="mt-2 text-[10px] font-black text-primary uppercase tracking-widest underline underline-offset-2"
                >
                  Create your first ad →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myAds.map(ad => {
                  const rem = daysRemaining(ad.expires_at);
                  const purchased = ad.days_purchased || 1;
                  const progressPct = Math.max(0, Math.min(100, ((purchased - rem) / purchased) * 100));
                  return (
                    <div key={ad.$id} className="bg-white dark:bg-card border border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex items-center gap-3 p-4 border-b border-primary/5">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-base shrink-0 uppercase">
                          {ad.title?.[0] || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-sm truncate">{ad.title}</p>
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge className={cn(
                              "text-[7px] font-black px-1.5 py-0 h-3.5 rounded-full uppercase border",
                              ad.is_active
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40"
                                : "bg-secondary text-muted-foreground border-border"
                            )}>
                              {ad.is_active ? "Active" : "Paused"}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                              {ad.placement === "feed" ? "Home Feed" : "Reels"} · Sponsored
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAd(ad.$id)}
                          className="h-8 w-8 rounded-xl bg-secondary/40 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="p-4 space-y-3">
                        {ad.content && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ad.content}</p>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground">
                            <span>{rem} day{rem !== 1 ? "s" : ""} remaining of {purchased}</span>
                            <span>{(ad.impressions || 0).toLocaleString()} views · {(ad.clicks || 0).toLocaleString()} taps</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-[9px] font-bold text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {ad.expires_at ? `Expires ${format(new Date(ad.expires_at), "MMM d, yyyy")}` : "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Gem className="h-3 w-3 text-cyan-500" />
                            {ad.credits_spent || ad.diamonds_spent || ad.budget || 0} Credits spent
                          </span>
                        </div>
                        {ad.action_label && (
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                              {ad.action_label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === "analytics" && (
          <div className="space-y-5">
            {isLoadingAds ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : myAds.length === 0 ? (
              <div className="bg-white dark:bg-card border border-primary/10 rounded-2xl p-10 text-center space-y-3">
                <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto opacity-25" />
                <p className="text-sm font-black uppercase tracking-tight text-muted-foreground">No Analytics Yet</p>
                <p className="text-xs text-muted-foreground/60">Launch a campaign to see your performance data here.</p>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Total Views", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40" },
                    { label: "Total Taps", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40" },
                    { label: "Tap-Through", value: `${overallCtr}%`, icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/40" },
                    { label: "Credits Spent", value: totalSpend.toLocaleString(), icon: Gem, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800/40" },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className={cn("rounded-2xl p-4 border space-y-2", bg)}>
                      <Icon className={cn("h-4 w-4", color)} />
                      <p className="text-xl font-black tabular-nums">{value}</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Per-campaign breakdown */}
                <div className="bg-white dark:bg-card border border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-primary/5 border-b border-primary/10 px-5 py-3">
                    <h3 className="font-black italic uppercase tracking-tighter text-sm">Campaign Breakdown</h3>
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Views vs Taps — your campaigns only</p>
                  </div>
                  <div className="p-5 space-y-5">
                    {myAds.map(ad => {
                      const imp = ad.impressions || 0;
                      const clk = ad.clicks || 0;
                      const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(1) : "0.0";
                      const impPct = Math.max(0, Math.min(100, (imp / maxImpressionsInSet) * 100));
                      const clkPct = imp > 0 ? Math.max(0, Math.min(100, (clk / imp) * 100)) : 0;
                      const rem = daysRemaining(ad.expires_at);
                      return (
                        <div key={ad.$id} className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs shrink-0 uppercase">
                                {ad.title?.[0] || "A"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-xs truncate">{ad.title}</p>
                                <p className="text-[8px] text-muted-foreground font-black uppercase">
                                  {ad.placement === "feed" ? "Feed" : "Reels"} · {rem}d left
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-black tabular-nums">{ctr}% CTR</p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-blue-500 w-6 shrink-0 uppercase">Views</span>
                              <div className="flex-1 h-2 bg-blue-100 dark:bg-blue-950/40 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                  style={{ width: `${impPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-black tabular-nums text-muted-foreground w-10 text-right shrink-0">{imp.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-emerald-500 w-6 shrink-0 uppercase">Taps</span>
                              <div className="flex-1 h-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${clkPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-black tabular-nums text-muted-foreground w-10 text-right shrink-0">{clk.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-[9px] font-bold text-muted-foreground">
                            <span>{(ad.credits_spent || ad.diamonds_spent || ad.budget || 0)} Credits spent</span>
                            <span>·</span>
                            <span>Expires {ad.expires_at ? format(new Date(ad.expires_at), "MMM d") : "—"}</span>
                          </div>

                          <div className="h-px bg-primary/5" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[9px] text-muted-foreground font-bold text-center pb-2">
                  Only you can see this analytics data. It is private to your account.
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
