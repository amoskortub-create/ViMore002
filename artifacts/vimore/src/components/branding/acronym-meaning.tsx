"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const LETTERS: Array<{ letter: string; word: string; tagline: string }> = [
  { letter: "V", word: "Value", tagline: "Every voice carries weight." },
  { letter: "I", word: "Innovation", tagline: "Reimagining how creators earn." },
  { letter: "M", word: "Moving", tagline: "Always in motion, never still." },
  { letter: "O", word: "Our", tagline: "Built by us, for us." },
  { letter: "R", word: "Region", tagline: "Rooted in our communities." },
  { letter: "E", word: "Everywhere", tagline: "Borderless reach for every story." },
];

const ONE_LINE = "Value · Innovation · Moving · Our · Region · Everywhere";

/* -----------------------------------------------------------
 * 1. CAPTION — slim one-liner under the ViMore wordmark.
 *    Used on /login and /signup.
 * --------------------------------------------------------- */
export function AcronymCaption({ className, light }: { className?: string; light?: boolean }) {
  return (
    <p
      className={cn(
        "text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] leading-snug",
        light ? "text-gray-400" : "text-muted-foreground",
        "animate-in fade-in duration-700",
        className
      )}
      title="V.I.M.O.R.E."
    >
      {ONE_LINE}
    </p>
  );
}

/* -----------------------------------------------------------
 * 2. HERO — vertical letter-by-letter breakdown.
 *    Used on /how-it-works.
 * --------------------------------------------------------- */
export function AcronymHero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "bg-white dark:bg-card border-2 border-primary/10 rounded-[2.5rem] p-8 sm:p-12 shadow-xl shadow-primary/5",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em]">The Name</p>
          <h3 className="text-2xl font-black italic uppercase tracking-tighter">What ViMore Means</h3>
        </div>
      </div>

      <div className="space-y-3">
        {LETTERS.map(({ letter, word, tagline }, i) => (
          <div
            key={letter}
            className="group flex items-center gap-4 sm:gap-6 p-3 sm:p-4 rounded-2xl bg-secondary/20 hover:bg-primary/5 transition-colors animate-in fade-in slide-in-from-left-4 duration-500"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-2xl bg-primary text-white font-black text-2xl sm:text-3xl flex items-center justify-center italic shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              {letter}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg sm:text-xl font-black uppercase tracking-tight leading-none">{word}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-1 leading-snug">
                {tagline}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-[10px] font-black text-primary uppercase tracking-[0.35em]">
        Six letters · One promise
      </p>
    </section>
  );
}

/* -----------------------------------------------------------
 * 3. CARD — collapsible "About ViMore" entry.
 *    Used on /settings.
 * --------------------------------------------------------- */
export function AcronymCard({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "bg-white dark:bg-card border border-primary/10 rounded-[2rem] overflow-hidden shadow-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-primary uppercase tracking-[0.35em]">About ViMore</p>
          <p className="text-sm font-black uppercase tracking-tight leading-tight mt-0.5">
            What the name stands for
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground/60 transition-transform duration-300",
            open && "rotate-180 text-primary"
          )}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {LETTERS.map(({ letter, word, tagline }) => (
            <div
              key={letter}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
            >
              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary text-white font-black italic text-lg flex items-center justify-center">
                {letter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black uppercase tracking-tight leading-none">{word}</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{tagline}</p>
              </div>
            </div>
          ))}
          <p className="pt-2 text-center text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">
            ViMore · Media Tech Liberia
          </p>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------
 * 4. RIBBON — slim marquee at the bottom of the home feed.
 * --------------------------------------------------------- */
export function AcronymRibbon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden border-y border-primary/5 bg-primary/[0.03] py-3",
        className
      )}
      aria-label="V.I.M.O.R.E. — Value Innovation Moving Our Region Everywhere"
    >
      <div className="flex gap-10 whitespace-nowrap animate-[marquee_28s_linear_infinite]">
        {[0, 1].map(loop => (
          <div key={loop} className="flex gap-10 shrink-0">
            {LETTERS.map(({ letter, word }) => (
              <span
                key={`${loop}-${letter}`}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary/70"
              >
                <span className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center italic font-black text-xs">
                  {letter}
                </span>
                {word}
              </span>
            ))}
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
