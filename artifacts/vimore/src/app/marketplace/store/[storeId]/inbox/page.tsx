"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePosts } from "@/context/PostContext";
import { getStore, StoreDoc } from "@/lib/stores";
import { BUCKET, getFileUrl, formatTimeAgo } from "@/lib/appwrite";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth-fetch";
import { uploadViaClient } from "@/lib/upload";
import {
  ArrowLeft, Store, Loader2, Inbox, Send, Mic, StopCircle,
  ShoppingBag, Paperclip, Play, Pause, X, ChevronLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  clusterId: string;
  productId: string | null;
  buyerId: string;
  senderName: string;
  lastMessage: string;
  lastTime: string;
  isRead: boolean;
  type: string;
}

interface MktMessage {
  $id: string;
  $createdAt: string;
  cluster_id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  text?: string;
  type: string;
  media_url?: string;
  media_id?: string;
  voice_duration?: string;
  is_read: boolean;
}

// ─── Voice player ─────────────────────────────────────────────────────────────
function VoiceBubble({ url, duration, isMe }: { url: string; duration?: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, []);

  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-2xl min-w-[160px]", isMe ? "bg-primary text-white" : "bg-secondary")}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={toggle} className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", isMe ? "bg-white/20 hover:bg-white/30" : "bg-primary/10 hover:bg-primary/20")}>
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] font-bold opacity-70">{duration || "0:00"}</span>
      </div>
    </div>
  );
}

function formatRecordingTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Chat panel (right side or full screen) ───────────────────────────────────
function ChatPanel({
  conv,
  sellerId,
  sellerName,
  onBack,
}: {
  conv: Conversation;
  sellerId: string;
  sellerName: string;
  onBack: () => void;
}) {
  const { currentUser } = usePosts();
  const myId = currentUser?.$id || "";
  const myName = currentUser?.name || currentUser?.username || sellerName;

  const [messages, setMessages] = useState<MktMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMsgs = useCallback(async () => {
    try {
      const res = await fetch(`/api/marketplace/messages/list?clusterId=${encodeURIComponent(conv.clusterId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      // Mark as read
      fetch(`/api/marketplace/messages/list?clusterId=${encodeURIComponent(conv.clusterId)}`, { method: "PATCH" }).catch(() => {});
    } catch {}
  }, [conv.clusterId]);

  useEffect(() => {
    setLoading(true);
    fetchMsgs().finally(() => setLoading(false));
    pollRef.current = setInterval(fetchMsgs, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMsgs]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMsg = useCallback(async (opts: {
    text?: string; type?: string; mediaUrl?: string; mediaId?: string; voiceDuration?: string;
  }) => {
    if (!myId || !myName) return;
    setSending(true);
    try {
      const optimistic: MktMessage = {
        $id: "opt_" + Date.now(),
        $createdAt: new Date().toISOString(),
        cluster_id: conv.clusterId,
        sender_id: myId,
        sender_name: myName,
        receiver_id: conv.buyerId,
        text: opts.text,
        type: opts.type || "text",
        media_url: opts.mediaUrl,
        media_id: opts.mediaId,
        voice_duration: opts.voiceDuration,
        is_read: false,
      };
      setMessages(p => [...p, optimistic]);

      await fetch("/api/marketplace/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusterId: conv.clusterId,
          sellerId: conv.buyerId,
          senderName: myName,
          senderId: myId,
          ...opts,
        }),
      });
      await fetchMsgs();
    } finally {
      setSending(false);
    }
  }, [myId, myName, conv, fetchMsgs]);

  const handleSendText = async () => {
    if (mediaPreview) {
      setSending(true);
      try {
        const bucketId = BUCKET.MESSAGE_MEDIA;
        const fileId = await uploadViaClient(mediaPreview.file, bucketId);
        await sendMsg({
          text: text.trim() || undefined,
          type: mediaPreview.file.type.startsWith("video") ? "video" : "photo",
          mediaUrl: getFileUrl(bucketId, fileId),
          mediaId: fileId,
        });
      } finally { setMediaPreview(null); setText(""); setSending(false); }
      return;
    }
    const t = text.trim();
    if (!t) return;
    setText("");
    await sendMsg({ text: t, type: "text" });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const dur = recordingTime;
        setRecordingTime(0);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) return;
        setSending(true);
        try {
          const voiceFile = new File([blob], "voice.webm", { type: "audio/webm" });
          const bucketId = BUCKET.VOICE_MESSAGES;
          const fileId = await uploadViaClient(voiceFile, bucketId);
          await sendMsg({
            type: "voice",
            mediaUrl: getFileUrl(bucketId, fileId),
            mediaId: fileId,
            voiceDuration: formatRecordingTime(dur),
          });
        } finally { setSending(false); }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white dark:bg-card">
        <Button variant="ghost" size="icon" className="md:hidden rounded-full h-8 w-8 shrink-0" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-sm font-black bg-primary/10 text-primary">
            {(conv.senderName || "?")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate">{conv.senderName}</p>
          {conv.productId && conv.productId !== "store" && (
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Re: Product
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" ref={scrollRef}>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender_id === myId;
          return (
            <div key={msg.$id} className={cn("flex gap-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
              {!isMe && (
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="text-[9px] font-black bg-primary/10 text-primary">
                    {(msg.sender_name || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="max-w-[70%] space-y-1">
                {!isMe && <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">{msg.sender_name}</p>}
                {msg.type === "voice" && msg.media_url ? (
                  <VoiceBubble url={msg.media_url} duration={msg.voice_duration} isMe={isMe} />
                ) : msg.type === "photo" && msg.media_url ? (
                  <div className="rounded-2xl overflow-hidden max-w-[200px]">
                    <img src={msg.media_url} alt="Photo" className="w-full object-cover" />
                    {msg.text && <p className={cn("px-3 py-2 text-sm", isMe ? "bg-primary text-white" : "bg-secondary")}>{msg.text}</p>}
                  </div>
                ) : msg.type === "video" && msg.media_url ? (
                  <div className="rounded-2xl overflow-hidden max-w-[200px]">
                    <video src={msg.media_url} controls className="w-full" />
                  </div>
                ) : (
                  <div className={cn(
                    "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                    isMe ? "bg-primary text-white rounded-tr-sm" : "bg-white dark:bg-card border border-border/40 rounded-tl-sm"
                  )}>
                    {msg.text}
                  </div>
                )}
                <p className={cn("text-[9px] text-muted-foreground", isMe ? "text-right mr-1" : "ml-1")}>
                  {formatTimeAgo(new Date(msg.$createdAt))}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Media preview */}
      {mediaPreview && (
        <div className="px-4 pb-1">
          <div className="relative inline-block">
            <img src={mediaPreview.url} alt="preview" className="h-20 w-20 object-cover rounded-xl border border-border" />
            <button onClick={() => setMediaPreview(null)} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border bg-white dark:bg-card px-3 py-2.5">
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => {
          const f = e.target.files?.[0]; if (!f) return;
          setMediaPreview({ file: f, url: URL.createObjectURL(f) });
          e.target.value = "";
        }} />
        {recording ? (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl px-3 py-2.5">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="flex-1 text-sm font-bold text-destructive">Recording {formatRecordingTime(recordingTime)}</span>
            <Button size="sm" variant="destructive" className="rounded-xl h-8 gap-1.5 text-[10px] font-black uppercase" onClick={stopRecording}>
              <StopCircle className="h-3.5 w-3.5" /> Stop
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground hover:text-primary" onClick={() => fileInputRef.current?.click()} disabled={sending}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
              placeholder={mediaPreview ? "Add a caption…" : "Reply to buyer…"}
              className="flex-1 rounded-2xl h-9 bg-secondary/40 border-none text-sm"
              disabled={sending}
            />
            {text.trim() || mediaPreview ? (
              <Button size="icon" className="h-9 w-9 rounded-xl shrink-0 bg-primary hover:bg-primary/90" onClick={handleSendText} disabled={sending}>
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground hover:text-primary" onClick={startRecording} disabled={sending}>
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main inbox page ──────────────────────────────────────────────────────────
export default function StoreInboxPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const router = useRouter();
  const { currentUser, isLoading } = usePosts();

  const [store, setStore] = useState<StoreDoc | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStore(storeId).then(s => { if (!cancelled) { setStore(s); setStoreLoading(false); } });
    return () => { cancelled = true; };
  }, [storeId]);

  const fetchConvs = useCallback(async (ownerId: string) => {
    try {
      const res = await fetch(`/api/marketplace/messages/conversations?sellerId=${encodeURIComponent(ownerId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!store) return;
    setConvsLoading(true);
    fetchConvs(store.owner_id).finally(() => setConvsLoading(false));
    pollRef.current = setInterval(() => fetchConvs(store.owner_id), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [store, fetchConvs]);

  if (isLoading || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Store className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Store not found</p>
        <Link href="/marketplace"><Button variant="secondary" className="rounded-xl">Back to Marketplace</Button></Link>
      </div>
    );
  }

  const isOwner = currentUser?.$id === store.owner_id;
  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-lg font-black italic uppercase tracking-tighter">Inbox is private</p>
        <p className="text-sm text-muted-foreground">Only the store owner can view messages.</p>
        <Link href={`/marketplace/store/${storeId}`}>
          <Button variant="secondary" className="rounded-xl mt-2">Back to Store</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#050505] flex justify-center">
      <div className="max-w-[1100px] w-full h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white dark:bg-card border-b border-border h-14 px-4 flex items-center gap-3 shrink-0">
          <Link href={`/marketplace/store/${storeId}`}>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Inbox className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm truncate">{store.store_name} — Inbox</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </header>

        {/* Two-panel layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation list */}
          <aside className={cn(
            "w-full md:w-80 md:min-w-[280px] md:max-w-[320px] border-r border-border bg-white dark:bg-card flex flex-col shrink-0",
            selected ? "hidden md:flex" : "flex"
          )}>
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Customer Messages</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convsLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                  <div className="h-14 w-14 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <Inbox className="h-7 w-7 text-primary/40" />
                  </div>
                  <p className="text-sm font-bold">No messages yet</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When customers message you about your products, they'll appear here.
                  </p>
                </div>
              ) : conversations.map(conv => (
                <button
                  key={conv.clusterId}
                  onClick={() => setSelected(conv)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3.5 border-b border-border/40 hover:bg-secondary/40 transition-all text-left",
                    selected?.clusterId === conv.clusterId && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                    <AvatarFallback className="text-sm font-black bg-primary/10 text-primary">
                      {(conv.senderName || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm truncate", !conv.isRead ? "font-black" : "font-bold")}>
                        {conv.senderName}
                      </p>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {formatTimeAgo(new Date(conv.lastTime))}
                      </span>
                    </div>
                    {conv.productId && conv.productId !== "store" && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <ShoppingBag className="h-2.5 w-2.5 text-primary/60" />
                        <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Re: product</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    {!conv.isRead && (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Chat panel */}
          <main className={cn(
            "flex-1 flex flex-col overflow-hidden",
            !selected ? "hidden md:flex items-center justify-center" : "flex"
          )}>
            {!selected ? (
              <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <Inbox className="h-8 w-8 text-primary/40" />
                </div>
                <div>
                  <p className="font-black text-base">Select a conversation</p>
                  <p className="text-sm text-muted-foreground mt-1">Choose a customer chat to view and reply</p>
                </div>
              </div>
            ) : (
              <ChatPanel
                conv={selected}
                sellerId={store.owner_id}
                sellerName={currentUser?.name || currentUser?.username || store.store_name}
                onBack={() => setSelected(null)}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
