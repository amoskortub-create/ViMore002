"use client";

import { usePosts } from "@/context/PostContext";
import { KineticSplashScreen } from "./kinetic-splash-screen";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const PUBLIC_PATHS = ["/login", "/signup", "/auth/", "/terms", "/privacy", "/child-safety", "/marketplace", "/join/", "/admin"];

function getActivePath(hookPath: string | null): string {
  if (typeof window !== 'undefined' && window.location.pathname) {
    return window.location.pathname;
  }
  if (hookPath) return hookPath;
  return '';
}

function isPublicActivePath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path.startsWith(p));
}

export function AppLoadingGate({ children }: { children: React.ReactNode }) {
  const { isLoading, initError, logout, triggerHaptic, currentUser } = usePosts();
  const router = useRouter();
  const pathname = usePathname();

  const mountedPath = useRef(getActivePath(pathname));
  useEffect(() => {
    const p = getActivePath(pathname);
    if (p) mountedPath.current = p;
  }, [pathname]);

  const activePath = getActivePath(pathname) || mountedPath.current;
  const isPublicPath = isPublicActivePath(activePath);

  const [isVisible, setIsVisible] = useState(true);
  const [shouldRenderSplash, setShouldRenderSplash] = useState(true);

  useEffect(() => {
    const current = getActivePath(pathname) || mountedPath.current;
    if (isPublicActivePath(current)) {
      setIsVisible(false);
      setShouldRenderSplash(false);
      return;
    }
    if (!isLoading && !initError) {
      setIsVisible(false);
      setShouldRenderSplash(false);
    }
  }, [isLoading, initError, pathname]);

  useEffect(() => {
    const current = getActivePath(pathname) || mountedPath.current;
    if (isPublicActivePath(current)) return;

    const fallbackTimer = setTimeout(() => {
      setIsVisible(false);
      setShouldRenderSplash(false);
    }, 8000);

    return () => clearTimeout(fallbackTimer);
  }, [pathname, isLoading, initError]);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      const current = getActivePath(pathname) || mountedPath.current;
      if (!current || isPublicActivePath(current)) return;
      router.replace('/login');
    }
  }, [isLoading, currentUser, pathname, router]);

  const handleReset = async () => {
    triggerHaptic(50);
    await logout();
    window.location.reload();
  };

  const showSplash = !isPublicPath && shouldRenderSplash;

  return (
    <>
      {showSplash && (
        <div className={cn(
          "fixed inset-0 z-[9999] transition-opacity duration-500 ease-in-out",
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {initError ? (
            <div className="min-h-screen bg-[#F2ECF7] dark:bg-[#050505] flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-700">
              <div className="relative">
                <div className="absolute -inset-8 bg-destructive/10 rounded-full blur-2xl animate-pulse" />
                <div className="h-24 w-24 bg-destructive/10 rounded-3xl flex items-center justify-center text-destructive relative z-10 border border-destructive/20 shadow-2xl">
                  <AlertTriangle className="h-12 w-12" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">Vault Sync Stalled</h2>
                <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-4 max-w-sm mx-auto">
                  <p className="text-[11px] font-bold text-destructive uppercase leading-relaxed tracking-tight">
                    {initError}
                  </p>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="rounded-2xl h-14 px-10 border-foreground/10 text-foreground font-black uppercase text-[10px] tracking-[0.3em] hover:bg-foreground hover:text-background transition-all active:scale-95 gap-3"
                onClick={handleReset}
              >
                <RefreshCcw className="h-4 w-4" /> Reset Identity Node
              </Button>

              <footer className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2 opacity-20">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">ViMore Sentry v1.5</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-primary italic">© 2026 ViMore by Media Tech Liberia</p>
              </footer>
            </div>
          ) : (
            <KineticSplashScreen />
          )}
        </div>
      )}
      <div className={cn(
        "flex-1 flex flex-col",
        !isPublicPath && "transition-opacity duration-1000 ease-out",
        (isPublicPath || !isVisible) ? "opacity-100" : "opacity-0"
      )}>
        {children}
      </div>
    </>
  );
}
