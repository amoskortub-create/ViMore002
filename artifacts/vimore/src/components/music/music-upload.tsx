"use client";

import { useState, useRef, useEffect } from "react";
import {
  Music, Disc3, Upload, X, Plus, Calendar, Users, CheckCircle2,
  Trash2, ChevronDown, ChevronUp, Settings2, Mic2, ArrowLeft,
  Loader2, Lock, Unlock, Zap, AudioLines, ImagePlus, FileMusic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useMusic, Track, Album } from "@/context/MusicContext";
import { usePosts } from "@/context/PostContext";
import { BUCKET_MUSIC, BUCKET } from "@/lib/appwrite";
import { parseFollowerCount } from "@/lib/utils";

interface TrackSlot {
  id: number;
  title: string;
  file: File | null;
  fileName: string | null;
  collaborator: string;
  isExplicit: boolean;
  credits: string;
  isExpanded: boolean;
  duration: number;
}

const readAudioDuration = (file: File): Promise<number> =>
  new Promise(resolve => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => { resolve(Math.round(audio.duration)); URL.revokeObjectURL(audio.src); };
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });

const GENRES = ["Afrobeats", "Amapiano", "Hip-Hop", "R&B", "Trap", "Jazz", "Lo-Fi", "Gospel", "Pop", "Soul", "Dancehall", "Electronic"];

