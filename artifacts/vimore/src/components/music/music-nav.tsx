"use client";

import { Compass, BarChart3, ListMusic, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";

interface MusicNavProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function MusicNav({ activeTab, onTabChange }: MusicNavProps) {
  const { t } = useTranslation();

  const leftItems = [
    { id: "discover", icon: Compass, label: t('music_discover') },
    { id: "chart", icon: BarChart3, label: t('music_charts') },
  ];
  const rightItems = [
    { id: "library", icon: ListMusic, label: t('music_library') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[80] pb-safe px-4 pb-5 flex justify-center pointer-events-none">
      <nav className="relative flex items-center gap-1 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-[2rem] px-3 py-2 shadow-2xl shadow-black/20 pointer-events-auto">
        {leftItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-300 min-w-[64px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[9px] font-bold uppercase tracking-widest transition-all", isActive && "font-black")}>{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => onTabChange("upload")}
          className={cn(
            "relative mx-2 flex flex-col items-center gap-0.5 transition-all duration-300",
            activeTab === "upload" && "scale-105"
          )}
        >
          <span className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all duration-300",
            activeTab === "upload"
              ? "bg-primary shadow-primary/40 scale-105"
              : "bg-gradient-to-br from-primary to-violet-600 shadow-primary/30"
          )}>
            <Upload className="h-5 w-5 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">Upload</span>
        </button>

        {rightItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-300 min-w-[64px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[9px] font-bold uppercase tracking-widest transition-all", isActive && "font-black")}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
