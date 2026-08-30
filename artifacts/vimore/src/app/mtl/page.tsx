
"use client";

import { ArrowLeft, Building2, Sparkles, Globe, Zap, Heart, Users, Star, Quote, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const leaders = [
  {
    name: "Amos B. Kortu",
    title: "Founder & CEO",
    company: "Media Tech Liberia",
    image: "/amos-kortu.png",
    gradient: "from-violet-600 via-purple-500 to-indigo-600",
    accent: "violet" as const,
    tagline: "The visionary who sparked the dream",
    quote: null,
  },
];

const storyParagraphs = [
  `Every great movement begins with a single, burning idea. For Amos B. Kortu, that idea was rooted in a profound belief: that Africa — and Liberia in particular — deserved its own world-class technology platform. A platform built not by outsiders, but by Liberians who understood the heartbeat of their nation, its culture, its stories, and its people.`,
  `Amos's conviction was simple but radical: technology is a language, and every people deserves to speak it in their own voice. He believed that Liberia's young generation was brimming with talent — developers, designers, creators, storytellers — who simply needed the right stage.`,
  `Media Tech Liberia didn't just want to build a product. It wanted to build a movement. A place where creators could monetize their talent, where communities could form and flourish, where stories from the streets of Monrovia could reach every corner of the globe.`,
  `Building a technology company in West Africa comes with its own unique set of challenges — from infrastructure limitations to funding hurdles. But Amos turned every challenge into fuel. Every setback became a setup for a greater comeback.`,
  `Under Amos's leadership, Media Tech Liberia is built to empower, train, and create an ecosystem for young Liberian developers, designers, and creatives—proving that the talent to build world-class technology has always existed right here in Africa.`,
  `Today, Media Tech Liberia stands as a testament to what happens when passion meets purpose. It is a company that carries the flag of African excellence into every server, every line of code, and every feature that rolls out to its growing community of users.`,
  `The mission is far from finished. In fact, it has only just begun. New features are coming. New markets are opening. And through it all, the same fire that started in the heart of a Liberian dreamer continues to burn — lighting the way for millions who believe that Africa's digital future is something to build. Right now. Together.`,
];

const stats = [
  { label: "Founded", value: "Dec 2025" },
  { label: "Platform", value: "ViMore" },
  { label: "Mission", value: "Africa-First" },
  { label: "HQ", value: "Monrovia" },
];

export default function MTLPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#08080f]">

      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#08080f]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/5 h-15 px-4 flex items-center gap-3">
        <Link href="/menu">
          <button className="h-9 w-9 rounded-2xl bg-secondary/60 dark:bg-white/5 flex items-center justify-center hover:bg-secondary transition-all active:scale-90">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h1 className="text-base font-black tracking-tight">About Us</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24">

        {/* ─── Hero ─── */}
        <div className="relative pt-8 pb-10 text-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-purple-500/8 rounded-full blur-2xl" />
          </div>

          <div className="relative space-y-5">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-primary to-indigo-700 rounded-full blur-2xl opacity-30 scale-125" />
                <div className="relative h-28 w-28 rounded-full overflow-hidden border-4 border-white/20 dark:border-white/10 shadow-2xl shadow-primary/30 ring-4 ring-primary/15">
                  <Image
                    src="/mtl-logo.png"
                    alt="Media Tech Liberia"
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full">
              <Zap className="h-3 w-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">Powering Africa's Digital Future</span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h2 className="text-4xl font-black tracking-tight leading-none">
                Media Tech <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">Liberia</span>
              </h2>
              <p className="text-sm text-muted-foreground font-medium">Born in Liberia. Built for the World.</p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              A next-generation technology company building the social media and creator economy platform for Africa.
            </p>

            {/* Stat pills */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {stats.map(s => (
                <div key={s.label} className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/8 rounded-2xl px-2 py-3 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/70 mb-0.5">{s.label}</p>
                  <p className="text-[11px] font-black text-foreground">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── ViMore Launch Banner ─── */}
        <div className="mb-8 bg-gradient-to-r from-primary via-violet-600 to-purple-600 rounded-3xl p-5 text-white relative overflow-hidden shadow-xl shadow-primary/25">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="absolute -right-8 -top-8 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-black text-base leading-tight">ViMore Launched</p>
              <p className="text-white/80 text-sm font-medium">April 14, 2026 · Monrovia, Liberia</p>
            </div>
          </div>
        </div>

        {/* ─── Leadership ─── */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Leadership</h3>
          </div>

          {leaders.map(leader => (
            <div key={leader.name} className="space-y-3">
              <div className="bg-white dark:bg-white/4 rounded-3xl border border-black/5 dark:border-white/8 shadow-lg shadow-black/5 overflow-hidden">
                {/* Gradient bar */}
                <div className={cn("h-1.5 w-full bg-gradient-to-r", leader.gradient)} />

                <div className="p-5 flex items-start gap-5">
                  {/* Photo */}
                  <div className={cn(
                    "relative shrink-0 h-24 w-20 rounded-2xl overflow-hidden ring-2",
                    "ring-violet-400/30"
                  )}>
                    <Image
                      src={leader.image}
                      alt={leader.name}
                      width={80}
                      height={96}
                      className="object-cover object-top w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pt-1 space-y-2">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                    )}>
                      <Sparkles className="h-2.5 w-2.5" />
                      {leader.title}
                    </div>
                    <h4 className="text-xl font-black tracking-tight leading-tight">{leader.name}</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{leader.company}</p>
                    <div className="flex items-start gap-1.5">
                      <Star className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground italic leading-snug">{leader.tagline}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote card — shown only if leader has a quote */}
              {leader.quote && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-5">
                  <Quote className="h-6 w-6 text-emerald-400/60 mb-3" />
                  <p className="text-sm font-semibold leading-relaxed text-foreground/85 italic">
                    "{leader.quote}"
                  </p>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-3 uppercase tracking-widest">
                    — {leader.name}, {leader.title}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ─── Our Story ─── */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Our Story</h3>
          </div>

          <div className="bg-white dark:bg-white/4 rounded-3xl border border-black/5 dark:border-white/8 shadow-lg shadow-black/5 overflow-hidden">
            {/* Pull quote */}
            <div className="bg-gradient-to-br from-primary/8 to-purple-500/5 border-b border-black/5 dark:border-white/5 p-6">
              <Quote className="h-7 w-7 text-primary/40 mb-3" />
              <p className="text-lg font-black leading-snug text-foreground">
                "Africa's digital future is not something to wait for — it is something to build."
              </p>
              <p className="text-[11px] font-bold text-primary mt-3 uppercase tracking-widest">— Amos B. Kortu, Founder & CEO</p>
            </div>

            {/* Story paragraphs */}
            <div className="p-6 space-y-5">
              {storyParagraphs.map((para, i) => (
                <p
                  key={i}
                  className={cn(
                    "leading-relaxed text-foreground/75",
                    i === 0 ? "text-base font-semibold text-foreground/90" : "text-sm",
                    i === storyParagraphs.length - 1 && "font-semibold text-foreground/85"
                  )}
                >
                  {i === 0 && (
                    <span className="float-left text-5xl font-black text-primary leading-none mr-2 mt-1 font-headline">
                      {para[0]}
                    </span>
                  )}
                  {i === 0 ? para.slice(1) : para}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Values ─── */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Heart className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Our Values</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🌍", label: "Africa-First", desc: "Built for African voices and communities." },
              { icon: "🔒", label: "Integrity", desc: "Honest, transparent, and trustworthy." },
              { icon: "⚡", label: "Innovation", desc: "Always pushing the boundaries of what's possible." },
              { icon: "🤝", label: "Empathy", desc: "Led by genuine care for our community." },
            ].map(v => (
              <div key={v.label} className="bg-white dark:bg-white/4 border border-black/5 dark:border-white/8 rounded-2xl p-4 shadow-sm">
                <span className="text-2xl">{v.icon}</span>
                <p className="font-black text-sm mt-2 mb-0.5">{v.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Official Website ─── */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Official Website</h3>
          </div>

          <a
            href="https://www.mediatechliberia.online"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white dark:bg-white/4 rounded-3xl border border-black/5 dark:border-white/8 shadow-lg shadow-black/5 overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-all active:scale-[0.98]"
          >
            {/* Top gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-violet-500 to-indigo-600" />

            <div className="p-5 space-y-4">
              {/* URL row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">mediatechliberia.online</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Official company website</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-black/5 dark:bg-white/5" />

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "🏢", label: "Company", value: "Media Tech Liberia" },
                  { icon: "📍", label: "Headquartered", value: "Monrovia, Liberia" },
                  { icon: "🚀", label: "Focus", value: "Creator Economy & Social Tech" },
                  { icon: "🌍", label: "Market", value: "Africa & Global Diaspora" },
                ].map(item => (
                  <div key={item.label} className="bg-secondary/40 dark:bg-white/4 rounded-2xl p-3">
                    <span className="text-lg">{item.icon}</span>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1.5 mb-0.5">{item.label}</p>
                    <p className="text-[11px] font-bold text-foreground leading-snug">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                Media Tech Liberia is the parent company behind ViMore — building technology products and digital infrastructure for African creators, communities, and entrepreneurs. Visit the official website to learn more about our mission, team, and upcoming ventures.
              </p>

              {/* CTA */}
              <div className="flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-2xl px-4 py-2.5">
                <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-[11px] font-black text-primary">Visit www.mediatechliberia.online →</p>
              </div>
            </div>
          </a>
        </div>

        {/* ─── Footer ─── */}
        <div className="flex flex-col items-center gap-2 py-8 opacity-50">
          <div className="h-px w-24 bg-foreground/20 mb-3" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">Media Tech Liberia</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-primary italic">Built in Liberia. Built for the World.</p>
          <p className="text-[9px] text-muted-foreground mt-1">© 2025–2026 Media Tech Liberia. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
