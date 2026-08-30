
"use client";

import { useState, useEffect } from "react";
import { 
  Zap, 
  Mail, 
  Lock, 
  Loader2, 
  ShieldCheck, 
  User,
  Globe,
  Calendar,
  AlertTriangle,
  Smartphone,
  ArrowLeft,
  FileText,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePosts } from "@/context/PostContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const NATIONALITIES = [
  "Liberian", "American", "Nigerian", "Ghanian", "Guinean", "Sierra Leonean", "Ivory Coast", "European", "Asian", "Other"
];

export function AuthModal() {
  const { currentUser, login, signup, triggerHaptic } = usePosts();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("Liberian");
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');

  // ── Auto-open signup tab when ?signup=1 is in the URL ───────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('signup') === '1') {
        setMode('signup');
        setSignupStep(1);
      }
    }
  }, []);

  // Modal disappears when user is authenticated
  if (currentUser?.username && currentUser.username !== 'guest_node') return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    triggerHaptic(20);
    try {
      const res = await login(identifier, password);
      if (res.success) {
        toast({ title: "Identity Synced" });
      } else {
        setAuthError(res.message || "Credential handshake rejected.");
      }
    } catch (error: any) {
      setAuthError(String(error.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (signupStep === 1) {
      const isEmail = identifier.includes('@');
      const isPhone = /^\+?\d+$/.test(identifier.replace(/[-\s]/g, ''));

      if (!isEmail && !isPhone) {
        setAuthError("Invalid identifier pulse. Use Email or Phone (+231...).");
        return;
      }
      if (password.length < 8) {
        setAuthError("Security signature too weak. (Min 8 chars)");
        return;
      }
      if (!name.trim()) {
        setAuthError("Identity label (Name) is required.");
        return;
      }
      setSignupStep(2);
      triggerHaptic(10);
      return;
    }

    if (!dob) {
      setAuthError("Arrival date required for synchronization.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    triggerHaptic(30);
    
    try {
      const isEmail = identifier.includes('@');
      // Read referral from localStorage — stored when user clicked a referral link
      let referredBy: string | undefined;
      try { referredBy = localStorage.getItem('vimore_referrer') || undefined; } catch { /* ignore */ }

      const signupPayload = {
        email: isEmail ? identifier : undefined,
        phone: !isEmail ? identifier : undefined,
        password,
        name,
        dob,
        nationality,
        gender,
        referredBy,
      };

      const res = await signup(signupPayload);

      if (res && res.success) {
        // Clear the referral code after successful signup
        try { localStorage.removeItem('vimore_referrer'); } catch { /* ignore */ }
        toast({ title: "Welcome to ViMore", description: "Identity node materialized successfully." });
      } else {
        setAuthError(res?.message || "Identity node creation rejected.");
      }
    } catch (error: any) {
      console.error("[SIGNUP ERROR]", error);
      setAuthError("The network handshake encountered a stall. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#050505] flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center space-y-10 animate-in fade-in zoom-in-95 duration-700">
        
        <header className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl">
              <Zap className="h-10 w-10 fill-current" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">ViMore</h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">High-Velocity Identity Hub</p>
          </div>
        </header>

        <div className="w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          
          {authError && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 animate-in shake-vibe">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-destructive uppercase tracking-widest mb-1">VAULT REJECTION</span>
                <p className="text-[11px] font-bold text-destructive uppercase leading-tight tracking-tight">{authError}</p>
              </div>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Email or Phone Node</Label>
                  <div className="relative">
                    {identifier.includes('@') ? <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" /> : <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />}
                    <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-12 pl-11 bg-white/5 border-none rounded-xl text-white font-bold" placeholder="Email or Phone Number" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Security Signature</Label>
                  <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" /><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-11 bg-white/5 border-none rounded-xl text-white font-bold" placeholder="••••••••" /></div>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-[0.2em]">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sync Identity"}</Button>
              <div className="text-center"><button type="button" onClick={() => { setMode('signup'); setSignupStep(1); setAuthError(null); }} className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-primary transition-all">Materialize New Identity</button></div>
            </form>
          ) : (
            <form onSubmit={handleSignupInit} className="space-y-6 animate-in slide-in-from-bottom-4">
              {signupStep === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 bg-white/5 border-none rounded-xl text-white font-bold" placeholder="Your Full Name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Email or Phone</Label>
                    <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-12 bg-white/5 border-none rounded-xl text-white font-bold" placeholder="e.g. +231..." />
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-white/40 ml-1">Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-white/5 border-none rounded-xl text-white font-bold" placeholder="••••••••" /></div>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <button type="button" onClick={() => setSignupStep(1)} className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors mb-2"><ArrowLeft className="h-3 w-3" /> Back to Protocol</button>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-white/40 ml-1">Arrival Date (DOB)</Label><div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" /><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-12 pl-11 bg-white/5 border-none rounded-xl text-white font-bold" /></div></div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Nationality</Label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                      <select value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full h-12 pl-11 bg-white/5 border-none rounded-xl text-white font-bold appearance-none outline-none">
                        {NATIONALITIES.map(n => (<option key={n} value={n} className="bg-zinc-900">{n}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Gender Node</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setGender('Male')} className={cn("h-12 rounded-xl border-2 transition-all font-black uppercase text-[10px]", gender === 'Male' ? "bg-primary border-primary text-white" : "border-white/5 bg-white/5 text-white/40")}>Male</button>
                      <button type="button" onClick={() => setGender('Female')} className={cn("h-12 rounded-xl border-2 transition-all font-black uppercase text-[10px]", gender === 'Female' ? "bg-primary border-primary text-white" : "border-white/5 bg-white/5 text-white/40")}>Female</button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-[0.2em]">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : signupStep === 1 ? "Next Protocol" : "Materialize Identity"}</Button>
                {mode === 'signup' && (
                  <p className="text-[9px] text-white/30 text-center uppercase leading-relaxed px-4">
                    By materializing an identity, you agree to our <Link href="/terms" className="text-white/60 hover:text-primary underline">Terms of Service</Link> and <Link href="/privacy" className="text-white/60 hover:text-primary underline">Privacy Policy</Link>.
                  </p>
                )}
              </div>

              <div className="text-center"><button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setSignupStep(1); setAuthError(null); }} className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-primary transition-all">{mode === 'signup' ? 'Back to Sync' : 'Materialize New Identity'}</button></div>
            </form>
          )}
        </div>

        <footer className="w-full flex flex-col items-center gap-4 opacity-40">
          <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-primary" /><span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Command Cluster v1.5</span></div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[8px] font-black text-white/60 uppercase tracking-widest hover:text-primary transition-colors">Privacy Node</Link>
            <Link href="/terms" className="text-[8px] font-black text-white/60 uppercase tracking-widest hover:text-primary transition-colors">Terms Node</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
