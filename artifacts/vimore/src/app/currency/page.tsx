
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  ArrowLeft, 
  Coins, 
  Gem, 
  CheckCircle2, 
  Copy, 
  Upload, 
  AlertTriangle, 
  ShieldCheck,
  Zap,
  Clock,
  Trash2,
  X,
  Loader2,
  Sparkles,
  ChevronRight,
  Send,
  HelpCircle,
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useNotifications } from "@/context/NotificationContext";
import { useTranslation } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BiometricGate } from "@/components/layout/biometric-gate";

const CREDIT_PACKAGES = [
  { id: "d1", d: 25, priceLD: 1200, priceUSD: 7.00, label: "Gem Spike" },
  { id: "d2", d: 50, priceLD: 2350, priceUSD: 13.00, label: "Vault Refill" },
  { id: "d3", d: 100, priceLD: 4700, priceUSD: 25.00, label: "VIP Crystalline", isVIP: true },
];

type TabId = "credits" | "complete";

export default function CurrencyHub() {
  const { currentUser, initiateTransaction, pendingTransaction, cancelTransaction, triggerHaptic, createPaymentRequest, submitTicket, isLoading } = usePosts();
  const { currentTrack, isExpanded } = useMusic();
  const { addSignal } = useNotifications();
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>(pendingTransaction ? "complete" : "credits");
  const [currencyMode, setCurrencyMode] = useState<"USD" | "LD">("LD");
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [uploadedScreenshot, setUploadedScreenshot] = useState<string | null>(null);

  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Finance");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const EXPIRY_SECONDS = 30 * 60;
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (pendingTransaction) {
      setTimeLeft(EXPIRY_SECONDS);
      stopTimer();
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            stopTimer();
            cancelTransaction();
            toast({ variant: "destructive", title: "Session Expired", description: "Your payment session timed out. Please select a package and try again." });
            setActiveTab("credits");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopTimer();
      setTimeLeft(EXPIRY_SECONDS);
    }
    return stopTimer;
  }, [pendingTransaction?.$id]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const timerColor = timeLeft <= 300 ? 'red' : timeLeft <= 600 ? 'amber' : 'emerald';

  const isPlayerActive = currentTrack && !isExpanded;

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setIsSubmittingTicket(true);
    try {
      await submitTicket({ subject: ticketSubject, message: ticketMessage, category: ticketCategory, priority: 'HIGH' });
      toast({ title: "Ticket Submitted", description: "Our team will review your issue shortly." });
      setIsTicketOpen(false);
      setTicketSubject(""); setTicketMessage(""); setTicketCategory("Finance");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to Submit Ticket", description: e.message });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    triggerHaptic(5);
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} synced to clipboard.` });
  };

  const handlePackageSelect = (pkg: any, type: 'Gold' | 'Credits') => {
    triggerHaptic(15);
    setSelectedPackage({ ...pkg, type });
  };

  const handleProceedToPayment = async () => {
    if (!selectedPackage) return;
    triggerHaptic(20);
    setIsGeneratingCode(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const amount = currencyMode === 'LD' ? selectedPackage.priceLD : selectedPackage.priceUSD;
      initiateTransaction({
        packageId: selectedPackage.id,
        packageName: selectedPackage.label,
        amount: amount.toString(),
        currency: currencyMode,
        type: selectedPackage.type,
        coinAmount: selectedPackage.gd || selectedPackage.d || 0,
        code: `VBC-${code}`
      });
      setSelectedPackage(null);
      setActiveTab("complete");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Protocol Error", description: e.message });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic(10);
      const reader = new FileReader();
      reader.onloadend = () => setUploadedScreenshot(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitForReview = async () => {
    if (!uploadedScreenshot) return;
    setIsUploading(true);
    triggerHaptic(50);
    try {
      await createPaymentRequest(uploadedScreenshot);
      addSignal({
        type: 'SYSTEM',
        title: 'Review Node Active',
        content: `Your receipt for **${pendingTransaction?.packageName}** is now in the review cluster. We will notify you upon approval.`
      });
      toast({ title: "Submission Received", description: "Review node materialized. Returning to feed..." });
      cancelTransaction();
      router.push("/");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Handshake Failed", description: e.message });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/30 blur-2xl rounded-full" />
          <Coins className="relative h-12 w-12 text-amber-400 animate-pulse" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 animate-pulse">Syncing Wallet...</p>
      </div>
    );
  }

  const TABS: { id: TabId; label: string; color: string }[] = [
    { id: "credits", label: "Buy Credits", color: "cyan" },
    { id: "complete", label: "Complete", color: "emerald" },
  ];

  return (
    <BiometricGate title="Credit Hub">
      <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#060608] transition-colors duration-300">

        {/* Header */}
        <header className={cn(
          "sticky top-0 z-50 bg-white/90 dark:bg-[#0D0D12]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/5 h-16 px-4 flex items-center justify-between transition-all",
          ""
        )}>
          <div className="flex items-center gap-3">
            <Link href="/menu">
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-black/5 dark:hover:bg-white/5">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-base font-black italic uppercase tracking-tighter leading-none">Credit Hub</h1>
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Financial Vault</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-2xl px-4 py-2">
              <Gem className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-xs font-black tabular-nums">{(currentUser?.creditBalance ?? currentUser?.diamondBalance ?? 0).toFixed(2)}</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">C</span>
            </div>
            <Avatar className="h-9 w-9 border-2 border-primary/20 ring-2 ring-primary/10">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback className="text-xs font-black">{(currentUser?.name || 'V')[0]}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 pb-32 space-y-6 pt-6">

          {/* Wallet Hero Card */}
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1a0533] via-[#2d0a5c] to-[#0f1a3d] p-6 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(168,85,247,0.3),_transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(6,182,212,0.2),_transparent_60%)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Your Vault</p>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">ViMore Wallet</h2>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Sparkles className="h-6 w-6 text-white/80" />
                </div>
              </div>
              <div className="mt-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <Gem className="h-4.5 w-4.5 text-cyan-400" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Credit Balance</span>
                  </div>
                  <p className="text-4xl font-black italic text-white tabular-nums">{(currentUser?.creditBalance ?? currentUser?.diamondBalance ?? 0).toFixed(2)}</p>
                  <p className="text-[9px] text-white/30 font-bold uppercase mt-1">Credits are non-withdrawable and used exclusively for boosts, marketplace promotions, and verification badges.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1.5 p-1.5 bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 relative py-3 px-2 rounded-xl text-[10px] font-black italic uppercase tracking-widest transition-all duration-200",
                    isActive
                      ? tab.color === "amber" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                        : tab.color === "cyan" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
                        : "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {tab.id === "complete" && pendingTransaction && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Currency Toggle */}
          {activeTab !== "complete" && (
            <div className="flex justify-center">
              <div className="flex items-center gap-1 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full p-1 shadow-sm">
                {(["USD", "LD"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { triggerHaptic(5); setCurrencyMode(mode); }}
                    className={cn(
                      "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                      currencyMode === mode
                        ? "bg-primary text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode === "USD" ? "USD ($)" : "LD (L$)"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Credit packages */}
          {activeTab === "credits" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg, 'Credits')}
                  className={cn(
                    "group relative text-left p-5 rounded-[1.75rem] border-2 transition-all duration-300 overflow-hidden active:scale-[0.97]",
                    pkg.isVIP
                      ? "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 border-cyan-300 shadow-2xl shadow-cyan-500/30"
                      : "bg-white dark:bg-white/5 border-black/5 dark:border-white/10 hover:border-cyan-300 dark:hover:border-cyan-700 shadow-sm hover:shadow-lg"
                  )}
                >
                  {pkg.isVIP && (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
                  )}
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", pkg.isVIP ? "bg-white/20" : "bg-cyan-500/10")}>
                        <Gem className={cn("h-6 w-6", pkg.isVIP ? "text-white" : "text-cyan-500")} />
                      </div>
                      {pkg.isVIP && <Badge className="bg-white/25 text-white text-[8px] font-black uppercase border-none px-2.5">VIP</Badge>}
                    </div>
                    <div>
                      <p className={cn("text-3xl font-black italic tracking-tight leading-none", pkg.isVIP ? "text-white" : "text-foreground")}>
                        {pkg.d} <span className="text-base">C</span>
                      </p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", pkg.isVIP ? "text-white/60" : "text-muted-foreground")}>{pkg.label}</p>
                    </div>
                    <div className={cn("flex items-center justify-between pt-3 border-t", pkg.isVIP ? "border-white/20" : "border-black/5 dark:border-white/5")}>
                      <span className={cn("text-xl font-black", pkg.isVIP ? "text-white" : "")}>
                        {currencyMode === 'USD' ? `$${pkg.priceUSD.toFixed(2)}` : `L$ ${pkg.priceLD.toLocaleString()}`}
                      </span>
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1", pkg.isVIP ? "bg-white/20" : "bg-cyan-500/10")}>
                        <ChevronRight className={cn("h-4 w-4", pkg.isVIP ? "text-white" : "text-cyan-500")} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Complete Payment Tab */}
          {activeTab === "complete" && (
            !pendingTransaction ? (
              <div className="py-20 flex flex-col items-center gap-6 bg-white dark:bg-white/5 rounded-[2.5rem] border border-dashed border-black/10 dark:border-white/10">
                <div className="h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center border-2 border-dashed border-primary/20">
                  <ShieldCheck className="h-10 w-10 text-primary/30" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">No Active Pulses</h3>
                  <p className="text-muted-foreground text-sm font-medium max-w-xs mx-auto">No unfinished payments. Select a package to begin.</p>
                </div>
                <Button variant="outline" className="rounded-full border-primary text-primary font-black uppercase text-[10px] tracking-widest h-11 px-8" onClick={() => setActiveTab("credits")}>Browse Packages</Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in zoom-in-95 duration-500">
                {/* Active payment card */}
                <div className={cn(
                  "border rounded-[2.5rem] p-6 space-y-5 transition-colors duration-500",
                  timerColor === 'red'
                    ? "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/30"
                    : timerColor === 'amber'
                    ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30"
                    : "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20"
                )}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0",
                        timerColor === 'red' ? "bg-red-500 shadow-red-500/20"
                          : timerColor === 'amber' ? "bg-amber-500 shadow-amber-500/20"
                          : "bg-emerald-500 shadow-emerald-500/20"
                      )}>
                        <CheckCircle2 className="h-7 w-7 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-xs font-black uppercase tracking-[0.2em]",
                          timerColor === 'red' ? "text-red-500/60" : timerColor === 'amber' ? "text-amber-500/60" : "text-emerald-600/60"
                        )}>Session Active</p>
                        <h3 className={cn(
                          "text-xl font-black italic uppercase tracking-tighter",
                          timerColor === 'red' ? "text-red-500" : timerColor === 'amber' ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                        )}>Awaiting Payment</h3>
                        <p className="text-xs font-bold text-muted-foreground truncate">{pendingTransaction.packageName}</p>
                      </div>
                    </div>

                    {/* Countdown timer */}
                    <div className={cn(
                      "flex flex-col items-center justify-center rounded-2xl px-4 py-3 shrink-0 border",
                      timerColor === 'red'
                        ? "bg-red-500/10 border-red-500/30"
                        : timerColor === 'amber'
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-emerald-500/10 border-emerald-500/20"
                    )}>
                      <Timer className={cn(
                        "h-3.5 w-3.5 mb-1",
                        timerColor === 'red' ? "text-red-500" : timerColor === 'amber' ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                      )} />
                      <p className={cn(
                        "text-xl font-black font-mono tabular-nums leading-none",
                        timerColor === 'red' ? "text-red-500 animate-pulse" : timerColor === 'amber' ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                      )}>{formatTime(timeLeft)}</p>
                      <p className={cn(
                        "text-[8px] font-black uppercase tracking-widest mt-0.5",
                        timerColor === 'red' ? "text-red-500/60" : timerColor === 'amber' ? "text-amber-500/60" : "text-emerald-600/50"
                      )}>
                        {timerColor === 'red' ? "Expiring!" : timerColor === 'amber' ? "Hurry up" : "Remaining"}
                      </p>
                    </div>
                  </div>

                  {timerColor !== 'emerald' && (
                    <div className={cn(
                      "flex items-center gap-2 rounded-2xl px-4 py-2.5",
                      timerColor === 'red' ? "bg-red-500/10" : "bg-amber-500/10"
                    )}>
                      <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", timerColor === 'red' ? "text-red-500" : "text-amber-500")} />
                      <p className={cn("text-[10px] font-bold leading-relaxed", timerColor === 'red' ? "text-red-500/80" : "text-amber-600/80 dark:text-amber-400/80")}>
                        {timerColor === 'red'
                          ? "Less than 5 minutes left! Complete your payment now or this session will expire."
                          : "Less than 10 minutes left. Please complete your payment soon."}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Amount Due</p>
                      <p className="text-xl font-black">{pendingTransaction.currency === 'USD' ? '$' : 'L$'} {pendingTransaction.amount}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(pendingTransaction.code, "Code")}
                      className="bg-white/60 dark:bg-white/5 rounded-2xl p-4 border border-white/20 dark:border-white/5 text-left hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ref Code</p>
                        <Copy className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-lg font-black tracking-widest font-mono text-primary">{pendingTransaction.code}</p>
                    </button>
                  </div>
                </div>

                {/* Payment destination */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      <h3 className="text-sm font-black italic uppercase tracking-widest">Complete Your Payment</h3>
                    </div>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                      pendingTransaction.currency === 'USD'
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-primary/10 border-primary/30 text-primary"
                    )}>
                      {pendingTransaction.currency === 'USD' ? '$ USD' : 'L$ LD'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                    Tap the button for your preferred network below. Your phone dialer will open with the payment code pre-filled — just press <span className="font-black text-foreground">Send/Call</span> to transfer the money to <span className="font-black text-foreground">Amos Kortu</span>. After the transfer, screenshot the confirmation message and upload it here.
                  </p>

                  {/* MTN MoMo — shows ONLY the button matching the selected currency */}
                  <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-yellow-500 flex items-center justify-center shrink-0 shadow-md shadow-yellow-500/20">
                        <span className="text-white font-black text-xs">MM</span>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-widest">MTN MoMo</p>
                        <p className="font-black text-sm">Amos Kortu</p>
                      </div>
                    </div>
                    {pendingTransaction.currency === 'USD' ? (
                      <a
                        href={`tel:*156*1*1*1*0889322188*2*${pendingTransaction.amount}*${pendingTransaction.amount}%23`}
                        onClick={() => triggerHaptic(20)}
                        className="flex items-center justify-between w-full bg-yellow-500/15 hover:bg-yellow-500/25 active:scale-95 rounded-xl px-4 py-3 transition-all"
                      >
                        <div>
                          <span className="text-[9px] font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-widest block">USD — Tap to Dial</span>
                          <span className="text-lg font-black text-yellow-600 dark:text-yellow-400">$ {pendingTransaction.amount}</span>
                        </div>
                        <span className="text-yellow-600 dark:text-yellow-400 text-xl">📞</span>
                      </a>
                    ) : (
                      <a
                        href={`tel:*156*1*1*1*0889322188*1*${pendingTransaction.amount}*${pendingTransaction.amount}%23`}
                        onClick={() => triggerHaptic(20)}
                        className="flex items-center justify-between w-full bg-yellow-500/15 hover:bg-yellow-500/25 active:scale-95 rounded-xl px-4 py-3 transition-all"
                      >
                        <div>
                          <span className="text-[9px] font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-widest block">LD — Tap to Dial</span>
                          <span className="text-lg font-black text-yellow-600 dark:text-yellow-400">L$ {pendingTransaction.amount}</span>
                        </div>
                        <span className="text-yellow-600 dark:text-yellow-400 text-xl">📞</span>
                      </a>
                    )}
                  </div>

                  {/* Orange Money — shows ONLY the button matching the selected currency */}
                  <div className="bg-orange-500/8 border border-orange-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                        <span className="text-white font-black text-xs">OM</span>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Orange Money</p>
                        <p className="font-black text-sm">Amos Kortu</p>
                      </div>
                    </div>
                    {pendingTransaction.currency === 'USD' ? (
                      <a
                        href={`tel:*144*1*1*1*0778451835*${pendingTransaction.amount}%23`}
                        onClick={() => triggerHaptic(20)}
                        className="flex items-center justify-between w-full bg-orange-500/15 hover:bg-orange-500/25 active:scale-95 rounded-xl px-4 py-3 transition-all"
                      >
                        <div>
                          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block">USD — Tap to Dial</span>
                          <span className="text-lg font-black text-orange-500">$ {pendingTransaction.amount}</span>
                        </div>
                        <span className="text-orange-500 text-xl">📞</span>
                      </a>
                    ) : (
                      <a
                        href={`tel:*144*2*1*1*0778451835*${pendingTransaction.amount}%23`}
                        onClick={() => triggerHaptic(20)}
                        className="flex items-center justify-between w-full bg-orange-500/15 hover:bg-orange-500/25 active:scale-95 rounded-xl px-4 py-3 transition-all"
                      >
                        <div>
                          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block">LD — Tap to Dial</span>
                          <span className="text-lg font-black text-orange-500">L$ {pendingTransaction.amount}</span>
                        </div>
                        <span className="text-orange-500 text-xl">📞</span>
                      </a>
                    )}
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-4 flex gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                      After sending, screenshot the Orange Money or MTN MoMo confirmation message and upload it below for verification.
                    </p>
                  </div>
                </div>

                {/* Screenshot upload */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black italic uppercase tracking-widest">Attach Receipt</h3>
                    <button onClick={() => { triggerHaptic(5); cancelTransaction(); }} className="text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                      <Trash2 className="h-3 w-3" /> Cancel
                    </button>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative aspect-video w-full rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
                      uploadedScreenshot ? "border-emerald-500/40 bg-emerald-500/5" : "border-black/10 dark:border-white/10 hover:border-primary/40 bg-white dark:bg-white/5"
                    )}
                  >
                    {uploadedScreenshot ? (
                      <>
                        <Image src={uploadedScreenshot} alt="Receipt" fill className="object-cover opacity-30" />
                        <div className="relative z-10 flex flex-col items-center gap-3">
                          <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-xl">
                            <CheckCircle2 className="h-7 w-7 text-white" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Receipt Attached</p>
                          <Button variant="ghost" size="sm" className="text-destructive font-black uppercase text-[10px] h-8" onClick={(e) => { e.stopPropagation(); setUploadedScreenshot(null); }}>Change Image</Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-center px-8">
                        <div className="p-5 rounded-3xl bg-primary/5 hover:bg-primary/10 transition-colors">
                          <Upload className="h-9 w-9 text-primary/40" />
                        </div>
                        <div>
                          <p className="text-sm font-black italic uppercase tracking-wide">Tap to upload screenshot</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1">Upload your payment confirmation</p>
                        </div>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScreenshotUpload} />
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 flex gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-600/70 dark:text-amber-400/70 leading-relaxed">
                    Review may take some time. Go back to the home feed — you'll receive a notification when approved.
                  </p>
                </div>

                <Button
                  className={cn(
                    "w-full h-14 rounded-2xl font-black italic uppercase tracking-[0.2em] text-base transition-all",
                    uploadedScreenshot && !isUploading
                      ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-700"
                      : "bg-secondary text-muted-foreground/40 cursor-not-allowed"
                  )}
                  disabled={!uploadedScreenshot || isUploading}
                  onClick={handleSubmitForReview}
                >
                  {isUploading ? <><Clock className="mr-2 h-5 w-5 animate-spin" /> Synchronizing...</> : "Submit for Review"}
                </Button>
              </div>
            )
          )}

          {/* Support ticket button */}
          <button
            onClick={() => { triggerHaptic(10); setIsTicketOpen(true); }}
            className="w-full flex items-center gap-4 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[1.5rem] p-4 hover:border-primary/20 transition-all shadow-sm active:scale-[0.98] group"
          >
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-black italic uppercase tracking-tight">Need Help?</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contact support for payment issues</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
          </button>

          <div className="text-center opacity-20 pb-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">ViMore Vault v1.5.0</span>
            </div>
          </div>
        </main>

        {/* Package Detail Overlay */}
        {selectedPackage && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-300">
            <header className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-white/5">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white rounded-full" onClick={() => setSelectedPackage(null)}>
                <X className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Confirm Purchase</h2>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{selectedPackage.label}</p>
              </div>
              <div className="w-10" />
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-sm mx-auto space-y-6">
                {/* Warning */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-red-500 rounded-2xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-black italic uppercase tracking-tighter text-red-400 text-lg">Warning</h3>
                      <p className="text-[10px] text-red-400/60 font-bold uppercase">Read before proceeding</p>
                    </div>
                  </div>
                  <p className="text-sm text-red-300/80 leading-relaxed">
                    Do NOT share your payment code with anyone. Once you proceed, you must complete the payment before the session expires.
                  </p>
                </div>

                {/* Package summary */}
                <div className={cn(
                  "rounded-[2rem] p-6 space-y-4",
                  selectedPackage.type === 'Gold'
                    ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20"
                    : "bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20"
                )}>
                  <div className="flex items-center gap-4">
                    {selectedPackage.type === 'Gold'
                      ? <Coins className="h-10 w-10 text-amber-400" />
                      : <Gem className="h-10 w-10 text-cyan-400" />
                    }
                    <div>
                      <p className="text-3xl font-black italic text-white">
                        {selectedPackage.gd || selectedPackage.d} {selectedPackage.type === 'Gold' ? 'GD' : 'C'}
                      </p>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{selectedPackage.label}</p>
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-white/40 tracking-widest">Total</span>
                    <span className="text-2xl font-black text-white">
                      {currencyMode === 'USD' ? `$${selectedPackage.priceUSD.toFixed(2)}` : `L$ ${selectedPackage.priceLD.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full h-14 rounded-2xl font-black italic uppercase tracking-[0.2em] bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  onClick={handleProceedToPayment}
                  disabled={isGeneratingCode}
                >
                  {isGeneratingCode
                    ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
                    : "Proceed to Payment"
                  }
                </Button>
                <Button variant="ghost" className="w-full text-white/40 font-bold uppercase text-[10px]" onClick={() => setSelectedPackage(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Support Ticket Overlay */}
        {isTicketOpen && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-300">
            <header className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-white/5">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white rounded-full" onClick={() => setIsTicketOpen(false)}><X className="h-5 w-5" /></Button>
              <div className="text-center">
                <h2 className="text-sm font-black italic uppercase tracking-widest text-white">Support Ticket</h2>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Payment Help</p>
              </div>
              <div className="w-10" />
            </header>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-sm mx-auto space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Subject</label>
                  <input value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Describe your issue..." className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-white/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['Finance', 'Technical', 'Identity', 'Rewards', 'Other'].map(cat => (
                      <button key={cat} onClick={() => setTicketCategory(cat)} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", ticketCategory === cat ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Message</label>
                  <textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} placeholder="Provide details..." rows={5} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-white/20" />
                </div>
                <Button
                  className={cn("w-full h-14 rounded-2xl font-black italic uppercase tracking-widest transition-all gap-3", ticketSubject && ticketMessage && !isSubmittingTicket ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-white/5 text-white/20 cursor-not-allowed")}
                  onClick={handleSubmitTicket}
                  disabled={!ticketSubject || !ticketMessage || isSubmittingTicket}
                >
                  {isSubmittingTicket ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <><Send className="h-5 w-5" /> Submit Ticket</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BiometricGate>
  );
}
