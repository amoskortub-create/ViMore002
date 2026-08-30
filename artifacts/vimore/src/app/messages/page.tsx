 
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MainNav } from "@/components/layout/main-nav";
import { ChatList } from "@/components/chat/chat-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { useMusic } from "@/context/MusicContext";
import { usePosts, Connection, Cluster } from "@/context/PostContext";
import { cn } from "@/lib/utils";
import { MessageSquare, Sparkles, WifiOff } from "lucide-react";
import { BiometricGate } from "@/components/layout/biometric-gate";
import { DiagnosticErrorBoundary } from "@/components/layout/diagnostic-error-boundary";
import MessagesLoading from "./loading";

function MessagesInner() {
  const { currentTrack, isExpanded } = useMusic();
  const { connections, clusters, currentUser, isLoading, isOffline, allUsers, setSelectedChatId: setContextChatId } = usePosts();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const searchParams = useSearchParams();

  const isPlayerActive = currentTrack && !isExpanded;

  useEffect(() => {
    const open = searchParams.get('open');
    if (open) { setSelectedChatId(open); setContextChatId(open); }
  }, [searchParams, setContextChatId]);

  useEffect(() => {
    if (selectedChatId) {
      setShowMobileChat(true);
    } else {
      setShowMobileChat(false);
    }
  }, [selectedChatId]);

  const selectedContact = useMemo(() => {
    if (!selectedChatId || !currentUser) return null;
    
    const conn = connections.find(c => c.username === selectedChatId);
    if (conn) return { ...conn, isGroup: false } as Connection;
    
    const cluster = clusters.find(cl => cl.$id === selectedChatId);
    if (cluster) return { ...cluster, isGroup: true } as Cluster;

    const fallbackUser = allUsers.find(u => u.username === selectedChatId);
    if (fallbackUser) {
      return {
        $id: fallbackUser.$id,
        name: fallbackUser.name,
        username: fallbackUser.username,
        email: fallbackUser.vimoreId || '',
        avatar: fallbackUser.avatar,
        isVerified: fallbackUser.isVerified,
        isGroup: false,
        isOnline: false,
        followsYou: false,
      } as Connection;
    }
    
    return null;
  }, [connections, clusters, selectedChatId, currentUser, allUsers]);

  if (isLoading || !currentUser) {
    return <MessagesLoading />;
  }

  return (
    <BiometricGate title="Direct Messages">
      <div className="h-[100dvh] bg-background flex justify-center overflow-hidden">
        <div className="max-w-[1440px] w-full grid grid-cols-1 md:grid-cols-[280px_1fr] h-full overflow-hidden">
          <aside className="hidden md:block border-r border-primary/5 bg-white dark:bg-card h-full">
            <div className="sticky top-0 h-full">
              <MainNav />
            </div>
          </aside>

          <main className="relative flex flex-col bg-white dark:bg-[#0a0a0f] h-full overflow-hidden">
            {isOffline && (
              <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 shrink-0">
                <WifiOff className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Offline — showing saved messages</span>
              </div>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] min-h-0 overflow-hidden">
              <div className={cn(
                "h-full border-r border-primary/5 dark:border-white/5 flex flex-col transition-all duration-300 min-h-0",
                showMobileChat ? "hidden lg:flex" : "flex"
              )}>
                <ChatList 
                  selectedId={selectedChatId} 
                  onSelect={(id) => { setSelectedChatId(id); setContextChatId(id); }} 
                />
              </div>

              <div className={cn(
                "h-full flex flex-col relative transition-all duration-300 min-h-0",
                !showMobileChat ? "hidden lg:flex" : "flex"
              )}>
                <DiagnosticErrorBoundary title="Chat Hub">
                  {selectedContact ? (
                    <div className="relative h-full flex flex-col min-0">
                      <ChatWindow 
                        contact={selectedContact} 
                        onBack={() => { setSelectedChatId(null); setContextChatId(null); }} 
                      />
                    </div>
                  ) : (
                    <div className="flex-1 hidden lg:flex flex-col items-center justify-center text-center p-12 bg-[#FAFAFF] dark:bg-[#080810] relative overflow-hidden">
                      {/* Background decoration */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                        <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl" />
                      </div>

                      <div className="relative space-y-6 max-w-sm">
                        {/* Icon */}
                        <div className="relative mx-auto">
                          <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl scale-110 opacity-60" />
                          <div className="relative h-20 w-20 bg-gradient-to-br from-primary to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 mx-auto">
                            <MessageSquare className="h-9 w-9 text-white" />
                          </div>
                        </div>

                        {/* Text */}
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black tracking-tight">Select a conversation</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            Pick a chat from the left to start messaging, or create a new group cluster.
                          </p>
                        </div>

                        {/* Hint pill */}
                        <div className="inline-flex items-center gap-2 bg-primary/8 dark:bg-primary/10 px-4 py-2 rounded-full border border-primary/10 mx-auto">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-primary">End-to-end encrypted</span>
                        </div>
                      </div>
                    </div>
                  )}
                </DiagnosticErrorBoundary>
              </div>
            </div>
          </main>
        </div>
      </div>
    </BiometricGate>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <MessagesInner />
    </Suspense>
  );
}
