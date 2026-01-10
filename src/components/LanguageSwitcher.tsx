'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';

export type Language = 'en' | 'nl' | 'fr' | 'de';

const LANGUAGES: Record<Language, { label: string; flag: string }> = {
  en: { label: 'English', flag: 'EN' },
  nl: { label: 'Nederlands', flag: 'NL' },
  fr: { label: 'Français', flag: 'FR' },
  de: { label: 'Deutsch', flag: 'DE' },
};

const STORAGE_KEY = 'health-search-language';

function getStoredLanguageFromStorage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in LANGUAGES) return stored as Language;
  // Try to detect from browser
  const browserLang = navigator.language.split('-')[0];
  if (browserLang in LANGUAGES) return browserLang as Language;
  return 'en';
}

// External store for language state - shared across all useLanguage hooks
// Using a closure to encapsulate the mutable state
function createLanguageStore() {
  let currentLanguage: Language = 'en';
  let isInitialized = false;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): Language {
      // Lazy initialization on first client-side access
      if (!isInitialized && typeof window !== 'undefined') {
        isInitialized = true;
        currentLanguage = getStoredLanguageFromStorage();
        document.documentElement.lang = currentLanguage;
      }
      return currentLanguage;
    },
    getServerSnapshot(): Language {
      return 'en';
    },
    setLanguage(lang: Language): void {
      currentLanguage = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      listeners.forEach((listener) => listener());
    },
  };
}

const languageStore = createLanguageStore();

// Exported for backward compatibility
export function getStoredLanguage(): Language {
  return getStoredLanguageFromStorage();
}

export function setStoredLanguage(lang: Language): void {
  languageStore.setLanguage(lang);
}

export function useLanguage(): [Language, (lang: Language) => void] {
  const language = useSyncExternalStore(
    languageStore.subscribe,
    languageStore.getSnapshot,
    languageStore.getServerSnapshot
  );

  return [language, languageStore.setLanguage];
}

export function LanguageSwitcher() {
  const [language, setLanguage] = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <span>{LANGUAGES[language].flag}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          role="listbox"
        >
          {(Object.entries(LANGUAGES) as [Language, { label: string; flag: string }][]).map(
            ([code, { label, flag }]) => (
              <button
                key={code}
                onClick={() => {
                  setLanguage(code);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  language === code
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                role="option"
                aria-selected={language === code}
              >
                <span className="font-medium">{flag}</span>
                <span>{label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
