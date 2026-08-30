
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ImageIcon, 
  ChevronDown, 
  Smile, 
  MapPin, 
  UserPlus, 
  Globe,
  Lock,
  Users,
  X,
  ListTodo,
  PlusSquare,
  Clapperboard,
  Play,
  Check,
  History,
  Users2,
  Bold,
  Italic,
  Code,
  Palette,
  Clock,
  Settings2,
  MessageCircleOff,
  Filter,
  Trash2,
  Video,
  Search,
  Coins,
  Gem,
  ShieldCheck,
  AlertTriangle,
  Type,
  Loader2,
  Zap,
  Wand2,
  CheckCircle2,
  Plus,
  ExternalLink,
  Tag,
  LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn, parseFollowerCount, formatBytes } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { aiSuggestCaptionsFromImagesAction } from "@/app/actions/ai";
import { usePosts } from "@/context/PostContext";
import { useFeedSignal } from "@/context/FeedSignalContext";
import { useReelUpload } from "@/context/ReelUploadContext";
import { useMusic } from "@/context/MusicContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { BUCKET_IMAGES } from "@/lib/appwrite";

interface CreatePostModalProps {
  children: React.ReactNode;
  sharedPost?: any;
  initialContent?: string;
  onOpen?: () => void;
}

type PrivacySetting = {
  id: string;
  label: string;
  icon: any;
  description: string;
};

const privacySettings: PrivacySetting[] = [
  { id: "public", label: "Public", icon: Globe, description: "Anyone on or off ViMore" },
  { id: "friends", label: "Friends", icon: Users, description: "Your friends on ViMore" },
  { id: "private", label: "Only Me", icon: Lock, description: "Only you can see this post" },
];

const feelings = [
  { emoji: "😊", text: "Happy" },
  { emoji: "😇", text: "Blessed" },
  { emoji: "🤩", text: "Excited" },
  { emoji: "🥰", text: "Loved" },
  { emoji: "😎", text: "Cool" },
  { emoji: "🤔", text: "Thinking" },
  { emoji: "😴", text: "Tired" },
  { emoji: "🥳", text: "Celebrating" },
  { emoji: "😤", text: "Productive" },
  { emoji: "🔥", text: "On Fire" },
];

const backgroundThemes = [
  { id: "none", label: "Default", class: "bg-transparent" },
  { id: "purple-grad", label: "ViMore Purple", class: "bg-gradient-to-br from-primary to-accent text-white" },
  { id: "ocean", label: "Ocean Breeze", class: "bg-gradient-to-br from-blue-400 to-emerald-400 text-white" },
  { id: "sunset", label: "Sunset Glow", class: "bg-gradient-to-br from-orange-500 to-rose-500 text-white" },
  { id: "royal", label: "Royal", class: "bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white" },
  { id: "midnight", label: "Midnight", class: "bg-gradient-to-br from-slate-900 to-slate-700 text-white" },
];

const imageFilters = [
  { id: "none", label: "None", class: "" },
  { id: "grayscale", label: "Mono", class: "grayscale" },
  { id: "sepia", label: "Sepia", class: "sepia" },
  { id: "brightness", label: "Lume", class: "brightness-125 contrast-110" },
  { id: "invert", label: "Noir", class: "invert" },
  { id: "saturate", label: "Vivid", class: "saturate-150" },
];

const VIDEO_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB in bytes

