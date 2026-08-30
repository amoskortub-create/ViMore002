"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { MainNav } from "@/components/layout/main-nav";
import { PostCard } from "@/components/post/post-card";
import { usePosts } from "@/context/PostContext";
import { databases, Query, COL, DATABASE_ID, BUCKET, getFileUrl } from "@/lib/appwrite";
import { cn } from "@/lib/utils";
import { Hash, TrendingUp, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMusic } from "@/context/MusicContext";

export default function HashtagPage() {
  const params = useParams();
  const tag = decodeURIComponent((params?.tag as string) || '').replace('#', '');
  const { posts: contextPosts, settings } = usePosts();
  const { currentTrack, isExpanded } = useMusic();
  const isPlayerActive = currentTrack && !isExpanded;

  const [remotePosts, setRemotePosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tag) return;
    setIsLoading(true);
    const normalizedTag = `#${tag.toLowerCase()}`;

    databases.listDocuments(DATABASE_ID, COL.POSTS, [
      Query.contains('hashtags', [normalizedTag]),
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ]).then(async (res) => {
      const authorIds = [...new Set(res.documents.map((p: any) => p.user_id).filter(Boolean))];
      let authorsMap: Record<string, any> = {};
      if (authorIds.length > 0) {
        try {
          const authorsRes = await databases.listDocuments(DATABASE_ID, COL.USERS, [Query.equal('$id', authorIds)]);
          authorsMap = Object.fromEntries(authorsRes.documents.map((u: any) => [u.$id, u]));
        } catch {}
      }
      setRemotePosts(res.documents.map((doc: any) => ({ doc, author: authorsMap[doc.user_id] })));
    }).catch(() => {
      setRemotePosts([]);
    }).finally(() => setIsLoading(false));
  }, [tag]);

  const localMatches = useMemo(() => {
    if (!tag) return [];
    const pattern = `#${tag.toLowerCase()}`;
    return contextPosts.filter(p =>
      (p as any).hashtags?.includes(pattern) ||
      (p.content || '').toLowerCase().includes(pattern)
    );
  }, [contextPosts, tag]);

  const matchCount = remotePosts.length || localMatches.length;

  function mapDocToCard(doc: any, author: any) {
    const imageIds: string[] = Array.isArray(doc.image_ids) ? doc.image_ids : (doc.image_id ? [doc.image_id] : []);
    const images = imageIds.map((id: string) => getFileUrl(BUCKET.POST_MEDIA, id));
    const videoId = doc.video_id;
    let poll;
    if (doc.poll) { try { poll = typeof doc.poll === 'string' ? JSON.parse(doc.poll) : doc.poll; } catch {} }
    let linkPreview;
    if (doc.link_preview) { try { linkPreview = typeof doc.link_preview === 'string' ? JSON.parse(doc.link_preview) : doc.link_preview; } catch {} }

    return {
      $id: doc.$id,
      user: author ? {
        name: author.name || 'Unknown',
        username: author.username || 'unknown',
        avatar: author.avatar_id ? getFileUrl(BUCKET.AVATARS, author.avatar_id) : '',
        isVerified: author.is_verified || false,
        followers: author.followers_count || 0,
      } : { name: 'Unknown', username: 'unknown', avatar: '', isVerified: false },
      content: doc.content || '',
      time: new Date(doc.$createdAt).toLocaleDateString(),
      likes: doc.likes_count || 0,
      unlikes: doc.unlikes_count || 0,
      comments: doc.comments_count || 0,
      shares: doc.shares_count || 0,
      views: doc.views_count || 0,
      images: images.length > 0 ? images : undefined,
      image: images[0],
      videoUrl: videoId ? getFileUrl(BUCKET.POST_MEDIA, videoId) : undefined,
      theme: doc.theme,
      imageFilter: doc.image_filter,
      feeling: doc.feeling ? (() => { try { return typeof doc.feeling === 'string' ? JSON.parse(doc.feeling) : doc.feeling; } catch { return undefined; } })() : undefined,
      location: doc.location,
      commentsDisabled: doc.comments_disabled || false,
      isLocked: doc.is_locked || false,
      unlockPrice: doc.unlock_price,
      isBoosted: doc.is_boosted || false,
      poll,
      hashtags: Array.isArray(doc.hashtags) ? doc.hashtags : [],
      taggedUsers: Array.isArray(doc.tagged_users) ? doc.tagged_users : [],
      linkPreview: linkPreview || null,
    };
  }

  const displayPosts = remotePosts.length > 0
    ? remotePosts.map(({ doc, author }) => mapDocToCard(doc, author))
    : localMatches;

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#080808] transition-colors duration-300">
      <Header />
      <SubHeader />
      <div className={cn(
        "max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-8 px-4 transition-all duration-300",
        "pt-6"
      )}>
        <aside className={cn("hidden lg:block sticky h-[calc(100vh-132px)]", "top-[132px]")}>
          <MainNav />
        </aside>

        <main className="w-full max-w-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white dark:bg-card rounded-2xl p-6 border border-primary/10 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Hash className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black italic uppercase tracking-tighter">#{tag}</h1>
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  {isLoading ? 'Scanning nodes...' : `${matchCount} post${matchCount !== 1 ? 's' : ''} in this cluster`}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-bold uppercase tracking-widest">Scanning the network...</p>
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="py-20 text-center space-y-4 opacity-50">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-black italic uppercase tracking-tighter">Cluster Silent</h3>
              <p className="text-sm text-muted-foreground">No posts with #{tag} found yet.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {displayPosts.map((post: any) => (
                <PostCard key={post.$id} {...post} />
              ))}
            </div>
          )}
        </main>

        <aside className="hidden lg:block" />
      </div>
    </div>
  );
}
