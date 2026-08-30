
"use client";

import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Gem, 
  ShieldCheck, 
  ChevronRight, 
  Trash2, 
  Clock, 
  Star,
  Zap,
  CheckCircle2,
  Lock,
  User,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProfileLoading from "@/app/profile/loading";

export default function SubscriptionsVault() {
  const { currentUser, connections, activeSubscriptions, cancelSubscription, triggerHaptic, isLoading } = usePosts();
  const { currentTrack, isExpanded } = useMusic();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [cancellingUsername, setCancellingUsername] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isPlayerActive = currentTrack && !isExpanded;

  const subscribedCreators = useMemo(() => {
    if (!currentUser || !connections) return [];
    return connections.filter(c => activeSubscriptions.has(c.username));
  }, [connections, activeSubscriptions, currentUser]);

  if (isLoading || !currentUser) {
    return <ProfileLoading />;
  }

  const handleCancelRequest = (username: string) => {
    triggerHaptic(15);
    setCancellingUsername(username);
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingUsername) return;
    
    setIsProcessing(true);
    triggerHaptic(50);

    try {
      await cancelSubscription(cancellingUsername);
      toast({ 
        title: "Node Severed", 
        description: `Your Premium Loop with @${cancellingUsername} has been deactivated.` 
      });
      setCancellingUsername(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Protocol Error", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#050505] transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary/80 active:scale-90 transition-all">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-black italic uppercase tracking-tighter text-foreground leading-tight">Subscription Vault</h1>
            <div className="flex items-center gap-2">
              <Gem className="h-3 w-3 text-cyan-500" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active Creator Loops</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black uppercase px-2 h-5">v1.5-HD</Badge>
      </header>

      <main className={cn(
        "max-w-xl mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32",
        "pt-4"
      )}>
        
        <section className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 text-center space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <ShieldCheck className="h-24 w-24 text-primary" />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="h-16 w-16 bg-primary rounded-[1.5rem] flex items-center justify-center text-white mx-auto shadow-2xl">
              <Gem className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Premium Clusters</h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest max-w-[280px] mx-auto">
              Manage your high-fidelity connections and exclusive content access.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Active Handshakes ({subscribedCreators.length})</h3>
            <span className="text-[9px] font-black text-primary uppercase">Syncing Live</span>
          </div>

          <div className="space-y-3">
            {subscribedCreators.length > 0 ? subscribedCreators.map((creator) => (
              <div 
                key={creator.username}
                className="bg-white dark:bg-card border border-primary/5 rounded-[2rem] p-5 shadow-xl shadow-black/5 flex flex-col gap-6 group hover:border-primary/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link href={`/profile/${creator.username}`}>
                      <Avatar className="h-14 w-14 border-2 border-primary/10 group-hover:scale-105 transition-transform">
                        <AvatarImage src={creator.avatar} />
                        <AvatarFallback>{creator.name[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-base">{creator.name}</span>
                        {creator.isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-primary fill-primary text-white" />}
                      </div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">@{creator.username}</span>
                    </div>
                  </div>
                  <Badge className="bg-cyan-500/10 text-cyan-600 border-none font-black h-5 px-3 uppercase tracking-tighter">20 C / MO</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/20 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-muted-foreground uppercase">
                      <Clock className="h-2.5 w-2.5" /> Next Billing
                    </div>
                    <p className="text-xs font-bold uppercase tracking-tight">In 24 Days</p>
                  </div>
                  <div className="p-3 bg-secondary/20 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-muted-foreground uppercase">
                      <Zap className="h-2.5 w-2.5 text-primary" /> Tier Pulse
                    </div>
                    <p className="text-xs font-bold uppercase tracking-tight">VIP Elite</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Link href={`/profile/${creator.username}`} className="flex-1">
                    <Button variant="outline" className="w-full rounded-xl border-primary/10 font-black uppercase text-[10px] tracking-widest gap-2 h-11">
                      <User className="h-3.5 w-3.5" /> View Vibe Hub
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-11 w-11 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm"
                    onClick={() => handleCancelRequest(creator.username)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )) : (
              <div className="py-24 text-center bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-dashed border-primary/10 rounded-[2.5rem] space-y-6 opacity-40">
                <div className="h-16 w-16 bg-secondary/30 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">Vault Empty</h3>
                  <p className="text-sm font-medium uppercase tracking-widest">No active creator loops detected.</p>
                </div>
                <Link href="/explore">
                  <Button variant="outline" className="rounded-full border-primary text-primary font-black uppercase text-[10px] h-10 px-8">Find Creators</Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 pb-20">
          <div className="p-6 bg-secondary/10 border border-primary/5 rounded-[2rem] space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <h4 className="text-sm font-black italic uppercase tracking-widest">Billing Protocol</h4>
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed uppercase tracking-tight">
                  All Premium Loop subscriptions are billed in Credits. If your vault balance falls below the monthly energy threshold, the handshake will be automatically severed during the next sync cycle.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4 opacity-30 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Revenue Core v1.5</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-primary italic">Architecture by Media Tech Liberia</p>
          </div>
        </section>
      </main>

      <AlertDialog open={!!cancellingUsername} onOpenChange={(open) => !open && setCancellingUsername(null)}>
        <AlertDialogContent className="rounded-[2.5rem] sm:max-w-[420px] bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-3xl border-destructive/10 shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="font-black italic uppercase tracking-tighter text-3xl text-center">Sever Loop?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium leading-relaxed text-center px-4">
              Deactivating this loop will immediately remove your access to exclusive vibes and spatial nodes from <span className="font-bold text-foreground">@{cancellingUsername}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6 px-4 pb-2">
            <AlertDialogCancel className="rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] bg-secondary/50 border-none hover:bg-secondary transition-all">Abort</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancellation}
              className="rounded-2xl h-14 font-black italic uppercase tracking-[0.2em] text-[10px] bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20 transition-all active:scale-95"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Severance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
