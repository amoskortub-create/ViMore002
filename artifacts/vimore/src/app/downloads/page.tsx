import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Download, ShieldCheck, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "Downloads | ViMore",
  description: "Download ViMore for Android and discover the next generation of social apps from Media Tech Liberia.",
};

const apps = [
  {
    name: "ViMore",
    version: "1.0.2",
    platform: "Android",
    size: "14 MB",
    description: "Social, music, marketplace, reels, and messaging in one data-light community app.",
    href: "/downloads/vimore.apk",
    available: true,
  },
  {
    name: "More apps coming",
    version: "Soon",
    platform: "Android",
    size: "Coming soon",
    description: "A growing collection of focused tools from the Media Tech Liberia team.",
    href: "#",
    available: false,
  },
];

export default function DownloadsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#101014] text-white selection:bg-fuchsia-400 selection:text-black">
      <div className="relative isolate">
        <div className="pointer-events-none absolute -top-48 right-[-12rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="pointer-events-none absolute left-[-16rem] top-[32rem] -z-10 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-3xl" />

        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="ViMore home">
            <Image src="/icons/icon-192.png" alt="ViMore" width={42} height={42} className="rounded-xl" priority />
            <span className="text-lg font-black tracking-[-0.04em]">ViMore</span>
          </Link>
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.28em] text-white/45 sm:block">Media Tech Liberia</span>
        </nav>

        <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 lg:px-10 lg:pb-24 lg:pt-20">
          <div className="max-w-3xl">
            <p className="mb-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-fuchsia-300">
              <span className="h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_18px_rgba(240,171,252,0.9)]" />
              Official app downloads
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.07em] sm:text-7xl lg:text-8xl">
              Take your world with you.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              ViMore brings people, ideas, music, and local commerce together. Download the official Android app and stay connected to the community wherever you go.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {apps.map((app) => (
              <article key={app.name} className={`relative overflow-hidden rounded-[2rem] border p-6 transition-colors ${app.available ? "border-white/15 bg-white/[0.08]" : "border-white/8 bg-white/[0.03]"}`}>
                {app.available && <div className="absolute right-6 top-6 rounded-full bg-emerald-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Available now</div>}
                <div className="flex min-h-[15rem] flex-col justify-between">
                  <div>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${app.available ? "bg-fuchsia-400" : "bg-white/10"}`}>
                        {app.available ? <Image src="/icons/icon-192.png" alt="" width={52} height={52} className="rounded-xl" /> : <Smartphone className="h-7 w-7 text-white/35" />}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-[-0.05em]">{app.name}</h2>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{app.platform} · v{app.version}</p>
                      </div>
                    </div>
                    <p className="mt-7 max-w-md text-sm leading-6 text-white/55">{app.description}</p>
                  </div>
                  <div className="mt-8 flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-white/35">{app.size}</span>
                    {app.available ? (
                      <a href={app.href} download className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black text-[#101014] transition-transform hover:-translate-y-0.5" aria-label="Download ViMore APK">
                        <Download className="h-4 w-4" />
                        Download APK
                      </a>
                    ) : (
                      <span className="rounded-full border border-white/10 px-5 py-3 text-xs font-bold text-white/30">In development</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/8 bg-white/[0.025]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1fr_1.4fr] lg:px-10 lg:py-20">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Why ViMore</p>
              <h2 className="mt-4 max-w-sm text-3xl font-black leading-tight tracking-[-0.05em]">Built for connection. Designed for real life.</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                ["Connect", "Find your people, share moments, and keep conversations moving."],
                ["Create", "Publish posts, reels, music, and ideas that deserve a place to grow."],
                ["Discover", "Explore local stores, creators, culture, and opportunities in one place."],
              ].map(([title, text]) => (
                <div key={title}>
                  <Check className="h-5 w-5 text-fuchsia-300" />
                  <h3 className="mt-4 text-sm font-black uppercase tracking-[0.14em]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/45">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>ViMore is a Media Tech Liberia product.</p>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Official release</span>
            <Link href="/" className="inline-flex items-center gap-1 font-bold text-white/70 hover:text-white">Visit ViMore <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </footer>
      </div>
    </main>
  );
}