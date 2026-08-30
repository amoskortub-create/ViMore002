"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import { isLegacyIOS, fetchMediaAsBlob } from "@/lib/ios-media";
import { VideoOff } from "lucide-react";

interface IOSVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
  onFetchError?: (msg: string) => void;
}

export const IOSVideo = forwardRef<HTMLVideoElement, IOSVideoProps>(function IOSVideo(
  { src, poster, className, style, children, muted, controls, playsInline, onFetchError, ...rest },
  ref
) {
  const [displaySrc, setDisplaySrc] = useState<string>(src);
  const [displayPoster, setDisplayPoster] = useState<string | undefined>(poster);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFetchingError, setIsFetchingError] = useState(false);
  const isIOS = useRef(false);
  const hasHandledError = useRef(false);

  useEffect(() => {
    isIOS.current = isLegacyIOS();
  }, []);

  useEffect(() => {
    if (!src) return;
    setErrorMessage(null);
    hasHandledError.current = false;

    if (!isIOS.current) {
      setDisplaySrc(src);
      return;
    }

    let cancelled = false;
    fetchMediaAsBlob(src)
      .then((blobUrl) => {
        if (!cancelled) setDisplaySrc(blobUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        onFetchError?.(msg);
      });

    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => {
    if (!poster) { setDisplayPoster(undefined); return; }
    if (!isIOS.current) { setDisplayPoster(poster); return; }

    let cancelled = false;
    fetchMediaAsBlob(poster)
      .then((blobUrl) => { if (!cancelled) setDisplayPoster(blobUrl); })
      .catch(() => { if (!cancelled) setDisplayPoster(poster); });

    return () => { cancelled = true; };
  }, [poster]);

  const handleError = async () => {
    if (hasHandledError.current) return;
    hasHandledError.current = true;
    setIsFetchingError(true);
    try {
      const res = await fetch(src, { method: 'HEAD', credentials: 'include' });
      if (!res.ok) {
        const msg = `HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`;
        setErrorMessage(msg);
        onFetchError?.(msg);
      } else {
        const msg = 'media failed to render';
        setErrorMessage(msg);
        onFetchError?.(msg);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'network request failed';
      setErrorMessage(msg);
      onFetchError?.(msg);
    } finally {
      setIsFetchingError(false);
    }
  };

  if (isFetchingError) {
    return (
      <div
        className={`flex items-center justify-center bg-black/80 ${className ?? ''}`}
        style={style}
      >
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-black/80 text-center p-4 gap-2 ${className ?? ''}`}
        style={style}
      >
        <VideoOff className="h-8 w-8 text-white/30 shrink-0" />
        <p className="text-[10px] font-bold text-white/60 leading-relaxed max-w-[240px]">
          Your device is not fetching media from application storage bucket due to{' '}
          <span className="text-red-400">{errorMessage}</span>
        </p>
      </div>
    );
  }

  const effectiveMuted = muted ?? (isIOS.current ? true : false);

  return (
    <video
      ref={ref}
      src={displaySrc}
      poster={displayPoster}
      className={className}
      style={style}
      playsInline
      muted={effectiveMuted}
      controls={controls}
      onError={handleError}
      {...rest}
    >
      {children}
    </video>
  );
});
