
"use client";

import { LiteLink as Link } from "@/components/ui/lite-link";
import { Search, Plus, Menu, Bell, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreatePostModal } from "@/components/post/create-post-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/context/NotificationContext";
import { usePosts } from "@/context/PostContext";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview } from "@/lib/adaptive-media";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const PulseBadge = ({ count }: { count: number }) => {
  if (!count || count <= 0) return null;
  return (
    <div className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[8px] font-black h-4.5 w-4.5 min-w-[18px] rounded-full flex items-center justify-center border-2 border-white dark:border-background shadow-lg shadow-primary/20 animate-in zoom-in duration-300">
      {count > 9 ? '9+' : count}
    </div>
  );
};

export function Header() {
  const { unreadCount = 0, categoryPulses = { MESSAGES: 0, HOME: 0, FRIENDS: 0, MUSIC: 0, ADMIN: 0 }, clearPulse } = useNotifications();
  const { setSearchOpen, currentUser = { name: "Guest", avatar: "" }, settings } = usePosts();
  const { t } = useTranslation();
  const { tier } = useNetwork();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-primary/10 px-4 py-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group" onClick={() => clearPulse('HOME')}>
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-105">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-2/3 h-2/3">
              <path d="M3 7L10 19L17 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 15L17 7L21 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-headline font-bold text-xl tracking-tight text-primary">ViMore</span>
        </Link>
        <div className="hidden sm:block relative group max-w-[160px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
          <Input 
            placeholder={t('ui_search_vimore')} 
            className="pl-10 rounded-full bg-secondary/50 border-none focus-visible:ring-primary h-9 text-sm cursor-pointer" 
            readOnly
            onClick={() => setSearchOpen(true)}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <CreatePostModal>
          <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50">
            <Plus className="h-5 w-5" />
          </Button>
        </CreatePostModal>
        
        <Link href="/notifications" className="relative group">
          <Button variant="ghost" size="icon" className={cn(
            "rounded-full bg-secondary/50 transition-all",
            unreadCount > 0 && "text-primary bg-primary/5 shadow-[0_0_10px_rgba(153,64,229,0.2)]"
          )}>
            <Bell className={cn("h-5 w-5", unreadCount > 0 && "animate-pulse")} />
          </Button>
          <PulseBadge count={unreadCount} />
        </Link>

        
        <Link href="/profile" className="hidden sm:block ml-1 group">
          <Avatar className="h-9 w-9 border-2 border-primary/10 transition-transform group-hover:scale-105">
            <AvatarImage src={getAdaptivePreview(currentUser?.avatar, 'avatar', tier) || currentUser?.avatar} alt={currentUser?.name} />
            <AvatarFallback>{currentUser?.name?.[0] || 'V'}</AvatarFallback>
          </Avatar>
        </Link>

        <Link href="/messages" className="relative group" onClick={() => clearPulse('MESSAGES')}>
          <Button variant="ghost" size="icon" className={cn(
            "rounded-full bg-secondary/50 transition-all",
            (categoryPulses?.MESSAGES || 0) > 0 && "text-primary bg-primary/5 shadow-[0_0_10px_rgba(153,64,229,0.2)]"
          )}>
            <MessageCircle className="h-5 w-5" />
          </Button>
          <PulseBadge count={categoryPulses?.MESSAGES || 0} />
        </Link>

        <Link href="/menu" className="lg:hidden relative">
          <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <PulseBadge count={(unreadCount || 0) + (categoryPulses?.MESSAGES || 0) + Object.values(categoryPulses || {}).reduce((a, b) => a + b, 0)} />
        </Link>
      </div>
    </header>
  );
}
