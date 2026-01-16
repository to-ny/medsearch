/**
 * Excipient database service
 *
 * Provides access to pre-parsed excipient data from SmPC documents.
 * The database is loaded once and cached in memory.
 */

import 'server-only';

import excipientData from '@/data/excipients.json';

type Language = 'fr' | 'nl' | 'de' | 'en';

interface ExcipientDatabase {
  version: string;
  generatedAt: string;
  totalMedications: number;
  medicationsWithExcipients: number;
  data: Record<string, Partial<Record<Language, string>>>;
}

// Type assertion for the imported JSON
const database = excipientData as ExcipientDatabase;

export interface ExcipientResult {
  /** Text in the requested language, if available */
  text?: string;
  /** Language of the text */
  language?: Language;
  /** All available languages with their texts */
  allTexts: { language: Language; text: string }[];
  /** Whether the requested language was available */
  hasRequestedLanguage: boolean;
}

/**
 * Get excipients for a medication by AMP code
 * @param ampCode The AMP code (e.g., "SAM000691-00")
 * @param preferredLanguage The user's preferred language
 * @returns Excipient text with language info, or null if not found
 */
export function getExcipients(ampCode: string, preferredLanguage: Language = 'fr'): ExcipientResult | null {
  const entry = database.data[ampCode];
  if (!entry) {
    return null;
  }

  // Build list of all available texts
  const allTexts: { language: Language; text: string }[] = [];
  const langOrder: Language[] = ['fr', 'nl', 'de', 'en'];

  for (const lang of langOrder) {
    if (entry[lang]) {
      allTexts.push({ language: lang, text: entry[lang]! });
    }
  }

  if (allTexts.length === 0) {
    return null;
  }

  // Check if preferred language is available
  const preferredText = entry[preferredLanguage];
  if (preferredText) {
    return {
      text: preferredText,
      language: preferredLanguage,
      allTexts,
      hasRequestedLanguage: true,
    };
  }

  // Fallback: return first available language
  return {
    text: allTexts[0].text,
    language: allTexts[0].language,
    allTexts,
    hasRequestedLanguage: false,
  };
}

/**
 * Check if we have excipient data for a medication
 * @param ampCode The AMP code
 * @returns true if excipient data exists
 */
export function hasExcipientData(ampCode: string): boolean {
  return ampCode in database.data;
}

/**
 * Get database statistics
 */
export function getExcipientDatabaseStats(): {
  version: string;
  generatedAt: string;
  totalMedications: number;
  medicationsWithExcipients: number;
  coveragePercent: number;
} {
  return {
    version: database.version,
    generatedAt: database.generatedAt,
    totalMedications: database.totalMedications,
    medicationsWithExcipients: database.medicationsWithExcipients,
    coveragePercent: (database.medicationsWithExcipients / database.totalMedications) * 100,
  };
}
