'use client';

import { useEffect, useState, ReactNode } from 'react';
import { usePosts } from '@/context/PostContext';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Clock, LogOut, MessageSquare } from 'lucide-react';

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

export function SuspensionGate({ children }: { children: ReactNode }) {
  const { currentUser, logout, submitTicket } = usePosts();
  const [now, setNow] = useState(Date.now());
  const [appealSent, setAppealSent] = useState(false);
  const [isSendingAppeal, setIsSendingAppeal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isSuspended =
    currentUser?.status === 'suspended' &&
    currentUser?.suspendedUntil &&
    new Date(currentUser.suspendedUntil).getTime() > now;

  const isBanned = currentUser?.status === 'banned';

  if (!isBanned && !isSuspended) {
    return <>{children}</>;
  }

  const msRemaining = isSuspended && currentUser?.suspendedUntil
    ? new Date(currentUser.suspendedUntil).getTime() - now
    : 0;

  const liftDate = isSuspended && currentUser?.suspendedUntil
    ? new Date(currentUser.suspendedUntil).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const handleAppeal = async () => {
    if (appealSent) return;
    setIsSendingAppeal(true);
    try {
      await submitTicket({
        subject: isBanned ? 'Ban Appeal' : 'Suspension Appeal',
        message: `I am appealing my ${isBanned ? 'ban' : 'suspension'}. I believe this action was taken in error and would like to request a review.`,
        category: 'APPEAL',
        priority: 'HIGH',
      });
      setAppealSent(true);
    } catch {
      setAppealSent(true);
    } finally {
      setIsSendingAppeal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center space-y-8 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-destructive/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-destructive/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 space-y-8 max-w-md w-full">
        <div className="relative mx-auto w-fit">
          <div className="absolute -inset-8 bg-destructive/10 rounded-full blur-2xl animate-ping opacity-30" />
          <div className="h-24 w-24 bg-destructive/10 rounded-3xl flex items-center justify-center text-destructive relative border border-destructive/20 shadow-2xl">
            <ShieldAlert className="h-12 w-12" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            {isBanned ? 'Account Terminated' : 'Access Restricted'}
          </h1>
          <p className="text-sm font-bold text-white/50 uppercase tracking-widest">
            {isBanned
              ? 'Your account has been permanently banned from ViMore.'
              : 'Your account has been temporarily suspended.'}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 text-left">
          {currentUser?.suspensionReason && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Reason</p>
              <p className="text-sm font-bold text-white/80">{currentUser.suspensionReason}</p>
            </div>
          )}
          {currentUser?.suspensionMessage && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Message from Admin</p>
              <p className="text-sm text-white/60 leading-relaxed">{currentUser.suspensionMessage}</p>
            </div>
          )}
          {isSuspended && liftDate && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Access Restored On</p>
              <p className="text-sm font-bold text-primary">{liftDate}</p>
              <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-2.5">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-black text-primary">{formatCountdown(msRemaining)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {!isBanned && !appealSent && (
            <Button
              onClick={handleAppeal}
              disabled={isSendingAppeal}
              className="w-full h-14 rounded-2xl bg-white/10 text-white font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/20 transition-all border border-white/10"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {isSendingAppeal ? 'Submitting...' : 'Submit an Appeal'}
            </Button>
          )}
          {isBanned && !appealSent && (
            <Button
              onClick={handleAppeal}
              disabled={isSendingAppeal}
              className="w-full h-14 rounded-2xl bg-white/10 text-white font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/20 transition-all border border-white/10"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {isSendingAppeal ? 'Submitting...' : 'Appeal This Decision'}
            </Button>
          )}
          {appealSent && (
            <div className="h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Appeal Submitted — We'll review within 48h</span>
            </div>
          )}
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full h-12 rounded-2xl text-white/30 font-black uppercase text-[10px] tracking-[0.3em] hover:text-white/60 hover:bg-white/5 transition-all"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em]">
          ViMore Trust & Safety • Case ID: {currentUser?.$id?.slice(-8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}
