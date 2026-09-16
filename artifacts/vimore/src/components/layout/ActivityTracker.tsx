"use client";

import { useEffect, useRef } from "react";
import { usePosts } from "@/context/PostContext";
import { authFetch } from "@/lib/auth-fetch";

export function ActivityTracker() {
  const { currentUser } = usePosts();

  useEffect(() => {
    if (!currentUser?.$id) return;

    const track = () => {
      authFetch("/api/user/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          user_id: currentUser.$id,
          username: currentUser.username || currentUser.name || "unknown",
        }),
      }).catch(() => {});
    };

    track();
    const interval = setInterval(track, 45_000);
    const handleForeground = () => {
      if (document.visibilityState === "visible") track();
    };
    document.addEventListener("visibilitychange", handleForeground);
    window.addEventListener("pageshow", handleForeground);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleForeground);
      window.removeEventListener("pageshow", handleForeground);
    };
  }, [currentUser?.$id]);

  return null;
}
