"use client";

import { useState } from "react";
import {
  ArrowLeft, Copy, Check, Code2, Globe, Zap,
  ChevronRight, ExternalLink, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInWithViMore } from "@/components/oauth/SignInWithViMore";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DEMO_CLIENT_ID = "vimore_YOUR_CLIENT_ID";
const DEMO_REDIRECT = "https://yourapp.com/auth/callback";

type Tab = "html" | "react" | "nextjs" | "vanilla";
type Variant = "purple" | "white";
type Size = "sm" | "md" | "lg";

const HTML_SNIPPET = (clientId: string, redirect: string) =>
  `<!-- 1. Add the SDK script once, before </body> -->
<script src="https://vimore.cfd/sdk/vimore-auth.js"></script>

<!-- 2. Drop the button anywhere in your HTML -->
<div
  data-vimore-client-id="${clientId}"
  data-vimore-redirect-uri="${redirect}"
  data-vimore-scope="profile email"
  data-vimore-label="Sign in with ViMore"
></div>

<!-- That's it! The SDK auto-renders the button. -->`;

const REACT_SNIPPET = (clientId: string, redirect: string) =>
  `// 1. Copy SignInWithViMore.tsx into your project
//    (get it from: vimore.cfd/developer/sdk)

// 2. Use it in any component
import { SignInWithViMore } from "./SignInWithViMore";

export default function LoginPage() {
  return (
    <SignInWithViMore
      clientId="${clientId}"
      redirectUri="${redirect}"
      scope="profile email"
      label="Sign in with ViMore"
      size="md"        // "sm" | "md" | "lg"
      variant="purple" // "purple" | "white"
    />
  );
}`;

const NEXTJS_SNIPPET = (clientId: string, redirect: string) =>
  `// pages/api/auth/callback.ts  (or app/auth/callback/route.ts)
// Exchange the code for a token on your server
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  const res = await fetch("https://vimore.cfd/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: "${redirect}",
      client_id: "${clientId}",
      client_secret: process.env.VIMORE_CLIENT_SECRET,
    }),
  });

  const { access_token } = await res.json();

  // Fetch user profile
  const user = await fetch("https://vimore.cfd/api/oauth/userinfo", {
    headers: { Authorization: \`Bearer \${access_token}\` },
  }).then((r) => r.json());

  // user = { sub, name, username, picture, email, verified }
  // → create your own session here
}`;

const VANILLA_SNIPPET = (clientId: string, redirect: string) =>
  `<script src="https://vimore.cfd/sdk/vimore-auth.js"></script>
<script>
  // Programmatic usage
  const btn = ViMoreAuth.createButton({
    clientId: "${clientId}",
    redirectUri: "${redirect}",
    scope: "profile email",
    label: "Sign in with ViMore",
    variant: "purple", // "purple" | "white"
    size: "md",        // "sm" | "md" | "lg"
    popup: false,      // open in popup window instead of redirect
    container: "#login-container", // CSS selector or DOM element
  });
</script>

<div id="login-container"></div>`;

