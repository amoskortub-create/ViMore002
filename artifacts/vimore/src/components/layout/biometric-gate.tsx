"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Fingerprint, Lock, Loader2, CheckCircle2, ShieldAlert, ScanFace, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/context/PostContext";
import { cn } from "@/lib/utils";

// Map of BiometricGate title → protected-area key
const TITLE_TO_AREA: Record<string, string> = {
  "Direct Messages": "messages",
  "Earnings Portal": "earnings",
  "Credit Hub":      "currency",
};

type AuthCapability = "biometric" | "device-credential" | "none" | "checking";

interface BiometricGateProps {
  children: React.ReactNode;
  title: string;
}

export function BiometricGate({ children, title }: BiometricGateProps) {
  const { settings, verifyHardwareBiometrics, triggerHaptic } = usePosts();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isScanning,      setIsScanning]      = useState(false);
  const [scanComplete,    setScanComplete]    = useState(false);
  const [error,           setError]           = useState(false);
  const [capability,      setCapability]      = useState<AuthCapability>("checking");

  // Detect what the device actually supports for better icon/text rendering
  useEffect(() => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      setCapability("none");
      return;
    }
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(hasBiometric => setCapability(hasBiometric ? "biometric" : "device-credential"))
      .catch(() => setCapability("device-credential"));
  }, []);

  // Resolve the area key for this gate
  const areaKey = TITLE_TO_AREA[title] ?? title.toLowerCase().replace(/\s+/g, "-");

  // Which areas are currently protected
  const protectedAreas: string[] = settings.biometricProtectedAreas ?? ["messages", "earnings", "currency"];

  // Bypass conditions
  const isThisAreaProtected = protectedAreas.includes(areaKey);
  if (!settings.isBiometricActive || !settings.isHardwareEnrolled || !isThisAreaProtected) {
    return <>{children}</>;
  }
  if (isAuthenticated) return <>{children}</>;

  // Icon & label based on device capability
  const SensorIcon =
    capability === "biometric"          ? Fingerprint :
    capability === "device-credential"  ? KeyRound    :
    capability === "checking"           ? Loader2     :
    Lock;

  const hintLine =
    capability === "biometric"
      ? "Use your fingerprint or face to verify"
      : capability === "device-credential"
      ? "Use your device PIN, pattern, or password"
      : "Verify your identity to continue";

  const scanningLabel =
    capability === "biometric" ? "READING BIOMETRIC..." : "VERIFYING DEVICE LOCK...";

  const handleAuthenticate = async () => {
    if (isScanning) return;
    setError(false);
    setIsScanning(true);
    triggerHaptic(20);

    try {
      const success = await verifyHardwareBiometrics();
      if (success) {
        setScanComplete(true);
        triggerHaptic(50);
        setTimeout(() => {
          setIsAuthenticated(true);
          setIsScanning(false);
        }, 700);
      } else {
        setIsScanning(false);
        setError(true);
        triggerHaptic(100);
      }
    } catch {
      setIsScanning(false);
      setError(true);
      triggerHaptic(100);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#050505] flex flex-col items-center justify-center p-6 overflow-hidden">

      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 blur-[150px] rounded-full animate-pulse delay-1000" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center space-y-10 animate-in fade-in zoom-in-95 duration-700">

        {/* Header */}
        <header className="space-y-3">
          <div className="flex justify-center">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-1.5 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Secure Access</span>
            </div>
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">{title}</h1>
          <p className="text-white/40 text-sm font-medium">{hintLine}</p>
        </header>

        {/* Sensor orb */}
        <main className="relative py-6 w-full flex flex-col items-center">
          <div
            className={cn(
              "relative h-48 w-48 rounded-full border-2 transition-all duration-500 flex items-center justify-center cursor-pointer group",
              isScanning   ? "border-cyan-400 shadow-[0_0_60px_rgba(34,211,238,0.4)] scale-110" :
              scanComplete ? "border-green-500 bg-green-500/10" :
              error        ? "border-destructive animate-shake" :
                             "border-white/10 hover:border-cyan-400/40 bg-white/5 shadow-inner"
            )}
            onClick={handleAuthenticate}
          >
            {/* Glow */}
            <div className={cn(
              "absolute inset-2 rounded-full blur-md transition-opacity duration-500",
              isScanning ? "bg-cyan-400/40 opacity-100 animate-pulse" : "bg-cyan-400/5 opacity-0 group-hover:opacity-100"
            )} />

            {/* Ripple + scan line */}
            {isScanning && (
              <>
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping" />
                <div className="absolute inset-4 border-2 border-cyan-400/40 rounded-full animate-pulse" />
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)] animate-[scan_1.5s_infinite] z-20" />
              </>
            )}

            <div className="relative z-10 flex flex-col items-center gap-4">
              {scanComplete ? (
                <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
              ) : error ? (
                <ShieldAlert className="h-16 w-16 text-destructive" />
              ) : (
                <div className={cn(
                  "relative transition-all duration-500",
                  isScanning ? "text-cyan-400" : "text-white/20 group-hover:text-cyan-400"
                )}>
                  <SensorIcon className={cn("h-20 w-20", capability === "checking" && "animate-spin")} />
                  {isScanning && (
                    <div className="absolute inset-0 text-cyan-400 animate-pulse">
                      <SensorIcon className="h-20 w-20" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status label */}
          <div className="mt-14">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-[0.4em] transition-all",
              isScanning   ? "text-cyan-400 animate-pulse" :
              scanComplete ? "text-green-500" :
              error        ? "text-destructive" : "text-white/20"
            )}>
              {isScanning   ? scanningLabel      :
               scanComplete ? "ACCESS GRANTED"   :
               error        ? "VERIFICATION FAILED — TRY AGAIN" :
               capability === "biometric" ? "TAP TO SCAN" : "TAP TO VERIFY"}
            </span>
          </div>
        </main>

        {/* CTA */}
        <footer className="w-full space-y-4">
          <Button
            className={cn(
              "w-full h-16 rounded-[2rem] font-black italic uppercase tracking-[0.2em] transition-all",
              isScanning || scanComplete
                ? "bg-white/5 text-white/20 cursor-not-allowed"
                : "bg-white text-black hover:bg-zinc-200 shadow-2xl"
            )}
            onClick={handleAuthenticate}
            disabled={isScanning || scanComplete}
          >
            {isScanning
              ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
              : capability === "biometric"
              ? "Scan Fingerprint / Face"
              : "Use Device Lock"}
          </Button>

          {/* Capability badge */}
          <div className="flex items-center justify-center gap-2 text-[9px] font-black text-white/20 uppercase tracking-widest">
            <ShieldCheck className="h-3 w-3" />
            {capability === "biometric"
              ? "Fingerprint · Face ID · Device Auth"
              : capability === "device-credential"
              ? "PIN · Pattern · Password · Device Auth"
              : "Device Security · ViMore Vault"}
            {" "}· v2.0
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0%   { transform: translateY(0);     opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(192px); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0);  }
          25%       { transform: translateX(-8px); }
          75%       { transform: translateX(8px);  }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}
