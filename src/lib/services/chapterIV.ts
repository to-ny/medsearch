/**
 * Chapter IV service
 * Handles Chapter IV (prior authorization) paragraph details for restricted medications
 */

import 'server-only';

import { soapRequest } from '@/lib/soap/client';
import { buildFindChapterIVRequest } from '@/lib/soap/xml-builder';
import {
  parseFindChapterIVResponse,
  extractAllTextVersions,
  type RawChapterIVParagraphData,
  type RawChapterIVVerseData,
} from '@/lib/soap/xml-parser';
import type { ChapterIVParagraph, ChapterIVVerse, ApiResponse } from '@/lib/types';
import { getLocalizedText } from '@/lib/utils/localization';

/**
 * Transforms raw verse data to our typed format
 */
function transformVerse(raw: RawChapterIVVerseData): ChapterIVVerse {
  // Extract text from nested structure
  const textElements = raw.Text?.Text;
  const textVersions = extractAllTextVersions(textElements);

  return {
    verseSeq: raw['@_VerseSeq'] ?? 0,
    verseNum: raw.VerseNum ?? 0,
    verseSeqParent: raw.VerseSeqParent ?? 0,
    verseLevel: raw.VerseLevel ?? 1,
    text: textVersions.map((t) => ({ text: t.text, language: t.language })),
    requestType: raw.RequestType,
    agreementTermQuantity: raw.AgreementTerm?.Quantity,
    agreementTermUnit: raw.AgreementTerm?.Unit,
    startDate: raw['@_StartDate'],
  };
}

/**
 * Transforms raw paragraph data to our typed format
 */
function transformParagraph(raw: RawChapterIVParagraphData): ChapterIVParagraph {
  // Extract keyString from nested structure
  const keyStringElements = raw.KeyString?.Text;
  const keyStringVersions = extractAllTextVersions(keyStringElements);

  // Transform verses, sorted by sequence
  const verses = (raw.Verse || [])
    .map(transformVerse)
    .sort((a, b) => a.verseSeq - b.verseSeq);

  return {
    chapterName: raw['@_ChapterName'] || '',
    paragraphName: raw['@_ParagraphName'] || '',
    legalReferencePath: raw.LegalReferencePath || '',
    keyString: keyStringVersions.map((t) => ({ text: t.text, language: t.language })),
    agreementType: raw.AgreementType,
    publicationDate: raw.PublicationDate,
    modificationDate: raw.ModificationDate,
    paragraphVersion: raw.ParagraphVersion,
    startDate: raw['@_StartDate'],
    endDate: raw['@_EndDate'],
    verses,
  };
}

/**
 * Gets Chapter IV paragraph details for a CNK code
 *
 * @param cnk - The 7-digit CNK code
 * @param language - Preferred language for text extraction (default: 'en')
 * @returns Chapter IV paragraphs if the medication requires prior authorization
 */
export async function getChapterIVByCnk(
  cnk: string,
  language = 'en'
): Promise<ApiResponse<ChapterIVParagraph[]>> {
  try {
    const soapXml = buildFindChapterIVRequest({
      cnk,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'reimbursement', // Same cache policy as reimbursement (reference data)
    });
    const parsed = parseFindChapterIVResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const paragraphs = parsed.data.map(transformParagraph);

    return {
      success: true,
      data: paragraphs,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: paragraphs.length,
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
 * Gets Chapter IV paragraph details by legal reference path
 *
 * @param legalReferencePath - The legal reference path (e.g., "RD20180201-IV-10680000")
 * @param language - Preferred language for text extraction (default: 'en')
 * @returns Chapter IV paragraph details
 */
export async function getChapterIVByLegalReference(
  legalReferencePath: string,
  language = 'en'
): Promise<ApiResponse<ChapterIVParagraph[]>> {
  try {
    const soapXml = buildFindChapterIVRequest({
      legalReferencePath,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'reimbursement',
    });
    const parsed = parseFindChapterIVResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const paragraphs = parsed.data.map(transformParagraph);

    return {
      success: true,
      data: paragraphs,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: paragraphs.length,
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

// Re-export pure localization functions from utils for backward compatibility
export { getLocalizedText, hasTextInLanguage } from '@/lib/utils/localization';

/**
 * Builds a flat list of verse texts for display
 * Filters to top-level verses (verseLevel <= 2) for a summary view
 *
 * @param verses - Array of verse objects
 * @param preferredLang - Preferred language code
 * @returns Array of text strings suitable for display
 */
export function getVerseSummary(
  verses: ChapterIVVerse[],
  preferredLang = 'en'
): string[] {
  return verses
    .filter((v) => v.verseLevel <= 2)
    .map((v) => getLocalizedText(v.text, preferredLang))
    .filter((text) => text.length > 0);
}
