
"use client";

import { ArrowLeft, Gavel, CheckCircle2, ShieldAlert, Zap, Globe, Rocket, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F2ECF7] dark:bg-[#050505] transition-colors duration-500 flex flex-col relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-accent/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <header className="h-20 px-6 flex items-center justify-between bg-white/40 dark:bg-card/40 backdrop-blur-xl border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-black italic uppercase tracking-widest leading-tight">Terms of Service</h1>
            <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Network Social Contract</span>
          </div>
        </div>
        <div className="h-10 w-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
          <Scale className="h-6 w-6" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 sm:p-12 relative z-10">
        <div className="max-w-3xl mx-auto space-y-12 pb-32">
          
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-accent">
              <Gavel className="h-6 w-6" />
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">The Handshake Agreement</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              By materializing an account on ViMore, you enter into a binding social contract with <strong>Media Tech Liberia (MTL)</strong>. You agree to uphold the high-velocity integrity of our global network and comply with all architectural protocols.
            </p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">Effective Date: April 14, 2026 | Revision v1.0</p>
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest italic">Media Tech Liberia · Founded December 19, 2025</p>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-black italic uppercase tracking-widest border-b border-accent/10 pb-2">1. Eligibility & Identity</h3>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>• You must be at least 13 solar years of age to synchronize with this network.</p>
              <p>• Your digital signature must be authentic. Creating a node for impersonation or deceptive purposes will result in an immediate <strong>Administrative Purge</strong>.</p>
              <p>• You are the sole architect of your account security. Media Tech Liberia is not liable for unauthorized vault access resulting from weak security signatures (passwords).</p>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-black italic uppercase tracking-widest border-b border-accent/10 pb-2">2. Harmonic Conduct</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-destructive/5 border border-destructive/10 rounded-2xl space-y-3">
                <h4 className="font-bold text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Prohibited Pulses
                </h4>
                <ul className="text-xs space-y-2 font-medium uppercase tracking-tight">
                  <li>— Harassment or toxic vibrations</li>
                  <li>— Materializing illegal content</li>
                  <li>— Attempting to disrupt cluster stability</li>
                  <li>— Unauthorized data scraping</li>
                </ul>
              </div>
              <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-2xl space-y-3">
                <h4 className="font-bold text-green-600 flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Healthy Handshakes
                </h4>
                <ul className="text-xs space-y-2 font-medium uppercase tracking-tight">
                  <li>— Original human expression</li>
                  <li>— High-velocity collaboration</li>
                  <li>— Mutual support via gifting</li>
                  <li>— Positive community engagement</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-black italic uppercase tracking-widest border-b border-accent/10 pb-2">3. Content Sovereignty</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You retain full ownership of the vibes you materialize. However, to synchronize them with the global cluster, you grant ViMore and MTL a non-exclusive, global license to host, archive, and display your content for the purpose of platform operation.
            </p>
            <div className="p-6 bg-accent/5 border border-accent/10 rounded-2xl flex gap-4">
              <Zap className="h-6 w-6 text-accent shrink-0" />
              <p className="text-xs font-bold text-muted-foreground leading-relaxed uppercase tracking-tight">
                WE DO NOT SELL YOUR CONTENT NODES TO EXTERNAL DATA BROKERS. YOUR EXPRESSION REMAINS WITHIN THE SOVEREIGN VAULT.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-black italic uppercase tracking-widest border-b border-accent/10 pb-2">4. Terminal Severance</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MTL reserves the right to neutralize any node that violates the Social Contract. This includes temporary suspension of pulses or permanent identity deletion. You may also sever your own connection anytime via the System Core settings.
            </p>
          </section>

          <section className="p-8 bg-[#050505] rounded-[2.5rem] border border-white/10 text-center space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Legal Jurisdiction</h3>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em]">Governed by the Sovereign Laws of Liberia</p>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-md mx-auto">
              Any disputes regarding this handshake will be resolved through arbitration nodes in the city of Monrovia, Liberia.
            </p>
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mb-1">Architecture by</p>
              <p className="text-lg font-black italic uppercase tracking-widest text-white">Media Tech Liberia</p>
            </div>
          </section>

        </div>
      </main>

      <footer className="h-16 flex items-center justify-center bg-white/20 dark:bg-black/20 shrink-0">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">ViMore v1.5.0 • Legal Node v1.0</p>
      </footer>
    </div>
  );
}
