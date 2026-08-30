
"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { MainNav } from "@/components/layout/main-nav";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { PostCard } from "@/components/post/post-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMusic } from "@/context/MusicContext";
import { CreateStoryModal } from "@/components/feed/create-story-modal";
import { ImageRefinementPortal } from "@/components/profile/image-refinement-portal";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Camera, 
  Edit2, 
  MoreHorizontal, 
  BadgeCheck,
  Plus,
  Volume2,
  Play,
  Pause,
  Star,
  Zap,
  Languages,
  AtSign,
  Briefcase,
  GraduationCap,
  Heart,
  Cake,
  Calendar,
  Lock,
  Clock,
  Music as MusicIcon,
  Disc3,
  ListMusic,
  Trash2,
  Loader2,
  ImageIcon,
  Globe,
  Users,
  EyeOff,
  Smartphone,
  Film,
  ShoppingBag,
  BarChart2,
  CheckCircle2,
} from "lucide-react";
import { UserListings } from "@/components/marketplace/UserListings";
import Link from "next/link";
import { usePosts, Post } from "@/context/PostContext";
import Image from "next/image";
import { cn, dataURLtoFile, parseFollowerCount } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { client, databases, DATABASE_ID, COL, BUCKET_IMAGES, BUCKET, Query, getFileUrl } from "@/lib/appwrite";
import ProfileLoading from "./loading";

const NATIONALITIES = [
  "Liberian", "American", "Nigerian", "Ghanian", "Guinean", "Sierra Leonean", "Ivory Coast", "European", "Asian", "Other"
];

