"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    if (!userId || !secret) {
      setStatus('error');
      setErrorMessage('Invalid verification link. Please request a new one.');
      return;
    }

    account.updateVerification(userId, secret)
      .then(() => {
        setStatus('success');
        setTimeout(() => router.replace('/login?verified=true'), 3000);
      })
      .catch((err: any) => {
        setStatus('error');
        setErrorMessage(err?.message || 'Verification failed. The link may have expired.');
      });
  }, [searchParams, router]);

  if (status === 'verifying') {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black italic uppercase text-white">Verifying Account...</h2>
          <p className="text-sm text-white/40 font-medium uppercase tracking-widest">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black italic uppercase text-white">Email Verified!</h2>
          <p className="text-sm text-white/40 font-medium">Your account is now active. Redirecting to sign in...</p>
        </div>
        <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center">
          <XCircle className="h-12 w-12 text-red-500" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black italic uppercase text-white">Verification Failed</h2>
        <p className="text-sm text-white/40 font-medium">{errorMessage}</p>
      </div>
      <Button
        onClick={() => router.replace('/login')}
        className="w-full h-12 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-sm"
      >
        Back to Sign In
      </Button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black italic uppercase tracking-tighter text-white">ViMore</span>
        </div>
        <Suspense fallback={
          <div className="space-y-6">
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
            <p className="text-sm text-white/40 font-medium uppercase tracking-widest">Loading...</p>
          </div>
        }>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
