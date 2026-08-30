
"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { saveCache, loadCache, OFFLINE_KEYS } from "@/lib/offline-cache";
import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { MainNav } from "@/components/layout/main-nav";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { usePosts } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { NativeAdNode } from "@/components/ad/native-ad-node";
import { databases, DATABASE_ID, COL, Query, getFileUrl, BUCKET, avatarFallback } from "@/lib/appwrite";
import { 
  Users, 
  UserPlus, 
  Search, 
  WifiOff,
  UserCheck, 
  Zap, 
  Play, 
  Volume2, 
  UserMinus, 
  Heart,
  ArrowRight,
  UserRoundCheck,
  UserRoundPlus,
  X,
  Users2,
  Check,
  Loader2,
  Rocket,
  Clock,
  MessageCircle
} from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/context/LanguageContext";
import { useNetwork } from "@/context/NetworkContext";
import { getAdaptivePreview, adaptiveFeedPageSize } from "@/lib/adaptive-media";
import FriendsLoading from "./loading";

type HubTab = "add" | "confirm" | "friends" | "pending";

function FriendsPageContent() {
  const { tier } = useNetwork();
  const pageMultiplier = tier === 'lite' ? 4 : tier === 'standard' ? 6 : 10;
  const friendsPageLimit = adaptiveFeedPageSize(tier) * pageMultiplier;
  const requestsPageLimit = Math.max(10, Math.floor(friendsPageLimit / 2));
  const { connections = [], isFriend, isRequestSent, isRequestReceived, sendFriendRequest, confirmFriendRequest, cancelFriendRequest, unfriendUser, currentUser, friendUsernames, followerUsernames, isLoading, isOffline, posts } = usePosts();
  const { currentTrack, isExpanded, triggerHaptic } = useMusic();
  const { t } = useTranslation();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<HubTab>("add");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  const [discoveryUsers, setDiscoveryUsers] = useState<any[]>(() => loadCache<any>(OFFLINE_KEYS.FRIENDS_DISCOVERY));
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false);

  const [confirmReceivedUsers, setConfirmReceivedUsers] = useState<any[]>(() => loadCache<any>(OFFLINE_KEYS.FRIENDS_CONFIRM));
  const [isLoadingConfirm, setIsLoadingConfirm] = useState(false);

  const [pendingUsers, setPendingUsers] = useState<any[]>(() => loadCache<any>(OFFLINE_KEYS.FRIENDS_PENDING));
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [cancellingUser, setCancellingUser] = useState<string | null>(null);

  const [confirmUser, setConfirmUser] = useState<any | null>(null);
  const [confirmType, setConfirmType] = useState<"unfriend" | "cancel">("unfriend");

  const discoveryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPlayerActive = currentTrack && !isExpanded;

  useEffect(() => {
    const tabParam = searchParams.get('tab') as HubTab;
    if (tabParam && ["add", "confirm", "friends", "pending"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const fetchDiscoveryBatch = useCallback(async () => {
    if (!currentUser) return;
    try {
      const result = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.limit(friendsPageLimit)]);
      const mapped = result.documents.map((doc: any) => ({
        $id: doc.$id,
        username: doc.username,
        name: doc.name || doc.username,
        avatar: doc.avatar_id ? getFileUrl(BUCKET.AVATARS, doc.avatar_id) : (doc.avatar || doc.avatar_url || avatarFallback(doc.name || doc.username || 'U')),
        followers: doc.followers_count || doc.followers || 0,
        category: doc.category || 'CREATOR',
        isVerified: doc.is_verified || false,
        isOnline: doc.is_online || false,
      }));
      setDiscoveryUsers(mapped);
      saveCache(OFFLINE_KEYS.FRIENDS_DISCOVERY, mapped, 50);
    } catch { }
  }, [currentUser]);

  const fetchPendingRequests = useCallback(async () => {
    if (!currentUser) return;
    try {
      const reqResult = await databases.listDocuments(DATABASE_ID, COL.FRIEND_REQUESTS, [
        Query.equal('from_user_id', currentUser.$id),
        Query.equal('status', 'PENDING'),
        Query.limit(requestsPageLimit),
      ]);
      if (reqResult.documents.length === 0) { setPendingUsers([]); saveCache(OFFLINE_KEYS.FRIENDS_PENDING, [], 50); return; }
      const toIds = reqResult.documents.map((d: any) => d.to_user_id);
      const userResults = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', toIds), Query.limit(requestsPageLimit)]);
      const mapped = userResults.documents.map((doc: any) => ({
        $id: doc.$id, username: doc.username, name: doc.name || doc.username,
        avatar: doc.avatar_id ? getFileUrl(BUCKET.AVATARS, doc.avatar_id) : (doc.avatar || doc.avatar_url || avatarFallback(doc.name || doc.username || 'U')),
        followers: doc.followers_count || doc.followers || 0, category: doc.category || 'CREATOR', isVerified: doc.is_verified || false,
      }));
      setPendingUsers(mapped);
      saveCache(OFFLINE_KEYS.FRIENDS_PENDING, mapped, 50);
    } catch { }
  }, [currentUser]);

  const fetchConfirmRequests = useCallback(async () => {
    if (!currentUser) return;
    try {
      const reqResult = await databases.listDocuments(DATABASE_ID, COL.FRIEND_REQUESTS, [
        Query.equal('to_user_id', currentUser.$id),
        Query.equal('status', 'PENDING'),
        Query.limit(friendsPageLimit),
      ]);
      if (reqResult.documents.length === 0) { setConfirmReceivedUsers([]); saveCache(OFFLINE_KEYS.FRIENDS_CONFIRM, [], 50); return; }
      const fromIds = reqResult.documents.map((d: any) => d.from_user_id);
      const userResults = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', fromIds), Query.limit(friendsPageLimit)]);
      const mapped = userResults.documents.map((doc: any) => ({
        $id: doc.$id, username: doc.username, name: doc.name || doc.username,
        avatar: doc.avatar_id ? getFileUrl(BUCKET.AVATARS, doc.avatar_id) : (doc.avatar || doc.avatar_url || avatarFallback(doc.name || doc.username || 'U')),
        followers: doc.followers_count || doc.followers || 0, category: doc.category || 'CREATOR', isVerified: doc.is_verified || false,
      }));
      setConfirmReceivedUsers(mapped);
      saveCache(OFFLINE_KEYS.FRIENDS_CONFIRM, mapped, 50);
    } catch { }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab !== 'add') { if (discoveryIntervalRef.current) { clearInterval(discoveryIntervalRef.current); discoveryIntervalRef.current = null; } return; }
    setIsLoadingDiscovery(true);
    fetchDiscoveryBatch().finally(() => setIsLoadingDiscovery(false));
    discoveryIntervalRef.current = setInterval(() => { fetchDiscoveryBatch(); }, 90000);
    return () => { if (discoveryIntervalRef.current) { clearInterval(discoveryIntervalRef.current); discoveryIntervalRef.current = null; } };
  }, [activeTab, fetchDiscoveryBatch]);

  useEffect(() => {
    if (activeTab !== 'confirm') { if (confirmIntervalRef.current) { clearInterval(confirmIntervalRef.current); confirmIntervalRef.current = null; } return; }
    setIsLoadingConfirm(true);
    fetchConfirmRequests().finally(() => setIsLoadingConfirm(false));
    confirmIntervalRef.current = setInterval(() => { fetchConfirmRequests(); }, 5000);
    return () => { if (confirmIntervalRef.current) { clearInterval(confirmIntervalRef.current); confirmIntervalRef.current = null; } };
  }, [activeTab, fetchConfirmRequests]);

  useEffect(() => {
    if (activeTab !== 'pending') { if (pendingIntervalRef.current) { clearInterval(pendingIntervalRef.current); pendingIntervalRef.current = null; } return; }
    setIsLoadingPending(true);
    fetchPendingRequests().finally(() => setIsLoadingPending(false));
    pendingIntervalRef.current = setInterval(() => { fetchPendingRequests(); }, 90000);
    return () => { if (pendingIntervalRef.current) { clearInterval(pendingIntervalRef.current); pendingIntervalRef.current = null; } };
  }, [activeTab, fetchPendingRequests]);

  useEffect(() => {
    return () => {
      if (discoveryIntervalRef.current) clearInterval(discoveryIntervalRef.current);
      if (confirmIntervalRef.current) clearInterval(confirmIntervalRef.current);
      if (pendingIntervalRef.current) clearInterval(pendingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!confirmUser) { document.body.style.pointerEvents = 'auto'; }
    return () => { document.body.style.pointerEvents = 'auto'; };
  }, [confirmUser]);

  const addFriendsUsers = useMemo(() => {
    if (!currentUser) return [];
    const now = Date.now();
    const boostedUsernames = new Set(
      (posts || [])
        .filter((p: any) => p.isBoosted && p.boostExpiry && p.boostExpiry > now)
        .map((p: any) => p.user?.username)
        .filter(Boolean)
    );
    const filtered = discoveryUsers.filter(u =>
      u.username !== currentUser.username &&
      !isFriend(u.username) &&
      !isRequestSent(u.username) &&
      !isRequestReceived(u.username)
    );
    // Sort: verified first → active boost → regular
    return filtered.sort((a, b) => {
      const score = (u: any) => (u.isVerified ? 2 : boostedUsernames.has(u.username) ? 1 : 0);
      return score(b) - score(a);
    });
  }, [discoveryUsers, currentUser, isFriend, isRequestSent, isRequestReceived, posts]);

  const confirmUsers = useMemo(() => {
    if (!currentUser) return [];
    return confirmReceivedUsers.filter(u => u.username !== currentUser.username);
  }, [confirmReceivedUsers, currentUser]);

  const friendsList = useMemo(() => {
    if (!currentUser) return [];
    return connections.filter(c => c.username !== currentUser.username && isFriend(c.username));
  }, [connections, currentUser, isFriend]);

  useEffect(() => {
    if (isOffline || friendsList.length === 0) return;
    const toCache = friendsList.slice(0, 100).map((c: any) => ({
      $id: c.$id, username: c.username, name: c.name, avatar: c.avatar,
      isVerified: c.isVerified, isOnline: c.isOnline, followers: c.followers || 0, category: c.category || 'CREATOR',
    }));
    saveCache(OFFLINE_KEYS.FRIENDS, toCache, 100);
  }, [friendsList, isOffline]);

  const filteredUsers = useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'add') list = addFriendsUsers;
    else if (activeTab === 'confirm') list = confirmUsers;
    else if (activeTab === 'friends') list = friendsList;
    else if (activeTab === 'pending') list = pendingUsers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u => (u.name || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q));
    }
    return list;
  }, [activeTab, addFriendsUsers, confirmUsers, friendsList, pendingUsers, searchQuery]);

  if (isLoading || !currentUser) return <FriendsLoading />;

  const tabs: { id: HubTab; label: string; icon: any; count?: number }[] = [
    { id: "add", label: t('friends_add'), icon: UserRoundPlus },
    { id: "confirm", label: t('friends_confirm'), icon: UserRoundCheck, count: confirmUsers.length || undefined },
    { id: "pending", label: "Pending", icon: Clock, count: pendingUsers.length || undefined },
    { id: "friends", label: t('friends_my_friends'), icon: Users2, count: friendUsernames.size || undefined },
  ];

  const handlePreviewSonic = (username: string, name: string) => {
    triggerHaptic(15);
    if (playingPreview === username) {
      setPlayingPreview(null);
    } else {
      setPlayingPreview(username);
      toast({ title: "Sonic Signature", description: `Sampling ${name}'s digital intro...`, duration: 3000 });
      setTimeout(() => setPlayingPreview(null), 3000);
    }
  };

  const handleAction = (user: any) => {
    const friend = isFriend(user.username);
    const sent = isRequestSent(user.username);
    const received = isRequestReceived(user.username);
    if (friend) { triggerHaptic(15); setConfirmType("unfriend"); setConfirmUser(user); }
    else if (sent) { triggerHaptic(10); setConfirmType("cancel"); setConfirmUser(user); }
    else if (received) { triggerHaptic(25); confirmFriendRequest(user.username); setConfirmReceivedUsers(prev => prev.filter(u => u.username !== user.username)); }
    else { triggerHaptic(20); sendFriendRequest(user.username); }
  };

  const handleCancelPending = async (user: any) => {
    if (cancellingUser === user.username) return;
    triggerHaptic(15);
    setCancellingUser(user.username);
    try {
      await cancelFriendRequest(user.username);
      setPendingUsers(prev => prev.filter(u => u.username !== user.username));
      toast({ title: "Request cancelled", description: `Request to @${user.username} cancelled.`, duration: 2500 });
    } catch {
      toast({ title: "Error", description: "Could not cancel request. Try again.", duration: 2500 });
    } finally { setCancellingUser(null); }
  };

  const confirmRemoval = () => {
    if (confirmUser) {
      triggerHaptic(30);
      const user = { ...confirmUser };
      document.body.style.pointerEvents = 'auto';
      setConfirmUser(null);
      if (confirmType === "unfriend") unfriendUser(user.username);
      else cancelFriendRequest(user.username);
    }
  };

  const isTabLoading = (tab: HubTab) => {
    if (tab === 'add') return isLoadingDiscovery;
    if (tab === 'confirm') return isLoadingConfirm;
    if (tab === 'pending') return isLoadingPending;
    return false;
  };

  const emptyMessage = () => {
    if (activeTab === 'add') return "All nodes synced. Share your referral link to expand your network.";
    if (activeTab === 'confirm') return "No pending friendship requests.";
    if (activeTab === 'pending') return "No outgoing requests pending.";
    return "No friends added yet.";
  };

  const emptyAction = activeTab === 'add' ? { href: "/referrals", label: "Share Referral" } : { href: "/explore", label: "Discover People" };

  return (
    <div className="min-h-screen bg-[#F2ECF7] dark:bg-[#050505] text-foreground flex flex-col transition-colors duration-500 overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/8 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/8 blur-[150px] rounded-full pointer-events-none" />

      <Header />
      <SubHeader />

      {isOffline && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-center gap-2 relative z-20">
          <WifiOff className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Offline — showing saved connections</span>
        </div>
      )}

      <div className={cn(
        "w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-8 px-4 relative z-10 transition-all duration-300",
        "pt-6"
      )}>
        <aside className={cn("hidden lg:block sticky h-[calc(100vh-132px)] overflow-y-auto", "top-[132px]")}>
          <MainNav />
        </aside>

        <main className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">

          {/* Page header */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-3">
                  Community
                  <div className="h-9 w-9 bg-primary/15 rounded-2xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{friendUsernames.size} Friends</span>
                  <span className="h-1 w-1 rounded-full bg-primary/30" />
                  <span className="text-primary text-[10px] font-black uppercase tracking-widest">{filteredUsers.length} in view</span>
                </div>
              </div>
              <div className="relative group w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search connections..."
                  className="pl-10 h-11 bg-white/60 dark:bg-white/5 border-transparent focus-visible:border-primary/20 rounded-2xl text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <NativeAdNode type="banner-468" id="friends-top-pulse" />

            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-[1.5rem] shadow-sm overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const loading = isTabLoading(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => { triggerHaptic(5); setActiveTab(tab.id); }}
                    className={cn(
                      "flex-shrink-0 relative flex items-center gap-2 py-3 px-4 rounded-[1.2rem] text-[11px] font-black italic uppercase tracking-widest transition-all min-w-max",
                      isActive ? "bg-primary text-white shadow-md shadow-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                    )}
                  >
                    {loading && isActive
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <tab.icon className="h-3.5 w-3.5" />
                    }
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={cn(
                        "h-4 min-w-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center",
                        isActive ? "bg-white/30 text-white" : "bg-primary/15 text-primary"
                      )}>{tab.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading states */}
          {isLoadingDiscovery && activeTab === "add" && discoveryUsers.length === 0 && (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-bold uppercase tracking-widest">Scanning nodes...</span>
            </div>
          )}
          {isLoadingConfirm && activeTab === "confirm" && confirmReceivedUsers.length === 0 && (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-bold uppercase tracking-widest">Syncing requests...</span>
            </div>
          )}
          {isLoadingPending && activeTab === "pending" && pendingUsers.length === 0 && (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-bold uppercase tracking-widest">Syncing pending...</span>
            </div>
          )}

          {/* Pending tab */}
          {activeTab === 'pending' && (!isLoadingPending || pendingUsers.length > 0) && (
            <div className="space-y-3">
              {filteredUsers.length > 0 ? filteredUsers.map((user, i) => (
                <div
                  key={user.username}
                  className="group bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[1.75rem] p-4 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar className="h-14 w-14 border-2 border-amber-300/40 shadow-md">
                        <AvatarImage src={getAdaptivePreview(user.avatar, 'avatar', tier) || user.avatar} />
                        <AvatarFallback className="font-black text-sm">{(user.name || '?')[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#050505] shadow">Sent</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${user.username}`}>
                        <p className="font-black italic uppercase tracking-tight text-base truncate hover:text-primary transition-colors">{user.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">@{user.username}</p>
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-black uppercase bg-primary/5 text-primary/60 px-2 py-0.5 rounded-md">{user.category}</span>
                        {user.isVerified && <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black h-4 px-2">Verified</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-4 rounded-xl font-black italic uppercase text-[9px] tracking-widest border-destructive/30 text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-all"
                        onClick={() => handleCancelPending(user)}
                        disabled={cancellingUser === user.username}
                      >
                        {cancellingUser === user.username ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><X className="h-3 w-3 mr-1" />Cancel</>}
                      </Button>
                      <Link href={`/messages?open=${user.username}`}>
                        <Button size="sm" variant="ghost" className="w-full h-9 px-4 rounded-xl font-bold text-[9px] uppercase text-muted-foreground hover:text-primary">
                          <MessageCircle className="h-3 w-3 mr-1" />Msg
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )) : (
                <EmptyState icon={Clock} title="No Pending Requests" message={emptyMessage()} action={emptyAction} onAddTab={() => setActiveTab('add')} />
              )}
            </div>
          )}

          {/* Add / Confirm / Friends tabs */}
          {activeTab !== 'pending' && (!isLoadingDiscovery || activeTab !== 'add' || discoveryUsers.length > 0) && (!isLoadingConfirm || activeTab !== 'confirm' || confirmReceivedUsers.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredUsers.length > 0 ? filteredUsers.map((user, i) => {
                const friend = isFriend(user.username);
                const sent = isRequestSent(user.username);
                const isPlaying = playingPreview === user.username;
                const isConfirmTab = activeTab === 'confirm';

                return (
                  <div
                    key={user.username}
                    className="group bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[1.75rem] p-4 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className={cn(
                          "absolute -inset-1 rounded-full blur-sm opacity-0 transition-all duration-500",
                          user.isOnline && "opacity-60 bg-primary/40"
                        )} />
                        <div className="relative">
                          <Avatar className={cn(
                            "h-14 w-14 border-2 shadow-md transition-all",
                            user.isOnline ? "border-primary/60" : "border-white/20 group-hover:border-primary/30"
                          )}>
                            <AvatarImage src={getAdaptivePreview(user.avatar, 'avatar', tier) || user.avatar} />
                            <AvatarFallback className="font-black text-sm">{(user.name || '?')[0]}</AvatarFallback>
                          </Avatar>
                          {/* Sonic button overlay */}
                          <button
                            onClick={() => handlePreviewSonic(user.username, user.name)}
                            className={cn(
                              "absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity",
                              isPlaying && "opacity-100 bg-primary/50"
                            )}
                          >
                            {isPlaying ? <Volume2 className="h-5 w-5 text-white animate-bounce" /> : <Play className="h-5 w-5 text-white fill-current" />}
                          </button>
                        </div>
                        {friend && (
                          <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#050505] shadow">Friend</div>
                        )}
                        {user.isOnline && !friend && (
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#050505]" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${user.username}`}>
                          <p className="font-black italic uppercase tracking-tight text-base truncate hover:text-primary transition-colors">{user.name}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">@{user.username}</p>
                            {user.isVerified && <Badge className="bg-primary/10 text-primary border-none text-[7px] font-black h-3.5 px-1.5">✓</Badge>}
                          </div>
                        </Link>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[9px] font-black uppercase bg-primary/5 text-primary/60 px-2 py-0.5 rounded-md">{user.category}</span>
                          <span className="text-[9px] text-muted-foreground/40 font-bold">{user.followers} followers</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className={cn(
                            "h-9 px-4 rounded-xl font-black italic uppercase text-[9px] tracking-widest transition-all group/btn",
                            friend
                              ? "bg-primary/10 text-primary border border-primary/20 hover:bg-destructive hover:text-white hover:border-destructive"
                              : sent
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-destructive hover:text-white hover:border-destructive"
                              : isConfirmTab
                              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600"
                              : "bg-primary text-white shadow-md shadow-primary/20 hover:scale-105"
                          )}
                          onClick={() => handleAction(user)}
                        >
                          {friend ? (
                            <><UserCheck className="h-3 w-3 mr-1 group-hover/btn:hidden" /><span className="group-hover/btn:hidden">Friends</span><UserMinus className="h-3 w-3 mr-1 hidden group-hover/btn:block" /><span className="hidden group-hover/btn:inline">Remove</span></>
                          ) : sent ? (
                            <><Check className="h-3 w-3 mr-1 group-hover/btn:hidden" /><span className="group-hover/btn:hidden">Sent</span><X className="h-3 w-3 mr-1 hidden group-hover/btn:block" /><span className="hidden group-hover/btn:inline">Cancel</span></>
                          ) : isConfirmTab ? (
                            <><UserCheck className="h-3 w-3 mr-1" />Accept</>
                          ) : (
                            <><UserPlus className="h-3 w-3 mr-1" />{t('friends_add_friend')}</>
                          )}
                        </Button>
                        <Link href={`/messages?open=${user.username}`} className="w-full">
                          <Button size="sm" variant="ghost" className="w-full h-9 px-4 rounded-xl font-bold text-[9px] uppercase text-muted-foreground hover:text-primary">
                            <MessageCircle className="h-3 w-3 mr-1" />Message
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full">
                  <EmptyState
                    icon={activeTab === 'friends' ? Heart : activeTab === 'confirm' ? UserRoundCheck : UserRoundPlus}
                    title={activeTab === 'friends' ? "No Friends Yet" : activeTab === 'confirm' ? "No Requests" : "No New People"}
                    message={emptyMessage()}
                    action={emptyAction}
                    onAddTab={() => setActiveTab('add')}
                  />
                </div>
              )}
            </div>
          )}

          <NativeAdNode type="banner-468" id="friends-mid-pulse" />

          {filteredUsers.length > 6 && (
            <div className="w-full py-8 flex flex-col items-center gap-4">
              <NativeAdNode type="banner-468" id="friends-bottom-pulse" />
              <Link href="/referrals">
                <Button className="rounded-full bg-primary text-white font-black italic uppercase tracking-widest h-12 px-10 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  <Rocket className="mr-2 h-4 w-4" /> Expand Network
                </Button>
              </Link>
            </div>
          )}
        </main>

        <aside className={cn("hidden lg:block sticky h-[calc(100vh-132px)] overflow-y-auto", "top-[132px]")}>
          <RightSidebar />
        </aside>
      </div>

      {/* Unfriend/Cancel Alert */}
      <AlertDialog open={!!confirmUser} onOpenChange={(open) => !open && setConfirmUser(null)}>
        <AlertDialogContent className="rounded-[2rem] sm:max-w-[380px] z-[300] bg-white/95 dark:bg-[#0D0D12]/95 backdrop-blur-2xl border-destructive/10 text-foreground shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-14 w-14 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-3">
              <UserMinus className="h-7 w-7" />
            </div>
            <AlertDialogTitle className="font-headline font-black italic uppercase tracking-tighter text-2xl text-center">
              {confirmType === "unfriend" ? "Remove Friend?" : "Cancel Request?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed text-center px-4">
              {confirmType === "unfriend"
                ? `You'll no longer be friends with @${confirmUser?.username}.`
                : `Cancel your friend request to @${confirmUser?.username}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4 px-4 pb-2">
            <AlertDialogCancel className="rounded-xl h-12 font-black uppercase tracking-widest text-[10px] bg-secondary/50 border-none hover:bg-secondary flex-1">Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoval}
              className="rounded-xl h-12 font-black italic uppercase tracking-widest text-[10px] bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 flex-1"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message, action, onAddTab }: {
  icon: any; title: string; message: string; action: { href: string; label: string }; onAddTab: () => void;
}) {
  return (
    <div className="py-24 flex flex-col items-center gap-5 text-center">
      <div className="h-20 w-20 bg-primary/5 rounded-[1.5rem] flex items-center justify-center border-2 border-dashed border-primary/15">
        <Icon className="h-9 w-9 text-primary/25" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-xl font-black italic uppercase tracking-tighter">{title}</h3>
        <p className="text-muted-foreground text-sm font-medium max-w-xs mx-auto leading-relaxed">{message}</p>
      </div>
      <Link href={action.href}>
        <Button variant="outline" className="rounded-full border-primary/30 text-primary font-black uppercase text-[10px] h-11 px-8 hover:bg-primary hover:text-white hover:border-primary transition-all">
          {action.label}
        </Button>
      </Link>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F2ECF7] dark:bg-[#050505] flex items-center justify-center"><Zap className="h-10 w-10 text-primary animate-spin" /></div>}>
      <FriendsPageContent />
    </Suspense>
  );
}
