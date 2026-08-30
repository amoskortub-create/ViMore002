"use client";

import {
  ArrowLeft,
  Gem,
  Star,
  Rocket,
  Music2,
  Users,
  ShieldCheck,
  TrendingUp,
  Zap,
  MessageCircle,
  ShoppingBag,
  Ticket,
  ChevronRight,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { NativeAdNode } from "@/components/ad/native-ad-node";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Gem,
    gradient: "from-cyan-400 to-blue-600",
    label: "Currency",
    title: "How Money Works",
    points: [
      { icon: Star, text: "Stars — earned by inviting friends. 5,000 Stars per referral." },
      { icon: Gem, text: "Credits — send gifts to creators, unlock posts, and subscribe to creators." },
      { icon: TrendingUp, text: "1 Credit = $0.25 USD. Withdraw anytime to Orange or MTN MoMo." },
    ],
  },
  {
    icon: TrendingUp,
    gradient: "from-green-400 to-emerald-600",
    label: "Creator Economy",
    title: "Earning as a Creator",
    points: [
      { icon: TrendingUp, text: "You keep 90% of everything you earn. ViMore takes only 10%." },
      { icon: Gem, text: "Withdraw your Credits to real money via Orange or MTN MoMo." },
      { icon: ShieldCheck, text: "Every payout is reviewed by our AI audit system for security." },
    ],
  },
  {
    icon: Rocket,
    gradient: "from-violet-500 to-purple-700",
    label: "Content",
    title: "Sharing & Discovery",
    points: [
      { icon: Rocket, text: "Your feed is personalised by AI — it shows the content most relevant to you." },
      { icon: Zap, text: "Reels — short videos in full-screen, designed for creators to go viral." },
      { icon: Gem, text: "Lock posts behind a Credit paywall (2–100 C) to monetise your best content." },
    ],
  },
  {
    icon: Music2,
    gradient: "from-pink-500 to-rose-600",
    label: "Music",
    title: "Music & Audio",
    points: [
      { icon: Music2, text: "Upload and publish your own tracks, albums, and playlists." },
      { icon: Zap, text: "Set a 10-second audio intro that plays when people visit your profile." },
      { icon: Star, text: "Download tracks to listen offline — no data needed after the first play." },
    ],
  },
  {
    icon: Users,
    gradient: "from-blue-400 to-cyan-600",
    label: "Community",
    title: "Friends & Groups",
    points: [
      { icon: Users, text: "Follow anyone. When they follow back, direct messaging unlocks." },
      { icon: MessageCircle, text: "Create group chats (Clusters) for teams, friends, or communities." },
      { icon: Globe, text: "Designate a trusted person to manage your account if you go inactive." },
    ],
  },
  {
    icon: ShoppingBag,
    gradient: "from-teal-400 to-green-600",
    label: "Marketplace",
    title: "Buy & Sell",
    points: [
      { icon: ShoppingBag, text: "List products in the Marketplace — photos, price, and contact details." },
      { icon: Zap, text: "Boost your listing to get it shown to more people across the platform." },
      { icon: MessageCircle, text: "Buyers contact sellers directly through the built-in chat." },
    ],
  },
  {
    icon: Ticket,
    gradient: "from-amber-500 to-yellow-600",
    label: "Events",
    title: "Events & Tickets",
    points: [
      { icon: Ticket, text: "Find events near you and buy tickets directly inside ViMore." },
      { icon: Star, text: "Gift tickets to friends — they'll be notified and the ticket transfers instantly." },
      { icon: ShieldCheck, text: "Every ticket has a unique QR code that's verified at the door." },
    ],
  },
  {
    icon: ShieldCheck,
    gradient: "from-slate-500 to-slate-700",
    label: "Safety",
    title: "Privacy & Safety",
    points: [
      { icon: ShieldCheck, text: "Ghost Mode — browse without showing your online status or read receipts." },
      { icon: Zap, text: "Sensitive content is blurred by default until you choose to reveal it." },
      { icon: Users, text: "Report or block anyone. Serious violations result in immediate removal." },
    ],
  },
];

