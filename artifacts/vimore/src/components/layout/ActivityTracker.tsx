"use client";

import { useEffect, useRef } from "react";
import { usePosts } from "@/context/PostContext";
import { authFetch } from "@/lib/auth-fetch";

export function ActivityTracker() {
  const { currentUser } = usePosts();
  const tracked = useRef(false);

  useEffect(() => {
    if (!currentUser?.$id || tracked.current) return;
    tracked.current = true;

    authFetch("/api/user/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.$id,
        username: currentUser.username || currentUser.name || "unknown",
      }),
    }).catch(() => {});
  }, [currentUser?.$id]);

  return null;
}
