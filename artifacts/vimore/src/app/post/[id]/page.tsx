"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Send,
  MessageCircle,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PostCard } from "@/components/post/post-card";
import { CommentNode } from "@/components/post/comment-hub";
import { MainNav } from "@/components/layout/main-nav";
import { usePosts, Post, PostComment } from "@/context/PostContext";
import { useMusic } from "@/context/MusicContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import {
  databases,
  DATABASE_ID,
  COL,
  BUCKET,
  getFileUrl,
  formatTimeAgo,
  avatarFallback,
  Query,
} from "@/lib/appwrite";

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { currentUser, addComment, addReply, fetchComments, activeComments, streamedComments } =
    usePosts();
  const { triggerHaptic } = useMusic();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const commentsTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const doc = await databases.getDocument(DATABASE_ID, COL.POSTS, id);
        let authorDoc: any = null;
        try {
          const authorResult = await databases.listDocuments(
            DATABASE_ID,
            COL.USERS,
            [Query.equal("$id", doc.user_id), Query.limit(1)]
          );
          authorDoc = authorResult.documents[0] || null;
        } catch {
          /* ignore */
        }

        const imageIds: string[] = Array.isArray(doc.image_ids)
          ? doc.image_ids
          : doc.image_id
          ? [doc.image_id]
          : [];
        const images = imageIds.map((fid: string) =>
          getFileUrl(BUCKET.POST_MEDIA, fid)
        );

        const author = authorDoc
          ? {
              $id: doc.user_id,
              name: authorDoc.name || "Unknown",
              username: authorDoc.username || "unknown",
              avatar: authorDoc.avatar_id
                ? getFileUrl(BUCKET.AVATARS, authorDoc.avatar_id)
                : avatarFallback(authorDoc.name || "U"),
              isVerified: authorDoc.is_verified || false,
            }
          : {
              $id: doc.user_id,
              name: "Unknown",
              username: "unknown",
              avatar: avatarFallback("U"),
              isVerified: false,
            };

        let poll: any = undefined;
        if (doc.poll) {
          try {
            poll =
              typeof doc.poll === "string" ? JSON.parse(doc.poll) : doc.poll;
          } catch {
            /* ignore */
          }
        }

        let sharedPost: any = undefined;
        if (doc.shared_post_data) {
          try {
            sharedPost =
              typeof doc.shared_post_data === "string"
                ? JSON.parse(doc.shared_post_data)
                : doc.shared_post_data;
          } catch {
            /* ignore */
          }
        }

        const mapped: Post = {
          $id: doc.$id,
          $createdAt: doc.$createdAt,
          user: author,
          content: doc.content || "",
          time: formatTimeAgo(doc.$createdAt),
          likes: doc.likes_count || 0,
          unlikes: doc.unlikes_count || 0,
          comments: doc.comments_count || 0,
          shares: doc.shares_count || 0,
          views: doc.views_count || 0,
          image: images[0],
          images: images.length > 0 ? images : undefined,
          videoUrl: doc.video_id
            ? getFileUrl(BUCKET.POST_MEDIA, doc.video_id)
            : undefined,
          theme: doc.theme,
          imageFilter: doc.image_filter,
          feeling: doc.feeling,
          location: doc.location,
          commentsDisabled: doc.comments_disabled || false,
          isLocked: doc.is_locked || false,
          unlockPrice: doc.unlock_price,
          isBoosted: doc.is_boosted || false,
          poll,
          hashtags: Array.isArray(doc.hashtags) ? doc.hashtags : [],
          taggedUsers: Array.isArray(doc.tagged_users)
            ? doc.tagged_users
            : [],
          sharedPost,
        };
        setPost(mapped);

        await fetchComments(doc.$id);
        setCommentsLoaded(true);
      } catch (err: any) {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, fetchComments]);

  const allComments = useMemo(() => {
    const combined = [...activeComments];
    streamedComments.forEach((sc) => {
      if (!combined.some((c) => c.$id === sc.$id)) combined.push(sc);
    });
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [activeComments, streamedComments]);

  const topLevelComments = useMemo(
    () => allComments.filter((c) => !c.parentId),
    [allComments]
  );

  const handleSend = async () => {
    if (!commentText.trim() || !post || isSending) return;
    triggerHaptic(20);
    setIsSending(true);
    const currentText = commentText;
    setCommentText("");
    try {
      if (replyingTo) {
        await addReply(post.$id, replyingTo.$id, currentText);
      } else {
        await addComment(post.$id, currentText);
      }
      setReplyingTo(null);
    } catch {
      setCommentText(currentText);
      toast({ variant: "destructive", title: "Comment Failed", description: "Could not post your comment. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  const handleInitiateReply = (comment: PostComment) => {
    triggerHaptic(10);
    setReplyingTo(comment);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex justify-center">
      <div className="max-w-[1440px] w-full grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-full">
        <aside className="hidden md:block border-r border-primary/5 bg-white dark:bg-card">
          <div className="sticky top-0 h-screen">
            <MainNav />
          </div>
        </aside>

        <main className="flex flex-col min-h-full bg-white dark:bg-[#050505]">
          <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-primary/5 px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 shrink-0"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-black uppercase tracking-tight">{t('post_heading')}</h1>
          </div>

          <div className="flex-1 max-w-2xl w-full mx-auto px-0 sm:px-4 py-4 pb-32">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">
                  {t('post_loading')}
                </p>
              </div>
            ) : notFound || !post ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">
                    {t('post_not_found')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('post_not_found_desc')}
                  </p>
                </div>
                <Button
                  onClick={() => router.back()}
                  variant="outline"
                  className="rounded-2xl"
                >
                  {t('post_go_back')}
                </Button>
              </div>
            ) : (
              <div className="space-y-0">
                <PostCard {...post} />

                {!post.commentsDisabled && (
                  <div ref={commentsTopRef} className="mt-4 px-3 sm:px-0 space-y-6">
                    <div className="flex items-center gap-3 px-1">
                      <h2 className="text-base font-black italic uppercase tracking-tighter">
                        {t('post_comments')}
                      </h2>
                      <div className="bg-primary/5 px-3 py-1 rounded-full flex items-center gap-2 border border-primary/10">
                        <Zap className="h-3 w-3 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                          {allComments.length} vibes
                        </span>
                      </div>
                    </div>

                    {!commentsLoaded ? (
                      <div className="flex items-center justify-center py-10 gap-3">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        <span className="text-sm text-muted-foreground font-medium">
                          {t('post_loading_comments')}
                        </span>
                      </div>
                    ) : topLevelComments.length === 0 ? (
                      <div className="py-12 text-center space-y-3 opacity-40">
                        <MessageCircle className="h-10 w-10 mx-auto text-primary/40" />
                        <div className="space-y-1">
                          <p className="text-sm font-black italic uppercase tracking-widest">
                            {t('post_no_comments')}
                          </p>
                          <p className="text-[10px] font-medium uppercase text-muted-foreground">
                            {t('post_no_comments_desc')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {topLevelComments.map((comment) => (
                          <CommentNode
                            key={comment.$id}
                            comment={comment}
                            postId={post.$id}
                            onReply={handleInitiateReply}
                            allComments={allComments}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {post.commentsDisabled && (
                  <div className="mt-4 px-3 sm:px-0 py-8 text-center opacity-40 space-y-2">
                    <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t('post_comments_disabled')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {post && !post.commentsDisabled && currentUser && (
            <div className="fixed bottom-0 left-0 right-0 md:left-[280px] z-20">
              <div className="bg-white/90 dark:bg-[#050505]/90 backdrop-blur-xl border-t border-primary/5 p-4 pb-6">
                <div className="max-w-2xl mx-auto space-y-2">
                  {replyingTo && (
                    <div className="flex items-center justify-between bg-primary/10 px-4 py-2 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                        {t('post_reply_to')}{" "}
                        <span className="underline">@{replyingTo.userName}</span>
                      </p>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-primary hover:text-primary/60 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="relative group">
                    <Input
                      ref={inputRef}
                      placeholder={
                        replyingTo ? t('post_write_reply') : t('post_drop_vibe')
                      }
                      className="h-14 pl-6 pr-14 bg-secondary/40 border-none rounded-2xl focus-visible:ring-primary/20 text-sm font-medium shadow-inner transition-all focus-visible:bg-secondary/60"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <Button
                      size="icon"
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl transition-all",
                        commentText.trim()
                          ? "bg-primary text-white shadow-lg"
                          : "bg-white/10 text-muted-foreground opacity-20"
                      )}
                      disabled={!commentText.trim() || isSending}
                      onClick={handleSend}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 fill-current" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