function InfoNode({ icon: Icon, label, value, colorClass }: { icon: any, label: string, value: string, colorClass: string }) {
  return (
    <div className="flex items-center gap-3 group/node">
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-transform group-hover/node:scale-110", colorClass)}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mb-1">{label}</span>
        <span className="text-sm font-bold text-foreground leading-none truncate">{value}</span>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const { currentUser, updateCurrentUser, uploadMedia, triggerHaptic, settings, setSelectedImageUrl, addPost, friendUsernames, followingUsernames, followerUsernames, isLoading, fetchProfilePosts } = usePosts();
  const { currentTrack, isExpanded, userSongs, userAlbums, userPlaylists, setTrack, playCollection, isPlaying } = useMusic();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  
  const [refiningImage, setRefiningImage] = useState<string | null>(null);
  const [refiningMode, setRefiningMode] = useState<"avatar" | "cover">("avatar");
  const [isRefinementOpen, setIsRefinementOpen] = useState(false);
  const [isApplyingRefinement, setIsApplyingRefinement] = useState(false);

  const [editData, setEditData] = useState({
    name: "",
    category: "Digital Creator",
    bio: "",
    dateOfBirth: "",
    nationality: "Liberian",
    gender: 'Male' as 'Male' | 'Female'
  });

  const [ownProfilePosts, setOwnProfilePosts] = useState<Post[]>([]);
  const [isLoadingOwnPosts, setIsLoadingOwnPosts] = useState(false);
  const [ownPostsCursor, setOwnPostsCursor] = useState<string | null>(null);
  const [hasMoreOwnPosts, setHasMoreOwnPosts] = useState(true);
  const ownPostsLoadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingOwnPostsRef = useRef(false);

  const [liveFollowers, setLiveFollowers] = useState<number | null>(null);
  const [liveFollowing, setLiveFollowing] = useState<number | null>(null);
  const [livePosts, setLivePosts] = useState<number | null>(null);

  const [reelsPosts, setReelsPosts] = useState<Post[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const [mediaPosts, setMediaPosts] = useState<{ id: string; url: string }[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const isPlayerActive = currentTrack && !isExpanded;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser?.$id) return;
    const userId = currentUser.$id;

    const fetchCounts = async () => {
      const [followersRes, followingRes, postsRes] = await Promise.allSettled([
        databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [Query.equal('following_id', userId), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, COL.FOLLOWS, [Query.equal('follower_id', userId), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, COL.POSTS, [Query.equal('user_id', userId), Query.limit(1)]),
      ]);
      if (followersRes.status === 'fulfilled') setLiveFollowers(followersRes.value.total);
      if (followingRes.status === 'fulfilled') setLiveFollowing(followingRes.value.total);
      if (postsRes.status === 'fulfilled') setLivePosts(postsRes.value.total);
    };
    fetchCounts();

    const unsubFollows = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COL.FOLLOWS}.documents`,
      (response) => {
        const payload = response.payload as any;
        if (payload.following_id === userId || payload.follower_id === userId) {
          fetchCounts();
        }
      }
    );

    const unsubPosts = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COL.POSTS}.documents`,
      (response) => {
        const payload = response.payload as any;
        if (payload.user_id === userId) {
          fetchCounts();
        }
      }
    );

    return () => { unsubFollows(); unsubPosts(); };
  }, [currentUser?.$id]);

  useEffect(() => {
    if (currentUser) {
      setEditData({
        name: currentUser.name || "",
        category: currentUser.category || "Digital Creator",
        bio: currentUser.bio || "",
        dateOfBirth: currentUser.dateOfBirth || "",
        nationality: currentUser.nationality || "Liberian",
        gender: currentUser.gender || 'Male'
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.$id) return;
    setOwnProfilePosts([]);
    setOwnPostsCursor(null);
    setHasMoreOwnPosts(true);
    setIsLoadingOwnPosts(true);
    isLoadingOwnPostsRef.current = true;
    fetchProfilePosts(currentUser.$id, null).then(({ posts, cursor, hasMore }) => {
      setOwnProfilePosts(posts);
      setOwnPostsCursor(cursor);
      setHasMoreOwnPosts(hasMore);
    }).finally(() => {
      setIsLoadingOwnPosts(false);
      isLoadingOwnPostsRef.current = false;
    });
  }, [currentUser?.$id, fetchProfilePosts]);

  // Fetch Reels directly from POSTS collection
  useEffect(() => {
    if (!currentUser?.$id) return;
    setIsLoadingReels(true);
    setReelsPosts([]);
    const fetchReels = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COL.POSTS, [
          Query.equal('user_id', currentUser.$id),
          Query.or([Query.equal('type', 'reel'), Query.isNotNull('video_id')]),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]);
        const mapped = res.documents.map((doc: any) => ({
          $id: doc.$id,
          $createdAt: doc.$createdAt,
          user: {
            $id: doc.user_id,
            name: currentUser.name || 'Unknown',
            username: currentUser.username || 'unknown',
            avatar: currentUser.avatar || '',
            isVerified: currentUser.isVerified || false,
          },
          content: doc.content || '',
          time: new Date(doc.$createdAt).toLocaleDateString(),
          likes: doc.likes_count || 0,
          unlikes: doc.unlikes_count || 0,
          comments: doc.comments_count || 0,
          shares: doc.shares_count || 0,
          views: doc.views_count || 0,
          videoUrl: doc.type === 'reel' && doc.media_url
            ? getFileUrl(BUCKET.REEL_MEDIA, doc.media_url)
            : (doc.video_id ? getFileUrl(BUCKET.POST_MEDIA, doc.video_id) : undefined),
          type: doc.type,
        } as Post));
        setReelsPosts(mapped);
      } catch { /* non-critical */ }
      finally { setIsLoadingReels(false); }
    };
    fetchReels();
  }, [currentUser?.$id]);

  // Fetch Media posts directly from POSTS collection
  useEffect(() => {
    if (!currentUser?.$id) return;
    setIsLoadingMedia(true);
    setMediaPosts([]);
    const fetchMedia = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COL.POSTS, [
          Query.equal('user_id', currentUser.$id),
          Query.isNotNull('image_id'),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]);
        const urls: { id: string; url: string }[] = [];
        for (const doc of res.documents) {
          const imageIds: string[] = Array.isArray(doc.image_ids)
            ? doc.image_ids
            : doc.image_id ? [doc.image_id] : [];
          for (const imgId of imageIds) {
            urls.push({ id: `${doc.$id}-${imgId}`, url: getFileUrl(BUCKET.POST_MEDIA, imgId) });
          }
        }
        setMediaPosts(urls);
      } catch { /* non-critical */ }
      finally { setIsLoadingMedia(false); }
    };
    fetchMedia();
  }, [currentUser?.$id]);

  useEffect(() => {
    const el = ownPostsLoadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreOwnPosts && !isLoadingOwnPostsRef.current && currentUser?.$id) {
        isLoadingOwnPostsRef.current = true;
        setIsLoadingOwnPosts(true);
        fetchProfilePosts(currentUser.$id, ownPostsCursor).then(({ posts, cursor, hasMore }) => {
          setOwnProfilePosts(prev => {
            const existingIds = new Set(prev.map(p => p.$id));
            return [...prev, ...posts.filter(p => !existingIds.has(p.$id))];
          });
          setOwnPostsCursor(cursor);
          setHasMoreOwnPosts(hasMore);
        }).finally(() => {
          setIsLoadingOwnPosts(false);
          isLoadingOwnPostsRef.current = false;
        });
      }
    }, { threshold: 0.1, rootMargin: '300px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ownProfilePosts, hasMoreOwnPosts, ownPostsCursor, currentUser?.$id, fetchProfilePosts]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSavingProfile(true);
    triggerHaptic(25);
    try {
      await updateCurrentUser(editData);
      setIsEditModalOpen(false);
      toast({ title: "Identity Re-calibrated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Vault Sync Error", description: e.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleApplyRefinement = async (refinedDataUrl: string) => {
    if (!currentUser) return;
    setIsApplyingRefinement(true);
    triggerHaptic(30);
    try {
      const fileName = refiningMode === 'avatar' ? 'avatar.jpg' : 'cover.jpg';
      const file = dataURLtoFile(refinedDataUrl, fileName);
      const targetBucket = refiningMode === 'avatar' ? BUCKET.AVATARS : BUCKET.COVERS;
      const vaultUrl = await uploadMedia(file, targetBucket);
      await updateCurrentUser({ [refiningMode]: vaultUrl });
      const pronoun = currentUser.gender === 'Female' ? 'her' : 'his';
      const postContent = refiningMode === 'avatar'
        ? `${currentUser.name} updated ${pronoun} profile picture.`
        : `${currentUser.name} updated ${pronoun} cover photo.`;
      try {
        const postImageUrl = await uploadMedia(file, BUCKET_IMAGES);
        await addPost({ content: postContent, image: postImageUrl });
      } catch { /* post is optional, don't block the update */ }
      toast({ title: "Presence Refreshed" });
      setIsRefinementOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Vault Sync Error", description: e.message });
    } finally {
      setIsApplyingRefinement(false);
    }
  };

  const myVideoPosts = useMemo(() => {
    return ownProfilePosts.filter(p => !!p.videoUrl);
  }, [ownProfilePosts]);

  const postedImages = useMemo(() => {
    const list: string[] = [];
    ownProfilePosts.forEach(p => {
      if (p.image) list.push(p.image);
      if (p.images) list.push(...p.images);
    });
    return Array.from(new Set(list));
  }, [ownProfilePosts]);

  const formattedDob = useMemo(() => {
    if (!currentUser?.dateOfBirth) return null;
    return new Date(currentUser.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [currentUser?.dateOfBirth]);

  const combinedFollowers = useMemo(() => {
    if (!currentUser) return 0;
    if (liveFollowers !== null) return liveFollowers;
    return parseFollowerCount(currentUser.followers);
  }, [currentUser, liveFollowers]);

  const combinedFollowing = useMemo(() => {
    if (!currentUser) return 0;
    if (liveFollowing !== null) return liveFollowing;
    return typeof currentUser.following === 'number' ? currentUser.following : parseFollowerCount(currentUser.following);
  }, [currentUser, liveFollowing]);

  if (isLoading) {
    return <ProfileLoading />;
  }

  if (!currentUser) {
    if (typeof window !== 'undefined') router.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background flex justify-center">
      <div className="max-w-[1440px] w-full grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_360px] gap-8 px-0 md:px-4">
        <aside className={cn("hidden md:block sticky h-screen border-r border-border/50 transition-all duration-300", "top-0")}><MainNav /></aside>
        <main className={cn("w-full bg-white dark:bg-card min-h-screen shadow-sm transition-all duration-300", "pt-0")}>
          <header className="sticky top-0 z-50 bg-white/95 dark:bg-card/95 backdrop-blur-sm border-b border-border h-14 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link><div className="flex items-center gap-1"><h1 className="font-bold text-lg tracking-tight">Digital Workspace</h1>{currentUser.isVerified && <CheckCircle2 className="h-4 w-4 text-primary fill-primary text-white" />}</div></div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsEditModalOpen(true)}><Edit2 className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-5 w-5" /></Button>
            </div>
          </header>
          
          <div className="relative">
            <div className="relative h-48 sm:h-64 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 overflow-hidden group">
              {currentUser.cover ? (
                <Image src={currentUser.cover} alt="Cover" fill className="object-cover dark:brightness-75 transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-primary/30">
                    <path d="M3 7L10 19L17 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 15L17 7L21 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button onClick={() => coverInputRef.current?.click()} className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 text-white hover:bg-white/40 transition-all"><Camera className="h-6 w-6" /></button>
              </div>
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setRefiningImage(reader.result as string); setRefiningMode('cover'); setIsRefinementOpen(true); }; reader.readAsDataURL(file); } }} />
            </div>
            
            <div className="px-4 pb-4">
              <div className="relative inline-block -mt-16 sm:-mt-24 ml-0 sm:ml-2">
                <div className="relative w-32 h-32 sm:w-44 sm:h-44 group">
                  <Avatar className="w-full h-full border-4 border-white dark:border-card shadow-xl ring-2 ring-primary/10">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => avatarInputRef.current?.click()} className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 text-white hover:bg-white/40 transition-all"><Camera className="h-8 w-8" /></button>
                  </div>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setRefiningImage(reader.result as string); setRefiningMode('avatar'); setIsRefinementOpen(true); }; reader.readAsDataURL(file); } }} />
                </div>
              </div>
              
              <div className="mt-2 space-y-1 px-1">
                <div className="flex items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2"><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{currentUser.name}</h1>{currentUser.isVerified && <CheckCircle2 className="h-6 w-6 text-primary fill-primary text-white" />}</div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] font-black h-5 px-3 uppercase tracking-widest">{currentUser.category || "Creator"}</Badge>
                </div>
                
                <div className="flex items-center gap-6 py-2">
                  <div className="flex flex-col items-start"><span className="font-bold text-lg leading-none">{combinedFollowers.toLocaleString()}</span><span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Followers</span></div>
                  <div className="flex flex-col items-start"><span className="font-bold text-lg leading-none">{combinedFollowing.toLocaleString()}</span><span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Following</span></div>
                  <div className="flex flex-col items-start"><span className="font-bold text-lg leading-none">{livePosts ?? (currentUser.posts as number) ?? 0}</span><span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Posts</span></div>
                </div>

                {/* Creator milestone progress bars */}
                <div className="space-y-3 py-3">
                  {/* Lock Post milestone — 1,000 followers */}
                  {combinedFollowers < 1000 ? (
                    <div className="p-3 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="h-3 w-3 text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Post Lock Feature</span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{combinedFollowers.toLocaleString()} / 1,000</span>
                      </div>
                      <Progress value={Math.min((combinedFollowers / 1000) * 100, 100)} className="h-1.5 bg-amber-500/10 [&>div]:bg-amber-500" />
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{Math.max(0, 1000 - combinedFollowers).toLocaleString()} more followers to unlock</p>
                    </div>
                  ) : combinedFollowers < 10000 ? (
                    <div className="p-3 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-cyan-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Subscribe Feature</span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{combinedFollowers.toLocaleString()} / 10,000</span>
                      </div>
                      <Progress value={Math.min((combinedFollowers / 10000) * 100, 100)} className="h-1.5 bg-cyan-500/10 [&>div]:bg-cyan-500" />
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{Math.max(0, 10000 - combinedFollowers).toLocaleString()} more followers to unlock</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Elite Creator Status Unlocked</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">All creator features active</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 py-6 my-4 border-y border-primary/5 bg-primary/[0.02] px-4 rounded-[2rem]">
                  {currentUser.vimoreId && <InfoNode icon={AtSign} label="ViMore ID" value={currentUser.vimoreId} colorClass="bg-violet-500/10 text-violet-500" />}
                  <InfoNode icon={Globe} label="Spatial Origin" value={currentUser.nationality || "Liberian"} colorClass="bg-blue-500/10 text-blue-500" />
                  <InfoNode icon={Users} label="Gender Signature" value={currentUser.gender || 'Male'} colorClass="bg-purple-500/10 text-purple-500" />
                  {currentUser.phone && <InfoNode icon={Smartphone} label="Mobile Pulse" value={currentUser.phone} colorClass="bg-green-500/10 text-green-500" />}
                  <InfoNode icon={Clock} label="Member Since" value={currentUser.joinDate ? new Date(currentUser.joinDate).toLocaleDateString() : "Temporal Sync Active"} colorClass="bg-emerald-500/10 text-emerald-500" />
                </div>
                
                <div className="mt-3 relative group max-w-2xl"><p className="text-[15px] leading-relaxed text-foreground flex-1">{currentUser.bio}</p></div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1 w-full rounded-lg gap-2 bg-primary hover:bg-primary/90 h-11 font-bold text-white shadow-lg active:scale-95 transition-all" onClick={() => router.push('/verification')}>
                    <BadgeCheck className="h-5 w-5" />
                    {currentUser.isVerified ? "Verified" : "Get Verified"}
                  </Button>
                  <Button variant="secondary" className="flex-1 rounded-lg gap-2 h-11 font-bold active:scale-95 transition-all" onClick={() => setIsStoryModalOpen(true)}><Plus className="h-5 w-5" /> Add Story</Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2 rounded-lg gap-2 h-10 font-bold text-violet-600 border-violet-200 dark:border-violet-800/50 hover:bg-violet-50 dark:hover:bg-violet-950/30 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
                  onClick={() => router.push('/analytics')}
                >
                  <BarChart2 className="h-4 w-4" />
                  Creator Analytics
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="all" className="w-full mt-2">
              <TabsList className="w-full h-12 bg-white dark:bg-card border-t border-b border-border/50 rounded-none p-0 overflow-x-auto">
                <TabsTrigger value="all" className="flex-1 font-bold text-sm">Posts</TabsTrigger>
                <TabsTrigger value="reels" className="flex-1 font-bold text-sm flex items-center gap-1.5"><Film className="h-3.5 w-3.5" />Reels</TabsTrigger>
                <TabsTrigger value="music" className="flex-1 font-bold text-sm">Music</TabsTrigger>
                <TabsTrigger value="listings" className="flex-1 font-bold text-sm flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5" />Listings</TabsTrigger>
                <TabsTrigger value="media" className="flex-1 font-bold text-sm">Media</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="p-4 space-y-4">
                {isLoadingOwnPosts && ownProfilePosts.length === 0 ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-secondary/20 animate-pulse">
                      <div className="aspect-[4/5] bg-secondary/30 w-full" />
                      <div className="p-4 space-y-2">
                        <div className="h-3 bg-secondary/30 rounded-full w-3/4" />
                        <div className="h-3 bg-secondary/30 rounded-full w-1/2" />
                      </div>
                    </div>
                  ))
                ) : ownProfilePosts.length === 0 ? (
                  <div className="py-20 text-center opacity-40"><p className="font-bold">No active vibes</p></div>
                ) : (
                  <>
                    {ownProfilePosts.map(post => <PostCard key={post.$id} {...post} />)}
                    <div ref={ownPostsLoadMoreRef} className="h-4" />
                    {isLoadingOwnPosts && (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={`skeleton-own-${i}`} className="rounded-2xl overflow-hidden bg-secondary/20 animate-pulse">
                          <div className="aspect-[4/5] bg-secondary/30 w-full" />
                          <div className="p-4 space-y-2">
                            <div className="h-3 bg-secondary/30 rounded-full w-3/4" />
                            <div className="h-3 bg-secondary/30 rounded-full w-1/2" />
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </TabsContent>
              <TabsContent value="reels" className="p-4 space-y-4">
                {isLoadingReels ? (
                  <div className="flex items-center justify-center py-20 gap-3 opacity-50">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm font-bold">Loading reels…</p>
                  </div>
                ) : reelsPosts.length > 0 ? reelsPosts.map(post => <PostCard key={post.$id} {...post} />) : (
                  <div className="py-20 text-center opacity-40 flex flex-col items-center gap-3">
                    <Film className="h-10 w-10" />
                    <p className="font-bold">No reels yet</p>
                    <p className="text-sm">Upload a video reel to see it here</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="music" className="pb-8">
                {(userSongs.length === 0 && userAlbums.length === 0 && userPlaylists.length === 0) ? (
                  <div className="py-20 text-center flex flex-col items-center gap-3 opacity-40">
                    <MusicIcon className="h-12 w-12" />
                    <p className="font-bold">No music published yet</p>
                    <p className="text-xs">Upload tracks or albums to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {userSongs.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 pt-5 pb-3">
                          <MusicIcon className="h-4 w-4 text-primary" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Songs</h3>
                          <span className="text-[10px] font-bold text-primary/60 ml-auto">{userSongs.length} tracks</span>
                        </div>
                        <div className="px-4 space-y-2">
                          {userSongs.map((song, idx) => {
                            const isActive = currentTrack?.id === song.id;
                            return (
                              <button
                                key={song.id}
                                onClick={() => playCollection(userSongs, idx)}
                                className={cn(
                                  "w-full flex items-center gap-3 p-3 rounded-2xl transition-all group text-left",
                                  isActive
                                    ? "bg-primary/10 shadow-inner shadow-primary/5"
                                    : "bg-secondary/30 hover:bg-secondary/60"
                                )}
                              >
                                <div className="relative h-12 w-12 flex-shrink-0">
                                  <div className={cn(
                                    "h-12 w-12 rounded-xl overflow-hidden shadow-md transition-all",
                                    isActive && "ring-2 ring-primary shadow-[0_0_12px_rgba(153,64,229,0.5)]"
                                  )}>
                                      <img src={song.cover} alt={song.title} className="h-full w-full object-cover" />
                                  </div>
                                  {isActive && isPlaying && (
                                    <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-1.5 rounded-xl bg-black/30">
                                      {[1, 2, 3, 4].map((i) => (
                                        <div
                                          key={i}
                                          className="w-[3px] bg-white rounded-full animate-bounce"
                                          style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s`, animationDuration: "0.6s" }}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("font-bold text-sm truncate", isActive && "text-primary")}>{song.title}</p>
                                  <p className="text-[11px] text-muted-foreground font-bold truncate">{song.artist}</p>
                                  {song.streams && (
                                    <p className="text-[9px] text-muted-foreground/60 uppercase font-black mt-0.5">{song.streams} streams</p>
                                  )}
                                </div>
                                <div className={cn(
                                  "h-9 w-9 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                                  isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-primary/10 text-primary opacity-0 group-hover:opacity-100"
                                )}>
                                  {isActive && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {userAlbums.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 pb-3">
                          <Disc3 className="h-4 w-4 text-violet-500" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Albums</h3>
                          <span className="text-[10px] font-bold text-violet-500/60 ml-auto">{userAlbums.length} albums</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
                          {userAlbums.map((album) => (
                            <button
                              key={album.id}
                              onClick={() => playCollection(album.songs)}
                              className="flex-shrink-0 w-36 group text-left"
                            >
                              <div className="relative h-36 w-36 rounded-2xl overflow-hidden shadow-lg mb-2 group-hover:shadow-xl transition-all group-active:scale-95">
                                  <img src={album.cover} alt={album.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="h-11 w-11 bg-white rounded-full flex items-center justify-center shadow-xl">
                                    <Play className="h-5 w-5 text-primary fill-current ml-0.5" />
                                  </div>
                                </div>
                              </div>
                              <p className="font-black text-sm truncate">{album.title}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">{album.tracks} tracks · {album.year}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {userPlaylists.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 pb-3">
                          <ListMusic className="h-4 w-4 text-emerald-500" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Playlists</h3>
                          <span className="text-[10px] font-bold text-emerald-500/60 ml-auto">{userPlaylists.length} lists</span>
                        </div>
                        <div className="px-4 space-y-2">
                          {userPlaylists.map((pl) => (
                            <button
                              key={pl.id}
                              onClick={() => playCollection(pl.songs)}
                              className="w-full flex items-center gap-3 p-3 bg-secondary/30 hover:bg-secondary/60 rounded-2xl transition-all group text-left"
                            >
                              <div className="relative h-14 w-14 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                                  <img src={pl.cover} alt={pl.title} className="h-full w-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-sm truncate">{pl.title}</p>
                                <p className="text-[11px] text-muted-foreground font-bold">{pl.songs.length} songs</p>
                                {pl.description && <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{pl.description}</p>}
                              </div>
                              <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <Play className="h-4 w-4 fill-current" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="listings" className="p-4">
                {currentUser ? <UserListings sellerId={currentUser.$id} isOwner={true} /> : null}
              </TabsContent>
              <TabsContent value="media" className="p-4">
                {isLoadingMedia ? (
                  <div className="flex items-center justify-center py-20 gap-3 opacity-50">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm font-bold">Loading photos…</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaPosts.map(({ id, url }) => (
                      <div key={id} onClick={() => setSelectedImageUrl(url)} className={cn("aspect-square relative rounded-xl overflow-hidden shadow-lg cursor-pointer hover:scale-[1.02] transition-transform")}>
                        <Image src={url} alt="Media" fill className="object-cover" />
                      </div>
                    ))}
                    {mediaPosts.length === 0 && (
                      <p className="col-span-3 text-center text-xs opacity-40 py-10">No photos shared yet.</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <aside className={cn("hidden lg:block sticky h-screen transition-all duration-300", "top-0")}><RightSidebar /></aside>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-primary/10 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-3xl">
          <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10"><DialogTitle className="font-black italic uppercase tracking-widest text-2xl">Identity Calibration</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Signature Label (Name)</Label><Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="rounded-xl bg-secondary/20 border-none h-12" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Arrival Date (DOB)</Label><Input type="date" value={editData.dateOfBirth} onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })} className="rounded-xl bg-secondary/20 border-none h-12" /></div>
              </div>
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-primary">Identity Tones</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nationality</Label><Select value={editData.nationality} onValueChange={(val) => setEditData({ ...editData, nationality: val })}><SelectTrigger className="h-12 rounded-xl bg-secondary/20 border-none px-4"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{NATIONALITIES.map(n => <SelectItem key={n} value={n} className="font-bold">{n}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Gender</Label><Select value={editData.gender} onValueChange={(val: any) => setEditData({ ...editData, gender: val })}><SelectTrigger className="h-12 rounded-xl bg-secondary/20 border-none px-4"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Role Node</Label><Select value={editData.category} onValueChange={(val) => setEditData({ ...editData, category: val })}><SelectTrigger className="h-12 rounded-xl bg-secondary/20 border-none px-4 font-bold"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl">{["Digital Creator", "Product Architect", "Visual Storyteller", "Fullstack Developer", "Sonic Producer"].map(cat => <SelectItem key={cat} value={cat} className="font-bold">{cat}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Bio</Label><Textarea value={editData.bio} onChange={(e) => setEditData({ ...editData, bio: e.target.value })} className="rounded-xl bg-secondary/20 border-none min-h-[100px] resize-none" /></div>
              </div>
            </div>
          </ScrollArea>
          <div className="p-6 bg-secondary/10 border-t border-primary/10"><Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full bg-primary text-white font-black italic uppercase tracking-widest h-14 rounded-2xl shadow-xl">{isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sync Identity Pulse"}</Button></div>
        </DialogContent>
      </Dialog>

      <CreateStoryModal isOpen={isStoryModalOpen} onClose={() => setIsStoryModalOpen(false)} />
      <ImageRefinementPortal isOpen={isRefinementOpen} onClose={() => setIsRefinementOpen(false)} image={refiningImage} mode={refiningMode} onApply={handleApplyRefinement} />
    </div>
  );
}
