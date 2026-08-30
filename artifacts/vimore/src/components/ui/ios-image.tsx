"use client";

import { useState, useEffect, useRef } from "react";
import { isIOSDevice, fetchMediaAsBlob } from "@/lib/ios-media";
import { ImageOff } from "lucide-react";

interface IOSImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
}

export function IOSImage({ src, alt, fallback, className, style, onClick, ...rest }: IOSImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string>(src);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFetchingError, setIsFetchingError] = useState(false);
  const isIOS = useRef(false);
  const blobUrlRef = useRef<string | null>(null);
  const hasHandledError = useRef(false);

  useEffect(() => {
    isIOS.current = isIOSDevice();
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
        if (cancelled) return;
        blobUrlRef.current = blobUrl;
        setDisplaySrc(blobUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
      });

    return () => { cancelled = true; };
  }, [src]);

  const handleError = async () => {
    if (hasHandledError.current) return;
    hasHandledError.current = true;
    setIsFetchingError(true);
    try {
      const res = await fetch(src, { method: 'HEAD', credentials: 'include' });
      if (!res.ok) {
        setErrorMessage(`HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
      } else {
        setErrorMessage('media failed to render');
      }
    } catch (err: any) {
      setErrorMessage(err instanceof Error ? err.message : 'network request failed');
    } finally {
      setIsFetchingError(false);
    }
  };

  if (isFetchingError) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary/20 ${className ?? ''}`}
        style={style}
        onClick={onClick}
      >
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-secondary/20 text-center p-4 gap-2 ${className ?? ''}`}
        style={style}
        onClick={onClick}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground/40 shrink-0" />
        <p className="text-[10px] font-bold text-muted-foreground leading-relaxed max-w-[240px]">
          Your device is not fetching media from application storage bucket due to{' '}
          <span className="text-destructive">{errorMessage}</span>
        </p>
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onError={handleError}
      {...rest}
    />
  );
}
