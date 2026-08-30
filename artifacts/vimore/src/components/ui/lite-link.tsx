"use client";

import Link, { LinkProps } from "next/link";
import { forwardRef, AnchorHTMLAttributes, ReactNode } from "react";
import { useNetwork } from "@/context/NetworkContext";

type LiteLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: ReactNode;
    className?: string;
  };

/**
 * LiteLink — drop-in replacement for next/link that disables prefetch on Lite
 * networks. Saves a bunch of background route bundles for users on tight data caps.
 */
export const LiteLink = forwardRef<HTMLAnchorElement, LiteLinkProps>(function LiteLink(
  { prefetch, ...props },
  ref
) {
  const { tier } = useNetwork();
  const effectivePrefetch = tier === "lite" ? false : prefetch;
  return <Link ref={ref} prefetch={effectivePrefetch} {...props} />;
});
