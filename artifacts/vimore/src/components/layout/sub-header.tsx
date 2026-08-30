
"use client";

import { LiteLink as Link } from "@/components/ui/lite-link";
import { 
  Home, 
  Users, 
  Search, 
  Music2,
  Film,
  Coins,
  Gem, 
  Star,
  User,
  Wallet,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Zap,
  EyeOff,
  Activity,
  Wifi,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useNotifications, PulseCategory } from "@/context/NotificationContext";
import { useTranslation } from "@/context/LanguageContext";
import { useNetwork } from "@/context/NetworkContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const PulseBadge = ({ count }: { count: number }) => {
  if (!count || count <= 0) return null;
  return (
    <div className="absolute -top-1 -right-1 bg-primary text-white text-[7px] font-black h-3.5 w-3.5 min-w-[14px] rounded-full flex items-center justify-center border border-white dark:border-background shadow-sm animate-in zoom-in duration-300">
      {count > 9 ? '9+' : count}
    </div>
  );
};

export function SubHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { setSearchOpen, currentUser = { name: "Guest", avatar: "", goldBalance: 0, diamondBalance: 0, starBalance: 0, isVerified: false }, settings, receivedRequestUsernames, withdrawalHistory, paymentRequests, reports, tickets } = usePosts();
  const { triggerHaptic } = useMusic();
  const { categoryPulses = { HOME: 0, FRIENDS: 0, MUSIC: 0, MESSAGES: 0, ADMIN: 0 }, clearPulse } = useNotifications();
  const pendingRequests = receivedRequestUsernames?.size || 0;
  const { t } = useTranslation();
  const { tier, setForcedTier } = useNetwork();

  const cycleTier = () => {
    triggerHaptic(10);
    if (tier === 'lite') setForcedTier('standard');
    else if (tier === 'standard') setForcedTier('rich');
    else setForcedTier('lite');
  };

  const userRole = (currentUser as any)?.role || 'USER';
  const isAdmin = userRole === 'SUPER' || userRole === 'MODERATOR' || userRole === 'FINANCIAL';

  const staticAdminCount = isAdmin
    ? ((withdrawalHistory as any[])?.filter((w) => w.status === 'pending')?.length || 0)
      + ((paymentRequests as any[])?.filter((p) => p.status === 'pending')?.length || 0)
      + ((tickets as any[])?.filter((tk) => tk.status === 'open')?.length || 0)
      + ((reports as any[])?.filter((r) => r.status === 'pending' || r.status === 'open')?.length || 0)
    : 0;
  const adminBadgeCount = staticAdminCount + (categoryPulses?.ADMIN || 0);

  const navItems: { icon: any; label: string; id: string; href: string; category: PulseCategory }[] = [
    { icon: Home, label: t('sub_home'), id: "home", href: "/", category: "HOME" },
    { icon: Users, label: t('sub_friends'), id: "friends", href: "/friends", category: "FRIENDS" },
    { icon: Film, label: t('nav_reels'), id: "reels", href: "/reels", category: "HOME" },
    { icon: Music2, label: t('sub_music'), id: "music", href: "/music", category: "MUSIC" },
  ];

  const handleNav = (href: string) => {
    triggerHaptic(5);
    router.push(href);
  };

  return (
    <div className="w-full bg-white dark:bg-card border-b border-primary/5 sticky top-[61px] z-40 shadow-sm transition-all duration-300">
      <div className="max-w-[1440px] mx-auto px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Navigation Tabs */}
        <nav className="flex items-center h-full shrink-0">
          {navItems.map((item) => {
            const isLinkActive = pathname === item.href;
            const isHomeActive = item.href === "/" && pathname === "/";
            const isActive = isLinkActive || isHomeActive;
            const pulseCount = categoryPulses?.[item.category] || 0;

            const showDot = (item.id === "reels" || item.id === "music");
            const realtimeFriendPulse = categoryPulses?.FRIENDS || 0;
            const friendBadge = item.id === "friends"
              ? Math.max(pendingRequests, realtimeFriendPulse)
              : 0;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => { triggerHaptic(5); clearPulse(item.category); }}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 h-full relative transition-colors group",
                  isActive 
                    ? "text-primary font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className={cn("w-5 h-5", isActive ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                  {showDot && (
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full shadow-[0_0_6px_rgba(153,64,229,0.9)]" />
                  )}
                  {friendBadge > 0 && <PulseBadge count={friendBadge} />}
                </div>
                <span className="hidden sm:inline text-sm">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Command Core — only for SUPER, MODERATOR, FINANCIAL */}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => triggerHaptic(5)}
            className={cn(
              "relative flex items-center justify-center h-full px-2.5 sm:px-4 transition-colors group shrink-0",
              pathname === "/admin" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <Activity className={cn("w-5 h-5 group-hover:scale-110 transition-transform", pathname === "/admin" && "scale-110")} />
              {adminBadgeCount > 0 && <PulseBadge count={adminBadgeCount} />}
            </div>
            {pathname === "/admin" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </Link>
        )}

        {/* Search and Profile Section */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end min-w-0">
          <div className="relative group w-full max-w-[120px] xs:max-w-[160px] sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={t('ui_search')} 
              className="pl-8 pr-2 rounded-xl bg-secondary/30 border-none focus-visible:ring-primary h-8 sm:h-9 text-xs sm:text-sm cursor-pointer" 
              readOnly
              onClick={() => setSearchOpen(true)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div 
                className="shrink-0 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all group active:scale-95"
                onClick={() => triggerHaptic(5)}
              >
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-bold leading-none group-hover:text-primary transition-colors">{currentUser?.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t('sub_wallet_pulse')}</p>
                </div>
                <div className="relative">
                  <Avatar className={cn(
                    "h-8 w-8 sm:h-9 sm:w-9 border-2 transition-all duration-500 shadow-sm",
                    settings.isGhostMode ? "border-zinc-500 opacity-60" : "border-primary/10"
                  )}>
                    <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
                    <AvatarFallback>{currentUser?.name?.[0] || 'V'}</AvatarFallback>
                  </Avatar>
                  {settings.isGhostMode && (
                    <div className="absolute -bottom-1 -right-1 bg-zinc-800 rounded-full p-0.5 border border-white dark:border-background shadow-lg">
                      <EyeOff className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-[1.5rem] p-2 shadow-2xl border-primary/10 animate-in zoom-in-95 duration-200">
              <DropdownMenuLabel className="p-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('ui_identity_vault')}</span>
                    {settings.isGhostMode && <Badge className="bg-zinc-100 text-zinc-800 border-none text-[7px] font-black h-3 px-1.5 rounded uppercase">Ghost</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black italic uppercase tracking-tighter text-lg">{currentUser?.name}</span>
                    {currentUser?.isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-primary fill-primary text-white" />}
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator className="bg-primary/5" />
              
              <div className="p-2 space-y-1">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border border-transparent hover:border-primary/10 transition-all">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('sub_energy_stars')}</span>
                  </div>
                  <span className="text-sm font-black tabular-nums">{(currentUser?.starBalance || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border border-transparent hover:border-primary/10 transition-all">
                  <div className="flex items-center gap-2">
                    <Gem className="h-4 w-4 text-cyan-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('sub_energy_diamonds')}</span>
                  </div>
                  <span className="text-sm font-black tabular-nums">{currentUser?.diamondBalance || 0}</span>
                </div>
              </div>

              <DropdownMenuSeparator className="bg-primary/5" />

              <div className="px-2 pb-1">
                <button
                  onClick={cycleTier}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border border-transparent hover:border-primary/10 transition-all active:scale-95"
                >
                  <div className="flex items-center gap-2">
                    <Wifi className={cn(
                      "h-4 w-4",
                      tier === 'lite' ? "text-amber-500" : tier === 'standard' ? "text-blue-500" : "text-emerald-500"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Network Mode</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 h-5 rounded-full text-[9px] font-black uppercase tracking-widest",
                    tier === 'lite'
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      : tier === 'standard'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  )}>
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      tier === 'lite' ? "bg-amber-500" : tier === 'standard' ? "bg-blue-500" : "bg-emerald-500 animate-pulse"
                    )} />
                    {tier === 'lite' ? 'Lite' : tier === 'standard' ? 'Standard' : 'Rich'}
                  </div>
                </button>
              </div>

              <DropdownMenuSeparator className="bg-primary/5" />

              <DropdownMenuItem className="gap-3 p-3 rounded-xl cursor-pointer group" onClick={() => handleNav('/profile')}>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">{t('nav_profile')}</span>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Workspace Node</span>
                </div>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-40" />
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-3 p-3 rounded-xl cursor-pointer group" onClick={() => handleNav('/currency')}>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">{t('menu_currency_hub')}</span>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Purchase Energy</span>
                </div>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-40" />
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-3 p-3 rounded-xl cursor-pointer group" onClick={() => handleNav('/earnings')}>
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-green-600">{t('menu_earnings_hub')}</span>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Withdraw Assets</span>
                </div>
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-40" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
