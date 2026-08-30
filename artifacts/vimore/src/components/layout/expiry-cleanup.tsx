"use client";

import { useEffect, useRef } from "react";
import { usePosts } from "@/context/PostContext";
import { authFetch } from "@/lib/auth-fetch";

const INTERVAL_MS = 15 * 60 * 1000;

export function ExpiryCleanup() {
  const { currentUser } = usePosts();
  const lastCleanup = useRef(0);
  const lastAlerts = useRef(0);

  const runCleanup = () => {
    const now = Date.now();
    if (now - lastCleanup.current < INTERVAL_MS) return;
    lastCleanup.current = now;
    authFetch("/api/cron/cleanup").catch(() => {});
  };

  const runAlerts = () => {
    const now = Date.now();
    if (now - lastAlerts.current < INTERVAL_MS) return;
    lastAlerts.current = now;
    authFetch("/api/cron/expiry-alerts").catch(() => {});
  };

  useEffect(() => {
    if (!currentUser?.$id) return;

    const initial = setTimeout(() => {
      runCleanup();
      runAlerts();
    }, 8000);

    const interval = setInterval(() => {
      runCleanup();
      runAlerts();
    }, INTERVAL_MS);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [currentUser?.$id]);

  return null;
}
