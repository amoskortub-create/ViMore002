"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SignInWithViMoreProps {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  label?: string;
  variant?: "purple" | "white";
  size?: "sm" | "md" | "lg";
  popup?: boolean;
  onSuccess?: (data: { code: string; state?: string }) => void;
  className?: string;
}

const SIZES = {
  sm: "h-9 px-4 text-xs rounded-xl gap-2",
  md: "h-12 px-5 text-sm rounded-2xl gap-2.5",
  lg: "h-14 px-7 text-base rounded-[18px] gap-3",
};

const ICON_SIZES = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };

export function SignInWithViMore({
  clientId,
  redirectUri,
  scope = "profile",
  state,
  label = "Sign in with ViMore",
  variant = "purple",
  size = "md",
  popup = false,
  onSuccess,
  className,
}: SignInWithViMoreProps) {
  function buildUrl() {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
    });
    if (state) params.set("state", state);
    return `https://vimore.cfd/oauth/authorize?${params.toString()}`;
  }

  function handleClick(e: React.MouseEvent) {
    if (!popup) return;
    e.preventDefault();
    const w = 480, h = 640;
    const left = screen.width / 2 - w / 2;
    const top = screen.height / 2 - h / 2;
    const win = window.open(
      buildUrl(),
      "vimore_auth",
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`
    );

    const VIMORE_ORIGIN = "https://vimore.cfd";
    const handler = (event: MessageEvent) => {
      if (event.origin !== VIMORE_ORIGIN) return;
      if (event.data?.type === "vimore_oauth_callback") {
        window.removeEventListener("message", handler);
        win?.close();
        onSuccess?.(event.data);
      }
    };
    window.addEventListener("message", handler);
  }

  return (
    <a
      href={buildUrl()}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center font-black select-none transition-all active:scale-95 no-underline",
        SIZES[size],
        variant === "purple"
          ? "bg-[#7C3AED] text-white shadow-lg shadow-purple-500/30 hover:bg-[#6D28D9]"
          : "bg-white text-[#7C3AED] border border-purple-200 shadow-md hover:bg-purple-50",
        className
      )}
    >
      <ViMoreIcon className={cn(ICON_SIZES[size], "flex-shrink-0")} variant={variant} />
      <span>{label}</span>
    </a>
  );
}

function ViMoreIcon({ className, variant }: { className?: string; variant: "purple" | "white" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        width="24" height="24" rx="6"
        fill={variant === "purple" ? "white" : "#7C3AED"}
        fillOpacity={variant === "purple" ? "0.15" : "1"}
      />
      <path
        d="M4 8L9.5 17L15 8"
        stroke={variant === "purple" ? "white" : "white"}
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M11.5 14L15 8L18.5 14"
        stroke={variant === "purple" ? "white" : "white"}
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
