
"use client";

import { LiteLink as Link } from "@/components/ui/lite-link";
import { usePathname } from "next/navigation";
import { Home, User, MessageCircle, PlusSquare, Compass, Menu, Music2, Bell, Activity, Film, Megaphone, Sparkles, Ticket, Building2, ShoppingBag, Code2, Bot, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNotifications, PulseCategory } from "@/context/NotificationContext";
import { usePosts } from "@/context/PostContext";
import { useTranslation } from "@/context/LanguageContext";
import { useAdminAlerts } from "@/context/AdminAlertsContext";

const PulseBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  return (
    <div className="bg-primary text-white text-[10px] font-black h-5 w-5 min-w-[20px] rounded-full flex items-center justify-center shadow-lg shadow-primary/20 animate-in zoom-in duration-300">
      {count > 9 ? '9+' : count}
    </div>
  );
};

export function MainNav() {
  const pathname = usePathname();
  const { unreadCount, categoryPulses, clearPulse, unreadMessageCount } = useNotifications();
  const { settings, currentUser } = usePosts();
  const { t } = useTranslation();
  const { totalAdminAlerts, resetEconomyBadge, resetTicketsBadge } = useAdminAlerts();

  const isAdmin = currentUser?.role && currentUser.role !== 'USER';

  const navItems: { icon: any; label: string; href: string; badge?: number; category?: PulseCategory; isHidden?: boolean }[] = [
    { icon: Home, label: t('nav_home'), href: "/", category: "HOME" },
    { icon: Compass, label: t('nav_explore'), href: "/explore" },
    { icon: Ticket, label: "Tickets", href: "/tickets" },
    { icon: ShoppingBag, label: "Marketplace", href: "/marketplace" },
    { icon: Film, label: t('nav_reels'), href: "/reels" },
    { icon: Music2, label: t('nav_music'), href: "/music", category: "MUSIC", isHidden: !settings.isMusicEnabled },
    { icon: Bell, label: t('nav_notifications'), href: "/notifications", badge: unreadCount },
    { icon: MessageCircle, label: t('nav_messages'), href: "/messages", category: "MESSAGES", badge: unreadMessageCount > 0 ? unreadMessageCount : undefined },
    { icon: User, label: t('nav_profile'), href: "/profile" },
    { icon: Activity, label: t('nav_admin'), href: "/admin", category: "ADMIN" as PulseCategory, isHidden: !isAdmin },
    { icon: Megaphone, label: "Advertise", href: "/advertise" },
    { icon: Sparkles, label: "Coming Soon", href: "/coming-soon" },
    { icon: Bot, label: "Intelligent", href: "/intelligent" },
    { icon: Building2, label: "About Us", href: "/mtl" },
    { icon: Code2, label: "Developer", href: "/developer" },
    { icon: ShieldAlert, label: "Child Safety", href: "/child-safety" },
    { icon: Menu, label: t('nav_menu'), href: "/menu" },
  ];

  return (
    <div className="flex flex-col h-full py-6 px-4 space-y-8">
      <div className="px-2">
        <Link href="/" className="flex items-center gap-2 group" onClick={() => clearPulse('HOME')}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground transition-transform group-hover:scale-110">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
              <path d="M3 7L10 19L17 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 15L17 7L21 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-headline font-bold text-2xl tracking-tight text-primary">ViMore</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.filter(item => !item.isHidden).map((item) => {
          const isActive = pathname === item.href;
          const isAdminItem = item.href === '/admin';
          const rawBadge = item.badge !== undefined ? item.badge : (item.category ? categoryPulses[item.category] : 0);
          const displayBadge = isAdminItem ? (rawBadge + totalAdminAlerts) : rawBadge;

          const handleClick = () => {
            if (item.category) clearPulse(item.category);
            if (isAdminItem) {
              resetEconomyBadge();
              resetTicketsBadge();
            }
          };

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleClick}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "hover:bg-secondary text-muted-foreground hover:text-primary"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("w-6 h-6", isActive ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                <span className="font-bold text-sm">{item.label}</span>
              </div>
              {displayBadge > 0 && !isActive && (
                <PulseBadge count={displayBadge} />
              )}
            </Link>
          );
        })}
        
        <div className="pt-4">
          <Button className="w-full rounded-2xl py-6 gap-2 font-black italic uppercase tracking-tighter text-lg bg-accent hover:bg-accent/90 shadow-xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <PlusSquare className="w-6 h-6" />
            <span>{t('action_post')}</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
