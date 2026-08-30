
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Zap, 
  Volume2, 
  Smartphone, 
  Moon, 
  Sun, 
  EyeOff, 
  Monitor, 
  Download, 
  Type, 
  ChevronRight,
  ShieldCheck,
  BellOff,
  Database,
  RefreshCcw,
  Languages,
  Fingerprint,
  UserCheck,
  Users2,
  Lock,
  Globe,
  MoreVertical,
  HardDrive,
  Archive,
  ArrowDownToLine,
  Activity,
  Music2,
  Video,
  Loader2,
  Bell,
  Clock,
  Radio,
  Sparkles,
  Trophy,
  UserPlus,
  Rocket,
  Search,
  CheckCircle2,
  Gem,
  X,
  ShieldAlert,
  KeyRound,
  Timer,
  Eye,
  FileText,
  ZapOff,
  LayoutDashboard,
  Gauge,
  Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AcronymCard } from "@/components/branding/acronym-meaning";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useTranslation } from "@/context/LanguageContext";
import { useNetwork } from "@/context/NetworkContext";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { clearAllLocalCaches } from "@/lib/offline-cache";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NativeAdNode } from "@/components/ad/native-ad-node";
import ProfileLoading from "../profile/loading";

export default function SettingsPage() {
  const { settings, updateSettings, triggerHaptic, currentUser, connections, posts, savedPostIds, activeSubscriptions, cancelSubscription, seenPostIds, archiveIdentityNode, isLoading, logout, enrollHardwareBiometrics } = usePosts();
  const { currentTrack, isExpanded, downloadedSongIds, userSongs } = useMusic();
  const { t } = useTranslation();
  const { tier, effectiveType, forcedTier, setForcedTier, saveData } = useNetwork();
  const { toast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLegacySelectorOpen, setIsLegacySelectorOpen] = useState(false);
  const [legacySearch, setLegacySearch] = useState("");
  const [isEnrollingBiometric, setIsEnrollingBiometric] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const isPlayerActive = currentTrack && !isExpanded;

  const handleSync = () => {
    setIsSyncing(true);
    triggerHaptic(50);
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: t('ui_linguistic_sync'), description: "All digital nodes and identity pulses are now synchronized." });
    }, 2500);
  };

  const handleUpdate = (data: any) => { 
    triggerHaptic(10); 
    updateSettings(data); 
  };

  const handleClearCache = async () => {
    triggerHaptic(50);
    setIsClearingCache(true);
    try {
      await clearAllLocalCaches();
      toast({ title: "Cache Cleared", description: "All cached pages, media, and data have been removed." });
    } catch {
      toast({ variant: "destructive", title: "Failed to Clear Cache", description: "Something went wrong. Please try again." });
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleBiometricToggle = async (val: boolean) => {
    triggerHaptic(10);
    if (!val) {
      updateSettings({ isBiometricActive: false });
      toast({ title: "Biometric Disabled", description: "Messages and Earnings are no longer locked." });
      return;
    }
    if (settings.isHardwareEnrolled) {
      updateSettings({ isBiometricActive: true });
      toast({ title: "Biometric Enabled", description: "Messages and Earnings are now protected." });
      return;
    }
    setIsEnrollingBiometric(true);
    try {
      const success = await enrollHardwareBiometrics();
      if (!success) {
        toast({ variant: "destructive", title: "Enrollment Failed", description: "Device biometric/PIN not available or was denied. Try from Account Settings." });
      } else {
        toast({ title: "Biometric Vault Active", description: "Messages and Earnings are now protected by your device." });
      }
    } catch {
      toast({ variant: "destructive", title: "Enrollment Error", description: "Could not reach device authenticator." });
    } finally {
      setIsEnrollingBiometric(false);
    }
  };

  const filteredConnections = useMemo(() => {
    return connections.filter(c => c.followsYou && (c.name.toLowerCase().includes(legacySearch.toLowerCase()) || c.username.toLowerCase().includes(legacySearch.toLowerCase())));
  }, [connections, legacySearch]);

  const selectedLegacyNode = useMemo(() => {
    return connections.find(c => c.username === settings.legacyContact);
  }, [connections, settings.legacyContact]);

  // Simulated Storage Pulse Calculation
  const storageMetrics = useMemo(() => {
    const mediaBase = (downloadedSongIds.size * 12.5) + (userSongs.length * 15); // MB
    const cacheBase = (seenPostIds.size * 0.4); // MB
    const notesBase = (savedPostIds.size * 0.1); // MB
    
    const total = mediaBase + cacheBase + notesBase;
    const percent = (total / 2048) * 100; // Assuming 2GB vault limit

    return {
      total: total > 1024 ? `${(total/1024).toFixed(1)} GB` : `${total.toFixed(0)} MB`,
      media: `${mediaBase.toFixed(0)} MB`,
      cache: `${cacheBase.toFixed(0)} MB`,
      notes: `${notesBase.toFixed(0)} MB`,
      percent: Math.min(percent, 100)
    };
  }, [downloadedSongIds.size, userSongs.length, seenPostIds.size, savedPostIds.size]);

  // Handshake Guard: Prerender protection
  if (isLoading || !currentUser) {
    return <ProfileLoading />;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#050505] transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/menu">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary/80 active:scale-90 transition-all">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-black italic uppercase tracking-tighter text-foreground">{t('settings_title')}</h1>
            <div className="flex items-center gap-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full", isSyncing ? "bg-primary animate-ping" : "bg-green-500")} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{isSyncing ? t('ui_syncing') : t('ui_status_optimal')}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary gap-2 transition-all active:scale-95" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />} {t('ui_manual_sync')}
        </Button>
      </header>

      <main className={cn(
        "max-w-xl mx-auto p-4 sm:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32",
        "pt-4"
      )}>
        
        <NativeAdNode type="banner-468" id="settings-top-pulse" />

        {/* NETWORK OPTIMIZATION (LITE MODE) */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Network Optimization</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <ZapOff className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-bold text-sm">Lite Mode</p>
                  <Badge className={cn(
                    "text-[9px] font-black uppercase tracking-widest border-none",
                    tier === 'lite' ? "bg-amber-500/15 text-amber-600" : tier === 'standard' ? "bg-blue-500/15 text-blue-600" : "bg-emerald-500/15 text-emerald-600"
                  )}>{tier}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-black break-words">
                  Detected: {effectiveType}{saveData ? " · save-data on" : ""}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Lite Mode shrinks images, lowers video quality, disables auto-play and reduces real-time sync — built for 2G/3G and Save-Data users across Africa.
            </p>

            <div className="grid grid-cols-3 gap-2 bg-secondary/40 p-1.5 rounded-2xl">
              <button
                onClick={() => { triggerHaptic(10); setForcedTier(null); }}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  forcedTier === null ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground"
                )}
              >
                Auto
              </button>
              <button
                onClick={() => { triggerHaptic(10); setForcedTier('lite'); }}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  forcedTier === 'lite' ? "bg-white dark:bg-zinc-800 text-amber-600 shadow-md" : "text-muted-foreground"
                )}
              >
                Lite
              </button>
              <button
                onClick={() => { triggerHaptic(10); setForcedTier('rich'); }}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  forcedTier === 'rich' ? "bg-white dark:bg-zinc-800 text-emerald-600 shadow-md" : "text-muted-foreground"
                )}
              >
                Full
              </button>
            </div>
          </div>
        </section>

        {/* SUBSCRIPTIONS */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">{t('settings_subs')}</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-2 space-y-1">
            <Link href="/settings/subscriptions" className="flex items-center justify-between p-4 rounded-2xl hover:bg-secondary/40 transition-all group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                  <Gem className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">Subscription Vault</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">{activeSubscriptions.size} Active Creator Loops</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
            </Link>
          </div>
        </section>

        {/* APPEARANCE */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">{t('settings_appearance')}</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 space-y-8">
            <div className="flex flex-col gap-4">
              <div className="space-y-0.5">
                <p className="font-bold text-sm">{t('settings_theme')}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black">{t('settings_theme_desc')}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-secondary/40 p-1.5 rounded-2xl">
                <button
                  onClick={() => handleUpdate({ theme: 'light' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.theme === 'light' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="h-3.5 w-3.5">☀</span> {t('settings_theme_ivory')}
                </button>
                <button
                  onClick={() => handleUpdate({ theme: 'dark' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.theme === 'dark' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="h-3.5 w-3.5">🌙</span> {t('settings_theme_space')}
                </button>
                <button
                  onClick={() => handleUpdate({ theme: 'system' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.theme === 'system' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="h-3.5 w-3.5">🖥</span> {t('settings_theme_sync')}
                </button>
              </div>
            </div>

            <div className="h-px bg-border -mx-6" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" />
                    <p className="font-bold text-sm">{t('settings_font_scale')}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Calibrate global text size</p>
                </div>
                <Badge className="bg-primary/5 text-primary border-primary/10 text-[10px] font-black">{Math.round(settings.fontScale * 100)}%</Badge>
              </div>
              <Slider value={[settings.fontScale]} min={0.8} max={1.4} step={0.05} onValueChange={(val) => handleUpdate({ fontScale: val[0] })} />
            </div>
          </div>
        </section>

        {/* EXPERIENCE HUB */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Experience Hub</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 space-y-8">
            
            <div className="flex flex-col gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <p className="font-bold text-sm">{t('settings_stream')}</p>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-black">Initial landing node for feeds</p>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-secondary/40 p-1.5 rounded-2xl">
                <button
                  onClick={() => handleUpdate({ defaultStream: 'following' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.defaultStream === 'following' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground"
                  )}
                >
                  Following
                </button>
                <button
                  onClick={() => handleUpdate({ defaultStream: 'foryou' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.defaultStream === 'foryou' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground"
                  )}
                >
                  For You
                </button>
              </div>
            </div>

            <div className="h-px bg-border -mx-6" />

            <div className="flex flex-col gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  <p className="font-bold text-sm">{t('settings_playback')}</p>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-black">Tune spatial video resolution</p>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-secondary/40 p-1.5 rounded-2xl">
                <button
                  onClick={() => handleUpdate({ playbackQuality: 'standard' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.playbackQuality === 'standard' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground"
                  )}
                >
                  Standard
                </button>
                <button
                  onClick={() => handleUpdate({ playbackQuality: 'pro-hd' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.playbackQuality === 'pro-hd' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground"
                  )}
                >
                  Pro-HD
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* DATA & ARCHIVAL */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">{t('settings_data')}</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 space-y-8">
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <p className="font-bold text-sm">Storage Pulse</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Hardware space synchronization</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black italic text-primary">{storageMetrics.total} / 2 GB</span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase">Vault Limit</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Progress value={storageMetrics.percent} className="h-1.5" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="h-1 bg-primary rounded-full" />
                    <span className="text-[8px] font-black uppercase text-muted-foreground">Media ({storageMetrics.media})</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="h-1 bg-accent rounded-full" />
                    <span className="text-[8px] font-black uppercase text-muted-foreground">Cache ({storageMetrics.cache})</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="h-1 bg-muted rounded-full" />
                    <span className="text-[8px] font-black uppercase text-muted-foreground">Notes ({storageMetrics.notes})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-border -mx-6" />

            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="h-16 rounded-2xl border-primary/10 bg-white dark:bg-card justify-start gap-4 px-6 group hover:bg-primary/5 transition-all"
                onClick={() => archiveIdentityNode()}
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Archive className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">{t('settings_archive')}</span>
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Download full data pulse</span>
                </div>
                <ArrowDownToLine className="ml-auto h-4 w-4 text-muted-foreground/40" />
              </Button>

              <Button
                variant="outline"
                disabled={isClearingCache}
                className="h-16 rounded-2xl border-destructive/10 bg-white dark:bg-card justify-start gap-4 px-6 group hover:bg-destructive/5 transition-all"
                onClick={handleClearCache}
              >
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                  isClearingCache ? "bg-destructive/10 text-destructive" : "bg-destructive/10 text-destructive group-hover:scale-110"
                )}>
                  {isClearingCache ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm text-destructive">
                    {isClearingCache ? "Clearing Cache..." : "Clear Cache"}
                  </span>
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                    Delete all cached pages &amp; media
                  </span>
                </div>
                {!isClearingCache && <X className="ml-auto h-4 w-4 text-destructive/40" />}
              </Button>
            </div>
          </div>
        </section>

        {/* SECURITY & VAULT */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">{t('settings_security')}</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 space-y-6">
            <Link href="/settings/account" className="flex items-center justify-between p-2 rounded-2xl hover:bg-secondary/40 transition-all group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">Security Handshake</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Passwords & Signature Rotation</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
            </Link>

            <div className="h-px bg-border -mx-6" />

            {/* ── DEVICE SECURITY (biometric / PIN / pattern / face / password) ── */}
            <div className="space-y-0">
              {/* Main toggle row */}
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                    settings.isBiometricActive ? "bg-green-500 text-white" : "bg-primary/10 text-primary"
                  )}>
                    {isEnrollingBiometric
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : settings.isBiometricActive
                        ? <ShieldCheck className="h-5 w-5" />
                        : <Lock className="h-5 w-5" />
                    }
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm">Device Security</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">
                      {isEnrollingBiometric
                        ? "Registering with your device..."
                        : settings.isBiometricActive
                          ? `${settings.biometricProtectedAreas?.length ?? 0} area${(settings.biometricProtectedAreas?.length ?? 0) !== 1 ? 's' : ''} protected`
                          : "Fingerprint · Face · PIN · Pattern · Password"}
                    </p>
                  </div>
                </div>
                <Switch checked={settings.isBiometricActive} onCheckedChange={handleBiometricToggle} disabled={isEnrollingBiometric} />
              </div>

              {/* Expanded area selector — shown only when security is ON */}
              {settings.isBiometricActive && (
                <div className="mt-3 mx-2 bg-secondary/30 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-4 pt-3 pb-2">
                    Protected Areas — tap to toggle
                  </p>
                  {([
                    { key: 'messages', label: 'Messages',       icon: '💬', desc: 'Direct messages & chats' },
                    { key: 'earnings', label: 'Earnings',        icon: '💰', desc: 'Wallet & earnings portal' },
                    { key: 'currency', label: 'Credit Hub',      icon: '💎', desc: 'Credits & conversions' },
                  ] as const).map(({ key, label, icon, desc }) => {
                    const areas: string[] = settings.biometricProtectedAreas ?? [];
                    const active = areas.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          triggerHaptic(10);
                          const next = active
                            ? areas.filter(a => a !== key)
                            : [...areas, key];
                          updateSettings({ biometricProtectedAreas: next });
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-all border-t border-border/40 first:border-t-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">{icon}</span>
                          <div className="text-left">
                            <p className="text-xs font-bold">{label}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-black">{desc}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                          active ? "bg-green-500 border-green-500" : "border-muted-foreground/30"
                        )}>
                          {active && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-4 py-3 border-t border-border/40 flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                    Uses your device lock — fingerprint, face, PIN, pattern or password
                  </p>
                </div>
              )}
            </div>

            <div className="h-px bg-border -mx-6" />

            <Link href="/settings/connected-apps" className="flex items-center justify-between p-2 rounded-2xl hover:bg-secondary/40 transition-all group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
                  <Code2 className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">Connected Apps</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Third-party access & OAuth</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
            </Link>
          </div>
        </section>

        {/* ACOUSTIC PULSE */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Acoustic Pulse</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 space-y-8">
            <div className="space-y-4">
              <div className="space-y-0.5">
                <p className="font-bold text-sm">Sound Signature</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black">Choose your network notification tone</p>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-secondary/40 p-1.5 rounded-2xl">
                <button
                  onClick={() => handleUpdate({ activeSoundSet: 'cyberpunk' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.activeSoundSet === 'cyberpunk' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground"
                  )}
                >
                  <Zap className="h-3.5 w-3.5" /> Cyberpunk
                </button>
                <button
                  onClick={() => handleUpdate({ activeSoundSet: 'lofi' })}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    settings.activeSoundSet === 'lofi' ? "bg-white dark:bg-zinc-800 text-primary shadow-md" : "text-muted-foreground"
                  )}
                >
                  <Music2 className="h-3.5 w-3.5" /> Lo-Fi
                </button>
              </div>
            </div>

            <div className="h-px bg-border -mx-6" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <p className="font-bold text-sm">{t('settings_quiet_hours')}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Suppress pulses during rest cycles</p>
                </div>
                <Switch checked={settings.isSilenceActive} onCheckedChange={(val) => handleUpdate({ isSilenceActive: val })} />
              </div>

              {settings.isSilenceActive && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Start Pulse</Label>
                    <Input type="time" value={settings.silenceStart} onChange={(e) => handleUpdate({ silenceStart: e.target.value })} className="h-10 bg-secondary/20 border-none rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">End Pulse</Label>
                    <Input type="time" value={settings.silenceEnd} onChange={(e) => handleUpdate({ silenceEnd: e.target.value })} className="h-10 bg-secondary/20 border-none rounded-xl" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PRIVACY & SIGNATURE */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">{t('settings_privacy')}</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-primary" />
                  <p className="font-bold text-sm">{t('settings_ghost')}</p>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-black">Hide your pulse from the network</p>
              </div>
              <Switch checked={settings.isGhostMode} onCheckedChange={(val) => handleUpdate({ isGhostMode: val })} />
            </div>

            <div className="h-px bg-border -mx-6" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <p className="font-bold text-sm">Read Receipts</p>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-black">Let nodes know you've synced messages</p>
              </div>
              <Switch checked={settings.showReadReceipts} onCheckedChange={(val) => handleUpdate({ showReadReceipts: val })} />
            </div>

            <div className="h-px bg-border -mx-6" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <p className="font-bold text-sm">Legacy Handshake</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Trusted node for vault management</p>
                </div>
                <Dialog open={isLegacySelectorOpen} onOpenChange={setIsLegacySelectorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-9 px-4 rounded-xl border-primary/10 text-[9px] font-black uppercase tracking-widest gap-2">
                      {selectedLegacyNode ? `@${selectedLegacyNode.username}` : "Assign Node"}
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-t-[2.5rem] p-0 overflow-hidden border-primary/10 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-3xl h-[60vh] flex flex-col">
                    <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                      <DialogTitle className="text-xl font-black italic uppercase tracking-widest">Select Legacy Node</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 space-y-4 shrink-0">
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                        <Input placeholder="Query established friends..." className="pl-10 h-12 bg-secondary/30 border-none rounded-2xl" value={legacySearch} onChange={(e) => setLegacySearch(e.target.value)} />
                      </div>
                    </div>
                    <ScrollArea className="flex-1 px-4">
                      <div className="space-y-2 pb-10">
                        {filteredConnections.length > 0 ? filteredConnections.map((c) => (
                          <button key={c.username} onClick={() => { handleUpdate({ legacyContact: c.username }); setIsLegacySelectorOpen(false); }} className={cn("w-full flex items-center justify-between p-3 rounded-2xl transition-all border", settings.legacyContact === c.username ? "bg-primary/10 border-primary/20" : "bg-transparent border-transparent hover:bg-secondary/40")}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-primary/10"><AvatarImage src={c.avatar} /></Avatar>
                              <div className="text-left">
                                <p className="font-bold text-sm leading-none">{c.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black mt-1">@{c.username}</p>
                              </div>
                            </div>
                            {settings.legacyContact === c.username && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </button>
                        )) : <div className="py-20 text-center opacity-40 italic text-xs uppercase">No mutual nodes found</div>}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-10">
          <AcronymCard />
        </section>

        <section className="pt-10 pb-20">
          <NativeAdNode type="banner-468" id="settings-bottom-pulse" />
          <Button variant="outline" className="w-full h-14 rounded-2xl border-destructive/20 text-destructive font-black italic uppercase tracking-widest text-[10px] hover:bg-destructive/5 transition-all active:scale-95 shadow-lg shadow-destructive/5 mt-8" onClick={logout}>
            {t('logout')}
          </Button>
          <p className="text-center text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-6">ViMore Node v1.5.0-HighVelocity</p>
        </section>
      </main>
    </div>
  );
}
