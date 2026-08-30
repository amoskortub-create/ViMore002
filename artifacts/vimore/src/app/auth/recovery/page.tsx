
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Lock, 
  CheckCircle2, 
  Loader2, 
  Zap, 
  ShieldCheck, 
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePosts } from "@/context/PostContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

function RecoveryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPassword, triggerHaptic } = usePosts();
  const { toast } = useToast();

  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!userId || !secret) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="h-20 w-20 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive">
          <ShieldCheck className="h-10 w-10 opacity-40" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Invalid Handshake</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold max-w-xs">This recovery pulse is incomplete or expired.</p>
        </div>
        <Link href="/"><Button variant="outline" className="border-white/10 text-white rounded-xl h-12 px-8 uppercase font-black text-[10px]">Return to Entry</Button></Link>
      </div>
    );
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Signatures do not match." });
      return;
    }

    setIsLoading(true);
    triggerHaptic(30);

    try {
      await resetPassword(userId, secret, password);
      setIsSuccess(true);
      triggerHaptic(100);
      toast({ title: "Signature Rotated", description: "Your vault access has been restored." });
      setTimeout(() => router.push("/"), 3000);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Handshake Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/20 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-10 animate-in fade-in zoom-in-95 duration-700">
        <header className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Vault Recovery</h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Signature Rotation Active</p>
          </div>
        </header>

        {isSuccess ? (
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 text-center space-y-6 animate-in zoom-in">
            <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-green-500/20">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase text-white">Sync Confirmed</h2>
              <p className="text-sm text-white/40 font-medium uppercase tracking-widest leading-relaxed">
                Your new security signature is now active. Returning to entry node...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-white/40 ml-1">New Signature (Password)</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-white/5 border-none rounded-xl text-white font-bold"
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Confirm Signature</Label>
                <Input 
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-14 bg-white/5 border-none rounded-xl text-white font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading || !password} className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-[0.2em] text-lg shadow-2xl transition-all active:scale-95">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Rotate Signature"}
            </Button>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <p className="text-[9px] font-bold text-primary/60 uppercase leading-relaxed tracking-tighter text-center">
                This action will materialize a new spatial access key and purge all other active sessions.
              </p>
            </div>
          </form>
        )}

        <footer className="text-center opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white">ViMore Security Cluster v1.5</p>
        </footer>
      </div>
    </div>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>}>
      <RecoveryContent />
    </Suspense>
  );
}
