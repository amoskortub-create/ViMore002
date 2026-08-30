"use client";

import { useState, useRef } from "react";
import {
  X,
  Gem,
  CheckCircle2,
  Loader2,
  Search,
  ChevronLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/context/PostContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GIFT_ITEMS } from "@/lib/ld-monetization";
import { authFetch } from "@/lib/auth-fetch";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  category: string;
}

const GIFT_CATEGORIES = [
  { id: "all", label: "All", emoji: "🎁" },
  { id: "love", label: "Love", emoji: "💕" },
  { id: "nature", label: "Nature", emoji: "🌸" },
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "animals", label: "Animals", emoji: "🐾" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "africa", label: "Africa", emoji: "🌍" },
  { id: "luxury", label: "Luxury", emoji: "💎" },
  { id: "power", label: "Power", emoji: "⚡" },
];

const MIN_GIFT_COST = 50;

const LEGACY_GIFTS: GiftItem[] = [
  // 💕 Love & Romance (25 gifts, 3 – 20 D) — all whole-diamond costs
  { id: "l-01", name: "Tiny Heart", emoji: "❤️", cost: 1, category: "love" },
  { id: "l-02", name: "Beating Heart", emoji: "💓", cost: 1, category: "love" },
  { id: "l-03", name: "Two Hearts", emoji: "💕", cost: 1, category: "love" },
  { id: "l-04", name: "Pink Heart", emoji: "💗", cost: 1, category: "love" },
  { id: "l-05", name: "Sparkling Heart", emoji: "💖", cost: 1, category: "love" },
  { id: "l-06", name: "Heart Ribbon", emoji: "💝", cost: 1, category: "love" },
  { id: "l-07", name: "Cupid Arrow", emoji: "💘", cost: 1, category: "love" },
  { id: "l-08", name: "Love Letter", emoji: "💌", cost: 1, category: "love" },
  { id: "l-09", name: "Red Rose", emoji: "🌹", cost: 1, category: "love" },
  { id: "l-10", name: "Pink Ribbon", emoji: "🎀", cost: 1, category: "love" },
  { id: "l-11", name: "Bouquet", emoji: "💐", cost: 1, category: "love" },
  { id: "l-12", name: "Hibiscus", emoji: "🌺", cost: 2, category: "love" },
  { id: "l-13", name: "Kiss Mark", emoji: "💋", cost: 2, category: "love" },
  { id: "l-14", name: "Teddy Bear", emoji: "🧸", cost: 2, category: "love" },
  { id: "l-15", name: "Heart Eyes", emoji: "😍", cost: 3, category: "love" },
  { id: "l-16", name: "Smiling Hearts", emoji: "🥰", cost: 3, category: "love" },
  { id: "l-17", name: "Couple Kiss", emoji: "💏", cost: 4, category: "love" },
  { id: "l-18", name: "Tulip", emoji: "🌷", cost: 4, category: "love" },
  { id: "l-19", name: "Heart Deco", emoji: "💟", cost: 5, category: "love" },
  { id: "l-20", name: "Heart Exclaim", emoji: "❣️", cost: 5, category: "love" },
  { id: "l-21", name: "Revolving Hearts", emoji: "💞", cost: 6, category: "love" },
  { id: "l-22", name: "Couple Heart", emoji: "💑", cost: 8, category: "love" },
  { id: "l-23", name: "Cherry Blossom", emoji: "🌸", cost: 10, category: "love" },
  { id: "l-24", name: "Wedding Bell", emoji: "💒", cost: 15, category: "love" },
  { id: "l-25", name: "Credit Ring", emoji: "💍", cost: 20, category: "love" },

  // 🌸 Nature & Flowers (20 gifts, 3 – 30 D)
  { id: "n-01", name: "Sunflower", emoji: "🌻", cost: 1, category: "nature" },
  { id: "n-02", name: "Blossom", emoji: "🌼", cost: 1, category: "nature" },
  { id: "n-03", name: "Four Leaf Clover", emoji: "🍀", cost: 1, category: "nature" },
  { id: "n-04", name: "Herb", emoji: "🌿", cost: 1, category: "nature" },
  { id: "n-05", name: "Potted Plant", emoji: "🪴", cost: 1, category: "nature" },
  { id: "n-06", name: "Evergreen", emoji: "🌲", cost: 1, category: "nature" },
  { id: "n-07", name: "Cactus", emoji: "🌵", cost: 1, category: "nature" },
  { id: "n-08", name: "Mushroom", emoji: "🍄", cost: 1, category: "nature" },
  { id: "n-09", name: "Ocean Wave", emoji: "🌊", cost: 2, category: "nature" },
  { id: "n-10", name: "Sunrise", emoji: "🌅", cost: 2, category: "nature" },
  { id: "n-11", name: "Crescent Moon", emoji: "🌙", cost: 3, category: "nature" },
  { id: "n-12", name: "Glowing Star", emoji: "🌟", cost: 4, category: "nature" },
  { id: "n-13", name: "Sunny Day", emoji: "☀️", cost: 5, category: "nature" },
  { id: "n-14", name: "Rainbow", emoji: "🌈", cost: 7, category: "nature" },
  { id: "n-15", name: "Snowflake", emoji: "❄️", cost: 8, category: "nature" },
  { id: "n-16", name: "Comet", emoji: "☄️", cost: 10, category: "nature" },
  { id: "n-17", name: "Earth Globe", emoji: "🌍", cost: 14, category: "nature" },
  { id: "n-18", name: "Mountain Peak", emoji: "⛰️", cost: 18, category: "nature" },
  { id: "n-19", name: "Saturn", emoji: "🪐", cost: 24, category: "nature" },
  { id: "n-20", name: "Milky Way", emoji: "🌌", cost: 30, category: "nature" },

  // 🍕 Food & Treats (20 gifts, 3 – 25 D)
  { id: "f-01", name: "Lollipop", emoji: "🍭", cost: 1, category: "food" },
  { id: "f-02", name: "Candy", emoji: "🍬", cost: 1, category: "food" },
  { id: "f-03", name: "Chocolate", emoji: "🍫", cost: 1, category: "food" },
  { id: "f-04", name: "Cookie", emoji: "🍪", cost: 1, category: "food" },
  { id: "f-05", name: "Cupcake", emoji: "🧁", cost: 1, category: "food" },
  { id: "f-06", name: "Donut", emoji: "🍩", cost: 1, category: "food" },
  { id: "f-07", name: "Strawberry", emoji: "🍓", cost: 1, category: "food" },
  { id: "f-08", name: "Birthday Cake", emoji: "🎂", cost: 2, category: "food" },
  { id: "f-09", name: "Cherries", emoji: "🍒", cost: 2, category: "food" },
  { id: "f-10", name: "Mango", emoji: "🥭", cost: 3, category: "food" },
  { id: "f-11", name: "Grapes", emoji: "🍇", cost: 3, category: "food" },
  { id: "f-12", name: "Pizza Slice", emoji: "🍕", cost: 4, category: "food" },
  { id: "f-13", name: "Burger", emoji: "🍔", cost: 5, category: "food" },
  { id: "f-14", name: "Sushi", emoji: "🍣", cost: 6, category: "food" },
  { id: "f-15", name: "Taco", emoji: "🌮", cost: 7, category: "food" },
  { id: "f-16", name: "Ramen Bowl", emoji: "🍜", cost: 8, category: "food" },
  { id: "f-17", name: "Lobster", emoji: "🦞", cost: 10, category: "food" },
  { id: "f-18", name: "Coffee Cup", emoji: "☕", cost: 14, category: "food" },
  { id: "f-19", name: "Champagne", emoji: "🍾", cost: 18, category: "food" },
  { id: "f-20", name: "Luxury Feast", emoji: "🥂", cost: 25, category: "food" },

  // 🐾 Animals (20 gifts, 3 – 35 D)
  { id: "a-01", name: "Puppy", emoji: "🐶", cost: 1, category: "animals" },
  { id: "a-02", name: "Kitten", emoji: "🐱", cost: 1, category: "animals" },
  { id: "a-03", name: "Bunny", emoji: "🐰", cost: 1, category: "animals" },
  { id: "a-04", name: "Hamster", emoji: "🐹", cost: 1, category: "animals" },
  { id: "a-05", name: "Parrot", emoji: "🦜", cost: 2, category: "animals" },
  { id: "a-06", name: "Butterfly", emoji: "🦋", cost: 2, category: "animals" },
  { id: "a-07", name: "Panda", emoji: "🐼", cost: 3, category: "animals" },
  { id: "a-08", name: "Fox", emoji: "🦊", cost: 4, category: "animals" },
  { id: "a-09", name: "Penguin", emoji: "🐧", cost: 5, category: "animals" },
  { id: "a-10", name: "Lion", emoji: "🦁", cost: 6, category: "animals" },
  { id: "a-11", name: "Tiger", emoji: "🐯", cost: 8, category: "animals" },
  { id: "a-12", name: "Elephant", emoji: "🐘", cost: 9, category: "animals" },
  { id: "a-13", name: "Giraffe", emoji: "🦒", cost: 11, category: "animals" },
  { id: "a-14", name: "Eagle", emoji: "🦅", cost: 14, category: "animals" },
  { id: "a-15", name: "Shark", emoji: "🦈", cost: 17, category: "animals" },
  { id: "a-16", name: "Dolphin", emoji: "🐬", cost: 20, category: "animals" },
  { id: "a-17", name: "Cheetah", emoji: "🐆", cost: 24, category: "animals" },
  { id: "a-18", name: "Dragon", emoji: "🐉", cost: 28, category: "animals" },
  { id: "a-19", name: "Unicorn", emoji: "🦄", cost: 32, category: "animals" },
  { id: "a-20", name: "Phoenix", emoji: "🦅", cost: 35, category: "animals" },

  // 🎵 Music & Arts (15 gifts, 3 – 30 D)
  { id: "m-01", name: "Musical Note", emoji: "🎵", cost: 1, category: "music" },
  { id: "m-02", name: "Music Notes", emoji: "🎶", cost: 2, category: "music" },
  { id: "m-03", name: "Guitar", emoji: "🎸", cost: 3, category: "music" },
  { id: "m-04", name: "Drumset", emoji: "🥁", cost: 4, category: "music" },
  { id: "m-05", name: "Piano", emoji: "🎹", cost: 5, category: "music" },
  { id: "m-06", name: "Trumpet", emoji: "🎺", cost: 6, category: "music" },
  { id: "m-07", name: "Violin", emoji: "🎻", cost: 7, category: "music" },
  { id: "m-08", name: "Microphone", emoji: "🎤", cost: 9, category: "music" },
  { id: "m-09", name: "Headphones", emoji: "🎧", cost: 10, category: "music" },
  { id: "m-10", name: "Theater Masks", emoji: "🎭", cost: 12, category: "music" },
  { id: "m-11", name: "Artist Palette", emoji: "🎨", cost: 15, category: "music" },
  { id: "m-12", name: "Film Camera", emoji: "🎬", cost: 18, category: "music" },
  { id: "m-13", name: "Radio", emoji: "📻", cost: 21, category: "music" },
  { id: "m-14", name: "Concert Stage", emoji: "🎪", cost: 25, category: "music" },
  { id: "m-15", name: "Grand Trophy", emoji: "🏆", cost: 30, category: "music" },

  // 🌍 African Pride (15 gifts, 3 – 50 D)
  { id: "af-01", name: "Africa Globe", emoji: "🌍", cost: 2, category: "africa" },
  { id: "af-02", name: "Savanna Sun", emoji: "🌅", cost: 4, category: "africa" },
  { id: "af-03", name: "Djembe Drum", emoji: "🥁", cost: 5, category: "africa" },
  { id: "af-04", name: "Tropical Bloom", emoji: "🌺", cost: 7, category: "africa" },
  { id: "af-05", name: "Baobab Tree", emoji: "🌳", cost: 9, category: "africa" },
  { id: "af-06", name: "Savanna Lion", emoji: "🦁", cost: 12, category: "africa" },
  { id: "af-07", name: "Rising Flame", emoji: "🔥", cost: 15, category: "africa" },
  { id: "af-08", name: "Rising Star", emoji: "⭐", cost: 18, category: "africa" },
  { id: "af-09", name: "Warrior Crown", emoji: "👑", cost: 22, category: "africa" },
  { id: "af-10", name: "African Eagle", emoji: "🦅", cost: 26, category: "africa" },
  { id: "af-11", name: "Nile Wave", emoji: "🌊", cost: 30, category: "africa" },
  { id: "af-12", name: "Kilimanjaro", emoji: "🏔️", cost: 35, category: "africa" },
  { id: "af-13", name: "Credit Mine", emoji: "💎", cost: 40, category: "africa" },
  { id: "af-14", name: "Liberia Flag", emoji: "🏴", cost: 45, category: "africa" },
  { id: "af-15", name: "African King", emoji: "🔱", cost: 50, category: "africa" },

  // 💎 Luxury (20 gifts, 5 – 80 D)
  { id: "lx-01", name: "Quartz Gem", emoji: "💎", cost: 5, category: "luxury" },
  { id: "lx-02", name: "Amethyst", emoji: "🔮", cost: 7, category: "luxury" },
  { id: "lx-03", name: "Sapphire", emoji: "💠", cost: 9, category: "luxury" },
  { id: "lx-04", name: "Candle", emoji: "🕯️", cost: 11, category: "luxury" },
  { id: "lx-05", name: "Ancient Key", emoji: "🗝️", cost: 13, category: "luxury" },
  { id: "lx-06", name: "Luxury Watch", emoji: "⌚", cost: 16, category: "luxury" },
  { id: "lx-07", name: "Crown Jewel", emoji: "👑", cost: 20, category: "luxury" },
  { id: "lx-08", name: "Pearl Necklace", emoji: "📿", cost: 24, category: "luxury" },
  { id: "lx-09", name: "Gold Medal", emoji: "🏅", cost: 28, category: "luxury" },
  { id: "lx-10", name: "VIP Badge", emoji: "🎖️", cost: 32, category: "luxury" },
  { id: "lx-11", name: "Luxury Car", emoji: "🏎️", cost: 38, category: "luxury" },
  { id: "lx-12", name: "Private Jet", emoji: "✈️", cost: 44, category: "luxury" },
  { id: "lx-13", name: "Yacht", emoji: "⛵", cost: 50, category: "luxury" },
  { id: "lx-14", name: "Royal Scepter", emoji: "🔱", cost: 56, category: "luxury" },
  { id: "lx-15", name: "Penthouse", emoji: "🏰", cost: 62, category: "luxury" },
  { id: "lx-16", name: "Treasure Chest", emoji: "💰", cost: 66, category: "luxury" },
  { id: "lx-17", name: "Credit Crown", emoji: "💍", cost: 70, category: "luxury" },
  { id: "lx-18", name: "Black Card", emoji: "💳", cost: 74, category: "luxury" },
  { id: "lx-19", name: "Galaxy Villa", emoji: "🏯", cost: 77, category: "luxury" },
  { id: "lx-20", name: "Ultimate Gem", emoji: "✨", cost: 80, category: "luxury" },

  // ⚡ Power & Energy (15 gifts, 15 – 100 D)
  { id: "pw-01", name: "Thunder", emoji: "⚡", cost: 15, category: "power" },
  { id: "pw-02", name: "Inferno", emoji: "🔥", cost: 20, category: "power" },
  { id: "pw-03", name: "Explosion", emoji: "💥", cost: 26, category: "power" },
  { id: "pw-04", name: "Cyclone", emoji: "🌀", cost: 32, category: "power" },
  { id: "pw-05", name: "Volcano", emoji: "🌋", cost: 38, category: "power" },
  { id: "pw-06", name: "Tsunami", emoji: "🌊", cost: 44, category: "power" },
  { id: "pw-07", name: "Comet Strike", emoji: "☄️", cost: 50, category: "power" },
  { id: "pw-08", name: "Black Hole", emoji: "🕳️", cost: 56, category: "power" },
  { id: "pw-09", name: "Supernova", emoji: "💫", cost: 62, category: "power" },
  { id: "pw-10", name: "Galaxy Force", emoji: "🌌", cost: 68, category: "power" },
  { id: "pw-11", name: "Titan Fist", emoji: "👊", cost: 74, category: "power" },
  { id: "pw-12", name: "Aurora", emoji: "🌈", cost: 80, category: "power" },
  { id: "pw-13", name: "Cosmic Storm", emoji: "⛈️", cost: 86, category: "power" },
  { id: "pw-14", name: "Legendary", emoji: "🏆", cost: 92, category: "power" },
  { id: "pw-15", name: "ViMore Max", emoji: "🚀", cost: 100, category: "power" },
];

