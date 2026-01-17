import type { Language, MultilingualText } from '@/server/types/domain';
import { LANGUAGE_FALLBACK_ORDER } from '@/server/types/domain';

/**
 * Result of getLocalizedTextWithMeta including fallback information
 */
export interface LocalizedTextWithMeta {
  text: string;
  actualLanguage: Language | null;
  isFallback: boolean;
}

/**
 * Extract text for a language with fallback chain (client-safe version)
 * Priority: requested → en → nl → fr → de → first available
 */
export function getLocalizedText(
  text: MultilingualText | null | undefined,
  lang: Language
): string {
  if (!text) return '';

  // Try requested language first
  if (text[lang]) return text[lang];

  // Fallback chain: en → nl → fr → de
  for (const fallback of LANGUAGE_FALLBACK_ORDER) {
    if (text[fallback]) return text[fallback];
  }

  // Last resort: first available value
  const firstValue = Object.values(text).find((v) => v);
  return firstValue || '';
}

/**
 * Extract text for a language with metadata about which language was actually used
 * Priority: requested → en → nl → fr → de → first available
 */
export function getLocalizedTextWithMeta(
  text: MultilingualText | null | undefined,
  lang: Language
): LocalizedTextWithMeta {
  if (!text) {
    return { text: '', actualLanguage: null, isFallback: false };
  }

  // Try requested language first
  if (text[lang]) {
    return { text: text[lang]!, actualLanguage: lang, isFallback: false };
  }

  // Fallback chain: en → nl → fr → de
  for (const fallback of LANGUAGE_FALLBACK_ORDER) {
    if (text[fallback]) {
      return { text: text[fallback]!, actualLanguage: fallback, isFallback: true };
    }
  }

  // Last resort: first available value
  const languages = ['nl', 'fr', 'en', 'de'] as Language[];
  for (const l of languages) {
    if (text[l]) {
      return { text: text[l]!, actualLanguage: l, isFallback: true };
    }
  }

  return { text: '', actualLanguage: null, isFallback: false };
}

/**
 * Get all available languages for a multilingual text
 */
export function getAvailableLanguages(text: MultilingualText | null | undefined): Language[] {
  if (!text) return [];
  return (Object.keys(text) as Language[]).filter((lang) => text[lang]);
}

/**
 * Check if a multilingual text has content in a specific language
 */
export function hasLanguage(
  text: MultilingualText | null | undefined,
  lang: Language
): boolean {
  return Boolean(text && text[lang]);
}
