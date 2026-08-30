"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePosts } from "@/context/PostContext";
import { ExternalLink } from "lucide-react";

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface RichTextProps {
  content: string;
  className?: string;
  isShared?: boolean;
  theme?: string;
  linkPreview?: LinkPreview | null;
}

function parseRichText(text: string) {
  const tokenRegex = /(#[\w\u00C0-\u024F]+|@[\w]+|https?:\/\/[^\s]+)/g;
  const parts: { type: 'text' | 'hashtag' | 'mention' | 'url'; value: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('#')) {
      parts.push({ type: 'hashtag', value: token });
    } else if (token.startsWith('@')) {
      parts.push({ type: 'mention', value: token });
    } else {
      parts.push({ type: 'url', value: token });
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts;
}

export function RichText({ content, className, isShared, theme, linkPreview }: RichTextProps) {
  const router = useRouter();
  const { setSearchOpen } = usePosts();

  const isThemed = !!theme;
  const parts = parseRichText(content || '');

  const handleHashtag = (tag: string) => {
    const clean = tag.replace('#', '');
    router.push(`/hashtag/${encodeURIComponent(clean)}`);
  };

  const handleMention = (mention: string) => {
    const username = mention.replace('@', '');
    router.push(`/profile/${username}`);
  };

  return (
    <div className="space-y-3">
      <p
        className={cn(
          "leading-relaxed whitespace-pre-wrap break-words",
          isThemed ? "text-2xl leading-tight font-black italic uppercase tracking-tighter" : "text-foreground",
          isShared ? "text-xs" : "text-[13px]",
          className
        )}
      >
        {parts.map((part, i) => {
          if (part.type === 'hashtag') {
            return (
              <button
                key={i}
                onClick={() => handleHashtag(part.value)}
                className={cn(
                  "font-bold hover:underline transition-colors focus:outline-none",
                  isThemed ? "text-white/90 hover:text-white" : "text-primary hover:text-primary/80"
                )}
              >
                {part.value}
              </button>
            );
          }
          if (part.type === 'mention') {
            return (
              <button
                key={i}
                onClick={() => handleMention(part.value)}
                className={cn(
                  "font-bold hover:underline transition-colors focus:outline-none",
                  isThemed ? "text-white/90 hover:text-white" : "text-blue-600 dark:text-blue-400 hover:text-blue-700"
                )}
              >
                {part.value}
              </button>
            );
          }
          if (part.type === 'url') {
            return (
              <a
                key={i}
                href={part.value}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "underline transition-colors break-all",
                  isThemed ? "text-white/80 hover:text-white" : "text-primary/80 hover:text-primary"
                )}
              >
                {part.value}
              </a>
            );
          }
          return <span key={i}>{part.value}</span>;
        })}
      </p>

      {linkPreview && linkPreview.url && !isThemed && (
        <a
          href={linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "block rounded-2xl border border-primary/10 overflow-hidden hover:border-primary/30 transition-colors bg-secondary/20 group",
            isShared ? "mt-1" : "mt-2"
          )}
        >
          {linkPreview.image && (
            <div className={cn("w-full overflow-hidden bg-secondary/40", isShared ? "h-20" : "h-40")}>
              <img
                src={linkPreview.image}
                alt={linkPreview.title || 'Link preview'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <div className="p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {linkPreview.favicon && (
                <img src={linkPreview.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <span>{linkPreview.siteName || new URL(linkPreview.url).hostname.replace('www.', '')}</span>
              <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-50 group-hover:opacity-100" />
            </div>
            {linkPreview.title && (
              <p className="font-bold text-sm leading-tight line-clamp-2">{linkPreview.title}</p>
            )}
            {linkPreview.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2">{linkPreview.description}</p>
            )}
          </div>
        </a>
      )}
    </div>
  );
}
