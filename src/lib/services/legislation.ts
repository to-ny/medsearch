/**
 * Legislation service
 * Handles legal text (Royal Decrees, chapters, paragraphs) that defines reimbursement rules
 */

import { soapRequest } from '@/lib/soap/client';
import { buildFindLegislationTextRequest } from '@/lib/soap/xml-builder';
import {
  parseFindLegislationTextResponse,
  extractAllTextVersions,
  type RawLegalBasisData,
  type RawLegalReferenceData,
  type RawLegalTextData,
} from '@/lib/soap/xml-parser';
import type { LegalBasis, LegalReference, LegalText, LocalizedText, ApiResponse } from '@/lib/types';

/**
 * Transforms raw legal text data to our typed format (recursive)
 */
function transformLegalText(raw: RawLegalTextData): LegalText {
  const contentElements = raw.Content?.Text;
  const contentVersions = extractAllTextVersions(contentElements);

  const children =
    raw.LegalText && Array.isArray(raw.LegalText) && raw.LegalText.length > 0
      ? raw.LegalText.map(transformLegalText).sort((a, b) => a.sequenceNr - b.sequenceNr)
      : undefined;

  return {
    key: raw['@_Key'] || '',
    content: contentVersions.map((t) => ({ text: t.text, language: t.language })),
    type: raw.Type || 'ALINEA',
    sequenceNr: raw.SequenceNr ?? 0,
    lastModifiedOn: raw.LastModifiedOn,
    startDate: raw['@_StartDate'],
    endDate: raw['@_EndDate'],
    children,
  };
}

/**
 * Transforms raw legal reference data to our typed format (recursive)
 */
function transformLegalReference(raw: RawLegalReferenceData): LegalReference {
  const titleElements = raw.Title?.Text;
  const titleVersions = extractAllTextVersions(titleElements);

  // LegalReference can have either nested LegalReference OR LegalText (not both)
  const legalReferences =
    raw.LegalReference && Array.isArray(raw.LegalReference) && raw.LegalReference.length > 0
      ? raw.LegalReference.map(transformLegalReference)
      : undefined;

  const legalTexts =
    raw.LegalText && Array.isArray(raw.LegalText) && raw.LegalText.length > 0
      ? raw.LegalText.map(transformLegalText).sort((a, b) => a.sequenceNr - b.sequenceNr)
      : undefined;

  return {
    key: raw['@_Key'] || '',
    title: titleVersions.map((t) => ({ text: t.text, language: t.language })),
    type: raw.Type || 'CHAPTER',
    firstPublishedOn: raw.FirstPublishedOn,
    lastModifiedOn: raw.LastModifiedOn,
    startDate: raw['@_StartDate'],
    endDate: raw['@_EndDate'],
    legalReferences,
    legalTexts,
  };
}

/**
 * Transforms raw legal basis data to our typed format
 */
function transformLegalBasis(raw: RawLegalBasisData): LegalBasis {
  const titleElements = raw.Title?.Text;
  const titleVersions = extractAllTextVersions(titleElements);

  const legalReferences =
    raw.LegalReference && Array.isArray(raw.LegalReference) && raw.LegalReference.length > 0
      ? raw.LegalReference.map(transformLegalReference)
      : [];

  return {
    key: raw['@_Key'] || '',
    title: titleVersions.map((t) => ({ text: t.text, language: t.language })),
    type: raw.Type || 'ROYAL_DECREE',
    effectiveOn: raw.EffectiveOn,
    startDate: raw['@_StartDate'],
    endDate: raw['@_EndDate'],
    legalReferences,
  };
}

/**
 * Gets legislation for a medication by CNK code
 *
 * @param cnk - The 7-digit CNK code
 * @param language - Preferred language (note: legal texts are only in FR/NL/DE)
 * @returns Legal basis documents applicable to this medication
 */
export async function getLegislationByCnk(
  cnk: string,
  language = 'en'
): Promise<ApiResponse<LegalBasis[]>> {
  try {
    const soapXml = buildFindLegislationTextRequest({
      cnk,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'legislation', // Long cache - legal texts change infrequently
    });
    const parsed = parseFindLegislationTextResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const legalBases = parsed.data.map(transformLegalBasis);

    return {
      success: true,
      data: legalBases,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: legalBases.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Request failed',
      },
    };
  }
}

/**
 * Gets legislation by legal reference path
 *
 * @param legalReferencePath - The legal reference path (e.g., "RD20180201-IV-10680000")
 * @param language - Preferred language (note: legal texts are only in FR/NL/DE)
 * @returns Legal basis documents for this reference path
 */
export async function getLegislationByPath(
  legalReferencePath: string,
  language = 'en'
): Promise<ApiResponse<LegalBasis[]>> {
  try {
    const soapXml = buildFindLegislationTextRequest({
      legalReferencePath,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'legislation',
    });
    const parsed = parseFindLegislationTextResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const legalBases = parsed.data.map(transformLegalBasis);

    return {
      success: true,
      data: legalBases,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: legalBases.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Request failed',
      },
    };
  }
}

/**
 * Gets all legal bases (Royal Decrees) from the system
 *
 * @returns All legal basis documents with their top-level chapters
 */
export async function getAllLegalBases(): Promise<ApiResponse<LegalBasis[]>> {
  try {
    const soapXml = buildFindLegislationTextRequest({
      findAllLegalBases: true,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'legislation',
    });
    const parsed = parseFindLegislationTextResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const legalBases = parsed.data.map(transformLegalBasis);

    return {
      success: true,
      data: legalBases,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: legalBases.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Request failed',
      },
    };
  }
}

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
