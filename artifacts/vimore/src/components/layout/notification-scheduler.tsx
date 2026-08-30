"use client";

import { useEffect, useRef } from "react";
import { usePosts } from "@/context/PostContext";
import { useNotifications } from "@/context/NotificationContext";

const VIMORE_AVATAR = "/icon.svg";

const WELCOME_KEY  = (uid: string) => `vm_welcome_${uid}`;
const CURRENCY_KEY = (uid: string) => `vm_currency_notif_${uid}`;
const VERIFY_KEY   = (uid: string) => `vm_verify_notif_${uid}`;

const TWO_DAYS_MS   = 2 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const FIVE_MIN_MS   = 5 * 60 * 1000;

function randomInterval(): number {
  return TWO_DAYS_MS + Math.random() * (THREE_DAYS_MS - TWO_DAYS_MS);
}

export function NotificationScheduler() {
  const { currentUser } = usePosts();
  const { addSignal } = useNotifications();
  const processedUser = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!currentUser || currentUser.username === "guest_node") return;
    if (processedUser.current === currentUser.$id) return;
    processedUser.current = currentUser.$id;

    const userId  = currentUser.$id;
    const name    = currentUser.name || currentUser.username || "Creator";
    const now     = Date.now();

    const schedule = (fn: () => void, delayMs: number) => {
      const t = setTimeout(fn, delayMs);
      timers.current.push(t);
    };

    // ─────────────────────────────────────────────────────────────────────
    // 1. WELCOME  — fires once for brand-new accounts (created < 5 min ago)
    // ─────────────────────────────────────────────────────────────────────
    const welcomeKey       = WELCOME_KEY(userId);
    const alreadyWelcomed  = localStorage.getItem(welcomeKey);

    if (!alreadyWelcomed) {
      const accountAge = currentUser.$createdAt
        ? now - new Date(currentUser.$createdAt).getTime()
        : Infinity;

      if (accountAge < FIVE_MIN_MS) {
        schedule(() => {
          addSignal({
            type: "SYSTEM",
            title: `🎉 Welcome to ViMore, ${name}!`,
            content:
              `You're officially part of the most vibrant creator community on the planet! ✨ ` +
              `**Start by creating your first post** — let the world hear your voice. ` +
              `Then share your unique **referral link** with friends and family. ` +
              `Every person you invite earns you **ViMore Gold**, and they get a head-start too! ` +
              `The more you share, the more you gain. Your journey starts right here. 🚀`,
            avatar: VIMORE_AVATAR,
            actionLabel: "Explore Star Network",
            actionHref: "/friends",
            recipientId: userId,
          });
          localStorage.setItem(welcomeKey, now.toString());
        }, 3_000);
      } else {
        localStorage.setItem(welcomeKey, now.toString());
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. BUY CURRENCY  — repeats every 2–3 days for every user
    // ─────────────────────────────────────────────────────────────────────
    const currencyKey      = CURRENCY_KEY(userId);
    const lastCurrency     = localStorage.getItem(currencyKey);
    const currencyOverdue  = !lastCurrency || now - parseInt(lastCurrency, 10) >= randomInterval();

    if (currencyOverdue) {
      schedule(() => {
        addSignal({
          type: "SYSTEM",
          title: "💎 Power Up Your ViMore Experience!",
          content:
            `Don't just scroll — **dominate the feed**! With **ViMore Gold & Credits** you can ` +
            `unlock exclusive creator content, send gifts to the voices you love, ` +
            `get your **Verified Badge**, tip posts, and access premium features others can't. ` +
            `Every coin you hold is power in the ViMore universe. ` +
            `Top up today and watch your influence grow! 🔥`,
          avatar: VIMORE_AVATAR,
          actionLabel: "Buy ViMore Currency",
          actionHref: "/currency",
          recipientId: userId,
        });
        localStorage.setItem(currencyKey, now.toString());
      }, 10_000);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. GET VERIFIED  — repeats every 2–3 days for unverified users only
    // ─────────────────────────────────────────────────────────────────────
    if (!currentUser.isVerified) {
      const verifyKey    = VERIFY_KEY(userId);
      const lastVerify   = localStorage.getItem(verifyKey);
      const verifyOverdue = !lastVerify || now - parseInt(lastVerify, 10) >= randomInterval();

      if (verifyOverdue) {
        schedule(() => {
          addSignal({
            type: "SYSTEM",
            title: "🛡️ Stand Out — Get Verified on ViMore!",
            content:
              `Ready to **level up your identity**? The purple **ViMore Verified Badge** signals to ` +
              `the whole network that you're the real deal. ✅ Verified creators enjoy ` +
              `**greater trust**, higher post reach, priority in search results, and ` +
              `exclusive features reserved for the verified elite. ` +
              `Join thousands of creators who've already claimed their badge — ` +
              `your audience is waiting. Get verified today!`,
            avatar: VIMORE_AVATAR,
            actionLabel: "Get Verified Now",
            actionHref: "/verification",
            recipientId: userId,
          });
          localStorage.setItem(verifyKey, now.toString());
        }, 18_000);
      }
    }

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [currentUser, addSignal]);

  return null;
}
