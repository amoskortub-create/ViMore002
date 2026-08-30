"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Sparkles, ArrowRight, Loader2, CheckCircle2, Zap, Users, Star, AtSign, ShieldQuestion, KeyRound, X, ChevronRight, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePosts } from "@/context/PostContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getSecurityQuestion, verifySecurityAnswer } from "@/lib/appwrite";
import { AcronymCaption } from "@/components/branding/acronym-meaning";
import { useTranslation } from "@/context/LanguageContext";

type ForgotStep = "id" | "question" | "newpass" | "done";

interface SavedAccount {
  id: string;
  vimoreId: string;
  name: string;
  avatar: string | null;
}

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-green-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-red-500", "bg-indigo-500",
];
function avatarColor(vimoreId: string) {
  let h = 0;
  for (let i = 0; i < vimoreId.length; i++) h = (h * 31 + vimoreId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function LoginPage() {
  const { login, currentUser, isLoading: contextLoading } = usePosts();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showFullForm, setShowFullForm] = useState(false);
  const [quickAccount, setQuickAccount] = useState<SavedAccount | null>(null);
  const [quickPassword, setQuickPassword] = useState("");
  const [showQuickPass, setShowQuickPass] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("id");
  const [forgotId, setForgotId] = useState("");
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const quickPassRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!contextLoading && currentUser) {
      router.replace("/");
    }
  }, [currentUser, contextLoading, router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vimore_saved_accounts');
      if (raw) setSavedAccounts(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (quickAccount) {
      setQuickPassword("");
      setTimeout(() => quickPassRef.current?.focus(), 150);
    }
  }, [quickAccount]);

  const removeAccount = (vimoreId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(a => a.vimoreId !== vimoreId);
    setSavedAccounts(updated);
    try { localStorage.setItem('vimore_saved_accounts', JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAccount || !quickPassword) return;
    setQuickSubmitting(true);
    try {
      const result = await login(quickAccount.vimoreId, quickPassword);
      if (result.success) {
        router.push("/");
      } else {
        toast({ variant: "destructive", title: "Sign in failed", description: result.message || "Wrong password. Try again." });
      }
    } catch {
      toast({ variant: "destructive", title: "Sign in failed", description: "Please check your password." });
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setIsSubmitting(true);
    try {
      const result = await login(identifier, password);
      if (result.success) {
        router.push("/");
      } else {
        toast({ variant: "destructive", title: "Sign in failed", description: result.message || "Please check your credentials." });
      }
    } catch {
      toast({ variant: "destructive", title: "Sign in failed", description: "Please check your credentials." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForgot = () => {
    setShowForgot(false);
    setForgotStep("id");
    setForgotId("");
    setForgotQuestion("");
    setForgotAnswer("");
    setForgotNewPass("");
    setForgotConfirm("");
  };

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotId) return;
    setForgotLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const normalised = forgotId.includes("@") ? forgotId : `${forgotId}@vimore.cfd`;
    const question = await getSecurityQuestion(normalised);
    setForgotLoading(false);
    if (!question) {
      toast({ variant: "destructive", title: "Account not found", description: "No account matches that ViMore ID." });
      return;
    }
    setForgotQuestion(question);
    setForgotStep("question");
  };

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotAnswer) return;
    setForgotLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const normalised = forgotId.includes("@") ? forgotId : `${forgotId}@vimore.cfd`;
    const correct = await verifySecurityAnswer(normalised, forgotAnswer);
    setForgotLoading(false);
    if (!correct) {
      toast({ variant: "destructive", title: "Wrong answer", description: "Your answer does not match. Please try again." });
      return;
    }
    setForgotStep("newpass");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNewPass || forgotNewPass !== forgotConfirm) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Please confirm your new password correctly." });
      return;
    }
    if (forgotNewPass.length < 8) {
      toast({ variant: "destructive", title: "Password too short", description: "Password must be at least 8 characters." });
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vimoreId: forgotId,
          securityAnswer: forgotAnswer,
          newPassword: forgotNewPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Reset failed", description: data.error || "Could not reset password." });
        setForgotLoading(false);
        return;
      }
      // If the server returned a session, hydrate the client SDK and log in directly
      if (data.sessionCreated && data.secret) {
        try {
          const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'vimore123';
          const { client } = await import('@/lib/appwrite');
          client.setSession(data.secret);
          localStorage.setItem('cookieFallback', JSON.stringify({ [`a_session_${PROJECT_ID}`]: data.secret }));
        } catch { /* ignore */ }
      }
      setForgotLoading(false);
      setForgotStep("done");
    } catch {
      toast({ variant: "destructive", title: "Reset failed", description: "Something went wrong. Please try again." });
      setForgotLoading(false);
    }
  };

  const hasSaved = savedAccounts.length > 0;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden" style={{ colorScheme: 'light' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-200 to-purple-100 blur-3xl opacity-60" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-violet-100 to-pink-100 blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-violet-50 blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 pt-12 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#9940E5] flex items-center justify-center shadow-lg shadow-violet-200">
              <Zap className="h-5 w-5 text-white fill-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-black italic uppercase tracking-tighter text-gray-900">ViMore</span>
              <AcronymCaption light className="hidden sm:block mt-0.5" />
            </div>
          </div>
          <Link href="/signup">
            <span className="text-sm font-bold text-[#9940E5] hover:text-violet-700 transition-colors">{t('auth_sign_up')}</span>
          </Link>
        </header>
        <div className="px-6 sm:hidden -mt-2 mb-2">
          <AcronymCaption light />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-sm mx-auto w-full">

          {hasSaved && !showFullForm ? (
            <>
              <div className="mb-8 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#9940E5]" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#9940E5]">{t('auth_your_accounts')}</span>
                </div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
                  {t('auth_welcome_back')}
                </h1>
                <p className="text-sm text-gray-500 font-medium">{t('auth_tap_accounts')}</p>
              </div>

              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {savedAccounts.map(acc => (
                  <button
                    key={acc.vimoreId}
                    onClick={() => setQuickAccount(acc)}
                    className="w-full flex items-center gap-4 bg-white border border-gray-100 rounded-[1.5rem] p-4 shadow-sm hover:shadow-md hover:border-violet-200 transition-all group text-left"
                  >
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-lg ${avatarColor(acc.vimoreId)}`}>
                      {acc.avatar
                        ? <img src={acc.avatar} alt={acc.name} className="h-14 w-14 rounded-2xl object-cover" />
                        : getInitials(acc.name)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 truncate">{acc.name}</p>
                      <p className="text-[11px] font-medium text-[#9940E5] truncate">{acc.vimoreId}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => removeAccount(acc.vimoreId, e)}
                        className="h-7 w-7 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400 transition-colors"
                        title="Remove account"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#9940E5] transition-colors ml-1" />
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => setShowFullForm(true)}
                  className="w-full flex items-center gap-4 bg-violet-50/60 border border-violet-100 rounded-[1.5rem] p-4 hover:bg-violet-50 transition-all group text-left"
                >
                  <div className="h-14 w-14 rounded-2xl bg-white border-2 border-dashed border-violet-200 flex items-center justify-center shrink-0">
                    <PlusCircle className="h-6 w-6 text-[#9940E5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-700">{t('auth_add_another')}</p>
                    <p className="text-[11px] font-medium text-gray-400">{t('auth_add_another_desc')}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#9940E5] transition-colors" />
                </button>
              </div>

              <div className="mt-6 text-center">
                <Link href="/signup">
                  <span className="text-sm font-black italic uppercase tracking-tight text-[#9940E5] hover:text-violet-700 transition-colors">
                    {t('auth_create_new_account')}
                  </span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mb-10 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#9940E5]" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#9940E5]">{t('auth_welcome_back')}</span>
                </div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
                  {t('auth_sign_in_headline')}<br />
                  <span className="text-[#9940E5]">ViMore</span>
                </h1>
                <p className="text-sm text-gray-500 font-medium">{t('auth_tagline')}</p>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-violet-100/50 p-7 space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700">
                {hasSaved && (
                  <button
                    onClick={() => setShowFullForm(false)}
                    className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#9940E5] hover:text-violet-700 transition-colors"
                  >
                    {t('auth_back_saved')}
                  </button>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{t('auth_vimore_id_label')}</Label>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                      <Input
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="yourname@vimore.cfd or +1 555 000 0000"
                        required
                        className="h-14 pl-11 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder:text-gray-300 focus:border-[#9940E5] focus:ring-[#9940E5]/20 focus:ring-4 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium pl-1">Use your ViMore ID <span className="text-[#9940E5] font-bold">(yourname)</span> or your registered phone number with country code.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{t('auth_password')}</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-[11px] font-bold text-[#9940E5] hover:text-violet-700 transition-colors uppercase tracking-wide"
                      >
                        {t('auth_forgot_password')}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="h-14 pl-11 pr-12 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder:text-gray-300 focus:border-[#9940E5] focus:ring-[#9940E5]/20 focus:ring-4 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !identifier || !password}
                    className="w-full h-14 rounded-2xl bg-[#9940E5] hover:bg-violet-700 text-white font-black italic uppercase tracking-[0.15em] text-sm shadow-xl shadow-violet-200 transition-all active:scale-95 gap-3 mt-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {t('auth_sign_in_btn')} <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm text-gray-500 font-medium">{t('auth_no_account')}</p>
                  <Link href="/signup">
                    <span className="text-sm font-black italic uppercase tracking-tight text-[#9940E5] hover:text-violet-700 transition-colors">
                      {t('auth_create_account')}
                    </span>
                  </Link>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 animate-in fade-in duration-1000 delay-300">
                {[
                  { icon: Users, value: "2M+", label: t('auth_creators') },
                  { icon: Star, value: "4.9★", label: t('auth_rating') },
                  { icon: Sparkles, value: "50+", label: t('auth_countries') },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                    <Icon className="h-4 w-4 text-[#9940E5] mx-auto mb-1" />
                    <p className="text-sm font-black text-gray-900">{value}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="py-6 text-center">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            ViMore · Media Tech Liberia · v1.5
          </p>
        </footer>
      </div>

      {quickAccount && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-7 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0 ${avatarColor(quickAccount.vimoreId)}`}>
                  {quickAccount.avatar
                    ? <img src={quickAccount.avatar} alt={quickAccount.name} className="h-16 w-16 rounded-2xl object-cover" />
                    : getInitials(quickAccount.name)
                  }
                </div>
                <div>
                  <p className="font-black text-gray-900 text-lg leading-tight">{quickAccount.name}</p>
                  <p className="text-[11px] font-medium text-[#9940E5] mt-0.5">{quickAccount.vimoreId}</p>
                </div>
              </div>
              <button onClick={() => setQuickAccount(null)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors mt-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{t('auth_password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <Input
                    ref={quickPassRef}
                    type={showQuickPass ? "text" : "password"}
                    value={quickPassword}
                    onChange={e => setQuickPassword(e.target.value)}
                    placeholder={t('auth_enter_password')}
                    required
                    className="h-14 pl-11 pr-12 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder:text-gray-300 focus:border-[#9940E5] focus:ring-[#9940E5]/20 focus:ring-4 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPass(!showQuickPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    {showQuickPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={quickSubmitting || !quickPassword}
                className="w-full h-14 rounded-2xl bg-[#9940E5] hover:bg-violet-700 text-white font-black italic uppercase tracking-[0.15em] text-sm shadow-xl shadow-violet-200 transition-all active:scale-95 gap-3"
              >
                {quickSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>{t('auth_sign_in_btn')} <ArrowRight className="h-5 w-5" /></>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-[11px] font-bold text-[#9940E5] hover:text-violet-700 transition-colors uppercase tracking-wide py-1"
              >
                {t('auth_forgot_password')}
              </button>
            </form>
          </div>
        </div>
      )}

      {showForgot && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-7 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">

            {forgotStep === "done" ? (
              <div className="text-center space-y-4 py-4">
                <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">{t('auth_reset_done')}</h3>
                  <p className="text-sm text-gray-500">{t('auth_reset_done_desc')}</p>
                </div>
                <Button
                  onClick={resetForgot}
                  className="w-full h-12 rounded-2xl bg-[#9940E5] text-white font-black italic uppercase tracking-widest text-sm"
                >
                  {t('auth_go_sign_in')}
                </Button>
              </div>
            ) : forgotStep === "id" ? (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
                      <AtSign className="h-5 w-5 text-[#9940E5]" />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">{t('auth_forgot_title')}</h3>
                  </div>
                  <p className="text-sm text-gray-500 pl-11">{t('auth_enter_vimore_id')}</p>
                </div>
                <form onSubmit={handleFindAccount} className="space-y-4">
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <Input
                      type="text"
                      value={forgotId}
                      onChange={e => setForgotId(e.target.value)}
                      placeholder="yourname@vimore.cfd"
                      required
                      className="h-14 pl-11 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder:text-gray-300 focus:border-[#9940E5] focus:ring-[#9940E5]/20 focus:ring-4 transition-all"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotId}
                    className="w-full h-12 rounded-2xl bg-[#9940E5] text-white font-black italic uppercase tracking-widest text-sm"
                  >
                    {forgotLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('auth_find_account')}
                  </Button>
                  <button type="button" onClick={resetForgot} className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors py-1">Cancel</button>
                </form>
              </>
            ) : forgotStep === "question" ? (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
                      <ShieldQuestion className="h-5 w-5 text-[#9940E5]" />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">{t('auth_security_question')}</h3>
                  </div>
                  <p className="text-sm text-gray-500 pl-11">{t('auth_your_answer')}</p>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#9940E5] mb-1">Your Question</p>
                  <p className="text-sm font-bold text-gray-800">{forgotQuestion}</p>
                </div>
                <form onSubmit={handleVerifyAnswer} className="space-y-4">
                  <Input
                    type="text"
                    value={forgotAnswer}
                    onChange={e => setForgotAnswer(e.target.value)}
                    placeholder={t('auth_your_answer')}
                    required
                    className="h-14 px-4 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder:text-gray-300 focus:border-[#9940E5] focus:ring-[#9940E5]/20 focus:ring-4 transition-all"
                  />
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotAnswer}
                    className="w-full h-12 rounded-2xl bg-[#9940E5] text-white font-black italic uppercase tracking-widest text-sm"
                  >
                    {forgotLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('auth_verify_answer')}
                  </Button>
                  <button type="button" onClick={resetForgot} className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors py-1">Cancel</button>
                </form>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
                      <KeyRound className="h-5 w-5 text-[#9940E5]" />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">{t('auth_new_password')}</h3>
                  </div>
                  <p className="text-sm text-gray-500 pl-11">{t('auth_reset_password')}</p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <Input
                      type={showNewPass ? "text" : "password"}
                      value={forgotNewPass}
                      onChange={e => setForgotNewPass(e.target.value)}
                      placeholder={t('auth_new_password')}
                      required
                      className="h-14 pl-11 pr-12 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder:text-gray-300 focus:border-[#9940E5] focus:ring-[#9940E5]/20 focus:ring-4 transition-all"
                    />
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <Input
                      type="password"
                      value={forgotConfirm}
                      onChange={e => setForgotConfirm(e.target.value)}
                      placeholder={t('auth_confirm_new_password')}
                      required
                      className="h-14 pl-11 bg-gray-50 border-gray-100 rounded-2xl text-gray-900 font-medium placeholder:text-gray-300 focus:border-[#9940E5] focus:ring-[#9940E5]/20 focus:ring-4 transition-all"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotNewPass || !forgotConfirm}
                    className="w-full h-12 rounded-2xl bg-[#9940E5] text-white font-black italic uppercase tracking-widest text-sm"
                  >
                    {forgotLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('auth_reset_password')}
                  </Button>
                  <button type="button" onClick={resetForgot} className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors py-1">Cancel</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
