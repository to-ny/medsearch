/**
 * Localization utilities for handling multilingual text
 *
 * These utilities work with LocalizedText arrays from the SAM API
 * and implement the app's language fallback pattern.
 */

import type { LocalizedText } from '@/lib/types';

/**
 * Extracts the best text for a given language from localized text array
 *
 * Fallback order:
 * 1. Preferred language
 * 2. English (if different from preferred)
 * 3. First available text
 *
 * @param texts - Array of localized text objects
 * @param preferredLang - Preferred language code
 * @returns The best matching text, or empty string if none found
 */
export function getLocalizedText(
  texts: LocalizedText[] | undefined,
  preferredLang = 'en'
): string {
  if (!texts || texts.length === 0) return '';

  // Try preferred language first
  const preferred = texts.find((t) => t.language === preferredLang);
  if (preferred?.text) return preferred.text;

  // Fall back to English if different from preferred
  if (preferredLang !== 'en') {
    const english = texts.find((t) => t.language === 'en');
    if (english?.text) return english.text;
  }

  // Fall back to first available
  return texts[0]?.text || '';
}

/**
 * Checks if text is available in the selected language
 *
 * @param texts - Array of localized text objects
 * @param language - Language code to check
 * @returns true if text exists in the specified language
 */
export function hasTextInLanguage(
  texts: LocalizedText[] | undefined,
  language: string
): boolean {
  if (!texts || texts.length === 0) return false;
  return texts.some((t) => t.language === language && t.text);
}
