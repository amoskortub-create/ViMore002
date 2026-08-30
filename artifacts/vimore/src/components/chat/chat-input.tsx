"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Paperclip, 
  Smile, 
  Send, 
  Image as ImageIcon,
  Video as VideoIcon,
  Flame,
  Mic,
  MicOff,
  Square,
  X,
} from "lucide-react";
import { useMusic } from "@/context/MusicContext";
import { usePosts } from "@/context/PostContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string, options?: { isViewOnce?: boolean; isWorkspace?: boolean; mediaUrl?: string; mediaType?: 'photo' | 'video' | 'voice'; duration?: string; file?: File }) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

const VIDEO_UPLOAD_LIMIT = 300;

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ChatInput({ onSend, onTyping, onStopTyping }: ChatInputProps) {
  const [text, setText] = useState("");
  const [isViewOnceEnabled, setIsViewOnceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const { triggerHaptic } = useMusic();
  const { settings } = usePosts();
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFilter, setCurrentFilter] = useState<string>("image/*,video/*");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingSecondsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    triggerHaptic(10);
    onStopTyping?.();
    onSend(text, { isViewOnce: isViewOnceEnabled });
    setText("");
    setIsViewOnceEnabled(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMediaTrigger = (filter: string) => {
    triggerHaptic(5);
    setCurrentFilter(filter);
    setTimeout(() => {
      if (fileInputRef.current) fileInputRef.current.click();
    }, 10);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic(20);
      const isVideo = file.type.startsWith('video');
      const mediaUrl = URL.createObjectURL(file);
      
      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          if (video.duration > VIDEO_UPLOAD_LIMIT) {
            toast({ 
              variant: "destructive", 
              title: "Clip Too Long", 
              description: "High-velocity sync is capped at 5 minutes per video." 
            });
            URL.revokeObjectURL(mediaUrl);
            e.target.value = "";
            return;
          }
          sendMedia(mediaUrl, 'video', file.name, file);
        };
        video.onerror = () => {
          toast({ variant: "destructive", title: "Format Error", description: "Could not decode video metadata." });
          URL.revokeObjectURL(mediaUrl);
        };
        video.src = mediaUrl;
      } else {
        sendMedia(mediaUrl, 'photo', file.name, file);
      }
      
      e.target.value = "";
    }
  };

  const sendMedia = (url: string, type: 'photo' | 'video', fileName: string, file: File) => {
    onSend("", { 
      isViewOnce: isViewOnceEnabled,
      mediaUrl: url,
      mediaType: type,
      file
    });
    setIsViewOnceEnabled(false);
    toast({
      title: isViewOnceEnabled ? "View-Once Vibe Shared" : "Media Shared",
      description: `Successfully launched ${fileName} to the hub.`
    });
  };

  const toggleViewOnce = () => {
    triggerHaptic(15);
    setIsViewOnceEnabled(!isViewOnceEnabled);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ variant: "destructive", title: "Not Supported", description: "Your browser does not support voice recording." });
      return;
    }

    try {
      triggerHaptic(20);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const recorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      recordingChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);

      setIsRecording(true);
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
        if (recordingSecondsRef.current >= 120) {
          stopRecording();
        }
      }, 1000);
    } catch {
      setMicPermission('denied');
      toast({
        variant: "destructive",
        title: "Microphone Access Denied",
        description: "Tap Allow when your browser asks for microphone access, or enable it in your device settings.",
      });
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const duration = formatDuration(recordingSecondsRef.current);
    const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
      const url = URL.createObjectURL(blob);

      triggerHaptic(30);
      onSend("", {
        mediaUrl: url,
        mediaType: 'voice',
        duration,
        file,
      });

      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current.ondataavailable = null;
    mediaRecorderRef.current.onstop = null;
    try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    triggerHaptic(15);
  };

  if (isRecording) {
    return (
      <footer className="p-4 sm:p-6 bg-white dark:bg-card border-t border-primary/5 shrink-0 z-20">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <button
            onClick={cancelRecording}
            className="h-12 w-12 rounded-full bg-secondary/40 flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex-1 flex items-center gap-3 bg-secondary/30 rounded-2xl px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-sm font-black tabular-nums text-red-500 tracking-widest shrink-0">
              {formatDuration(recordingSeconds)}
            </span>
            <div className="flex-1 flex items-end gap-0.5 h-6 overflow-hidden">
              {[35,65,80,45,90,55,75,40,85,60,70,50,95,45,60,80,35,75,55,90,40,65,85,50,70,45,80,60].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/60 rounded-full"
                  style={{
                    height: `${h}%`,
                    animation: `waveBar 0.8s ease-in-out infinite alternate`,
                    animationDelay: `${(i * 0.06) % 0.8}s`,
                  }}
                />
              ))}
              <style>{`@keyframes waveBar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }`}</style>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">
              REC
            </span>
          </div>

          <button
            onClick={stopRecording}
            className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all shrink-0"
          >
            <Square className="h-5 w-5 fill-current" />
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="p-4 sm:p-6 bg-white dark:bg-card border-t border-primary/5 shrink-0 z-20">
      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleMediaTrigger("image/*,video/*")}
              className="h-10 w-10 rounded-xl bg-secondary/40 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button 
              onClick={toggleViewOnce}
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                isViewOnceEnabled ? "bg-primary text-white shadow-lg" : "bg-secondary/40 text-muted-foreground"
              )}
            >
              <Flame className={cn("h-5 w-5", isViewOnceEnabled && "animate-pulse")} />
            </button>
          </div>
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-500", isViewOnceEnabled ? "bg-primary/10 opacity-100" : "opacity-0")}>
            <div className="h-1.5 w-1.5 bg-primary rounded-full animate-ping" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Disappearing Mode</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary"><Smile className="h-6 w-6" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary" onClick={() => handleMediaTrigger("video/*")}><VideoIcon className="h-6 w-6" /></Button>
          </div>

          <div className="flex-1 relative">
            <Input 
              ref={inputRef}
              placeholder="Type a high-velocity message..." 
              className={cn("h-12 border-none rounded-2xl px-6 pr-12 bg-secondary/30", isViewOnceEnabled && "italic font-bold")}
              value={text}
              onChange={(e) => { setText(e.target.value); if (e.target.value) onTyping?.(); else onStopTyping?.(); }}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleMediaTrigger("image/*")}><ImageIcon className="h-5 w-5" /></Button>
              <input type="file" ref={fileInputRef} className="hidden" accept={currentFilter} onChange={handleFileChange} />
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1">
            {text.trim() ? (
              <Button onClick={handleSubmit} className="rounded-full h-12 w-12 bg-primary text-white"><Send className="h-5 w-5 fill-current" /></Button>
            ) : (
              <button
                onClick={startRecording}
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center transition-all",
                  micPermission === 'denied'
                    ? "bg-secondary/50 text-muted-foreground/40 cursor-not-allowed"
                    : "bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-95"
                )}
                title={micPermission === 'denied' ? "Microphone access denied" : "Hold to record voice message"}
              >
                {micPermission === 'denied' ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
