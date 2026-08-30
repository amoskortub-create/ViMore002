"use client";

import { useState, useRef } from "react";
import {
  Image as ImageIcon,
  Clapperboard,
  ArrowLeft,
  Loader2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePosts } from "@/context/PostContext";
import { cn } from "@/lib/utils";
import { BUCKET_STORIES, getFileUrl } from "@/lib/appwrite";

const GRADIENTS = [
  { id: "vimore",   label: "ViMore",   class: "bg-gradient-to-br from-primary to-accent" },
  { id: "sunset",   label: "Sunset",   class: "bg-gradient-to-br from-orange-500 to-rose-500" },
  { id: "ocean",    label: "Ocean",    class: "bg-gradient-to-br from-blue-400 to-emerald-400" },
  { id: "midnight", label: "Midnight", class: "bg-gradient-to-br from-indigo-900 to-slate-900" },
  { id: "carbon",   label: "Carbon",   class: "bg-zinc-900" },
];

export function CreateStoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addStory, triggerHaptic } = usePosts();
  const { toast } = useToast();

  const [step, setStep] = useState<"choice" | "confirm" | "text">("choice");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [storyText, setStoryText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic(10);

    if (type === "video") {
      const objUrl = URL.createObjectURL(file);
      const tempVid = document.createElement("video");
      tempVid.src = objUrl;
      await new Promise<void>(r => { tempVid.onloadedmetadata = () => r(); tempVid.load(); });
      URL.revokeObjectURL(objUrl);
      if (tempVid.duration > 80) {
        toast({ title: "Video Too Long", description: "Story videos must be 1 minute 20 seconds or shorter." });
        e.target.value = "";
        return;
      }
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMediaType(type);
    setStep("confirm");
  };

  const handleShare = async () => {
    if (step === "text" && !storyText.trim()) return;
    if (step === "confirm" && !selectedFile) return;
    setIsProcessing(true);
    triggerHaptic(30);

    try {
      let finalFileId = "";
      let finalImageUrl = "";

      if (selectedFile) {
        const { uploadViaClient } = await import('@/lib/upload');
        finalFileId = await uploadViaClient(selectedFile, BUCKET_STORIES);
        finalImageUrl = getFileUrl(BUCKET_STORIES, finalFileId);
      }

      await addStory({
        image: finalImageUrl,
        fileId: finalFileId || undefined,
        type: mediaType || "image",
        filter: "",
        textOverlays: step === "text" ? [{ text: storyText, x: 50, y: 50, color: "#FFFFFF" }] : [],
        background: step === "text" ? selectedGradient.class : undefined,
      });

      toast({ title: "Story posted!" });
      onClose();
      resetState();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload failed", description: e.message || "Please try again." });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStep("choice");
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType(null);
    setStoryText("");
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[500px] h-full sm:h-[90vh] bg-zinc-950 sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-50 px-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-black/30 backdrop-blur-md rounded-full"
            onClick={step === "choice" ? onClose : resetState}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          {step !== "choice" && (
            <Button
              className="bg-primary text-white font-bold rounded-full px-6 h-9 gap-2"
              onClick={handleShare}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
            </Button>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">

          {/* ── Choice step ── */}
          {step === "choice" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Share a Vibe</h2>
              <div className="grid grid-cols-1 w-full gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-6 p-6 bg-zinc-900 border border-white/5 rounded-[2rem] hover:bg-zinc-800 transition-all group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-white">Photo</p>
                    <p className="text-xs text-zinc-500">Uploads at original size & ratio</p>
                  </div>
                </button>

                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="flex items-center gap-6 p-6 bg-zinc-900 border border-white/5 rounded-[2rem] hover:bg-zinc-800 transition-all group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                    <Clapperboard className="h-7 w-7" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-white">Video</p>
                    <p className="text-xs text-zinc-500">Max 1 min 20 sec</p>
                  </div>
                </button>

                <button
                  onClick={() => setStep("text")}
                  className="flex items-center gap-6 p-6 bg-zinc-900 border border-white/5 rounded-[2rem] hover:bg-zinc-800 transition-all group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Type className="h-7 w-7" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-white">Text</p>
                    <p className="text-xs text-zinc-500">Share words on a color background</p>
                  </div>
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => handleMediaUpload(e, "image")} />
              <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={e => handleMediaUpload(e, "video")} />
            </div>
          )}

          {/* ── Text story step ── */}
          {step === "text" && (
            <div className={cn("flex-1 flex flex-col items-center justify-center relative p-8 transition-all duration-500", selectedGradient.class)}>
              <textarea
                autoFocus
                placeholder="Start typing..."
                className="w-full bg-transparent border-none focus:ring-0 text-4xl text-center font-black italic uppercase text-white placeholder:text-white/30 resize-none"
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
              />
            </div>
          )}

          {/* ── Confirm step — media shown at its natural ratio ── */}
          {step === "confirm" && previewUrl && (
            <div className="flex-1 flex items-center justify-center bg-black px-4 pt-20 pb-6">
              {mediaType === "video" ? (
                <video
                  src={previewUrl}
                  className="max-w-full max-h-full rounded-2xl object-contain"
                  style={{ maxHeight: "calc(100% - 1rem)" }}
                  autoPlay
                  loop
                  playsInline
                  muted
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="max-w-full max-h-full rounded-2xl object-contain"
                  style={{ maxHeight: "calc(100% - 1rem)" }}
                />
              )}
            </div>
          )}
        </div>

        {/* Gradient picker — text stories only */}
        {step === "text" && (
          <div className="bg-zinc-900/80 backdrop-blur-md border-t border-white/5 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
            {GRADIENTS.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGradient(g)}
                className={cn(
                  "h-8 w-8 rounded-xl shrink-0 transition-all",
                  g.class,
                  selectedGradient.id === g.id ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-90"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
