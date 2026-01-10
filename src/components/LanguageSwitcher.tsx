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
const DEFAULT_LANGUAGE: Language = 'en';

function getStoredLanguageFromStorage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in LANGUAGES) return stored as Language;
    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (browserLang in LANGUAGES) return browserLang as Language;
  } catch {
    // localStorage may be blocked in some contexts
  }
  return DEFAULT_LANGUAGE;
}

// External store for language state - shared across all useLanguage hooks
// Hydration-safe: Returns default language until explicitly initialized after mount
function createLanguageStore() {
  let currentLanguage: Language = DEFAULT_LANGUAGE;
  let isHydrated = false;
  const listeners = new Set<() => void>();

  function notifyListeners() {
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): Language {
      // Always return current language - no side effects during render
      return currentLanguage;
    },
    getServerSnapshot(): Language {
      return DEFAULT_LANGUAGE;
    },
    // Called once after hydration to sync with stored preference
    hydrate(): void {
      if (isHydrated) return;
      isHydrated = true;
      const storedLanguage = getStoredLanguageFromStorage();
      if (storedLanguage !== currentLanguage) {
        currentLanguage = storedLanguage;
        notifyListeners();
      }
      // Sync document.lang after hydration (safe side effect)
      if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLanguage;
      }
    },
    setLanguage(lang: Language): void {
      if (lang === currentLanguage) return;
      currentLanguage = lang;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, lang);
        } catch {
          // localStorage may be blocked
        }
        document.documentElement.lang = lang;
      }
      notifyListeners();
    },
    isHydrated(): boolean {
      return isHydrated;
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

  // Hydrate the store after mount - this triggers a re-render with the stored language
  useEffect(() => {
    languageStore.hydrate();
  }, []);

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
      >
        <span aria-hidden="true">{LANGUAGES[language].flag}</span>
        <span className="sr-only">{LANGUAGES[language].label}</span>
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
