"use client";

import { useEffect, useState } from "react";
import { X, ArrowLeft, MoreHorizontal, Zap, Share2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePosts } from "@/context/PostContext";
import { PostCard } from "./post-card";
import { CommentNode } from "./comment-hub";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PostPortal() {
  const { selectedPostId, setSelectedPostId, posts, triggerHaptic, openCommentHub } = usePosts();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (selectedPostId) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
  }, [selectedPostId]);

  if (!selectedPostId && !isVisible) return null;

  const post = posts.find((p) => p.$id === selectedPostId);

  const handleClose = () => {
    triggerHaptic?.(10);
    setSelectedPostId(null);
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[300] flex flex-col transition-all duration-500",
        selectedPostId ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      {/* Immersive Aurora Background */}
      <div className="absolute inset-0 bg-[#F8F9FD] dark:bg-[#020202] -z-10" />
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[70%] h-[70%] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[60%] h-[60%] bg-accent/10 blur-[150px] rounded-full animate-pulse delay-1000" />
      </div>

      <header className="h-16 px-4 flex items-center justify-between bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-primary/5 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-secondary/50" onClick={handleClose}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h2 className="text-sm font-black italic uppercase tracking-widest leading-tight">Post Portal</h2>
            <div className="flex items-center gap-1.5">
              <Zap className="h-2.5 w-2.5 text-primary animate-pulse" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Focused Vibe</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground"><Share2 className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground"><MoreHorizontal className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide">
        <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-32">
          {post ? (
            <>
              <PostCard {...post} />
              
              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-black italic uppercase tracking-widest">Network Commentary</h3>
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/10">
                    {post.commentNodes?.length || 0} NODES
                  </span>
                </div>

                <div className="space-y-8">
                  {post.commentNodes && post.commentNodes.length > 0 ? (
                    post.commentNodes.map(comment => (
                      <CommentNode 
                        key={comment.$id} 
                        comment={comment} 
                        postId={post.$id} 
                        onReply={() => openCommentHub(post.$id)} 
                      />
                    ))
                  ) : (
                    <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-16 text-center space-y-4 opacity-40">
                      <MessageCircle className="h-12 w-12 mx-auto" />
                      <p className="text-sm font-black uppercase tracking-widest">No active discussion pulse</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 opacity-40">
              <div className="h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center border-2 border-dashed border-primary/20">
                <Zap className="h-10 w-10 text-primary/40" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Node Missing</h3>
                <p className="text-sm font-medium">This vibe might have been purged from the network.</p>
              </div>
              <Button variant="outline" className="rounded-full border-primary text-primary" onClick={handleClose}>Close Portal</Button>
            </div>
          )}
        </div>
      </main>

      <footer className="p-4 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-t border-primary/5 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <button 
            onClick={() => post && openCommentHub(post.$id)}
            className="flex-1 bg-secondary/30 h-12 rounded-2xl flex items-center px-6 text-sm text-muted-foreground italic font-medium hover:bg-secondary/50 transition-all text-left"
          >
            Sync your reaction to the network...
          </button>
          <Button 
            className="rounded-2xl h-12 px-6 font-black italic uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20"
            onClick={() => post && openCommentHub(post.$id)}
          >
            REPLY
          </Button>
        </div>
      </footer>
    </div>
  );
}
