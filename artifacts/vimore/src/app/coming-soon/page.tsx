"use client";

import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    emoji: "📞",
    title: "Voice & Video Calls",
    tag: "Communication",
    tagColor: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    accent: "from-violet-500/10 to-violet-500/5",
    border: "border-violet-200/60 dark:border-violet-800/30",
    description:
      "Crystal-clear, end-to-end encrypted audio and video calls — built natively into ViMore. No third-party apps, no friction. Just tap and connect with anyone in your network instantly, from anywhere in the world.",
  },
  {
    emoji: "📡",
    title: "Live Streaming",
    tag: "Broadcast",
    tagColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    accent: "from-rose-500/10 to-rose-500/5",
    border: "border-rose-200/60 dark:border-rose-800/30",
    description:
      "Go live to your entire network in real time. Whether you're sharing breaking news, hosting a Q&A, performing, or just vibing — ViMore Live puts the broadcast studio in your pocket with zero buffering and full audience engagement tools.",
  },
  {
    emoji: "📖",
    title: "Stories & Highlights",
    tag: "Content",
    tagColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    accent: "from-amber-500/10 to-amber-500/5",
    border: "border-amber-200/60 dark:border-amber-800/30",
    description:
      "Ephemeral moments that live for 24 hours, plus permanent highlights you curate on your profile. Express yourself freely without cluttering your main feed — and let your best moments shine forever in Highlights.",
  },
  {
    emoji: "🎭",
    title: "AR Filters & Effects",
    tag: "Creative",
    tagColor: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    accent: "from-pink-500/10 to-pink-500/5",
    border: "border-pink-200/60 dark:border-pink-800/30",
    description:
      "Bring your camera to life with augmented reality filters and effects. From subtle enhancements to wildly creative overlays — express yourself in ways that words and plain photos simply can't capture.",
  },
  {
    emoji: "📊",
    title: "Creator Analytics",
    tag: "Insights",
    tagColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    accent: "from-indigo-500/10 to-indigo-500/5",
    border: "border-indigo-200/60 dark:border-indigo-800/30",
    description:
      "Deep, real-time insights into every post, reel, story, and interaction. Understand your audience demographics, peak engagement windows, follower growth trends, and content performance — all visualised in a beautiful dashboard built for creators.",
  },
  {
    emoji: "🤝",
    title: "Collaborative Posts",
    tag: "Community",
    tagColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    accent: "from-teal-500/10 to-teal-500/5",
    border: "border-teal-200/60 dark:border-teal-800/30",
    description:
      "Create and co-own posts with other users. Invite a friend, a brand, or another creator to collaborate — your post appears on both profiles simultaneously, doubling the reach and making every collaboration feel official.",
  },
  {
    emoji: "🎙️",
    title: "Audio Rooms",
    tag: "Social Audio",
    tagColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    accent: "from-orange-500/10 to-orange-500/5",
    border: "border-orange-200/60 dark:border-orange-800/30",
    description:
      "Drop into live audio conversations — think talk shows, roundtables, town halls, and casual hangouts — all within ViMore. Listen passively or raise your hand to speak. Great discussions don't need a camera.",
  },
  {
    emoji: "🔔",
    title: "Smart Notification Filters",
    tag: "Productivity",
    tagColor: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    accent: "from-slate-500/10 to-slate-500/5",
    border: "border-slate-200/60 dark:border-slate-700/30",
    description:
      "AI-powered notification intelligence that learns what matters to you. Group, prioritise, and silence alerts automatically. Focus on the signals that move you forward — and let the noise fade into the background.",
  },
];

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#050505]">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border h-16 px-4 flex items-center gap-4">
        <Link href="/menu">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary/80 active:scale-90 transition-all">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Coming Soon</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
            <Zap className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Building the Future</span>
          </div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-foreground leading-tight">
            What&apos;s Next for ViMore
          </h2>
          <p className="text-muted-foreground font-medium leading-relaxed max-w-md mx-auto">
            We&apos;re working around the clock to bring you the most powerful social experience ever built. Here&apos;s a glimpse of what&apos;s loading.
          </p>
        </div>

        <div className="space-y-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={cn(
                "bg-gradient-to-br",
                feature.accent,
                "border",
                feature.border,
                "rounded-[2rem] p-6 space-y-3 bg-white dark:bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{feature.emoji}</span>
                  <h3 className="text-lg font-black tracking-tight text-foreground">{feature.title}</h3>
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shrink-0 mt-1", feature.tagColor)}>
                  {feature.tag}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed pl-1">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center space-y-3 py-8">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">ViMore Network</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-primary italic">© 2026 ViMore by Media Tech Liberia</p>
        </div>
      </main>

      <div className="h-20 lg:hidden" />
    </div>
  );
}
