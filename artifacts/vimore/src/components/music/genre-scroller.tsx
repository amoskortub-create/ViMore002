
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const GENRES = [
  "All Vibes",
  "Afrobeats",
  "Amapiano",
  "Hip-Hop",
  "Trap",
  "R&B",
  "Dancehall",
  "Gospel",
  "Lo-Fi",
  "Jazz",
  "Alternative",
  "Podcasts"
];

export function GenreScroller() {
  const [activeGenre, setActiveGenre] = useState("All Vibes");

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-3 pb-4 px-2">
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => setActiveGenre(genre)}
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300",
              activeGenre === genre 
                ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105" 
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent hover:border-border"
            )}
          >
            {genre}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="opacity-0" />
    </ScrollArea>
  );
}
