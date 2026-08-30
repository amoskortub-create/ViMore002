"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Info, 
  MoreHorizontal,
  Search,
  ChevronDown,
  Mic,
  CornerUpLeft,
  Bookmark,
  X,
  Zap,
  LayoutDashboard,
  ShieldCheck,
  Eye,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Play,
  Maximize2,
  Minimize2,
  Info as InfoIcon,
  Heart,
  Flame,
  Rocket,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldAlert,
  Layers,
  LogOut,
  Shield,
  Trash2,
  UserPlus,
  ChevronRight,
  Plus,
  Loader2,
  Check,
  Ban,
  Camera,
} from "lucide-react";
import { getAvatarUrl, BUCKET, getFileUrl } from "@/lib/appwrite";
import { cn } from "@/lib/utils";
import { playNotificationSound } from "@/lib/notification-sound";
import { Connection, Cluster, usePosts } from "@/context/PostContext";
import { useNetwork } from "@/context/NetworkContext";
import { saveChatMessages, loadChatMessages } from "@/lib/offline-cache";
import { getAdaptivePreview } from "@/lib/adaptive-media";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";
import { useMusic } from "@/context/MusicContext";
import { useTranslation } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";

import { ScrollArea } from "@/components/ui/scroll-area";
import { OnlineIndicator } from "@/components/ui/online-indicator";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ChatWindowProps {
  contact: Connection | Cluster;
  onBack: () => void;
}

