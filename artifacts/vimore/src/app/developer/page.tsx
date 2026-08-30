"use client";

import { useEffect, useState } from "react";
import { usePosts } from "@/context/PostContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Code2, Copy, Check, Plus, Trash2, ExternalLink, Globe, ChevronRight,
  Loader2, ShieldCheck, AlertTriangle, X, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface OAuthApp {
  $id: string;
  client_id: string;
  name: string;
  description: string;
  logo_url: string;
  website_url: string;
  redirect_uris: string[];
  created_at: string;
}

interface NewCredentials {
  client_id: string;
  client_secret: string;
}

export default function DeveloperPage() {
  const { currentUser } = usePosts();
  const { toast } = useToast();

  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCreds, setNewCreds] = useState<NewCredentials | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    website_url: "",
    redirect_uris: "",
  });

  useEffect(() => {
    if (currentUser?.$id) fetchApps();
  }, [currentUser?.$id]);

  async function fetchApps() {
    setLoading(true);
    try {
      const res = await fetch(`/api/oauth/clients?owner_id=${currentUser!.$id}`);
      const data = await res.json();
      setApps(data.clients || []);
    } catch {
      toast({ title: "Failed to load apps", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const uris = form.redirect_uris.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!form.name || !uris.length) {
      toast({ title: "App name and at least one redirect URI are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/oauth/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          logo_url: form.logo_url,
          website_url: form.website_url,
          redirect_uris: uris,
          owner_id: currentUser!.$id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewCreds({ client_id: data.client_id, client_secret: data.client_secret });
      setShowCreate(false);
      setForm({ name: "", description: "", logo_url: "", website_url: "", redirect_uris: "" });
      fetchApps();
    } catch (err: any) {
      toast({ title: err?.message || "Failed to create app", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(app: OAuthApp) {
    if (!confirm(`Delete "${app.name}"? This cannot be undone.`)) return;
    setDeletingId(app.$id);
    try {
      const res = await fetch("/api/oauth/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: app.$id, owner_id: currentUser!.$id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setApps((prev) => prev.filter((a) => a.$id !== app.$id));
      toast({ title: `"${app.name}" deleted` });
    } catch {
      toast({ title: "Failed to delete app", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Developer Portal</h1>
              <p className="text-xs text-muted-foreground">Build apps that use Sign in with ViMore</p>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-black">How Sign in with ViMore works</p>
          </div>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Register your app below to get a <strong>client_id</strong> and <strong>client_secret</strong></li>
            <li>Send users to: <code className="bg-muted px-1 rounded text-[10px]">vimore.cfd/oauth/authorize?client_id=...&redirect_uri=...&scope=profile&response_type=code</code></li>
            <li>User approves → you receive a <strong>code</strong> at your redirect URI</li>
            <li>Exchange the code for an <strong>access_token</strong> via <code className="bg-muted px-1 rounded text-[10px]">POST /api/oauth/token</code></li>
            <li>Fetch the user profile via <code className="bg-muted px-1 rounded text-[10px]">GET /api/oauth/userinfo</code></li>
          </ol>
        </div>

        <Link href="/developer/sdk">
          <div className="bg-gradient-to-r from-violet-600 to-primary rounded-2xl p-4 flex items-center gap-4 group hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">Sign in with ViMore — Button & SDK</p>
              <p className="text-[10px] text-white/70 font-bold">Copy-paste code for HTML, React, Next.js & Vanilla JS</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/60 flex-shrink-0" />
          </div>
        </Link>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Your Apps</h2>
          <Button
            size="sm"
            className="rounded-2xl h-9 font-black uppercase text-xs tracking-wider gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" /> New App
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto">
              <Code2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-black uppercase text-sm">No apps yet</p>
            <p className="text-xs text-muted-foreground">Create your first app to get started</p>
            <Button size="sm" className="rounded-2xl gap-2" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Create App
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => (
              <div key={app.$id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {app.logo_url ? (
                      <img src={app.logo_url} alt={app.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-primary text-sm">{app.name[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate">{app.name}</p>
                    {app.website_url && (
                      <a href={app.website_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary">
                        <Globe className="h-3 w-3" />{app.website_url}
                      </a>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                    disabled={deletingId === app.$id}
                    onClick={() => handleDelete(app)}
                  >
                    {deletingId === app.$id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Client ID</span>
                    <button onClick={() => copyText(app.client_id, app.$id + "_id")}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      {copiedKey === app.$id + "_id" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <code className="text-xs font-mono break-all">{app.client_id}</code>
                </div>

                {app.redirect_uris?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Redirect URIs</p>
                    {app.redirect_uris.map((uri, i) => (
                      <p key={i} className="text-xs font-mono text-muted-foreground truncate">{uri}</p>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Created {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Register New App</DialogTitle>
            <DialogDescription>Create an OAuth app to use Sign in with ViMore.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest">App Name *</Label>
              <Input placeholder="My App" className="rounded-xl"
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest">Description</Label>
              <Input placeholder="What does your app do?" className="rounded-xl"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest">Website URL</Label>
              <Input placeholder="https://myapp.com" className="rounded-xl"
                value={form.website_url} onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest">Logo URL</Label>
              <Input placeholder="https://myapp.com/logo.png" className="rounded-xl"
                value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest">Redirect URIs * (one per line)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={"https://myapp.com/auth/callback\nhttp://localhost:3000/auth/callback"}
                value={form.redirect_uris}
                onChange={(e) => setForm((f) => ({ ...f, redirect_uris: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">These are the URLs ViMore will send users back to after they approve.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1 rounded-2xl font-black" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create App"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newCreds} onOpenChange={() => setNewCreds(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" /> App Created!
            </DialogTitle>
            <DialogDescription>
              Save your client secret now — it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          {newCreds && (
            <div className="space-y-4 pt-2">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Copy your <strong>Client Secret</strong> now. For security, we don't store it and can't show it again.
                </p>
              </div>

              {[
                { label: "Client ID", value: newCreds.client_id, key: "cid" },
                { label: "Client Secret", value: newCreds.client_secret, key: "csec" },
              ].map(({ label, value, key }) => (
                <div key={key} className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
                    <button onClick={() => copyText(value, key)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {copiedKey === key ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <code className="text-xs font-mono break-all block">{value}</code>
                </div>
              ))}

              <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorization URL</p>
                <code className="text-[10px] font-mono break-all text-muted-foreground block">
                  {`https://vimore.cfd/oauth/authorize?client_id=${newCreds.client_id}&redirect_uri=YOUR_REDIRECT_URI&scope=profile+email&response_type=code`}
                </code>
                <button onClick={() => copyText(
                  `https://vimore.cfd/oauth/authorize?client_id=${newCreds.client_id}&redirect_uri=YOUR_REDIRECT_URI&scope=profile+email&response_type=code`,
                  "authurl"
                )} className="text-[10px] text-primary flex items-center gap-1">
                  {copiedKey === "authurl" ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy URL</>}
                </button>
              </div>

              <Button className="w-full rounded-2xl font-black" onClick={() => setNewCreds(null)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
