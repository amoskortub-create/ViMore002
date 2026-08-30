'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReelCreatePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/reels'); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-white/60 text-sm font-bold animate-pulse">Redirecting…</div>
    </div>
  );
}
