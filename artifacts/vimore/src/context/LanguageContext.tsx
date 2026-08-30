'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { dictionary, LanguageCode, TranslationKey } from '@/lib/dictionary';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    // 1. Check persistent local archival node
    const saved = localStorage.getItem('vimore_language') as LanguageCode;
    if (saved && dictionary[saved]) {
      setLanguageState(saved);
    } else {
      // 2. Hardware Handshake: Auto-detect cluster dialect
      const browserLang = window.navigator.language.split('-')[0] as LanguageCode;
      if (dictionary[browserLang]) {
        setLanguageState(browserLang);
      }
    }
  }, []);

  // Spatial Logic: Handle document direction for RTL clusters
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isRtl = language === 'ar';
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    if (dictionary[lang]) {
      setLanguageState(lang);
      localStorage.setItem('vimore_language', lang);
    }
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    // Fetch from active vault, fallback to English node if signature missing
    return dictionary[language][key] || dictionary['en'][key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
