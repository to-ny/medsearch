'use client';

import { useMemo, useCallback } from 'react';
import { useLanguage } from './use-language';
import type { Language } from '@/server/types/domain';

// Import locale files
import en from '@/locales/en.json';
import nl from '@/locales/nl.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';

type TranslationData = typeof en;

const translations: Record<Language, TranslationData> = {
  en,
  nl,
  fr,
  de,
};

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue(obj, 'detail.overview') returns obj.detail.overview
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

interface UseTranslationReturn {
  t: (key: string) => string;
  language: Language;
}

/**
 * Hook for accessing translated static content
 * Supports dot notation for nested keys (e.g., 'detail.overview')
 * Falls back to English if key is not found in current language
 */
export function useTranslation(): UseTranslationReturn {
  const { language } = useLanguage();

  const currentTranslations = useMemo(() => {
    return translations[language];
  }, [language]);

  const englishTranslations = useMemo(() => {
    return translations.en;
  }, []);

  const t = useCallback(
    (key: string): string => {
      // Try current language first
      const value = getNestedValue(currentTranslations, key);
      if (value !== undefined) {
        return value;
      }

      // Fall back to English
      const fallbackValue = getNestedValue(englishTranslations, key);
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      // Return key if not found (helps with debugging)
      console.warn(`Translation key not found: ${key}`);
      return key;
    },
    [currentTranslations, englishTranslations]
  );

  return { t, language };
}
