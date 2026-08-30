"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { account, databases, DATABASE_ID, COL } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, X, Check, AlertTriangle } from "lucide-react";
import Image from "next/image";

const SCOPE_LABELS: Record<string, string> = {
  profile: "Access your name, username, and profile picture",
  email: "Access your email address",
  "read:posts": "Read your public posts and activity",
};

export default function OAuthAuthorizePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const client_id = searchParams.get("client_id") || "";
  const redirect_uri = searchParams.get("redirect_uri") || "";
  const scope = searchParams.get("scope") || "profile";
  const state = searchParams.get("state") || "";
  const response_type = searchParams.get("response_type") || "";

  const [status, setStatus] = useState<"loading" | "ready" | "error" | "submitting">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [clientInfo, setClientInfo] = useState<{ name: string; logo_url: string; website_url: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ $id: string; name: string } | null>(null);

  useEffect(() => {
    async function init() {
      if (!client_id || !redirect_uri || response_type !== "code") {
        setErrorMsg("Invalid OAuth request. Missing required parameters.");
        setStatus("error");
        return;
      }

      try {
        const user = await account.get();
        setCurrentUser({ $id: user.$id, name: user.name });
      } catch {
        const params = new URLSearchParams(window.location.search);
        router.replace(`/login?next=/oauth/authorize%3F${params.toString()}`);
        return;
      }

      try {
        const res = await fetch(`/api/oauth/clients?owner_id=_lookup_&client_id=${client_id}`);
        const clientRes = await fetch(`/api/oauth/clients/info?client_id=${client_id}`);
        if (clientRes.ok) {
          const data = await clientRes.json();
          setClientInfo(data);
        } else {
          const db = databases;
          const result = await db.listDocuments(DATABASE_ID, "oauth_clients", [
            Query.equal("client_id", client_id),
            Query.limit(1),
          ]);
          if (!result.documents.length) {
            setErrorMsg("Unknown application. The client_id is not registered.");
            setStatus("error");
            return;
          }
          const doc = result.documents[0];
          const uris: string[] = Array.isArray(doc.redirect_uris) ? doc.redirect_uris : [];
          if (!uris.includes(redirect_uri)) {
            setErrorMsg("Redirect URI does not match any registered URI for this app.");
            setStatus("error");
            return;
          }
          setClientInfo({ name: doc.name, logo_url: doc.logo_url || "", website_url: doc.website_url || "" });
        }
        setStatus("ready");
      } catch (err: any) {
        setErrorMsg("Could not verify the application. Please try again.");
        setStatus("error");
      }
    }
    init();
  }, [client_id, redirect_uri, response_type, router]);

  const scopes = scope.split(" ").filter((s) => SCOPE_LABELS[s]);

  async function handleApprove() {
    if (!currentUser) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/oauth/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id, redirect_uri, scope, state, user_id: currentUser.$id }),
      });
      const data = await res.json();
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        setErrorMsg(data.error || "Authorization failed.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  function handleDeny() {
    const url = new URL(redirect_uri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F2ECF7] dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#F2ECF7] dark:bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#111] rounded-3xl p-8 max-w-sm w-full shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Authorization Error</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button variant="outline" className="w-full rounded-2xl" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2ECF7] dark:bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#111] rounded-3xl p-8 max-w-sm w-full shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
            {clientInfo?.logo_url ? (
              <img src={clientInfo.logo_url} alt={clientInfo.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-primary">{clientInfo?.name?.[0] ?? "?"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base truncate">{clientInfo?.name}</p>
            {clientInfo?.website_url && (
              <p className="text-xs text-muted-foreground truncate">{clientInfo.website_url}</p>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-black text-xs">VM</span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold">
            <span className="text-primary">{clientInfo?.name}</span> wants to access your ViMore account
          </p>
          <p className="text-xs text-muted-foreground">Signed in as <strong>{currentUser?.name}</strong></p>
        </div>

        <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Permissions requested</p>
          {scopes.length > 0 ? scopes.map((s) => (
            <div key={s} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <p className="text-sm">{SCOPE_LABELS[s]}</p>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">Basic profile access</p>
          )}
        </div>

        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/10 rounded-2xl p-3">
          <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">
            ViMore will never share your password with third-party apps.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="rounded-2xl h-12 font-black uppercase text-xs tracking-wider border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={handleDeny}
            disabled={status === "submitting"}
          >
            <X className="h-4 w-4 mr-1" /> Deny
          </Button>
          <Button
            className="rounded-2xl h-12 font-black uppercase text-xs tracking-wider bg-primary"
            onClick={handleApprove}
            disabled={status === "submitting"}
          >
            {status === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><Check className="h-4 w-4 mr-1" /> Allow</>
            )}
          </Button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          By allowing, you agree to share the requested info with {clientInfo?.name}.
          You can revoke access any time from your ViMore settings.
        </p>
      </div>
    </div>
  );
}
