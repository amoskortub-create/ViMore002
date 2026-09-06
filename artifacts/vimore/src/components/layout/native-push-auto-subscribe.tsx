"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePosts } from "@/context/PostContext";
import { registerNativePush } from "@/lib/native-push";

export function NativePushAutoSubscribe() {
  const { currentUser } = usePosts();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser?.$id) return;
    registerNativePush(currentUser.$id, (url) => router.push(url)).catch(
      (error) => {
        console.warn("[native-push] setup failed", error);
      },
    );
  }, [currentUser?.$id, router]);

  return null;
}
