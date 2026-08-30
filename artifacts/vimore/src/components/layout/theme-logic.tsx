"use client";

import { useEffect } from "react";
import { usePosts } from "@/context/PostContext";

/**
 * @fileOverview ViMore Theme Manager
 * Atomic listener that applies the environmental dark/light class signature to the root node.
 */

export function ThemeLogic() {
  const { settings } = usePosts();

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Resolve "System Sync" logic if active
    const isDark = settings.theme === 'dark' || 
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  return null;
}