export function ChatWindow({ contact, onBack }: ChatWindowProps) {
  const { currentUser, triggerHaptic, leaveCluster, connections = [], addMemberToCluster, updateCluster, settings, chatMessages, sendChatMessage, uploadMedia, friendUsernames, acceptedStrangerUsernames, acceptMessageRequest, declineMessageRequest, deleteMessage, editMessage, clusterMemberReceipts } = usePosts();
  const { tier: netTier } = useNetwork();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const isCluster = contact.isGroup === true;
  const contactId = isCluster ? (contact as Cluster).$id : (contact as Connection).username;
  const isAdmin = isCluster && !!currentUser && (contact as Cluster).adminUsername === currentUser.username;
  
  const [showVault, setShowVault] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    text: string;
    senderName: string;
    type: string;
  } | null>(null);
  const typingAutoHideRef = useRef<NodeJS.Timeout | null>(null);

  // Pending (optimistic) voice bubble shown while upload is in progress
  const [pendingVoice, setPendingVoice] = useState<{
    localUrl: string;
    duration: string;
    progress: number;
  } | null>(null);
  const pendingProgressRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const typingDocCreatedRef = useRef(false);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [addNodeSearch, setAddNodeSearch] = useState("");
  const [editClusterName, setEditClusterName] = useState((contact as Cluster)?.name || "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const logoEditRef = useRef<HTMLInputElement>(null);
  const coverEditRef = useRef<HTMLInputElement>(null);

  const isRequest = useMemo(() => {
    if (isCluster) return false;
    return !friendUsernames.has(contactId) && !acceptedStrangerUsernames.has(contactId);
  }, [isCluster, friendUsernames, acceptedStrangerUsernames, contactId]);

  const messages = useMemo(() => {
    const live = chatMessages[contactId];
    if (live && live.length > 0) return live;
    return loadChatMessages(contactId) as typeof live;
  }, [chatMessages, contactId]);

  // Persist messages to local cache whenever they update (for offline access)
  useEffect(() => {
    const live = chatMessages[contactId];
    if (live && live.length > 0) {
      saveChatMessages(contactId, live, 50);
    }
  }, [chatMessages, contactId]);

  // Compute a map of messageId → seen-by avatars (like Messenger).
  // Each member's avatar appears under the LAST message they've read.
  const seenByMap = useMemo(() => {
    const map: Record<string, { name: string; avatar: string }[]> = {};
    if (!settings.showReadReceipts) return map;

    if (!isCluster) {
      // DM: show contact avatar under the last read message sent by me
      const contactConn = contact as Connection;
      const myReadMsgs = messages.filter(m => m.sender === 'me' && m.status === 'read');
      if (myReadMsgs.length > 0) {
        const last = myReadMsgs[myReadMsgs.length - 1];
        map[last.$id] = [{ name: contactConn.name, avatar: (contactConn as any).avatar || '' }];
      }
      return map;
    }

    // Cluster: for each member show their avatar under the last msg they've seen
    const receipts = clusterMemberReceipts[contactId] || {};
    const members = (contact as Cluster).members || [];
    const myMsgs = messages.filter(m => m.sender === 'me' && m.createdAt);

    for (const member of members) {
      if (member.$id === currentUser?.$id) continue; // skip self
      const receipt = receipts[member.$id];
      if (!receipt) continue;
      const receiptTs = new Date(receipt).getTime();

      let lastSeenMsgId: string | null = null;
      for (const msg of myMsgs) {
        if (msg.createdAt && msg.createdAt <= receiptTs) {
          lastSeenMsgId = msg.$id;
        }
      }
      if (lastSeenMsgId) {
        if (!map[lastSeenMsgId]) map[lastSeenMsgId] = [];
        map[lastSeenMsgId].push({ name: member.name, avatar: (member as any).avatar || '' });
      }
    }
    return map;
  }, [isCluster, contact, contactId, messages, clusterMemberReceipts, settings.showReadReceipts, currentUser?.$id]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const userScrolledUpRef = useRef(false);

  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const handleScroll = () => {
    userScrolledUpRef.current = !isNearBottom();
  };

  useEffect(() => {
    const newCount = messages.length;
    const isNewMessage = newCount > prevMsgCountRef.current;
    if (scrollRef.current) {
      if (!userScrolledUpRef.current || isNewMessage && messages[newCount - 1]?.sender === 'me') {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      } else if (isNewMessage && !userScrolledUpRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, showVault]);

  useEffect(() => {
    const count = messages.length;
    if (count > prevMsgCountRef.current && count > 0) {
      const last = messages[count - 1];
      if (last && last.sender !== 'me' && last.sender !== currentUser?.username && !settings.isSilenceActive) {
        playNotificationSound();
      }
    }
    prevMsgCountRef.current = count;
  }, [messages, currentUser?.username, settings.isSilenceActive]);

  // ── Real-time typing indicator subscription ───────────────────────────────
  useEffect(() => {
    if (!currentUser?.$id || isCluster) return;

    let unsubscribe: (() => void) | null = null;

    import('@/lib/appwrite').then(({ client, DATABASE_ID, COL }) => {
      const channel = `databases.${DATABASE_ID}.collections.${COL.TYPING_INDICATORS}.documents`;

      unsubscribe = client.subscribe(channel, (response) => {
        const events = response.events as string[];
        const payload = response.payload as any;
        if (!payload) return;

        const isMyChat =
          payload.receiver_username === currentUser.username &&
          payload.sender_username === contactId;

        if (!isMyChat) return;

        const isDelete = events.some(e => e.endsWith('.delete'));

        if (isDelete) {
          setIsOtherTyping(false);
          if (typingAutoHideRef.current) clearTimeout(typingAutoHideRef.current);
        } else {
          setIsOtherTyping(true);
          if (typingAutoHideRef.current) clearTimeout(typingAutoHideRef.current);
          typingAutoHideRef.current = setTimeout(() => setIsOtherTyping(false), 4000);
        }
      });
    }).catch(() => {});

    return () => {
      unsubscribe?.();
      if (typingAutoHideRef.current) clearTimeout(typingAutoHideRef.current);
    };
  }, [currentUser?.$id, currentUser?.username, contactId, isCluster]);

  // ── Typing sender helpers ─────────────────────────────────────────────────
  const typingDocId = useMemo(() => {
    if (!currentUser?.$id || isCluster) return '';
    const raw = `${currentUser.$id.slice(0, 17)}_${contactId.slice(0, 17)}`;
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 36);
  }, [currentUser?.$id, contactId, isCluster]);

  const clearTypingDoc = useCallback(async () => {
    if (!typingDocCreatedRef.current || !typingDocId) return;
    typingDocCreatedRef.current = false;
    try {
      const { databases, DATABASE_ID, COL } = await import('@/lib/appwrite');
      await databases.deleteDocument(DATABASE_ID, COL.TYPING_INDICATORS, typingDocId);
    } catch { /* already deleted or never created */ }
  }, [typingDocId]);

  const handleTyping = useCallback(async () => {
    if (isCluster || !currentUser?.$id || !typingDocId) return;
    if (stopTypingDebounceRef.current) clearTimeout(stopTypingDebounceRef.current);
    stopTypingDebounceRef.current = setTimeout(() => { clearTypingDoc(); }, 2000);
    if (typingDocCreatedRef.current) return;
    try {
      const { databases, DATABASE_ID, COL } = await import('@/lib/appwrite');
      const docData = {
        sender_id: currentUser.$id,
        sender_username: currentUser.username,
        receiver_username: contactId,
      };
      await databases.createDocument(DATABASE_ID, COL.TYPING_INDICATORS, typingDocId, docData);
      typingDocCreatedRef.current = true;
    } catch (err: any) {
      if (err?.code === 409) {
        typingDocCreatedRef.current = true;
      }
    }
  }, [isCluster, currentUser?.$id, currentUser?.username, contactId, typingDocId, clearTypingDoc]);

  const handleStopTyping = useCallback(() => {
    if (stopTypingDebounceRef.current) clearTimeout(stopTypingDebounceRef.current);
    clearTypingDoc();
  }, [clearTypingDoc]);

  useEffect(() => {
    return () => {
      if (stopTypingDebounceRef.current) clearTimeout(stopTypingDebounceRef.current);
      clearTypingDoc();
    };
  }, [clearTypingDoc]);

  // ── Typing sound (plays once when the other person starts typing) ────────
  const prevIsOtherTypingRef = useRef(false);
  const playTypingSound = useCallback(() => {
    if (settings.isSilenceActive) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      // Two soft ticks separated by 80 ms — mimics WhatsApp typing sound
      [0, 0.08].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + delay + 0.05);
        gain.gain.setValueAtTime(0.07, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.07);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.07);
      });
      setTimeout(() => ctx.close(), 600);
    } catch { /* audio not available */ }
  }, [settings.isSilenceActive]);

  useEffect(() => {
    // Only fire the sound on the rising edge (false → true)
    if (isOtherTyping && !prevIsOtherTypingRef.current) {
      playTypingSound();
    }
    prevIsOtherTypingRef.current = isOtherTyping;
  }, [isOtherTyping, playTypingSound]);

  const handleLogoEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isCluster) return;
    setLogoUploading(true);
    try {
      const { uploadViaClient } = await import('@/lib/upload');
      const avatarFileId = await uploadViaClient(file, BUCKET.AVATARS);
      await updateCluster((contact as Cluster).$id, { avatarId: avatarFileId });
      toast({ title: "Logo Updated", description: "Cluster logo has been changed." });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Upload Failed", description: err.message });
    } finally {
      setLogoUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleCoverEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isCluster) return;
    setCoverUploading(true);
    try {
      const { uploadViaClient } = await import('@/lib/upload');
      const coverFileId = await uploadViaClient(file, BUCKET.COVERS);
      await updateCluster((contact as Cluster).$id, { coverId: coverFileId });
      toast({ title: "Cover Updated", description: "Cluster cover has been changed." });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Upload Failed", description: err.message });
    } finally {
      setCoverUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSend = async (text: string, options?: { isViewOnce?: boolean; isWorkspace?: boolean; mediaUrl?: string; mediaType?: 'photo' | 'video' | 'voice'; duration?: string; file?: File }) => {
    triggerHaptic(10);

    // ── Voice messages: show bubble instantly, upload in background ──────────
    if (options?.mediaType === 'voice' && options.file) {
      const localUrl = options.mediaUrl || URL.createObjectURL(options.file);
      const duration = options.duration || '0:00';

      // Immediately show the pending bubble at 0%
      setPendingVoice({ localUrl, duration, progress: 0 });

      // Animate progress bar to ~85% to give visual feedback
      let prog = 0;
      pendingProgressRef.current = setInterval(() => {
        prog = Math.min(85, prog + Math.random() * 12 + 5);
        setPendingVoice((prev) => prev ? { ...prev, progress: Math.round(prog) } : null);
        if (prog >= 85 && pendingProgressRef.current) clearInterval(pendingProgressRef.current);
      }, 200);

      try {
        const { BUCKET } = await import('@/lib/appwrite');
        const finalUrl = await uploadMedia(options.file, BUCKET.VOICE_MESSAGES);

        // Jump to 100% then send the real message
        if (pendingProgressRef.current) clearInterval(pendingProgressRef.current);
        setPendingVoice((prev) => prev ? { ...prev, progress: 100 } : null);

        await sendChatMessage(contactId, {
          type: 'voice' as any,
          mediaUrl: finalUrl,
          voiceDuration: duration,
          ...(replyingTo ? {
            replyToId: replyingTo.id,
            replyToText: replyingTo.text,
            replyToSenderName: replyingTo.senderName,
            replyToType: replyingTo.type,
          } : {}),
        });
        setReplyingTo(null);

        // Brief pause so user sees "100%" before the real bubble replaces it
        setTimeout(() => setPendingVoice(null), 350);
      } catch (err: any) {
        if (pendingProgressRef.current) clearInterval(pendingProgressRef.current);
        setPendingVoice(null);
        toast({ variant: 'destructive', title: 'Upload Failed', description: err?.message || 'Could not upload voice message.' });
      }
      return;
    }

    // ── All other message types ───────────────────────────────────────────────
    try {
      let finalMediaUrl = options?.mediaUrl;

      if (options?.file) {
        try {
          const { BUCKET } = await import('@/lib/appwrite');
          const bucket = options.mediaType === 'voice' ? BUCKET.VOICE_MESSAGES : BUCKET.MESSAGE_MEDIA;
          finalMediaUrl = await uploadMedia(options.file, bucket);
        } catch (uploadErr: any) {
          toast({ variant: 'destructive', title: 'Upload Failed', description: uploadErr?.message || 'Could not upload media.' });
          return;
        }
      }

      await sendChatMessage(contactId, {
        text: text || undefined,
        type: options?.isWorkspace ? "workspace" : (options?.mediaType || (text.includes("http") ? "link" : "text")) as any,
        isViewOnce: options?.isViewOnce,
        mediaUrl: finalMediaUrl,
        voiceDuration: options?.duration,
        ...(replyingTo ? {
          replyToId: replyingTo.id,
          replyToText: replyingTo.text,
          replyToSenderName: replyingTo.senderName,
          replyToType: replyingTo.type,
        } : {}),
      });
      setReplyingTo(null);
    } catch {
      return;
    }
  };

  const handleExternalLink = (url: string) => {
    triggerHaptic(5);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmLeave = () => {
    if (isCluster) {
      triggerHaptic(50);
      leaveCluster((contact as Cluster).$id);
      onBack();
    }
  };

  const handleAddNode = (member: Connection) => {
    if (isCluster) {
      triggerHaptic(30);
      addMemberToCluster((contact as Cluster).$id, member);
      toast({ title: "Node Synced", description: `@${member.username} joined cluster.` });
      setAddNodeSearch("");
    }
  };

  const handleAccept = async () => {
    await acceptMessageRequest(contactId);
  };

  const handleDecline = async () => {
    await declineMessageRequest(contactId);
    onBack();
  };

  const isContactOnline = !isCluster && (contact as Connection).isOnline && !settings.isGhostMode;
  const contactLastSeenAt = !isCluster ? (contact as Connection).lastSeenAt : null;

  return (
    <div className="flex flex-1 min-h-0 bg-[#F0F2F5] dark:bg-[#080808] relative overflow-hidden">
      {isAdmin && (
        <>
          <input ref={logoEditRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleLogoEdit} />
          <input ref={coverEditRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleCoverEdit} />
        </>
      )}
      <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden">
        <header className="h-[76px] px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-card border-b border-primary/5 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden rounded-full h-10 w-10 -ml-2" onClick={onBack}><ArrowLeft className="h-6 w-6" /></Button>
            <div className="relative shrink-0">
              {isCluster ? (
                isAdmin ? (
                  <button
                    type="button"
                    onClick={() => logoEditRef.current?.click()}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-[1rem] bg-primary/10 flex items-center justify-center relative overflow-hidden border border-primary/5 group"
                    title="Change cluster logo"
                  >
                    {(contact as Cluster).avatar ? <img src={getAdaptivePreview((contact as Cluster).avatar, 'avatar', netTier) || (contact as Cluster).avatar} alt="Cluster" className="w-full h-full object-cover" /> : <Layers className="h-5 w-5 text-primary" />}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      {logoUploading ? <Loader2 className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100 animate-spin" /> : <Camera className="h-3.5 w-3.5 text-white opacity-0 group-hover:opacity-100" />}
                    </div>
                  </button>
                ) : (
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-[1rem] bg-primary/10 flex items-center justify-center relative overflow-hidden border border-primary/5">
                    {(contact as Cluster).avatar ? <img src={getAdaptivePreview((contact as Cluster).avatar, 'avatar', netTier) || (contact as Cluster).avatar} alt="Cluster" className="w-full h-full object-cover" /> : <Layers className="h-5 w-5 text-primary" />}
                  </div>
                )
              ) : (
                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-primary/10">
                  <AvatarImage src={getAdaptivePreview((contact as Connection).avatar, 'avatar', netTier) || (contact as Connection).avatar} />
                  <AvatarFallback>{contact.name[0]}</AvatarFallback>
                </Avatar>
              )}
              {!isCluster && !isRequest && (
                <OnlineIndicator
                  isOnline={!!isContactOnline}
                  lastSeenAt={contactLastSeenAt}
                  dotClassName="h-3 w-3"
                  className="absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-card rounded-full"
                />
              )}
            </div>
            <div className="flex flex-col min-w-0 ml-1">
              <h3 className="font-bold text-sm sm:text-base truncate">{contact.name}</h3>
              {isCluster ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {`${((contact as Cluster).members || []).length} ${t('chat_members_pulse')}`}
                </span>
              ) : isRequest ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">STRANGER PULSE</span>
              ) : (
                <OnlineIndicator
                  isOnline={!!isContactOnline}
                  lastSeenAt={contactLastSeenAt}
                  showText
                  dotClassName="h-1.5 w-1.5"
                />
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className={cn("rounded-full transition-all", showVault ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => { triggerHaptic(5); setShowVault(!showVault); }}>
              {isCluster ? <Bookmark className="h-5 w-5" /> : <InfoIcon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(153, 64, 22, 0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
          {isRequest && (
            <div className="max-w-md mx-auto p-6 bg-white dark:bg-card border border-primary/10 rounded-[2rem] text-center space-y-4 animate-in zoom-in-95 duration-500 shadow-xl">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black italic uppercase tracking-tighter">{t('chat_requests')}</h4>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                  {t('chat_request_desc')}
                </p>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-12">
              <div className="h-20 w-20 bg-primary/5 rounded-[2rem] flex items-center justify-center border border-dashed border-primary/20 mb-6">
                <Zap className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">Handshake Initialized</h3>
              <p className="text-sm font-medium mt-2">Start typing to materialize your thoughts in the network.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.$id} id={`msg-${msg.$id}`} className="flex flex-col gap-1">
                {isCluster && !msg.isMe && msg.senderName && (
                  <div className="flex items-center gap-2 ml-2 mb-1">
                    <Avatar className="h-5 w-5 border border-primary/10 shadow-sm"><AvatarImage src={getAdaptivePreview(msg.senderAvatar, 'avatar', netTier) || msg.senderAvatar} /></Avatar>
                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">{msg.senderName}</span>
                  </div>
                )}
                <ChatBubble 
                  {...msg}
                  id={msg.$id}
                  isMe={msg.sender === "me"} 
                  status={settings.showReadReceipts ? msg.status : 'sent'}
                  seenByAvatars={seenByMap[msg.$id] || []}
                  onExternalLink={handleExternalLink}
                  onDelete={(msgId) => deleteMessage(msgId, contactId)}
                  onEdit={(msgId, newText) => editMessage(msgId, contactId, newText)}
                  onReply={(msgId) => {
                    const m = messages.find(x => x.$id === msgId);
                    if (!m) return;
                    const senderName = m.sender === 'me' ? (currentUser?.name || 'You') : (m.senderName || contact.name);
                    const previewText = m.type === 'text' ? (m.text || '') : '';
                    setReplyingTo({ id: msgId, text: previewText, senderName, type: m.type });
                    triggerHaptic(10);
                  }}
                  onScrollToReply={(msgId) => {
                    const el = document.getElementById(`msg-${msgId}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-primary/40', 'rounded-2xl');
                      setTimeout(() => el.classList.remove('ring-2', 'ring-primary/40', 'rounded-2xl'), 1200);
                    }
                  }}
                />
              </div>
            ))
          )}

          {pendingVoice && (
            <div className="flex items-end gap-2 justify-end animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex flex-col items-end gap-1 max-w-[75%]">
                <div className="bg-primary text-white rounded-2xl rounded-br-none px-4 py-3 flex items-center gap-3 min-w-[200px] shadow-lg shadow-primary/20">
                  <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black tracking-widest">{pendingVoice.duration}</div>
                    <div className="h-1.5 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${pendingVoice.progress}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-white/70 mt-1 uppercase tracking-widest font-black">
                      {pendingVoice.progress < 100 ? `Uploading ${pendingVoice.progress}%` : '✓ Sent'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isOtherTyping && !isCluster && (
            <div className="flex items-end gap-2 justify-start animate-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-7 w-7 shrink-0 border border-primary/10">
                <AvatarImage src={getAdaptivePreview((contact as Connection).avatar, 'avatar', netTier) || (contact as Connection).avatar} />
                <AvatarFallback>{contact.name[0]}</AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-card rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-primary/5">
                <div className="flex items-center gap-1 h-4">
                  <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
                  <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {isRequest ? (
          <div className="p-6 bg-white dark:bg-card border-t border-primary/5 z-20">
            <div className="max-w-xl mx-auto flex gap-4">
              <Button 
                variant="destructive" 
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-destructive/10"
                onClick={handleDecline}
              >
                <Ban className="h-4 w-4" /> {t('chat_decline')}
              </Button>
              <Button 
                className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-primary/20"
                onClick={handleAccept}
              >
                <Check className="h-4 w-4" /> {t('chat_accept')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {replyingTo && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-card border-t border-primary/5 animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex-1 flex items-start gap-2 border-l-4 border-primary pl-3 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary truncate">{replyingTo.senderName}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {replyingTo.type !== 'text' 
                        ? (replyingTo.type === 'voice' ? '🎙 Voice message' : replyingTo.type === 'photo' ? '🖼 Photo' : replyingTo.type === 'video' ? '🎥 Video' : `📎 ${replyingTo.type}`)
                        : replyingTo.text}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full shrink-0 hover:bg-secondary/80" onClick={() => setReplyingTo(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <ChatInput onSend={handleSend} onTyping={handleTyping} onStopTyping={handleStopTyping} />
          </>
        )}
      </div>

      <aside className={cn("h-full bg-white dark:bg-card border-l border-primary/5 transition-all duration-500 overflow-hidden flex flex-col shrink-0 relative z-30", showVault ? "w-full sm:w-[360px] opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-full")}>
        <div className="p-6 border-b border-primary/5 flex items-center justify-between shrink-0 bg-white/80 dark:bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{isCluster ? <Bookmark className="h-5 w-5" /> : <InfoIcon className="h-5 w-5" />}</div>
            <h3 className="font-black italic uppercase tracking-tighter text-lg">{isCluster ? t('chat_vault') : t('chat_node_details')}</h3>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => setShowVault(false)}><X className="h-6 w-6" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-10 pb-20">
            {isCluster && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('chat_members_pulse')}</span>
                  <div className="flex items-center gap-2">
                    {(isAdmin || !(contact as Cluster).isAddLocked) && (
                      <Dialog open={isAddNodeOpen} onOpenChange={setIsAddNodeOpen}>
                        <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><UserPlus className="h-4 w-4" /></Button></DialogTrigger>
                        <DialogContent className="rounded-[2rem] p-0 overflow-hidden border-primary/10">
                          <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10"><DialogTitle className="text-xl font-black italic uppercase tracking-widest text-primary">Add Node to Cluster</DialogTitle></DialogHeader>
                          <div className="p-4 space-y-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Search connections..." className="h-12 pl-10 rounded-2xl bg-secondary/20 border-none" value={addNodeSearch} onChange={(e) => setAddNodeSearch(e.target.value)} />
                            </div>
                            <ScrollArea className="h-[300px]">
                              <div className="space-y-2 pr-4">
                                {(connections || []).filter(c => friendUsernames.has(c.username) && !((contact as Cluster).members || []).some(m => m.username === c.username)).filter(c => !addNodeSearch || c.name.toLowerCase().includes(addNodeSearch.toLowerCase()) || c.username.toLowerCase().includes(addNodeSearch.toLowerCase())).map((c) => (
                                  <button key={c.username} onClick={() => handleAddNode(c)} className="w-full flex items-center justify-between p-3 rounded-2xl transition-all hover:bg-secondary/40">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10 border border-primary/10"><AvatarImage src={getAdaptivePreview(c.avatar, 'avatar', netTier) || c.avatar} /></Avatar>
                                      <div className="text-left"><p className="font-bold text-sm leading-none">{c.name}</p><p className="text-[10px] text-muted-foreground font-black uppercase mt-1">@{c.username}</p></div>
                                    </div>
                                    <Plus className="h-4 w-4 text-primary" />
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[8px] font-black h-4 px-2 uppercase">{((contact as Cluster).members || []).length} ACTIVE</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {((contact as Cluster).members || []).map(m => (
                    <div key={m.username} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-all group">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-primary/5 shadow-sm group-hover:scale-105 transition-transform"><AvatarImage src={getAdaptivePreview(m.avatar, 'avatar', netTier) || m.avatar} /></Avatar>
                        <div className="flex flex-col"><span className="text-sm font-bold truncate max-w-[120px]">{m.name}</span><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">@{m.username}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {isCluster && isAdmin && (
              <section className="space-y-4 pt-6 border-t border-primary/5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Cluster Settings</span>
                <div className="space-y-3">

                  {/* ── Logo ── */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Logo</label>
                    <button
                      type="button"
                      onClick={() => logoEditRef.current?.click()}
                      disabled={logoUploading}
                      className="w-full flex items-center gap-3 h-14 px-4 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-all border border-dashed border-primary/20 hover:border-primary/50 disabled:opacity-50"
                    >
                      <div className="h-9 w-9 rounded-xl overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
                        {(contact as Cluster).avatar
                          ? <img src={(contact as Cluster).avatar} className="w-full h-full object-cover" alt="logo" />
                          : <Layers className="h-4 w-4 text-primary" />}
                      </div>
                      {logoUploading
                        ? <div className="flex items-center gap-2 text-primary"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-xs font-black uppercase tracking-widest">Uploading...</span></div>
                        : <span className="text-xs font-bold text-muted-foreground">{(contact as Cluster).avatar ? 'Change logo' : 'Upload logo'}</span>
                      }
                      <Camera className="h-4 w-4 text-muted-foreground ml-auto" />
                    </button>
                  </div>

                  {/* ── Cover Photo ── */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Cover Photo</label>
                    <button
                      type="button"
                      onClick={() => coverEditRef.current?.click()}
                      disabled={coverUploading}
                      className="w-full flex items-center gap-3 h-14 px-4 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-all border border-dashed border-primary/20 hover:border-primary/50 disabled:opacity-50"
                    >
                      <div className="h-9 w-9 rounded-xl overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
                        {(contact as Cluster).cover
                          ? <img src={(contact as Cluster).cover} className="w-full h-full object-cover" alt="cover" />
                          : <ImageIcon className="h-4 w-4 text-primary" />}
                      </div>
                      {coverUploading
                        ? <div className="flex items-center gap-2 text-primary"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-xs font-black uppercase tracking-widest">Uploading...</span></div>
                        : <span className="text-xs font-bold text-muted-foreground">{(contact as Cluster).cover ? 'Change cover' : 'Upload cover'}</span>
                      }
                      <Camera className="h-4 w-4 text-muted-foreground ml-auto" />
                    </button>
                  </div>

                  {/* ── Name ── */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Name</label>
                    <div className="flex gap-2">
                      <Input value={editClusterName} onChange={(e) => setEditClusterName(e.target.value)} className="h-10 rounded-2xl bg-secondary/20 border-none text-sm font-bold" placeholder="Cluster name..." />
                      <Button size="sm" className="h-10 rounded-2xl px-4 font-black text-[10px] uppercase" onClick={() => { updateCluster((contact as Cluster).$id, { name: editClusterName }); toast({ title: "Name updated" }); }}>Save</Button>
                    </div>
                  </div>

                  {/* ── Lock Adding ── */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/20">
                    <div>
                      <p className="font-bold text-sm">Lock Adding</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Prevent members from adding</p>
                    </div>
                    <button
                      onClick={() => { updateCluster((contact as Cluster).$id, { isAddLocked: !(contact as Cluster).isAddLocked }); triggerHaptic(10); }}
                      className={cn("w-12 h-6 rounded-full transition-all relative", (contact as Cluster).isAddLocked ? "bg-primary" : "bg-secondary")}
                    >
                      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", (contact as Cluster).isAddLocked ? "left-6" : "left-0.5")} />
                    </button>
                  </div>
                </div>
              </section>
            )}
            <div className="pt-6 border-t border-primary/5 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">System Controls</h4>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-2xl text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all"><ShieldCheck className="h-5 w-5" /><span className="font-bold text-sm">Security Handshake</span></Button>
                {isCluster && (
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-2xl text-destructive hover:bg-destructive/5 transition-all" onClick={() => { triggerHaptic(15); setIsLeaveDialogOpen(true); }}>
                    <LogOut className="h-5 w-5" />
                    <span className="font-bold text-sm">{isAdmin ? "Dissolve Cluster" : "Leave Cluster"}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>

      <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] sm:max-w-[420px] z-[400] bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-2xl border-primary/10 shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive mb-4"><LogOut className="h-8 w-8" /></div>
            <AlertDialogTitle className="font-black italic uppercase tracking-tighter text-3xl text-center">{isAdmin ? "Dissolve Cluster?" : "Leave Cluster?"}</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium leading-relaxed text-center px-4">This action is terminal. You will lose access to this collective workspace node.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6"><AlertDialogCancel className="rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] bg-secondary/50 border-none hover:bg-secondary transition-all">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmLeave} className="rounded-2xl h-14 font-black italic uppercase tracking-widest text-[10px] bg-destructive hover:bg-destructive/90 text-white shadow-xl">Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
