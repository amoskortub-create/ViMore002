"use client";

import { usePosts } from "@/context/PostContext";
import { ReactNode } from "react";

export function FontScaleWrapper({ children }: { children: ReactNode }) {
  const { settings } = usePosts();

  return (
    <div 
      style={{ 
        fontSize: `${settings.fontScale}rem`,
        transition: 'font-size 0.3s ease-out'
      }}
      className="min-h-screen flex flex-col"
    >
      {children}
    </div>
  );
}