export function CreatePostModal({ children, sharedPost, initialContent, onOpen }: CreatePostModalProps) {
  const router = useRouter();
  const { addPost, currentUser, connections, settings, isFollowing, triggerHaptic, uploadMedia } = usePosts();
  const { setUploadProgress } = useFeedSignal();
  const { openCaptureStudio } = useMusic();
  const { startUpload: startReelUpload } = useReelUpload();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [activeSharedPost, setActiveSharedPost] = useState<any>(sharedPost || null);
  const [privacy, setPrivacy] = useState<PrivacySetting>(privacySettings[0]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState("24 Hours");
  
  const [feeling, setFeeling] = useState<{ emoji: string; text: string } | null>(null);
  const [location, setLocation] = useState<string>("");
  const [isTaggingSelectorOpen, setIsTaggingSelectorOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [taggedUsers, setTaggedUsers] = useState<any[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [linkPreview, setLinkPreview] = useState<any>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedTheme, setSelectedTheme] = useState(backgroundThemes[0]);
  const [selectedFilter, setSelectedFilter] = useState(imageFilters[0]);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPrice, setUnlockPrice] = useState(100);
  
  const [showFeelingSelector, setShowFeelingSelector] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Staged reel (user selects video but hasn't posted yet)
  const [stagedReelFile, setStagedReelFile] = useState<File | null>(null);
  const [stagedReelUrl, setStagedReelUrl] = useState<string | null>(null);
  const [stagedReelDuration, setStagedReelDuration] = useState<number>(0);

  // Caption suggestions
  const [isCaptionLoading, setIsCaptionLoading] = useState(false);
  const [captionSuggestions, setCaptionSuggestions] = useState<string[]>([]);

  // Compression State
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const reelVideoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const TRUNCATE_LIMIT = 150; 
  const isEliteCreator = currentUser ? parseFollowerCount(currentUser.followers) >= 1000 : false;

  const isLimitedType = selectedTheme.id !== "none" || selectedMedia.length > 0 || mediaType !== null || isPollOpen || isLocked;
  const currentLimit = isLimitedType ? TRUNCATE_LIMIT : 2000;
  const isOverLimit = content.length > currentLimit;

  const filteredTagResults = useMemo(() => {
    let base = connections || [];
    if (settings.taggingPrivacy === 'friends') base = base.filter(c => c.followsYou && isFollowing(c.username));
    if (!tagSearch.trim()) return base;
    return base.filter(c => c.name.toLowerCase().includes(tagSearch.toLowerCase()) || c.username.toLowerCase().includes(tagSearch.toLowerCase()));
  }, [connections, tagSearch, settings.taggingPrivacy, isFollowing]);

  useEffect(() => {
    if (!sharedPost) {
      const savedContent = localStorage.getItem('vimore_post_draft');
      if (savedContent) setContent(savedContent);
    }
  }, [sharedPost]);

  useEffect(() => {
    if (content && !sharedPost) localStorage.setItem('vimore_post_draft', content);
  }, [content, sharedPost]);

  useEffect(() => {
    if (isOpen) {
      if (initialContent && !content) setContent(initialContent);
      if (sharedPost) setActiveSharedPost(sharedPost);
      onOpen?.();
    }
  }, [isOpen]);


  const handleSuggestCaptions = async () => {
    if (isCaptionLoading) return;
    if (captionSuggestions.length > 0) { setCaptionSuggestions([]); return; }
    const mediaFile = stagedFiles[0] || stagedReelFile;
    if (!mediaFile) return;
    setIsCaptionLoading(true);
    triggerHaptic(10);
    try {
      const isVideo = mediaFile.type.startsWith('video/');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(mediaFile);
      });
      const { captions } = await aiSuggestCaptionsFromImagesAction({
        imageBase64: base64,
        mimeType: mediaFile.type,
        isVideo,
      });
      setCaptionSuggestions(captions);
    } catch {
      toast({ title: 'Could not generate captions', variant: 'destructive' });
    } finally {
      setIsCaptionLoading(false);
    }
  };

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery && !showMentionSuggestions) return [];
    const q = mentionQuery.toLowerCase();
    return (connections || []).filter(c =>
      c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [connections, mentionQuery, showMentionSuggestions]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    const urlMatch = val.match(/https?:\/\/[^\s]+/);
    const foundUrl = urlMatch ? urlMatch[0] : null;
    if (foundUrl !== detectedUrl) {
      setDetectedUrl(foundUrl);
      setLinkPreview(null);
      if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
      if (foundUrl) {
        setIsFetchingPreview(true);
        urlDebounceRef.current = setTimeout(async () => {
          try {
            const res = await fetch(`/api/link-preview?url=${encodeURIComponent(foundUrl)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.url) setLinkPreview(data);
            }
          } catch {}
          finally { setIsFetchingPreview(false); }
        }, 800);
      } else {
        setIsFetchingPreview(false);
      }
    }

    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([\w]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionSuggestions(true);
      setMentionStartIndex(cursorPos - mentionMatch[0].length);
    } else {
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }
  }, [detectedUrl]);

  const handleSelectMention = useCallback((user: any) => {
    if (taggedUsers.length >= 25) {
      toast({ variant: 'destructive', title: 'Tag Limit Reached', description: 'You can only tag up to 25 people.' });
      return;
    }
    if (!taggedUsers.find(u => u.username === user.username)) {
      setTaggedUsers(prev => [...prev, user]);
    }
    const before = content.slice(0, mentionStartIndex);
    const after = content.slice(mentionStartIndex + mentionQuery.length + 1);
    setContent(before + '@' + user.username + ' ' + after);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [content, mentionStartIndex, mentionQuery, taggedUsers, toast]);

  const handleToggleTagUser = useCallback((user: any) => {
    triggerHaptic(10);
    setTaggedUsers(prev => {
      const exists = prev.find(u => u.username === user.username);
      if (exists) return prev.filter(u => u.username !== user.username);
      if (prev.length >= 25) {
        toast({ variant: 'destructive', title: 'Tag Limit Reached', description: 'You can only tag up to 25 people.' });
        return prev;
      }
      return [...prev, user];
    });
  }, [triggerHaptic, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    triggerHaptic(10);
    const fileArray = Array.from(files);
    const isVideo = fileArray[0].type.startsWith('video/');

    if (isVideo) {
      const file = fileArray[0];
      const objUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.src = objUrl;
      await new Promise<void>(resolve => { tempVideo.onloadedmetadata = () => resolve(); tempVideo.load(); });
      URL.revokeObjectURL(objUrl);
      if (tempVideo.duration > 303) {
        triggerHaptic(25);
        toast({ title: "Video Too Long", description: "Videos must be 5 minutes 3 seconds or shorter." });
        e.target.value = '';
        return;
      }
      setMediaType('video');
      setStagedFiles([file]);
      setSelectedMedia([URL.createObjectURL(file)]);
    } else {
      setMediaType('image');
      setStagedFiles(prev => [...prev, ...fileArray].slice(0, 6));
      const urls = fileArray.map(file => URL.createObjectURL(file));
      setSelectedMedia(prev => [...prev, ...urls].slice(0, 6));
    }
    setSelectedTheme(backgroundThemes[0]);
    setShowThemeSelector(false);
  };

  const handleReelVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    triggerHaptic(10);
    const objUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.src = objUrl;
    await new Promise<void>(resolve => { tempVideo.onloadedmetadata = () => resolve(); tempVideo.load(); });
    if (tempVideo.duration > 1800) {
      triggerHaptic(25);
      URL.revokeObjectURL(objUrl);
      toast({ title: "Video Too Long", description: "Reel videos must be 30 minutes or shorter." });
      e.target.value = '';
      return;
    }
    setStagedReelFile(file);
    setStagedReelUrl(objUrl);
    setStagedReelDuration(tempVideo.duration);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    triggerHaptic(5);
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedMedia(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) setMediaType(null);
      return updated;
    });
  };

  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!currentUser || isPosting) return;
    triggerHaptic(30);
    setIsPosting(true);

    // If a reel video is staged, kick off background reel upload with caption
    if (stagedReelFile) {
      try {
        toast({ title: "Starting Reel Upload…", description: `${stagedReelFile.name} will upload in the background.` });
        startReelUpload({
          clips: [stagedReelFile],
          totalDuration: stagedReelDuration,
          effect: 'none',
          caption: content.trim(),
          visibility: privacy.id === 'public' ? 'public' : privacy.id === 'friends' ? 'friends' : 'private',
          allowComments: !commentsDisabled,
          allowDuet: true,
          allowDownloads: true,
          selectedSound: null,
          userId: currentUser.$id,
          username: currentUser.username,
          coverBlob: null,
          skipCompression: false,
        });
        resetForm();
        setIsOpen(false);
      } finally {
        setIsPosting(false);
      }
      return;
    }

    try {
      const uploadedUrls: string[] = [];
      const total = stagedFiles.length;
      if (total > 0) {
        setUploadProgress(0);
        for (let i = 0; i < total; i++) {
          const url = await uploadMedia(stagedFiles[i], BUCKET_IMAGES);
          uploadedUrls.push(url);
          setUploadProgress(Math.round(((i + 1) / total) * 80));
        }
      } else {
        setUploadProgress(5);
      }

      setUploadProgress(90);
      await addPost({
        content,
        language: typeof window !== 'undefined' ? window.navigator.language.split('-')[0] : 'en',
        theme: selectedTheme.id !== "none" ? selectedTheme.id : undefined,
        images: mediaType === 'image' ? uploadedUrls : undefined,
        videoUrl: mediaType === 'video' ? uploadedUrls[0] : undefined,
        imageFilter: selectedFilter.id !== "none" ? selectedFilter.class : undefined,
        feeling: feeling || undefined,
        location: location || undefined,
        commentsDisabled,
        isLocked,
        unlockPrice: isLocked ? unlockPrice : undefined,
        taggedUsers: taggedUsers.length > 0 ? [...taggedUsers] : undefined,
        linkPreview: linkPreview || undefined,
        sharedPost: activeSharedPost || undefined,
        poll: isPollOpen && pollQuestion ? {
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim()).map(text => ({ text, votes: 0 })),
          voters: {},
          totalVotes: 0,
          duration: pollDuration,
        } : undefined,
      });

      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 1500);
      localStorage.removeItem('vimore_post_draft');
      toast({ title: "Handshake Synchronized", description: "Node materialized in the global vault." });
      resetForm();
      setIsOpen(false);
    } catch (e: any) {
      setUploadProgress(null);
      toast({ variant: "destructive", title: "Upload Failed", description: e.message });
    } finally {
      setIsPosting(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setSelectedMedia([]);
    setStagedFiles([]);
    setMediaType(null);
    setStagedReelFile(null);
    if (stagedReelUrl) { URL.revokeObjectURL(stagedReelUrl); setStagedReelUrl(null); }
    setStagedReelDuration(0);
    setIsPollOpen(false);
    setFeeling(null);
    setLocation("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setTaggedUsers([]);
    setMentionQuery('');
    setShowMentionSuggestions(false);
    setMentionStartIndex(-1);
    setLinkPreview(null);
    setIsFetchingPreview(false);
    setDetectedUrl(null);
    setSelectedTheme(backgroundThemes[0]);
    setSelectedFilter(imageFilters[0]);
    setIsLocked(false);
    setUnlockPrice(50);
    setShowFeelingSelector(false);
    setShowLocationSelector(false);
    setShowThemeSelector(false);
    setIsCompressing(false);
    setCompressionProgress(0);
    setActiveSharedPost(null);
  };

  const toggleAction = (type: 'feeling' | 'location' | 'theme' | 'poll') => {
    triggerHaptic(5);
    if (type === 'feeling') {
      setShowFeelingSelector(!showFeelingSelector);
      setShowLocationSelector(false);
      setShowThemeSelector(false);
    } else if (type === 'location') {
      setShowLocationSelector(!showLocationSelector);
      setShowFeelingSelector(false);
      setShowThemeSelector(false);
    } else if (type === 'theme') {
      setShowThemeSelector(!showThemeSelector);
      setShowFeelingSelector(false);
      setShowLocationSelector(false);
    } else if (type === 'poll') {
      setIsPollOpen(!isPollOpen);
      setShowFeelingSelector(false);
      setShowLocationSelector(false);
      setShowThemeSelector(false);
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-none w-screen h-[100dvh] m-0 rounded-none border-none flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-background translate-x-0 translate-y-0 left-0 top-0">
        <DialogTitle className="sr-only">Create a New Post</DialogTitle>
        <DialogHeader className="p-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0 bg-white dark:bg-card">
          <div className="flex items-center gap-4">
            <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => triggerHaptic(5)}><ArrowLeft className="h-6 w-6" /></Button></DialogClose>
            <DialogTitle className="font-bold text-lg">Create post</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className={cn("font-bold text-primary text-base", ((!content.trim() && selectedMedia.length === 0 && !pollQuestion && !activeSharedPost) || isOverLimit || isCompressing || isPosting) && "opacity-50")} disabled={(!content.trim() && selectedMedia.length === 0 && !pollQuestion && !activeSharedPost) || isOverLimit || isCompressing || isPosting} onClick={handlePost}>
              {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "POST"}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pb-safe">
          {isCompressing && (
            <div className="p-6 bg-primary/5 border-b border-primary/10 animate-in slide-in-from-top-4 duration-500">
              <div className="max-w-md mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Materializing Vibe...</span>
                  </div>
                  <span className="text-[10px] font-black text-primary tabular-nums">{Math.round(compressionProgress)}%</span>
                </div>
                <Progress value={compressionProgress} className="h-1.5" />
                <p className="text-[9px] font-bold text-primary/60 uppercase text-center tracking-tighter">
                  Reducing spatial weight for high-velocity sync
                </p>
              </div>
            </div>
          )}

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-primary/10"><AvatarImage src={currentUser?.avatar} /><AvatarFallback>V</AvatarFallback></Avatar>
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-1">
                  <p className="font-bold text-base">{currentUser?.name || "Guest"}</p>
                  {feeling && <span className="text-[13px] text-muted-foreground">— is {feeling.emoji} {feeling.text}</span>}
                  {location && <span className="text-[13px] text-muted-foreground">— in <span className="font-bold text-foreground">{location}</span></span>}
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="h-7 px-2 bg-secondary/60 rounded-md flex items-center gap-1.5">
                        <privacy.icon className="h-3.5 w-3.5" />
                        <span className="text-[13px] font-bold">{privacy.label}</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 rounded-xl p-2">
                      {privacySettings.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => setPrivacy(s)} className="gap-3 py-2.5">
                          <s.icon className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{s.label}</span>
                            <span className="text-[10px] text-muted-foreground">{s.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className={cn("h-7 px-2 rounded-md flex items-center gap-1.5", taggedUsers.length > 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/60")}
                    onClick={() => setIsTaggingSelectorOpen(true)}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span className="text-[13px] font-bold">{taggedUsers.length > 0 ? `${taggedUsers.length} Tagged` : "Tag People"}</span>
                  </Button>
                </div>
              </div>
            </div>

            {isEliteCreator && (
              <div className="flex items-center gap-2 bg-cyan-500/5 p-2 rounded-xl border border-cyan-500/10">
                <Lock className={cn("h-4 w-4", isLocked ? "text-cyan-500" : "text-muted-foreground/40")} />
                <Switch 
                  checked={isLocked} 
                  onCheckedChange={(val) => { triggerHaptic(10); setIsLocked(val); if(val) setIsPollOpen(false); }} 
                  className="data-[state=checked]:bg-cyan-500"
                />
              </div>
            )}
          </div>

          <div className={cn("px-4 relative min-h-[220px] transition-all duration-300 flex flex-col items-center justify-center p-8", selectedTheme.class)}>
            <div className="relative w-full">
              <Textarea ref={textareaRef} placeholder={isLimitedType ? "Short vibe... (150 chars max)" : "What's on your mind? (2000 chars max)"} className={cn("border-none focus-visible:ring-0 text-2xl resize-none p-0 min-h-[160px] bg-transparent text-center w-full", selectedTheme.id !== "none" ? "text-white placeholder:text-white/60" : "text-foreground")} value={content} onChange={handleContentChange} autoFocus />
              {showMentionSuggestions && mentionSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-card border border-primary/10 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-primary/5 flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Tag a person</span>
                    <span className="ml-auto text-[9px] text-muted-foreground font-bold">{taggedUsers.length}/25 tagged</span>
                  </div>
                  {mentionSuggestions.map((user) => (
                    <button
                      key={user.username}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectMention(user); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/40 transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8 border border-primary/10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm leading-none truncate">{user.name}</span>
                        <span className="text-[10px] text-muted-foreground font-black uppercase mt-0.5">@{user.username}</span>
                      </div>
                      {taggedUsers.find(u => u.username === user.username) && (
                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {activeSharedPost && (
              <div className="w-full mt-4 rounded-2xl overflow-hidden border border-primary/10 bg-secondary/30 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Sharing post from</span>
                  <button
                    onClick={() => setActiveSharedPost(null)}
                    className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {(activeSharedPost.image || activeSharedPost.videoUrl) && (
                  <div className="relative aspect-video w-full">
                    <Image
                      src={activeSharedPost.image || activeSharedPost.videoUrl}
                      alt="Shared post preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5 border border-primary/10 shrink-0">
                      <AvatarImage src={activeSharedPost.user?.avatar} />
                      <AvatarFallback>{activeSharedPost.user?.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] font-black text-foreground truncate">{activeSharedPost.user?.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">@{activeSharedPost.user?.username}</span>
                  </div>
                  {activeSharedPost.content && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{activeSharedPost.content}</p>
                  )}
                </div>
              </div>
            )}

            {isLocked && (
              <div className="w-full max-w-sm mt-8 p-6 bg-black/20 backdrop-blur-md rounded-[2.5rem] border border-white/10 space-y-6 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gem className="h-4 w-4 text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Unlock Price</span>
                  </div>
                  <Badge className="bg-cyan-500 text-white border-none font-black h-5 px-3 uppercase tracking-tighter">{unlockPrice} LD</Badge>
                </div>
                <Slider 
                  value={[unlockPrice]} 
                  min={100}
                  max={500}
                  step={1} 
                  onValueChange={(val) => setUnlockPrice(val[0])}
                  className="[&_[role=slider]]:bg-cyan-500"
                />
                <div className="flex justify-between text-[8px] font-black text-white/40 uppercase tracking-widest">
                  <span>100 LD</span>
                  <span>500 LD</span>
                </div>
              </div>
            )}
          </div>


          {(isFetchingPreview || linkPreview || taggedUsers.length > 0) && (
            <div className="px-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300">
              {taggedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {taggedUsers.map(u => (
                    <div key={u.username} className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 text-[11px] font-bold">
                      <Avatar className="h-4 w-4"><AvatarImage src={u.avatar} /><AvatarFallback>{u.name?.[0]}</AvatarFallback></Avatar>
                      @{u.username}
                      <button onClick={() => setTaggedUsers(p => p.filter(x => x.username !== u.username))} className="ml-1 hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              {isFetchingPreview && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground p-3 bg-secondary/20 rounded-xl border border-primary/5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="font-bold uppercase tracking-widest text-[9px]">Fetching link preview...</span>
                </div>
              )}
              {linkPreview && !isFetchingPreview && (
                <a
                  href={linkPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="block rounded-2xl border border-primary/10 overflow-hidden bg-secondary/20 group relative"
                >
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLinkPreview(null); setDetectedUrl(null); }}
                    className="absolute top-2 right-2 z-10 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {linkPreview.image && (
                    <div className="w-full h-40 overflow-hidden bg-secondary/40">
                      <img src={linkPreview.image} alt={linkPreview.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {linkPreview.favicon && <img src={linkPreview.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                      <span>{linkPreview.siteName || ''}</span>
                      <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-40" />
                    </div>
                    {linkPreview.title && <p className="font-bold text-sm line-clamp-2">{linkPreview.title}</p>}
                    {linkPreview.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{linkPreview.description}</p>}
                  </div>
                </a>
              )}
            </div>
          )}

          {isPollOpen && (
            <div className="px-4 py-6 bg-secondary/10 border-y border-primary/5 space-y-6 animate-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Poll Question</Label>
                <Input 
                  placeholder="Ask the network..." 
                  className="h-12 bg-white/50 dark:bg-card/50 border-primary/10 rounded-xl font-bold"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Options</Label>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="relative group">
                    <Input 
                      placeholder={`Option ${i + 1}`} 
                      className="h-11 bg-white dark:bg-card border-none rounded-xl pr-10 shadow-sm"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                    />
                    {i > 1 && (
                      <button 
                        onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <Button variant="ghost" className="w-full h-11 border-2 border-dashed border-primary/10 rounded-xl text-primary font-black uppercase text-[10px] tracking-widest gap-2" onClick={handleAddPollOption}>
                    <Plus className="h-4 w-4" /> Add Pulse Option ({pollOptions.length}/6)
                  </Button>
                )}
              </div>
            </div>
          )}

          {showThemeSelector && (
            <div className="p-4 border-y border-primary/5 bg-secondary/5">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-2">
                  {backgroundThemes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { triggerHaptic(5); setSelectedTheme(t); }}
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center border-2 transition-all",
                        selectedTheme.id === t.id ? "border-primary scale-110 shadow-lg" : "border-transparent",
                        t.class === 'bg-transparent' ? "bg-secondary border-muted-foreground/20" : t.class
                      )}
                    >
                      {selectedTheme.id === t.id && <Check className={cn("h-5 w-5", t.id === 'none' ? "text-primary" : "text-white")} />}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {showFeelingSelector && (
            <div className="p-4 border-y border-primary/5 grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95">
              {feelings.map((f) => (
                <button
                  key={f.text}
                  onClick={() => { triggerHaptic(5); setFeeling(f); setShowFeelingSelector(false); }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    feeling?.text === f.text ? "bg-primary/10 border-primary text-primary" : "bg-secondary/20 border-transparent hover:bg-secondary/40"
                  )}
                >
                  <span className="text-xl">{f.emoji}</span>
                  <span className="text-xs font-bold uppercase tracking-widest">{f.text}</span>
                </button>
              ))}
            </div>
          )}

          {showLocationSelector && (
            <div className="p-4 border-y border-primary/5 space-y-4 animate-in slide-in-from-top-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input 
                  placeholder="Where are you? (e.g. Monrovia, Liberia)" 
                  className="h-12 pl-10 bg-secondary/30 border-none rounded-xl font-bold"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Recent Handshakes</p>
              <div className="flex flex-wrap gap-2">
                {["The Hub", "Main Cluster", "West Africa Node"].map(loc => (
                  <button key={loc} onClick={() => { triggerHaptic(5); setLocation(loc); setShowLocationSelector(false); }} className="px-4 py-2 rounded-lg bg-secondary/40 text-[10px] font-bold uppercase hover:bg-primary/10 hover:text-primary transition-all">{loc}</button>
                ))}
              </div>
            </div>
          )}

          {selectedMedia.length > 0 && !isCompressing && (
            <div className="px-4 pb-6 mt-4">
              <div className={cn("grid gap-2", selectedMedia.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {selectedMedia.map((url, i) => (
                  <div key={i} className="relative aspect-video rounded-[1.5rem] overflow-hidden group/media shadow-lg border border-primary/5">
                    {mediaType === 'video' ? <video src={url} className="w-full h-full object-cover" autoPlay muted loop playsInline /> : <Image src={url} alt="Preview" fill className={cn("object-cover", selectedFilter.class)} />}
                    <button onClick={() => removeMedia(i)} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stagedReelUrl && (
            <div className="px-4 pb-4 mt-2">
              <div className="relative rounded-[1.5rem] overflow-hidden border border-red-500/20 bg-black shadow-lg">
                <video src={stagedReelUrl} className="w-full aspect-video object-cover" muted loop playsInline autoPlay />
                <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1">
                  <Video className="h-3 w-3" /> Reel
                </div>
                <button
                  onClick={() => { setStagedReelFile(null); if (stagedReelUrl) URL.revokeObjectURL(stagedReelUrl); setStagedReelUrl(null); setStagedReelDuration(0); }}
                  className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold mt-2 px-1">Add a caption above, then tap Post to upload your reel.</p>
            </div>
          )}

          {(selectedMedia.length > 0 || !!stagedReelFile) && (
            <div className="px-4 pb-2">
              <button
                onClick={handleSuggestCaptions}
                disabled={isCaptionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-black uppercase tracking-widest transition-all hover:bg-primary/20 active:scale-95 disabled:opacity-60"
              >
                {isCaptionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                {captionSuggestions.length > 0 ? 'Hide suggestions' : isCaptionLoading ? 'Generating…' : 'AI Caption Ideas'}
              </button>

              {captionSuggestions.length > 0 && (
                <div className="mt-3 space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                  {captionSuggestions.map((caption, i) => (
                    <button
                      key={i}
                      onClick={() => { setContent(caption); setCaptionSuggestions([]); triggerHaptic(5); }}
                      className="w-full text-left px-4 py-3 rounded-2xl bg-secondary/40 border border-primary/10 text-[12px] font-medium leading-snug hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-[0.98]"
                    >
                      {caption}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t mt-4">
            <button onClick={() => fileInputRef.current?.click()} disabled={isPollOpen || mediaType === 'video' || selectedTheme.id !== "none" || isCompressing || !!stagedReelFile} className="w-full flex items-center justify-between p-4 transition-colors hover:bg-secondary/20 disabled:opacity-30">
              <div className="flex items-center gap-4"><ImageIcon className="h-6 w-6 text-green-500" /><span className="text-base font-medium">Photo</span>{mediaType === 'image' && <span className="text-[10px] text-muted-foreground font-bold ml-auto">{selectedMedia.length}/6</span>}</div>
            </button>
            <button onClick={() => reelVideoInputRef.current?.click()} disabled={isPollOpen || mediaType === 'video' || !!stagedReelFile} className="w-full flex items-center justify-between p-4 transition-colors hover:bg-secondary/20 disabled:opacity-30">
              <div className="flex items-center gap-4"><Video className="h-6 w-6 text-red-500" /><span className="text-base font-medium">Create Reel</span><span className="text-[10px] text-muted-foreground font-bold ml-auto">Upload Video</span></div>
            </button>
            <button onClick={() => toggleAction('poll')} disabled={selectedMedia.length > 0 || selectedTheme.id !== "none" || isCompressing} className="w-full flex items-center justify-between p-4 transition-colors hover:bg-secondary/20 disabled:opacity-30">
              <div className="flex items-center gap-4"><ListTodo className="h-6 w-6 text-purple-500" /><span className="text-base font-medium">Create Poll</span></div>
            </button>
            <button onClick={() => toggleAction('theme')} disabled={selectedMedia.length > 0 || isPollOpen || isCompressing} className="w-full flex items-center justify-between p-4 transition-colors hover:bg-secondary/20 disabled:opacity-30">
              <div className="flex items-center gap-4"><Palette className="h-6 w-6 text-pink-500" /><span className="text-base font-medium">Theme</span></div>
            </button>
            <button onClick={() => toggleAction('feeling')} className="w-full flex items-center justify-between p-4 transition-colors hover:bg-secondary/20">
              <div className="flex items-center gap-4"><Smile className="h-6 w-6 text-amber-500" /><span className="text-base font-medium">Feeling/Activity</span></div>
            </button>
            <button onClick={() => toggleAction('location')} className="w-full flex items-center justify-between p-4 transition-colors hover:bg-secondary/20">
              <div className="flex items-center gap-4"><MapPin className="h-6 w-6 text-red-400" /><span className="text-base font-medium">Check In</span></div>
            </button>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-card border-t shrink-0">
          <Button className="w-full h-11 font-bold text-lg bg-primary hover:bg-primary/90 text-white rounded-lg" disabled={(!content.trim() && selectedMedia.length === 0 && !pollQuestion && !stagedReelFile) || isOverLimit || isCompressing} onClick={handlePost}>
            POST
          </Button>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
        <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
        <input type="file" ref={reelVideoInputRef} className="hidden" accept="video/*" onChange={handleReelVideoChange} />

        <Dialog open={isTaggingSelectorOpen} onOpenChange={setIsTaggingSelectorOpen}>
          <DialogContent className="rounded-t-[2.5rem] p-0 overflow-hidden h-[80vh] flex flex-col bg-white dark:bg-card">
            <DialogHeader className="p-6 border-b space-y-1">
              <DialogTitle className="text-xl font-black italic uppercase tracking-widest text-primary flex items-center gap-2">
                <Tag className="h-5 w-5" /> Tag People
              </DialogTitle>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                {taggedUsers.length}/25 people tagged
              </p>
            </DialogHeader>
            {taggedUsers.length > 0 && (
              <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-primary/5 bg-primary/5">
                {taggedUsers.map(u => (
                  <div key={u.username} className="flex items-center gap-1.5 bg-white dark:bg-card rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm border border-primary/10">
                    <Avatar className="h-4 w-4"><AvatarImage src={u.avatar} /><AvatarFallback>{u.name?.[0]}</AvatarFallback></Avatar>
                    @{u.username}
                    <button onClick={() => handleToggleTagUser(u)} className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            {taggedUsers.length >= 25 && (
              <div className="mx-4 mt-3 flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                You can only tag up to 25 people.
              </div>
            )}
            <div className="p-4 space-y-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Query connections..." className="pl-10 h-12 bg-secondary/30 border-none rounded-xl" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-2 pb-10">
                {(filteredTagResults || []).map((c) => {
                  const isTagged = taggedUsers.some(u => u.username === c.username);
                  return (
                    <button key={c.username} onClick={() => handleToggleTagUser(c)} className={cn("w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-all", isTagged && "bg-primary/5")}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-primary/10"><AvatarImage src={c.avatar} /><AvatarFallback>{c.name?.[0]}</AvatarFallback></Avatar>
                        <div className="text-left"><p className="font-bold text-sm leading-none">{c.name}</p><p className="text-[10px] text-muted-foreground font-black uppercase mt-1">@{c.username}</p></div>
                      </div>
                      {isTagged ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20" />}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="p-4 border-t shrink-0">
              <Button className="w-full font-bold rounded-xl" onClick={() => setIsTaggingSelectorOpen(false)}>
                Done ({taggedUsers.length} tagged)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
