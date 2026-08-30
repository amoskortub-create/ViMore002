"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  UserCog, 
  ShieldCheck, 
  Mail, 
  Smartphone, 
  AtSign, 
  KeyRound, 
  Fingerprint, 
  Trash2, 
  Check, 
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  Shield,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

export default function AccountCenter() {
  const { currentUser, updateCurrentUser, triggerHaptic, settings, updateSettings, enrollHardwareBiometrics, isLoading } = usePosts();
  const { currentTrack, isExpanded } = useMusic();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        username: currentUser.username || "",
        email: (currentUser as any).email || "",
        phone: (currentUser as any).phone || ""
      });
    }
  }, [currentUser]);

  // Password Rotation State
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSyncingPassword, setIsSyncingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  // Deactivation State
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  if (isLoading || !currentUser) {
    return <ProfileLoading />;
  }

  const isPlayerActive = currentTrack && !isExpanded;

  const handleSave = () => {
    triggerHaptic(25);
    const updates: any = { name: formData.name };
    const normalized = formData.phone.replace(/[\s\-().]/g, '');
    if (normalized !== (currentUser?.phone || '').replace(/[\s\-().]/g, '')) {
      updates.phone = normalized || undefined;
    }
    updateCurrentUser(updates);
    toast({ title: t('ui_linguistic_sync'), description: "Your account credentials have been synchronized." });
  };

  const handleRotatePassword = () => {
    if (!passwords.current || !passwords.new || passwords.new !== passwords.confirm) {
      triggerHaptic(50);
      toast({ variant: "destructive", title: "Handshake Failed", description: "Please verify your new password nodes." });
      return;
    }

    setIsSyncingPassword(true);
    triggerHaptic(30);

    // Simulated Vault Pulse
    setTimeout(() => {
      setIsSyncingPassword(false);
      setIsPasswordDialogOpen(false);
      setPasswords({ current: "", new: "", confirm: "" });
      triggerHaptic(100);
      toast({ title: "Signature Rotated", description: "Your vault credentials have been updated." });
    }, 2000);
  };

  const handleToggle2FA = async () => {
    const nextState = !settings.isBiometricActive;
    triggerHaptic(10);

    if (nextState && !settings.isHardwareEnrolled) {
      setIsEnrolling(true);
      const success = await enrollHardwareBiometrics();
      setIsEnrolling(false);
      if (!success) return;
    } else {
      updateSettings({ isBiometricActive: nextState });
      toast({ 
        title: nextState ? "Handshake Active" : "Handshake Severed", 
        description: nextState ? "Mobile 2FA node synchronized with your hardware." : "Security vault downgraded to single-pulse." 
      });
    }
  };

  const handleFinalPurge = () => {
    triggerHaptic(150);
    toast({ title: "Purge Initiated", description: "Shutting down identity nodes..." });
    setTimeout(() => { 
      localStorage.clear(); 
      sessionStorage.clear(); 
      window.location.href = "/"; 
    }, 1500);
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
            <h1 className="text-lg font-black italic uppercase tracking-tighter text-foreground leading-tight">{t('account_center')}</h1>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('ui_identity_vault')}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary hover:bg-primary/5 rounded-xl h-9 px-4" onClick={handleSave}>{t('ui_save_hub')}</Button>
      </header>

      <main className={cn(
        "max-w-xl mx-auto p-4 sm:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32",
        "pt-4"
      )}>
        
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Digital Identity</h3>
          <Card className="rounded-[2.5rem] bg-white dark:bg-card border-none shadow-xl shadow-black/5 overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Legal Pulse (Name)</Label>
                  <div className="relative group">
                    <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-14 pl-12 bg-secondary/30 border-none rounded-2xl font-bold focus-visible:ring-primary/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Spatial ID (Username)</Label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.username} readOnly className="h-14 pl-12 bg-secondary/10 border-none rounded-2xl font-bold text-muted-foreground cursor-not-allowed" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Contact Handshakes</h3>
          <Card className="rounded-[2.5rem] bg-white dark:bg-card border-none shadow-xl shadow-black/5 overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Email Node</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="h-14 pl-12 bg-secondary/30 border-none rounded-2xl font-bold focus-visible:ring-primary/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Mobile Pulse</Label>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Optional · Used for sign-in</span>
                  </div>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+1 555 000 0000"
                      className="h-14 pl-12 bg-secondary/30 border-none rounded-2xl font-bold focus-visible:ring-primary/20"
                    />
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground/60 pl-1">Include your country code. You can sign in with this number instead of your ViMore ID.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">{t('settings_security')}</h3>
          <div className="grid grid-cols-1 gap-3">
            <Button 
              variant="outline" 
              className="h-16 rounded-2xl border-primary/10 bg-white dark:bg-card justify-start gap-4 px-6 group hover:bg-primary/5 transition-all"
              onClick={() => { triggerHaptic(10); setIsPasswordDialogOpen(true); }}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm">Rotate Password</span>
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Update vault credentials</span>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40" />
            </Button>
            
            <Button 
              variant="outline" 
              className={cn(
                "h-16 rounded-2xl border-primary/10 bg-white dark:bg-card justify-start gap-4 px-6 group hover:bg-primary/5 transition-all",
                settings.isBiometricActive && "border-green-500/20 bg-green-500/5"
              )}
              onClick={handleToggle2FA}
              disabled={isEnrolling}
            >
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110",
                settings.isBiometricActive ? "bg-green-500 text-white" : "bg-green-500/10 text-green-500"
              )}>
                {isEnrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm">Hardware Biometrics</span>
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                  {isEnrolling ? "Synchronizing..." : settings.isBiometricActive ? "Active Protection" : "Enable 2FA security"}
                </span>
              </div>
              <div className={cn(
                "ml-auto h-2 w-2 rounded-full",
                settings.isBiometricActive ? "bg-green-500 animate-pulse" : "bg-muted"
              )} />
            </Button>
          </div>
        </section>

        <div className="pt-10 flex flex-col items-center gap-6">
          <Button 
            variant="ghost" 
            className="text-destructive font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-destructive/5 rounded-xl h-10 px-6"
            onClick={() => { triggerHaptic(20); setIsDeactivateDialogOpen(true); }}
          >
            <Trash2 className="h-4 w-4" /> Deactivate Identity Node
          </Button>
          <div className="opacity-30 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Account Core v1.5</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-primary italic">© 2026 ViMore by Media Tech Liberia</p>
          </div>
        </div>
      </main>

      {/* 1. Password Rotation Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-primary/10 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-3xl sm:max-w-[400px]">
          <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
            <DialogTitle className="font-black italic uppercase tracking-widest text-2xl text-primary">Security Pulse</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Vault Password</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    className="h-12 bg-secondary/30 border-none rounded-xl pr-10"
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Signature (Password)</Label>
                <Input type="password" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} className="h-12 bg-secondary/30 border-none rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Signature</Label>
                <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} className="h-12 bg-secondary/30 border-none rounded-xl" />
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <p className="text-[9px] font-bold text-primary/60 uppercase leading-relaxed tracking-tighter">
                Rotating your password node will sign out all other devices currently connected to your identity.
              </p>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0">
            <Button className="w-full h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest gap-2 shadow-xl shadow-primary/20" onClick={handleRotatePassword} disabled={isSyncingPassword}>
              {isSyncingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}
              Sync New Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Deactivation Alert */}
      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] sm:max-w-[420px] bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-3xl border-destructive/10 shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="font-black italic uppercase tracking-tighter text-3xl text-center text-destructive">Sever Identity?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium leading-relaxed text-center px-4">
              Deactivating your node will permanently purge your digital signature, vault balances, and handshakes from the ViMore network. This action is terminal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6 px-4 pb-2">
            <AlertDialogCancel className="rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] bg-secondary/50 border-none hover:bg-secondary transition-all">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalPurge} className="rounded-2xl h-14 font-black italic uppercase tracking-widest text-[10px] bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20 transition-all active:scale-95">
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}