const ALL_GIFTS: GiftItem[] = GIFT_ITEMS.map((gift) => ({
  id: gift.id,
  name: gift.name,
  emoji: gift.emoji,
  cost: gift.priceLD,
  category: gift.category,
}));

export function GiftHub() {
  const { isGiftHubOpen, closeGiftHub, currentUser, targetUserForGift, triggerHaptic } = usePosts();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const filteredGifts = ALL_GIFTS.filter((g) => {
    if (g.cost < MIN_GIFT_COST) return false;
    const matchCat = activeCategory === "all" || g.category === activeCategory;
    const matchSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSelectGift = (gift: GiftItem) => {
    triggerHaptic(10);
    setSelectedGift((prev) => prev?.id === gift.id ? null : gift);
  };

  const handleConfirmSend = async () => {
    if (!selectedGift || !targetUserForGift) return;
    setIsSyncing(true);
    triggerHaptic(30);
    try {
      const creatorUserId = targetUserForGift.$id;
      if (!window.confirm(`Pay ${selectedGift.cost} LD to ${targetUserForGift.name} via Orange Money?`)) return;
      const ussdResponse = await authFetch('/api/monetization/generate-ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorUserId, amountLD: selectedGift.cost }),
      });
      if (!ussdResponse.ok) throw new Error((await ussdResponse.json()).error || 'Orange Money account unavailable.');
      const { dialerUri } = await ussdResponse.json();
      const transactionResponse = await authFetch('/api/monetization/log-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverUserId: creatorUserId, transactionType: 'gift', amountLD: selectedGift.cost, itemId: selectedGift.id, itemType: 'gift_item' }),
      });
      if (!transactionResponse.ok) throw new Error((await transactionResponse.json()).error || 'Could not create payment record.');
      window.location.href = dialerUri;
      setIsSuccess(true);
      triggerHaptic(100);
      setTimeout(() => {
        setIsSuccess(false);
        setSelectedGift(null);
        closeGiftHub();
      }, 2800);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gift Failed", description: e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isGiftHubOpen) return null;

  const canAfford = Boolean(selectedGift);

  return (
    <Sheet open={isGiftHubOpen} onOpenChange={(open) => !open && closeGiftHub()}>
      <SheetContent
        side="bottom"
        className="p-0 border-0 bg-transparent h-[92vh] flex flex-col overflow-hidden rounded-t-[2rem]"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-[#080C14] rounded-t-[2rem]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(6,182,212,0.12),_transparent_60%)] rounded-t-[2rem]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.08),_transparent_60%)] rounded-t-[2rem]" />

        {/* Drag handle */}
        <div className="relative z-10 flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {isSuccess ? (
          /* ── Success Screen ── */
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/30 blur-3xl rounded-full scale-150" />
              <div className="relative h-28 w-28 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-cyan-500/40">
                <CheckCircle2 className="h-14 w-14 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-center space-y-2 px-8">
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                Gift Sent!
              </h3>
              <p className="text-sm font-bold text-white/50 uppercase tracking-widest">
                {selectedGift?.emoji} {selectedGift?.name} → @{targetUserForGift?.username}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-5 py-3">
              <Gem className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-black text-cyan-400">{selectedGift?.cost} LD payment started</span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* ── Header ── */}
            <div className="shrink-0 px-5 pt-2 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Send a Gift</h2>
                  <p className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-widest mt-0.5">
                    to @{targetUserForGift?.username}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Credit balance */}
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                    <div className="h-5 w-5 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Gem className="h-3 w-3 text-cyan-400" />
                    </div>
                    <span className="text-sm font-black text-white tabular-nums">LD</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase">Orange Money</span>
                  </div>
                  <button
                    onClick={closeGiftHub}
                    className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search gifts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 text-sm text-white placeholder:text-white/25 font-medium focus:outline-none focus:border-cyan-500/40 focus:bg-white/8 transition-all"
                />
              </div>

              {/* Category pills */}
              <div
                ref={categoryScrollRef}
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
                style={{ scrollbarWidth: "none" }}
              >
                {GIFT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { triggerHaptic(5); setActiveCategory(cat.id); setSearchQuery(""); }}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200",
                      activeCategory === cat.id
                        ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/80"
                    )}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Gift Grid ── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-36">
              {filteredGifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <span className="text-3xl">🔍</span>
                  <p className="text-white/30 text-sm font-bold uppercase tracking-widest">No gifts found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                  {filteredGifts.map((gift) => {
                    const isSelected = selectedGift?.id === gift.id;
                    const affordable = true;
                    return (
                      <button
                        key={gift.id}
                        onClick={() => handleSelectGift(gift)}
                        className={cn(
                          "group relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all duration-200 active:scale-95",
                          isSelected
                            ? "bg-cyan-500/15 ring-2 ring-cyan-400/60 scale-[1.04]"
                            : affordable
                            ? "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]"
                            : "bg-white/[0.02] border border-white/[0.04] opacity-50"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-cyan-400/5 rounded-2xl" />
                        )}
                        {/* Emoji */}
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 relative z-10",
                          isSelected ? "bg-cyan-500/20 scale-110" : "bg-white/5"
                        )}>
                          {gift.emoji}
                        </div>
                        {/* Name */}
                        <p className="text-[7.5px] font-black uppercase tracking-wide text-white/50 text-center leading-tight line-clamp-1 w-full relative z-10">
                          {gift.name}
                        </p>
                        {/* Price */}
                        <div className="flex items-center gap-0.5 relative z-10">
                          <span className={cn("text-[8px] font-black", isSelected ? "text-cyan-400" : "text-cyan-500/60")}>LD</span>
                          <span className={cn(
                            "text-[10px] font-black tabular-nums",
                            isSelected ? "text-cyan-300" : "text-white/60"
                          )}>
                            {gift.cost}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 h-3.5 w-3.5 bg-cyan-400 rounded-full flex items-center justify-center z-10">
                            <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Bottom Action Bar ── */}
            <div className="absolute bottom-0 left-0 right-0 z-50">
              <div className="bg-gradient-to-t from-[#080C14] via-[#080C14]/95 to-transparent pt-8 pb-6 px-4">
                {selectedGift ? (
                  <div className="flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Gift preview */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 h-16 flex items-center gap-3">
                      <span className="text-2xl">{selectedGift.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Sending</p>
                        <p className="text-sm font-black text-white truncate">{selectedGift.name}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1 shrink-0">
                        <Gem className="h-4 w-4 text-cyan-400" />
                        <span className="text-lg font-black text-cyan-300 tabular-nums">
                          {selectedGift.cost < 1 ? selectedGift.cost.toFixed(2) : selectedGift.cost % 1 === 0 ? selectedGift.cost.toFixed(0) : selectedGift.cost.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Send button */}
                    <Button
                      onClick={handleConfirmSend}
                      disabled={isSyncing || !canAfford}
                      className={cn(
                        "h-16 px-8 rounded-2xl font-black italic uppercase tracking-widest text-sm shadow-2xl transition-all active:scale-95 shrink-0",
                        canAfford
                          ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-cyan-500/30 hover:from-cyan-400 hover:to-cyan-500"
                          : "bg-white/10 text-white/30 cursor-not-allowed"
                      )}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : !canAfford ? (
                        "Unavailable"
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">
                      Tap a gift to select it
                    </p>
                    <Link href="/currency" onClick={closeGiftHub}>
                      <button className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2">
                        <Gem className="h-3 w-3 text-cyan-400" />
                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Top Up</span>
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
