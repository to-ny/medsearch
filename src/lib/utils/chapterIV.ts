/**
 * Chapter IV detection utilities
 *
 * In Belgium, "Chapter IV" medications require prior authorization from the health insurer.
 * The prescriber must submit a request explaining why the patient needs this specific medication.
 *
 * Detection logic:
 * - Criterion codes ending with 'f' indicate a formal indication (prior authorization required)
 * - Examples: "Af", "Bf", "Cf", "Df" etc.
 */

import type { Reimbursement } from '@/lib/types';

/**
 * Official RIZIV/INAMI information URLs for Chapter IV
 */
export const CHAPTER_IV_INFO_URLS = {
  // Dutch (RIZIV)
  nl: 'https://www.riziv.fgov.be/nl/themas/kost-terugbetaling/door-ziekenfonds/geneesmiddel-gezondheidsproduct/geneesmiddel-voorschrijven/Paginas/hoofdstuk-IV-aanvragen.aspx',
  // French (INAMI)
  fr: 'https://www.inami.fgov.be/fr/themes/cout-remboursement/par-mutualite/medicament-produit-sante/prescrire-medicament/Pages/demander-chapitre-iv.aspx',
  // German - fallback to French
  de: 'https://www.inami.fgov.be/fr/themes/cout-remboursement/par-mutualite/medicament-produit-sante/prescrire-medicament/Pages/demander-chapitre-iv.aspx',
  // English - fallback to Dutch (most comprehensive)
  en: 'https://www.riziv.fgov.be/nl/themas/kost-terugbetaling/door-ziekenfonds/geneesmiddel-gezondheidsproduct/geneesmiddel-voorschrijven/Paginas/hoofdstuk-IV-aanvragen.aspx',
} as const;

/**
 * Checks if a reimbursement criterion code indicates Chapter IV (formal indication)
 *
 * Chapter IV medications have criterion codes ending with 'f' (formal)
 * This indicates that prior authorization from the health insurer is required.
 *
 * @param criterionCode - The reimbursement criterion code (e.g., "Af", "Bf", "A", "B")
 * @returns true if this is a Chapter IV (formal indication) medication
 */
export function isChapterIVCriterion(criterionCode: string | undefined): boolean {
  if (!criterionCode) return false;

  // Check if criterion code ends with 'f' (case insensitive)
  // Examples: "Af", "Bf", "Cf", "Df" are Chapter IV
  // Examples: "A", "B", "C", "D" are NOT Chapter IV
  return criterionCode.toLowerCase().endsWith('f');
}

/**
 * Checks if a reimbursement object indicates a Chapter IV medication
 *
 * @param reimbursement - The reimbursement data
 * @returns true if this medication requires Chapter IV prior authorization
 */
export function isChapterIV(reimbursement: Reimbursement | undefined | null): boolean {
  if (!reimbursement?.criterion) return false;

  return isChapterIVCriterion(reimbursement.criterion.code);
}

/**
 * Checks if any reimbursement in an array indicates Chapter IV
 *
 * @param reimbursements - Array of reimbursement data
 * @returns true if any reimbursement indicates Chapter IV
 */
export function hasChapterIVReimbursement(
  reimbursements: Reimbursement[] | undefined | null
): boolean {
  if (!reimbursements?.length) return false;

  return reimbursements.some(isChapterIV);
}

/**
 * Gets the Chapter IV info URL for a given language
 *
 * @param language - ISO language code (en, nl, fr, de)
 * @returns URL to official RIZIV/INAMI Chapter IV information page
 */
export function getChapterIVInfoUrl(language: string): string {
  const lang = language.toLowerCase();
  return (
    CHAPTER_IV_INFO_URLS[lang as keyof typeof CHAPTER_IV_INFO_URLS] ||
    CHAPTER_IV_INFO_URLS.en
  );
}
