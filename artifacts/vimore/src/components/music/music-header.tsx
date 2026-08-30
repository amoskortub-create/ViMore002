"use client";

import { Search, Upload, Crown, Menu, Gift, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePosts } from "@/context/PostContext";

export function MusicHeader() {
  const { currentUser } = usePosts();
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME';

  return (
    <header className="sticky top-0 z-[60] h-20 px-6 sm:px-10 flex items-center justify-between gap-6 bg-background/60 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center gap-6 flex-1 max-w-2xl">
        <Link href="/menu" className="lg:hidden">
          <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50">
            <Menu className="h-5 w-5" />
          </Button>
        </Link>
        <div className="relative group flex-1 hidden sm:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search music, artists, and hubs..." 
            className="pl-12 h-11 bg-secondary/30 border-none rounded-2xl focus-visible:ring-2 ring-primary/20 text-sm placeholder:text-muted-foreground/60 transition-all focus-visible:bg-secondary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          className="hidden md:flex items-center gap-2 border-none bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 font-black italic uppercase tracking-widest text-[10px] rounded-2xl h-10 px-6 transition-all shadow-lg shadow-primary/20"
        >
          <Crown className="h-4 w-4" />
          Go Plus
        </Button>

        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="rounded-full bg-secondary/30 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Gift Artist">
             <Gift className="h-5 w-5" />
           </Button>
           <Button variant="ghost" size="icon" className="rounded-full bg-secondary/30 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Upload Music">
             <Upload className="h-5 w-5" />
           </Button>
           <Button variant="ghost" size="icon" className="rounded-full bg-secondary/30 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Settings">
             <Settings className="h-5 w-5" />
           </Button>
           
           <div className="w-px h-8 bg-border/50 mx-1 hidden sm:block" />
           
           <Link href="/profile" className="transition-transform hover:scale-105 active:scale-90">
             <Avatar className="h-10 w-10 border-2 border-primary/10 shadow-sm">
               <AvatarImage src={currentUser?.avatar || ''} alt={currentUser?.name || 'Profile'} />
               <AvatarFallback>{initials}</AvatarFallback>
             </Avatar>
           </Link>
        </div>
      </div>
    </header>
  );
}
