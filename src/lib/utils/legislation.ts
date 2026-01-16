/**
 * Legislation utility functions (shared between server and client)
 * Pure helper functions for working with legal basis data
 */

import type { LegalBasis, LegalReference, LegalText, LocalizedText } from '@/lib/types';

/**
 * Extracts the best text for a given language from localized text array
 * For legal texts, prefers FR/NL as they are the official languages
 *
 * @param texts - Array of localized text objects
 * @param preferredLang - Preferred language code (will use official language if preferred not available)
 * @returns The best matching text, or empty string if none found
 */
export function getLegalText(texts: LocalizedText[] | undefined, preferredLang = 'en'): string {
  if (!texts || texts.length === 0) return '';

  // Try preferred language first
  const preferred = texts.find((t) => t.language === preferredLang);
  if (preferred?.text) return preferred.text;

  // Legal texts are official in FR/NL/DE only - try French first (most complete)
  const french = texts.find((t) => t.language === 'fr');
  if (french?.text) return french.text;

  // Try Dutch
  const dutch = texts.find((t) => t.language === 'nl');
  if (dutch?.text) return dutch.text;

  // Try German
  const german = texts.find((t) => t.language === 'de');
  if (german?.text) return german.text;

  // Fall back to first available
  return texts[0]?.text || '';
}

/**
 * Recursively flattens all legal texts from a legal reference tree
 * into a single array, preserving order by sequence number
 *
 * @param ref - The legal reference to extract texts from
 * @returns Flat array of all legal texts
 */
export function flattenLegalTexts(ref: LegalReference): LegalText[] {
  const result: LegalText[] = [];

  // Add texts from this reference
  if (ref.legalTexts) {
    for (const text of ref.legalTexts) {
      result.push(text);
      if (text.children) {
        result.push(...flattenLegalTextChildren(text.children));
      }
    }
  }

  // Recurse into child references
  if (ref.legalReferences) {
    for (const childRef of ref.legalReferences) {
      result.push(...flattenLegalTexts(childRef));
    }
  }

  return result;
}

/**
 * Helper to recursively flatten nested legal text children
 */
function flattenLegalTextChildren(children: LegalText[]): LegalText[] {
  const result: LegalText[] = [];
  for (const child of children) {
    result.push(child);
    if (child.children) {
      result.push(...flattenLegalTextChildren(child.children));
    }
  }
  return result;
}

/**
 * Gets a human-readable title for a legal basis
 *
 * @param basis - The legal basis
 * @param preferredLang - Preferred language
 * @returns A formatted title string (e.g., "Royal Decree of 01.02.2018")
 */
export function getLegalBasisTitle(basis: LegalBasis, preferredLang = 'en'): string {
  const title = getLegalText(basis.title, preferredLang);
  if (title) return title;

  // Fallback: parse from key (e.g., "RD20180201" -> "Royal Decree 01.02.2018")
  if (basis.key.startsWith('RD')) {
    const dateStr = basis.key.substring(2);
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `Royal Decree ${day}.${month}.${year}`;
    }
  }

  return basis.key;
}
