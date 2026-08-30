"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePosts } from "@/context/PostContext";
import { cn } from "@/lib/utils";
import { BUCKET, getFileUrl, formatTimeAgo } from "@/lib/appwrite";
import { authFetch } from "@/lib/auth-fetch";
import { uploadViaClient } from "@/lib/upload";
import {
  ArrowLeft, Send, Paperclip, Mic, StopCircle,
  ShoppingBag, Store, Loader2, X, Play, Pause, User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Guest identity helpers ───────────────────────────────────────────────────
function getOrCreateGuestId(): string {
  try {
    const stored = localStorage.getItem("mkt_guest_id");
    if (stored) return stored;
    const id = "guest_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("mkt_guest_id", id);
    return id;
  } catch {
    return "guest_" + Math.random().toString(36).slice(2);
  }
}

function getSavedGuestName(): string {
  try { return localStorage.getItem("mkt_guest_name") || ""; } catch { return ""; }
}

function saveGuestName(name: string) {
  try { localStorage.setItem("mkt_guest_name", name); } catch {}
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Voice bubble player ──────────────────────────────────────────────────────
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MarketplaceChatPage() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser } = usePosts();

  const productId = searchParams.get("product") || "store";
  const productName = searchParams.get("pname") || "";
  const storeName = searchParams.get("store") || "";

  // ── Identity ──────────────────────────────────────────────────────────────
  const [guestId, setGuestId] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [nameInput, setNameInput] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const myId = currentUser?.$id || guestId;
  const myName = currentUser?.name || currentUser?.username || guestName;

  useEffect(() => {
    const gid = getOrCreateGuestId();
    setGuestId(gid);
    const saved = getSavedGuestName();
    setGuestName(saved);
    if (!currentUser && !saved) setShowNamePrompt(true);
  }, [currentUser]);

  // cluster_id: mkt_{sellerId}_{buyerId} — product context is passed via URL params only
  const clusterId = myId ? `mkt_${sellerId}_${myId}` : "";

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<MktMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!clusterId) return;
    try {
      const res = await fetch(`/api/marketplace/messages/list?clusterId=${encodeURIComponent(clusterId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  }, [clusterId]);

  useEffect(() => {
    if (!clusterId) return;
    setLoadingMessages(true);
    fetchMessages().finally(() => setLoadingMessages(false));
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [clusterId, fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ── Sending ───────────────────────────────────────────────────────────────
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMsg = useCallback(async (opts: {
    text?: string;
    type?: string;
    mediaUrl?: string;
    mediaId?: string;
    voiceDuration?: string;
  }) => {
    if (!myId || !myName || !clusterId) return;
    setSending(true);
    try {
      // Optimistic
      const optimistic: MktMessage = {
        $id: "opt_" + Date.now(),
        $createdAt: new Date().toISOString(),
        cluster_id: clusterId,
        sender_id: myId,
        sender_name: myName,
        receiver_id: sellerId,
        text: opts.text,
        type: opts.type || "text",
        media_url: opts.mediaUrl,
        media_id: opts.mediaId,
        voice_duration: opts.voiceDuration,
        is_read: false,
      };
      setMessages(prev => [...prev, optimistic]);

      const res = await fetch("/api/marketplace/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusterId,
          sellerId,
          senderName: myName,
          senderId: myId,
          text: opts.text,
          type: opts.type || "text",
          mediaUrl: opts.mediaUrl,
          mediaId: opts.mediaId,
          voiceDuration: opts.voiceDuration,
        }),
      });
      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.$id !== optimistic.$id));
      } else {
        await fetchMessages();
      }
    } finally {
      setSending(false);
    }
  }, [myId, myName, clusterId, sellerId, fetchMessages]);

  const handleSendText = async () => {
    if (!text.trim() && !mediaPreview) return;
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
      } finally {
        setMediaPreview(null);
        setText("");
        setSending(false);
      }
      return;
    }
    const t = text.trim();
    setText("");
    await sendMsg({ text: t, type: "text" });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMediaPreview({ file, url });
    e.target.value = "";
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const duration = recordingTime;
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
            voiceDuration: formatRecordingTime(duration),
          });
        } finally {
          setSending(false);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone access to send voice messages.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // ── Name prompt submit ────────────────────────────────────────────────────
  const handleNameSubmit = () => {
    const name = nameInput.trim();
    if (!name) return;
    saveGuestName(name);
    setGuestName(name);
    setShowNamePrompt(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const contextLabel = productName || storeName || "Marketplace Inquiry";
  const isReady = !showNamePrompt && !!myId && !!myName;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-card/90 backdrop-blur-md border-b border-border h-14 px-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0 h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Store className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate">{storeName || "Store"}</p>
          {contextLabel && (
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">{contextLabel}</span>
            </div>
          )}
        </div>
        <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest shrink-0">Shop Chat</Badge>
      </header>

      {/* Guest name prompt */}
      {showNamePrompt && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter">What's your name?</h2>
              <p className="text-sm text-muted-foreground">So the seller knows who they're talking to.</p>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Enter your name..."
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleNameSubmit()}
                className="h-12 rounded-2xl text-base"
                autoFocus
              />
              <Button
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-sm"
                onClick={handleNameSubmit}
                disabled={!nameInput.trim()}
              >
                Start Chatting
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              No account needed — anyone can message the seller.
            </p>
          </div>
        </div>
      )}

      {/* Chat area */}
      {isReady && (
        <>
          {/* Product context banner */}
          {(productName || storeName) && (
            <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-bold text-primary truncate">
                Asking about: <span className="font-black">{productName || storeName}</span>
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" ref={scrollRef}>
            {loadingMessages && messages.length === 0 && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loadingMessages && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="h-14 w-14 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <Store className="h-7 w-7 text-primary/50" />
                </div>
                <p className="text-sm font-bold">Say hello to the seller!</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Ask about availability, price, or anything else.
                </p>
              </div>
            )}

            {messages.map(msg => {
              const isMe = msg.sender_id === myId;
              const isVoice = msg.type === "voice";
              const isPhoto = msg.type === "photo";
              const isVideo = msg.type === "video";

              return (
                <div key={msg.$id} className={cn("flex gap-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}>
                  {!isMe && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                        {(msg.sender_name || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("max-w-[75%] space-y-1", isMe ? "items-end" : "items-start")}>
                    {!isMe && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {msg.sender_name}
                      </p>
                    )}
                    {isVoice && msg.media_url ? (
                      <VoiceBubble url={msg.media_url} duration={msg.voice_duration} isMe={isMe} />
                    ) : isPhoto && msg.media_url ? (
                      <div className={cn("rounded-2xl overflow-hidden max-w-[220px]", isMe ? "rounded-tr-sm" : "rounded-tl-sm")}>
                        <img src={msg.media_url} alt="Photo" className="w-full object-cover" />
                        {msg.text && (
                          <p className={cn("px-3 py-2 text-sm", isMe ? "bg-primary text-white" : "bg-secondary")}>{msg.text}</p>
                        )}
                      </div>
                    ) : isVideo && msg.media_url ? (
                      <div className="rounded-2xl overflow-hidden max-w-[220px]">
                        <video src={msg.media_url} controls className="w-full" />
                      </div>
                    ) : (
                      <div className={cn(
                        "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isMe
                          ? "bg-primary text-white rounded-tr-sm"
                          : "bg-white dark:bg-card border border-border/40 rounded-tl-sm"
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

          {/* Media preview bar */}
          {mediaPreview && (
            <div className="px-4 pb-2">
              <div className="relative inline-block">
                {mediaPreview.file.type.startsWith("video") ? (
                  <video src={mediaPreview.url} className="h-24 w-24 object-cover rounded-2xl border border-border" />
                ) : (
                  <img src={mediaPreview.url} alt="preview" className="h-24 w-24 object-cover rounded-2xl border border-border" />
                )}
                <button
                  onClick={() => setMediaPreview(null)}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-border bg-white dark:bg-card px-3 py-3 safe-area-bottom">
            {recording ? (
              <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                <span className="flex-1 text-sm font-bold text-destructive">Recording… {formatRecordingTime(recordingTime)}</span>
                <Button size="sm" variant="destructive" className="rounded-xl h-9 gap-2" onClick={stopRecording}>
                  <StopCircle className="h-4 w-4" /> Stop
                </Button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl h-10 w-10 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                  placeholder={mediaPreview ? "Add a caption…" : "Type a message…"}
                  className="flex-1 rounded-2xl h-10 bg-secondary/40 border-none"
                  disabled={sending}
                />
                {text.trim() || mediaPreview ? (
                  <Button
                    size="icon"
                    className="rounded-xl h-10 w-10 shrink-0 bg-primary hover:bg-primary/90"
                    onClick={handleSendText}
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl h-10 w-10 shrink-0 text-muted-foreground hover:text-primary"
                    onClick={startRecording}
                    disabled={sending}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
