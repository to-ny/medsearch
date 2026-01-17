import 'server-only';

import type { Language, MultilingualText } from '../types/domain';
import { LANGUAGE_FALLBACK_ORDER } from '../types/domain';

/**
 * Extract text for a language with fallback chain
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
