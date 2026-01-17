'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Language, MultilingualText } from '@/server/types/domain';
import { LANGUAGES, isValidLanguage } from '@/server/types/domain';
import { getLocalizedText as getLocalizedTextUtil, getLocalizedTextWithMeta, type LocalizedTextWithMeta } from '@/lib/utils/localization';

const STORAGE_KEY = 'medsearch-language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  getLocalized: (text: MultilingualText | null | undefined) => string;
  getLocalizedWithMeta: (text: MultilingualText | null | undefined) => LocalizedTextWithMeta;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

/**
 * Detect the best language based on browser settings
 */
function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';

  const browserLang = navigator.language?.split('-')[0];
  if (isValidLanguage(browserLang)) {
    return browserLang;
  }

  // Check navigator.languages for alternatives
  for (const lang of navigator.languages || []) {
    const shortLang = lang.split('-')[0];
    if (isValidLanguage(shortLang)) {
      return shortLang;
    }
  }

  return 'en';
}

/**
 * Provider component for language context
 */
export function LanguageProvider({ children, defaultLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Default to 'en' for SSR, will be updated on mount
    return defaultLanguage || 'en';
  });

  const [isHydrated, setIsHydrated] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidLanguage(stored)) {
        setLanguageState(stored);
      } else {
        const detected = detectBrowserLanguage();
        setLanguageState(detected);
      }
      setIsHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Update language and persist to localStorage
  const setLanguage = useCallback((lang: Language) => {
    if (!LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Also set a cookie for server-side detection
    document.cookie = `language=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  // Helper to get localized text
  const getLocalized = useCallback(
    (text: MultilingualText | null | undefined) => {
      return getLocalizedTextUtil(text, language);
    },
    [language]
  );

  // Helper to get localized text with metadata
  const getLocalizedWithMetaCallback = useCallback(
    (text: MultilingualText | null | undefined) => {
      return getLocalizedTextWithMeta(text, language);
    },
    [language]
  );

  const value: LanguageContextValue = {
    language,
    setLanguage,
    getLocalized,
    getLocalizedWithMeta: getLocalizedWithMetaCallback,
  };

  // Prevent hydration mismatch by not rendering children until client-side language is loaded
  if (!isHydrated) {
    return (
      <LanguageContext.Provider value={value}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Hook to get just the current language
 */
export function useCurrentLanguage(): Language {
  const { language } = useLanguage();
  return language;
}