function CodeBlock({ code, id }: { code: string; id: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Code</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors"
        >
          {copied ? <><Check className="h-3 w-3 text-green-400" /><span className="text-green-400">Copied</span></> : <><Copy className="h-3 w-3" />Copy</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[11px] leading-relaxed text-white/75 font-mono whitespace-pre">{code}</pre>
    </div>
  );
}

export default function SdkPage() {
  const [activeTab, setActiveTab] = useState<Tab>("html");
  const [previewVariant, setPreviewVariant] = useState<Variant>("purple");
  const [previewSize, setPreviewSize] = useState<Size>("md");
  const [copiedDownload, setCopiedDownload] = useState(false);

  function copyComponentFile() {
    fetch("/sdk/vimore-auth.js")
      .then((r) => r.text())
      .then((text) => {
        navigator.clipboard.writeText(text);
        setCopiedDownload(true);
        setTimeout(() => setCopiedDownload(false), 2000);
      });
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "html", label: "HTML", icon: <Globe className="h-3.5 w-3.5" /> },
    { id: "react", label: "React", icon: <Code2 className="h-3.5 w-3.5" /> },
    { id: "nextjs", label: "Next.js", icon: <Zap className="h-3.5 w-3.5" /> },
    { id: "vanilla", label: "Vanilla JS", icon: <Package className="h-3.5 w-3.5" /> },
  ];

  const snippets: Record<Tab, string> = {
    html: HTML_SNIPPET(DEMO_CLIENT_ID, DEMO_REDIRECT),
    react: REACT_SNIPPET(DEMO_CLIENT_ID, DEMO_REDIRECT),
    nextjs: NEXTJS_SNIPPET(DEMO_CLIENT_ID, DEMO_REDIRECT),
    vanilla: VANILLA_SNIPPET(DEMO_CLIENT_ID, DEMO_REDIRECT),
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#050505] pb-24">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-border h-16 px-4 flex items-center gap-4">
        <Link href="/developer">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary/80 active:scale-90 transition-all">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div className="flex flex-col">
          <h1 className="text-lg font-black italic uppercase tracking-tighter text-foreground leading-tight">SDK & Button</h1>
          <div className="flex items-center gap-2">
            <Code2 className="h-3 w-3 text-primary" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Sign in with ViMore</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-10">

        {/* Hero */}
        <section className="bg-gradient-to-br from-primary via-primary to-violet-800 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Code2 className="h-40 w-40" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 h-6 text-[10px] font-black uppercase tracking-widest">
              One line of code
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-tight">
              Sign in with<br />ViMore — anywhere
            </h2>
            <p className="text-sm text-white/70 max-w-xs">
              Drop a script tag or import a component. Users click, approve, and your app gets their profile. Done.
            </p>
          </div>
        </section>

        {/* Live Preview */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Live Preview</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-8 space-y-6">

            <div className="flex items-center justify-center min-h-[80px] rounded-2xl bg-[#F0F2F5] dark:bg-[#0a0a0a]">
              <SignInWithViMore
                clientId={DEMO_CLIENT_ID}
                redirectUri={DEMO_REDIRECT}
                scope="profile email"
                variant={previewVariant}
                size={previewSize}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Variant</p>
                <div className="flex gap-2">
                  {(["purple", "white"] as Variant[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPreviewVariant(v)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        previewVariant === v
                          ? "bg-primary text-white border-primary"
                          : "bg-secondary/40 text-muted-foreground border-transparent hover:border-border"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Size</p>
                <div className="flex gap-2">
                  {(["sm", "md", "lg"] as Size[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPreviewSize(s)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        previewSize === s
                          ? "bg-primary text-white border-primary"
                          : "bg-secondary/40 text-muted-foreground border-transparent hover:border-border"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Snippets */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Integration Code</h3>

          <div className="flex gap-1 p-1.5 bg-secondary/40 rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === tab.id
                    ? "bg-white dark:bg-zinc-800 text-primary shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <CodeBlock code={snippets[activeTab]} id={activeTab} />

          {activeTab === "react" && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
              <div className="text-amber-600 text-sm font-black mt-0.5">💡</div>
              <div className="space-y-2">
                <p className="text-xs font-black text-amber-700 dark:text-amber-400">Get the React component file</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-500">Copy the full component source (no npm install needed):</p>
                <button
                  onClick={copyComponentFile}
                  className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  {copiedDownload ? <><Check className="h-3 w-3" /> Copied SDK source</> : <><Copy className="h-3 w-3" /> Copy vimore-auth.js</>}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">How it works</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 space-y-0">
            {[
              {
                step: "1",
                title: "User clicks the button",
                desc: "They're sent to vimore.cfd/oauth/authorize with your client_id and redirect_uri.",
              },
              {
                step: "2",
                title: "User approves on ViMore",
                desc: "ViMore shows a branded consent screen. The user logs in (if needed) and taps Allow.",
              },
              {
                step: "3",
                title: "ViMore redirects back with a code",
                desc: "Your redirect_uri receives ?code=abc123. The code expires in 10 minutes.",
              },
              {
                step: "4",
                title: "Exchange code for an access token",
                desc: "Your server calls POST /api/oauth/token with the code, client_id, and client_secret.",
              },
              {
                step: "5",
                title: "Fetch the user's profile",
                desc: "Call GET /api/oauth/userinfo with Authorization: Bearer <token> to get name, username, avatar, and email.",
              },
            ].map((item, i, arr) => (
              <div key={item.step} className={cn("flex gap-4 py-5", i < arr.length - 1 && "border-b border-border")}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-black text-primary">{item.step}</span>
                </div>
                <div className="space-y-0.5">
                  <p className="font-black text-sm">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Scopes */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Available Scopes</h3>
          <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 overflow-hidden">
            {[
              { scope: "profile", fields: "name, username, picture, verified", desc: "Basic identity — always include this." },
              { scope: "email", fields: "email", desc: "The user's email address." },
              { scope: "read:posts", fields: "posts, activity", desc: "Read the user's public posts." },
            ].map((row, i, arr) => (
              <div key={row.scope} className={cn("flex items-start gap-4 p-5", i < arr.length - 1 && "border-b border-border")}>
                <code className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5">{row.scope}</code>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{row.fields}</p>
                  <p className="text-[11px] text-muted-foreground">{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Token response */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Token & UserInfo Response</h3>
          <div className="space-y-3">
            <CodeBlock
              id="token-resp"
              code={`// POST /api/oauth/token → response
{
  "access_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "scope": "profile email"
}`}
            />
            <CodeBlock
              id="userinfo-resp"
              code={`// GET /api/oauth/userinfo → response
{
  "sub": "user_id_from_vimore",
  "name": "Amos Kortu",
  "username": "amoskortub",
  "picture": "https://mediatechliberia.online/v1/storage/...",
  "verified": true,
  "email": "amoskortub@gmail.com"
}`}
            />
          </div>
        </section>

        {/* CTA */}
        <section>
          <Link href="/developer">
            <div className="bg-white dark:bg-card rounded-[2.5rem] border border-border shadow-xl shadow-black/5 p-6 flex items-center gap-4 hover:bg-secondary/20 transition-all group">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Code2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-black">Register your app</p>
                <p className="text-[11px] text-muted-foreground">Get your client_id and client_secret from the Developer Portal.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
            </div>
          </Link>
        </section>

        <div className="opacity-30 text-center pt-2">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">ViMore OAuth SDK v1.0</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-primary italic">© 2026 ViMore by Media Tech Liberia</p>
        </div>
      </main>
    </div>
  );
}
