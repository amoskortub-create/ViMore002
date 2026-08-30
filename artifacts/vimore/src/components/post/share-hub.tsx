"use client";

import { useState } from "react";
import { 
  Send, 
  PlusSquare, 
  Clapperboard, 
  Download, 
  Link as LinkIcon, 
  X,
  Check,
  Search,
  MoreHorizontal,
  Zap,
  Loader2,
  Bookmark,
  CheckCircle2
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePosts } from "@/context/PostContext";
import { CreatePostModal } from "@/components/post/create-post-modal";
import { useMusic } from "@/context/MusicContext";
import { useToast } from "@/hooks/use-toast";
import { cn, saveFileToDevice } from "@/lib/utils";
import Image from "next/image";

interface ShareHubProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
}

export function ShareHub({ isOpen, onClose, post }: ShareHubProps) {
  const { connections, addStory, incrementShareCount, currentUser, friendUsernames, sendChatMessage } = usePosts();
  const { triggerHaptic, triggerDownloadWithAd } = useMusic();
  const { toast } = useToast();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sharingTo, setSharingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const filteredConnections = connections.filter(c => 
    friendUsernames.has(c.username) &&
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleShareToStory = async () => {
    triggerHaptic(25);
    try {
      const storyMedia = post.image || post.images?.[0] || post.videoUrl || '';
      const isVideoStory = !!post.videoUrl && !post.image && !post.images?.[0];
      const storyText = `Shared from @${post.user.username}${post.content ? `: ${post.content}` : ''}`;
      await addStory({
        image: storyMedia,
        type: storyMedia ? (isVideoStory ? 'video' : 'image') : 'text',
        text: storyMedia ? undefined : storyText.slice(0, 180),
        background: 'bg-gradient-to-br from-primary to-accent',
        postId: post.$id,
        textOverlays: [{
          text: storyMedia ? `Shared from @${post.user.username}` : 'Shared Post',
          x: 50,
          y: 80,
          color: "#FFFFFF"
        }]
      });
      incrementShareCount(post.$id);
      toast({ title: "Story Studio", description: "Vibe synced to your story rail." });
      onClose();
    } catch {
      toast({ variant: 'destructive', title: 'Story Failed', description: 'Could not sync to your story rail. Please try again.' });
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    
    // Determine asset source
    const assetUrl = post.videoUrl || post.image || post.user.avatar;
    const extension = post.videoUrl ? 'mp4' : 'jpg';
    
    triggerDownloadWithAd('reel', async () => {
      setIsDownloading(true);
      toast({ title: "Node Sync", description: "Preparing high-fidelity archive..." });
      
      try {
        // BINARY HANDSHAKE: Actual Save to Hardware
        await saveFileToDevice(assetUrl, `vimore_node_${post.$id}.${extension}`);
        toast({ title: "Archival Ready", description: "Vibe saved to your hardware identity notes." });
      } catch (e) {
        console.error("Archival handshake failure", e);
      } finally {
        setIsDownloading(false);
        onClose();
      }
    });
  };

  const handleDirectShare = async (conn: any) => {
    if (sharingTo || sentTo.has(conn.$id)) return;
    triggerHaptic(30);
    setSharingTo(conn.username);
    await sendChatMessage(conn.username, {
      type: 'post',
      postId: post.$id,
      sharedPostData: {
        postId: post.$id,
        postImage: post.image || post.images?.[0] || undefined,
        postVideo: post.videoUrl || undefined,
        postContent: (post.content || '').slice(0, 80),
        postAuthorName: post.user.name,
        postAuthorAvatar: post.user.avatar,
        postAuthorUsername: post.user.username,
      },
    });
    incrementShareCount(post.$id);
    setSentTo(prev => new Set(prev).add(conn.$id));
    setSharingTo(null);
    toast({ title: "Node Shared", description: `Sent to ${conn.name}` });
  };

  const handleCopyLink = () => {
    triggerHaptic(5);
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.$id}`);
    toast({ title: "Link Synced", description: "Temporal URL copied to clipboard." });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-[3rem] p-0 border-primary/10 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl h-[85vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="mx-auto w-12 h-1.5 bg-primary/20 rounded-full mt-4 mb-2 shrink-0" />
        
        <SheetHeader className="px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-black italic uppercase tracking-tighter">Share Hub</SheetTitle>
            <div className="bg-primary/5 px-3 py-1 rounded-full flex items-center gap-2 border border-primary/10">
              <Zap className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Multi-Channel</span>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-8">
          <div className="p-4 bg-primary/5 rounded-3xl border border-primary/10 flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-2xl overflow-hidden shrink-0 shadow-lg">
              {post.videoUrl && !post.image && !post.images?.[0] ? (
                <video src={post.videoUrl} className="h-full w-full object-cover" muted playsInline preload="none" />
              ) : (
                <Image src={post.image || post.images?.[0] || post.user.avatar} alt="Post" fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Context Node</p>
              <p className="text-sm font-medium line-clamp-2 italic text-muted-foreground">"{post.content}"</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CreatePostModal sharedPost={post} initialContent="">
              <Button variant="outline" className="h-24 w-full rounded-[2rem] border-primary/10 bg-white dark:bg-card hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all group">
                <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform"><PlusSquare className="h-6 w-6 text-primary" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Share as Post</span>
              </Button>
            </CreatePostModal>
            <Button variant="outline" className="h-24 rounded-[2rem] border-accent/10 bg-white dark:bg-card hover:bg-accent/5 flex flex-col items-center justify-center gap-2 transition-all group" onClick={handleShareToStory}>
              <div className="p-3 bg-accent/10 rounded-2xl group-hover:scale-110 transition-transform"><Clapperboard className="h-6 w-6 text-accent" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Add to Story</span>
            </Button>
            <Button variant="outline" className="h-24 rounded-[2rem] border-green-500/10 bg-white dark:bg-card hover:bg-green-500/5 flex flex-col items-center justify-center gap-2 transition-all group" onClick={handleDownload} disabled={isDownloading}>
              <div className="p-3 bg-green-500/10 rounded-2xl group-hover:scale-110 transition-transform">{isDownloading ? <Loader2 className="h-6 w-6 text-green-500 animate-spin" /> : <Download className="h-6 w-6 text-green-500" />}</div>
              <span className="text-[10px] font-black uppercase tracking-widest">Save to Device</span>
            </Button>
            <Button variant="outline" className="h-24 rounded-[2rem] border-border bg-white dark:bg-card hover:bg-secondary/50 flex flex-col items-center justify-center gap-2 transition-all group" onClick={handleCopyLink}>
              <div className="p-3 bg-secondary rounded-2xl group-hover:scale-110 transition-transform"><LinkIcon className="h-6 w-6 text-muted-foreground" /></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Copy Temporal URL</span>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black italic uppercase tracking-widest">Direct Sync</h3>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Friends Only</span>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input placeholder="Search friends..." className="h-12 bg-secondary/30 border-none rounded-2xl pl-11 focus-visible:ring-primary/20" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1">
              {filteredConnections.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 px-1">No friends to share with. Add friends first.</p>
              ) : filteredConnections.map((user) => (
                <button key={user.username} onClick={() => handleDirectShare(user)} disabled={!!sharingTo} className="flex flex-col items-center gap-2 shrink-0 group min-w-[80px]">
                  <div className="relative">
                    <div className={cn("absolute -inset-1 rounded-full blur-sm transition-all duration-500", sharingTo === user.username ? "bg-primary animate-pulse opacity-100" : "bg-transparent opacity-0 group-hover:bg-primary/20 group-hover:opacity-100")} />
                    <Avatar className="h-14 w-14 border-2 border-white dark:border-card relative shadow-xl transition-transform group-active:scale-90"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar>
                    {sharingTo === user.username ? <div className="absolute inset-0 flex items-center justify-center bg-primary/40 rounded-full z-10"><Loader2 className="h-6 w-6 text-white animate-spin" /></div> : sentTo.has(user.$id) ? <div className="absolute inset-0 flex items-center justify-center bg-green-500/40 rounded-full z-10"><Check className="h-5 w-5 text-white" /></div> : null}
                  </div>
                  <span className="text-[10px] font-bold text-center truncate w-full px-1">{user.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-primary/5">
            <Button variant="ghost" className="w-full h-14 rounded-2xl justify-start gap-4 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all">
              <MoreHorizontal className="h-5 w-5" />
              <span className="font-bold text-sm uppercase tracking-widest">More Share Options</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
