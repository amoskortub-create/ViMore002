'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FeedSignalContextType {
  newFollowingPostsCount: number;
  incrementNewPosts: () => void;
  clearNewPosts: () => void;
  uploadProgress: number | null;
  setUploadProgress: (p: number | null) => void;
}

const FeedSignalContext = createContext<FeedSignalContextType | undefined>(undefined);

export function FeedSignalProvider({ children }: { children: ReactNode }) {
  const [newFollowingPostsCount, setNewFollowingPostsCount] = useState(0);
  const [uploadProgress, setUploadProgressState] = useState<number | null>(null);
  const incrementNewPosts = useCallback(() => setNewFollowingPostsCount(p => p + 1), []);
  const clearNewPosts = useCallback(() => setNewFollowingPostsCount(0), []);
  const setUploadProgress = useCallback((p: number | null) => setUploadProgressState(p), []);

  return (
    <FeedSignalContext.Provider value={{ newFollowingPostsCount, incrementNewPosts, clearNewPosts, uploadProgress, setUploadProgress }}>
      {children}
    </FeedSignalContext.Provider>
  );
}

export function useFeedSignal() {
  const ctx = useContext(FeedSignalContext);
  if (!ctx) throw new Error('useFeedSignal must be within FeedSignalProvider');
  return ctx;
}