const CURRENCIES = [
  { icon: Star, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", name: "Stars", desc: "Earned by inviting friends", earn: "5,000 per referral" },
  { icon: Gem, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20", name: "Credits", desc: "Gifts, unlocks & subscriptions", earn: "Purchased in-app" },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#080808]">

      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-[#7B2FBE] via-primary to-[#4C1D95] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-12 w-56 h-56 bg-black/20 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 px-5 pt-5 pb-16">
          <Link href="/menu">
            <button className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-8 active:scale-90 transition-all">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </Link>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
              <Zap className="h-3 w-3 text-amber-300 fill-current" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Platform Guide</span>
            </div>
            <h1 className="text-[2.8rem] font-black italic uppercase tracking-tighter text-white leading-none drop-shadow-lg">
              How<br />ViMore<br />Works
            </h1>
            <p className="text-white/65 text-sm font-medium max-w-xs leading-relaxed">
              Everything you need to know about creating, earning, and connecting on ViMore.
            </p>
          </div>
        </div>
      </div>

      {/* ── Currency Quick-Look (overlaps hero) ── */}
      <div className="relative z-20 -mt-6 px-5 mb-8">
        <div className="bg-white dark:bg-[#161616] rounded-[2rem] shadow-xl shadow-black/10 border border-black/5 dark:border-white/5 p-5">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">3 Currencies</p>
          <div className="space-y-3">
            {CURRENCIES.map(c => (
              <div key={c.name} className={cn("flex items-center gap-3 p-3 rounded-xl border", c.bg, c.border)}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", c.bg)}>
                  <c.icon className={cn("h-5 w-5", c.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-black", c.color)}>{c.name}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{c.desc}</p>
                </div>
                <span className="text-[10px] font-black text-muted-foreground shrink-0 text-right leading-tight max-w-[80px]">{c.earn}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-24 space-y-4">

        <NativeAdNode type="banner-468" id="hiw-top" />

        {/* ── Feature Sections ── */}
        {FEATURES.map((f, idx) => (
          <div key={f.label}>
            {idx === 4 && <NativeAdNode type="banner-468" id="hiw-mid" />}
            <div className="bg-white dark:bg-[#161616] rounded-[2rem] shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
              {/* Card header */}
              <div className={cn("bg-gradient-to-r p-5 flex items-center gap-4", f.gradient)}>
                <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">{f.label}</p>
                  <h2 className="text-lg font-black text-white tracking-tight leading-tight">{f.title}</h2>
                </div>
              </div>

              {/* Points */}
              <div className="p-5 space-y-3">
                {f.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[#F5F5F7] dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      <pt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground/80 font-medium leading-snug flex-1">{pt.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* ── Creator Split Callout ── */}
        <div className="relative bg-gradient-to-br from-primary to-[#5B21B6] rounded-[2rem] p-6 overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Creator Revenue</p>
                <h3 className="text-lg font-black text-white leading-tight">The 90 / 10 Split</h3>
              </div>
            </div>
             <p className="text-white/75 text-sm font-medium leading-relaxed">
               Every Gold or Credit you earn from your content — gifts, unlocks, subscriptions — keeps the same 90/10 split for verified and unverified creators. Transactions under 10 Credits have a 1-Credit minimum fee.
            </p>
            <div className="flex gap-3">
              <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-white">90%</p>
                <p className="text-[10px] font-black text-white/60 uppercase">Yours</p>
              </div>
              <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-white/50">10%</p>
                <p className="text-[10px] font-black text-white/40 uppercase">Platform</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <NativeAdNode type="banner-468" id="hiw-bottom" />

        <div className="pt-4 flex flex-col items-center gap-2 opacity-40">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">ViMore v1.5.0 · Media Tech Liberia</p>
        </div>

      </div>
    </div>
  );
}
