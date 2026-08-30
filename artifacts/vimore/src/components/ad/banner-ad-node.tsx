"use client";

import { useEffect, useRef } from "react";

/**
 * @fileOverview ViMore Banner Ad Node
 * A specialized component for materializing 468x60 high-velocity advertisement pulses.
 * Leverages an isolated iframe handshake to prevent global script conflicts.
 *
 * The ad network publisher key is configured via NEXT_PUBLIC_AD_NETWORK_KEY.
 * Falls back to the default key if the env var is not set.
 */

const AD_KEY =
  process.env.NEXT_PUBLIC_AD_NETWORK_KEY || "1beca14f1ca06286fc5fb1922aed9308";

export function BannerAdNode() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <body style="margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden;">
          <script type="text/javascript">
            atOptions = {
              'key' : '${AD_KEY}',
              'format' : 'iframe',
              'height' : 60,
              'width' : 468,
              'params' : {}
            };
          </script>
          <script type="text/javascript" src="https://www.highperformanceformat.com/${AD_KEY}/invoke.js"></script>
        </body>
      </html>
    `);
    doc.close();

    return () => {
      if (iframe) {
        iframe.src = "about:blank";
      }
    };
  }, []);

  return (
    <div className="w-full flex justify-center py-6 overflow-hidden animate-in fade-in duration-700">
      <div className="relative group p-1.5 bg-white/5 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-primary/10 shadow-sm transition-all hover:border-primary/20 hover:shadow-primary/5">
        <div className="absolute -top-2 -left-2 flex items-center gap-1.5 bg-background border border-primary/10 px-2 py-0.5 rounded-full z-10 shadow-sm">
          <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Sponsored Node</span>
        </div>
        <iframe
          ref={iframeRef}
          className="w-[468px] h-[60px] border-none bg-transparent overflow-hidden rounded-lg"
          title="ViMore Banner Pulse"
          scrolling="no"
        />
      </div>
    </div>
  );
}
