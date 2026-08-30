"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ChatRedirectPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    router.replace(`/messages?open=${encodeURIComponent(userId)}`);
  }, [userId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">
      Opening chat...
    </div>
  );
}
