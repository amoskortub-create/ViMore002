"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, ShieldCheck, Globe, Trash2, Loader2,
  Code2, AlertTriangle, Check, RefreshCcw, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import ProfileLoading from "@/app/profile/loading";

interface ConnectedApp {
  client_id: string;
  name: string;
  logo_url: string;
  website_url: string;
  scopes: string;
  granted_at: string;
  token_ids: string[];
}

const SCOPE_LABELS: Record<string, string> = {
  profile: "Profile",
  email: "Email",
  "read:posts": "Posts",
};

function ScopeTag({ scope }: { scope: string }) {
  return (
    <span className="inline-flex items-center px-2 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
      {SCOPE_LABELS[scope] ?? scope}
    </span>
  );
}

export default function ConnectedAppsPage() {
  const { currentUser, isLoading: contextLoading, triggerHaptic } = usePosts();
  const { currentTrack, isExpanded } = useMusic();
  const { toast } = useToast();

  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<ConnectedApp | null>(null);
  const [revoking, setRevoking] = useState(false);

  const isPlayerActive = currentTrack && !isExpanded;

  useEffect(() => {
    if (currentUser?.$id) fetchConnected();
  }, [currentUser?.$id]);

  async function fetchConnected() {
    setLoading(true);
    try {
      const res = await fetch(`/api/oauth/connected?user_id=${currentUser!.$id}`);
      const data = await res.json();
      setApps(data.connected || []);
    } catch {
      toast({ title: "Failed to load connected apps", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget || !currentUser) return;
    setRevoking(true);
    triggerHaptic(30);
    try {
      const res = await fetch("/api/oauth/connected", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: revokeTarget.client_id, user_id: currentUser.$id }),
      });
      if (!res.ok) throw new Error("Failed");
      setApps((prev) => prev.filter((a) => a.client_id !== revokeTarget.client_id));
      triggerHaptic(80);
      toast({ title: `Access revoked for "${revokeTarget.name}"` });
    } catch {
      toast({ title: "Failed to revoke access", variant: "destructive" });
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  }

  if (contextLoading || !currentUser) return <ProfileLoading />;

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
            <h1 className="text-lg font-black italic uppercase tracking-tighter text-foreground leading-tight">Connected Apps</h1>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Third-Party Access</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost" size="icon"
          className="rounded-full hover:bg-secondary/80 active:scale-90 transition-all"
          onClick={fetchConnected}
          disabled={loading}
        >
          <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </header>

      <main className={cn(
        "max-w-xl mx-auto p-4 sm:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32",
        "pt-4"
      )}>

        <section className="space-y-3">
          <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-5 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-black">Your account access</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                These apps have been granted access to your ViMore account. You can revoke any app's access at any time — this signs them out immediately and they cannot access your data again without your approval.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
            Active Connections {!loading && <span className="text-primary">· {apps.length}</span>}
          </h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Scanning access nodes...</p>
            </div>
          ) : apps.length === 0 ? (
            <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
                <Code2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-black uppercase tracking-tight">No connected apps</p>
                <p className="text-[11px] text-muted-foreground max-w-[220px]">
                  When you sign in to third-party apps using ViMore, they'll appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-2 space-y-1">
              {apps.map((app, idx) => {
                const scopes = app.scopes.split(" ").filter(Boolean);
                const grantedDate = app.granted_at
                  ? new Date(app.granted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  : null;

                return (
                  <div key={app.client_id}>
                    {idx > 0 && <div className="h-px bg-border mx-4" />}
                    <div className="flex items-start gap-4 p-4 rounded-2xl">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {app.logo_url ? (
                          <img src={app.logo_url} alt={app.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-black text-primary text-base">{app.name[0]?.toUpperCase()}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-black text-sm truncate">{app.name}</p>
                            {app.website_url && (
                              <a
                                href={app.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors w-fit"
                              >
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[140px]">{app.website_url.replace(/^https?:\/\//, "")}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 rounded-xl text-destructive hover:bg-destructive/10 font-black uppercase text-[9px] tracking-widest gap-1.5 flex-shrink-0"
                            onClick={() => { triggerHaptic(10); setRevokeTarget(app); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Revoke
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {scopes.map((s) => <ScopeTag key={s} scope={s} />)}
                        </div>

                        {grantedDate && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                            Access granted · {grantedDate}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Developers</h3>
          <Link href="/developer">
            <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-2">
              <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/40 transition-all group">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
                  <Code2 className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="font-bold text-sm">Developer Portal</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Register your own OAuth apps</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-muted" />
              </div>
            </div>
          </Link>
        </section>

        <div className="opacity-30 text-center pt-6">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Access Control v1.0</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-primary italic">© 2026 ViMore by Media Tech Liberia</p>
        </div>
      </main>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent className="rounded-[2.5rem] sm:max-w-[420px] bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-3xl border-destructive/10 shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="font-black italic uppercase tracking-tighter text-2xl text-center text-destructive">
              Revoke Access?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed text-center px-4">
              <strong>{revokeTarget?.name}</strong> will immediately lose access to your ViMore account. They cannot access your data again without your approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-4 px-4 pb-2">
            <AlertDialogCancel className="rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] bg-secondary/50 border-none hover:bg-secondary transition-all">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="rounded-2xl h-14 font-black italic uppercase tracking-widest text-[10px] bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20 transition-all active:scale-95"
            >
              {revoking ? <Loader2 className="h-5 w-5 animate-spin" /> : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
