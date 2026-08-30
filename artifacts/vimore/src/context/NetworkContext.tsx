'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export type NetworkTier = 'lite' | 'standard' | 'rich';
export type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkInfo {
  tier: NetworkTier;
  effectiveType: EffectiveType;
  downlink: number;
  rtt: number;
  saveData: boolean;
  isOnline: boolean;
  forcedTier: NetworkTier | null;
  setForcedTier: (tier: NetworkTier | null) => void;
}

const DEFAULT_INFO: NetworkInfo = {
  tier: 'rich',
  effectiveType: 'unknown',
  downlink: 10,
  rtt: 50,
  saveData: false,
  isOnline: true,
  forcedTier: null,
  setForcedTier: () => {},
};

const NetworkContext = createContext<NetworkInfo>(DEFAULT_INFO);

function classify(effectiveType: string, saveData: boolean): NetworkTier {
  if (saveData) return 'lite';
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'lite';
  if (effectiveType === '3g') return 'standard';
  return 'rich';
}

function readConnection(): { effectiveType: EffectiveType; downlink: number; rtt: number; saveData: boolean } {
  if (typeof navigator === 'undefined') {
    return { effectiveType: 'unknown', downlink: 10, rtt: 50, saveData: false };
  }
  const conn: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!conn) {
    return { effectiveType: 'unknown', downlink: 10, rtt: 50, saveData: false };
  }
  return {
    effectiveType: (conn.effectiveType || 'unknown') as EffectiveType,
    downlink: typeof conn.downlink === 'number' ? conn.downlink : 10,
    rtt: typeof conn.rtt === 'number' ? conn.rtt : 50,
    saveData: !!conn.saveData,
  };
}

function publishTierGlobal(tier: NetworkTier) {
  if (typeof window === 'undefined') return;
  (window as any).__vimoreNetTier = tier;
  try {
    document.documentElement.dataset.netTier = tier;
  } catch { /* ignore */ }
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [forcedTier, setForcedTierState] = useState<NetworkTier | null>(null);
  const [info, setInfo] = useState(() => {
    const c = readConnection();
    return {
      ...c,
      isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    };
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vimore_forced_net_tier');
      if (stored === 'lite' || stored === 'standard' || stored === 'rich') {
        setForcedTierState(stored);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const conn: any = typeof navigator !== 'undefined'
      ? ((navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection)
      : null;

    const update = () => {
      const c = readConnection();
      setInfo(prev => ({
        ...prev,
        ...c,
        isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
      }));
    };

    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', update);
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      if (conn && typeof conn.removeEventListener === 'function') {
        conn.removeEventListener('change', update);
      }
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const detectedTier = classify(info.effectiveType, info.saveData);
  const tier = forcedTier ?? detectedTier;

  useEffect(() => {
    publishTierGlobal(tier);
  }, [tier]);

  const setForcedTier = useCallback((t: NetworkTier | null) => {
    setForcedTierState(t);
    try {
      if (t) localStorage.setItem('vimore_forced_net_tier', t);
      else localStorage.removeItem('vimore_forced_net_tier');
    } catch { /* ignore */ }
  }, []);

  const value: NetworkInfo = {
    tier,
    effectiveType: info.effectiveType,
    downlink: info.downlink,
    rtt: info.rtt,
    saveData: info.saveData,
    isOnline: info.isOnline,
    forcedTier,
    setForcedTier,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkInfo {
  return useContext(NetworkContext);
}

export function getCurrentNetworkTier(): NetworkTier {
  if (typeof window === 'undefined') return 'rich';
  const t = (window as any).__vimoreNetTier as NetworkTier | undefined;
  return t || 'rich';
}