export function MusicUpload({ onCancel }: { onCancel: () => void }) {
  const { toast } = useToast();
  const { triggerHaptic, publishTrack, publishAlbum } = useMusic();
  const { uploadMedia, currentUser } = usePosts();

  const [step, setStep] = useState<"choice" | "studio">("choice");
  const [projectType, setProjectType] = useState<"single" | "album">("single");
  const [coverArt, setCoverArt] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPrice, setUnlockPrice] = useState(100);

  const [tracks, setTracks] = useState<TrackSlot[]>(
    Array.from({ length: 12 }, (_, i) => ({
      id: i + 1, title: "", file: null, fileName: null,
      collaborator: "", isExplicit: false, credits: "", isExpanded: false, duration: 0,
    }))
  );

  const followerCount = parseFollowerCount(currentUser?.followers);
  const isPaywallEligible = followerCount >= 10000;
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vimore_studio_draft");
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setProjectTitle(d.projectTitle || "");
        setSelectedGenre(d.selectedGenre || "");
        setReleaseDate(d.releaseDate || "");
        if (d.projectType) { setProjectType(d.projectType); setStep("studio"); }
      } catch { }
    }
  }, []);

  const handleChoice = (type: "single" | "album") => {
    triggerHaptic(15);
    setProjectType(type);
    setStep("studio");
    if (type === "single") setTracks(prev => prev.slice(0, 1));
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic(10);
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverArt(reader.result as string);
    reader.readAsDataURL(file);
  };

  const updateTrack = (id: number, data: Partial<TrackSlot>) =>
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));

  const handleTrackFileUpload = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic(10);
    updateTrack(id, { fileName: file.name, file, title: file.name.split(".")[0] });
    const dur = await readAudioDuration(file);
    updateTrack(id, { duration: dur });
  };

  const calculateProgress = () => {
    let total = 3, done = 0;
    if (coverArt) done++;
    if (projectTitle.trim()) done++;
    if (selectedGenre) done++;
    const uploaded = tracks.filter(t => t.file).length;
    const required = projectType === "single" ? 1 : 2;
    total += required;
    done += Math.min(uploaded, required);
    return (done / total) * 100;
  };

  const progress = calculateProgress();
  const isReady = progress === 100;

  const handlePublish = async () => {
    if (!isReady || isPublishing) { triggerHaptic(50); return; }
    setIsPublishing(true);
    triggerHaptic(100);
    toast({ title: "Publishing…", description: "Uploading your music to the network." });
    try {
      if (!currentUser) return;
      const coverUrl = coverFile
        ? await uploadMedia(coverFile, BUCKET.ALBUM_COVERS)
        : "https://picsum.photos/seed/single/600/600";

      if (projectType === "single") {
        const slot = tracks[0];
        const audioUrl = slot.file ? await uploadMedia(slot.file, BUCKET_MUSIC) : "";
        await publishTrack({
          title: projectTitle, artist: currentUser.name, artistUsername: currentUser.username,
          cover: coverUrl, audioUrl, duration: slot.duration || 0,
          artistFollowers: currentUser.followers,
          isLocked: isLocked && isPaywallEligible, unlockPrice: isLocked && isPaywallEligible ? unlockPrice : 0,
        });
      } else {
        const albumSongs: Track[] = [];
        for (const slot of tracks.filter(t => t.file)) {
          const audioUrl = await uploadMedia(slot.file!, BUCKET_MUSIC);
          albumSongs.push({
            id: `song-${Date.now()}-${slot.id}`, title: slot.title,
            artist: currentUser.name, artistUsername: currentUser.username,
            cover: coverUrl, audioUrl, duration: slot.duration || 0, streams: "0", likes: 0, unlikes: 0,
          });
        }
        await publishAlbum({
          id: `album-${Date.now()}`, title: projectTitle, artist: currentUser.name,
          artistUsername: currentUser.username, cover: coverUrl,
          year: new Date().getFullYear().toString(), tracks: albumSongs.length,
          totalStreams: "0", songs: albumSongs,
          isLocked: isLocked && isPaywallEligible, unlockPrice: isLocked && isPaywallEligible ? unlockPrice : 0,
        });
      }
      toast({ title: "Published!", description: `${projectTitle} is now live on ViMore.` });
      localStorage.removeItem("vimore_studio_draft");
      onCancel();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: e.message });
    } finally {
      setIsPublishing(false);
    }
  };

  /* ── CHOICE SCREEN ── */
  if (step === "choice") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-8 p-4 animate-in fade-in zoom-in-95 duration-400">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <AudioLines className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Studio</h2>
          <p className="text-muted-foreground text-sm">Choose your release type</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <button
            onClick={() => handleChoice("single")}
            className="group relative bg-white dark:bg-card border-2 border-border hover:border-primary/50 rounded-3xl p-6 text-left transition-all hover:shadow-xl hover:shadow-primary/10 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity" />
            <div className="relative space-y-4">
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tight">Single</h3>
                <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">One cover, one track — maximum impact.</p>
              </div>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-primary">
                Release Single <Plus className="ml-1.5 h-3 w-3" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleChoice("album")}
            className="group relative bg-white dark:bg-card border-2 border-border hover:border-violet-400/50 rounded-3xl p-6 text-left transition-all hover:shadow-xl hover:shadow-violet-500/10 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity" />
            <div className="relative space-y-4">
              <div className="h-12 w-12 bg-violet-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Disc3 className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tight">Album</h3>
                <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">Up to 12 tracks. Your full vision.</p>
              </div>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-violet-500">
                Create Album <Plus className="ml-1.5 h-3 w-3" />
              </div>
            </div>
          </button>
        </div>

        <button onClick={onCancel} className="text-[12px] text-muted-foreground hover:text-foreground font-bold transition-colors">
          Cancel
        </button>
      </div>
    );
  }

  /* ── STUDIO FORM ── */
  return (
    <div className="flex flex-col min-h-screen animate-in slide-in-from-bottom-3 duration-400 -mx-4 sm:-mx-6">
      {/* Sticky header */}
      <div className="sticky top-[61px] z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => { triggerHaptic(5); setStep("choice"); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-sm font-black italic uppercase tracking-tight leading-none">
              {projectType === "single" ? "New Single" : "New Album"}
            </p>
            <p className="text-[9px] font-black text-primary uppercase tracking-widest">Studio</p>
          </div>
        </div>
        <Button
          size="sm"
          className={cn(
            "rounded-full font-black text-[10px] uppercase tracking-widest px-5 h-9 transition-all",
            isReady && !isPublishing
              ? "bg-primary text-white shadow-lg shadow-primary/30"
              : "bg-muted text-muted-foreground"
          )}
          onClick={handlePublish}
          disabled={!isReady || isPublishing}
        >
          {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          {isPublishing ? "Publishing…" : "Publish"}
        </Button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/30">
          <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 px-4 sm:px-6 py-5 max-w-2xl mx-auto w-full space-y-6 pb-32">

        {/* Cover Art */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <ImagePlus className="h-3.5 w-3.5" /> Cover Art
            </Label>
            {coverArt && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] font-black">DONE</Badge>}
          </div>
          <div
            onClick={() => coverInputRef.current?.click()}
            className={cn(
              "relative w-full aspect-square rounded-3xl overflow-hidden cursor-pointer border-2 border-dashed transition-all",
              coverArt ? "border-transparent" : "border-border hover:border-primary/50 bg-card"
            )}
          >
            {coverArt ? (
              <>
                <Image src={coverArt} alt="Cover" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Upload className="h-8 w-8 text-white" />
                  <span className="text-white text-xs font-bold">Change Cover</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ImagePlus className="h-8 w-8 text-primary/50" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-muted-foreground">Tap to upload cover</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">Square image, high resolution</p>
                </div>
              </div>
            )}
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
          </div>
        </div>

        {/* Project Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Title</Label>
            <Input
              placeholder={projectType === "single" ? "Track title…" : "Album name…"}
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              className="h-12 rounded-2xl bg-card border-border/50 focus-visible:ring-primary/30 text-base font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Genre</Label>
              <div className="relative">
                <select
                  value={selectedGenre}
                  onChange={e => { triggerHaptic(5); setSelectedGenre(e.target.value); }}
                  className="w-full h-12 rounded-2xl bg-card border border-border/50 px-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none appearance-none"
                >
                  <option value="" disabled>Pick genre…</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Release Date</Label>
              <Input
                type="date"
                value={releaseDate}
                onChange={e => setReleaseDate(e.target.value)}
                className="h-12 rounded-2xl bg-card border-border/50 focus-visible:ring-primary/30 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* Tracklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <FileMusic className="h-3.5 w-3.5" />
              {projectType === "single" ? "Audio File" : "Tracklist"}
            </Label>
            <span className="text-[10px] font-black text-primary">
              {tracks.filter(t => t.file).length} / {tracks.length} ready
            </span>
          </div>

          {tracks.map((track, idx) => (
            <div
              key={track.id}
              className={cn(
                "rounded-2xl border transition-all overflow-hidden bg-card",
                track.file ? "border-primary/25 shadow-md shadow-primary/5" : "border-border/50",
                track.isExpanded && "ring-2 ring-primary/20"
              )}
            >
              <div className="p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-[11px] font-black text-muted-foreground shrink-0">
                  {track.id.toString().padStart(2, "0")}
                </div>

                <div className="flex-1 min-w-0">
                  {track.file ? (
                    <div className="flex flex-col">
                      <input
                        value={track.title}
                        onChange={e => updateTrack(track.id, { title: e.target.value })}
                        className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none truncate"
                        placeholder="Untitled"
                      />
                      <span className="text-[10px] text-primary font-black uppercase flex items-center gap-1 mt-0.5">
                        <Mic2 className="h-2.5 w-2.5" /> {track.fileName}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => (document.getElementById(`file-${track.id}`) as HTMLInputElement)?.click()}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Upload Audio</span>
                    </button>
                  )}
                  <input type="file" id={`file-${track.id}`} className="hidden" accept="audio/*"
                    onChange={e => handleTrackFileUpload(track.id, e)} />
                </div>

                {track.file && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-xl", track.isExpanded ? "bg-primary text-white" : "text-muted-foreground")}
                      onClick={() => { triggerHaptic(5); updateTrack(track.id, { isExpanded: !track.isExpanded }); }}>
                      {track.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive"
                      onClick={() => { triggerHaptic(5); updateTrack(track.id, { file: null, fileName: null, title: "" }); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {track.isExpanded && track.file && (
                <div className="px-4 pb-4 pt-2 border-t border-border/30 space-y-4 bg-muted/30 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Collaborator
                      </Label>
                      <Input placeholder="@username" value={track.collaborator}
                        onChange={e => updateTrack(track.id, { collaborator: e.target.value })}
                        className="h-10 rounded-xl text-xs font-bold bg-card" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Settings2 className="h-3 w-3" /> Credits
                      </Label>
                      <Input placeholder="Producer, Writer…" value={track.credits}
                        onChange={e => updateTrack(track.id, { credits: e.target.value })}
                        className="h-10 rounded-xl text-xs font-bold bg-card" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/30">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest">Explicit Content</p>
                      <p className="text-[10px] text-muted-foreground">Contains adult language</p>
                    </div>
                    <Switch
                      checked={track.isExplicit}
                      onCheckedChange={v => { triggerHaptic(5); updateTrack(track.id, { isExplicit: v }); }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {projectType === "album" && (
            <Button
              variant="outline"
              className="w-full rounded-2xl h-12 border-dashed border-border/50 text-muted-foreground font-bold text-[11px] uppercase tracking-widest"
              onClick={() => {
                const newId = (tracks[tracks.length - 1]?.id || 0) + 1;
                if (tracks.length < 12) {
                  setTracks(prev => [...prev, { id: newId, title: "", file: null, fileName: null, collaborator: "", isExplicit: false, credits: "", isExpanded: false, duration: 0 }]);
                }
              }}
              disabled={tracks.length >= 12}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Track
            </Button>
          )}
        </div>

        {/* Paywall */}
        {isPaywallEligible && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black italic uppercase tracking-tight flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-primary" /> Paywall
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Charge listeners to unlock this release</p>
              </div>
              <Switch checked={isLocked} onCheckedChange={setIsLocked} />
            </div>
            {isLocked && (
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <Input
                  type="number"
                  min="100"
                  max="500"
                  step="1"
                  value={unlockPrice}
                  onChange={e => setUnlockPrice(parseFloat(e.target.value))}
                  className="h-10 rounded-xl text-sm font-bold bg-card flex-1"
                  placeholder="Price in LD"
                />
                <span className="text-[11px] font-black text-muted-foreground shrink-0">LD</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
