/**
 * ATC (Anatomical Therapeutic Chemical) Classification service
 * Handles browsing and retrieving ATC classification data
 */

import { soapRequest } from '@/lib/soap/client';
import { buildFindAtcRequest } from '@/lib/soap/xml-builder';
import {
  parseFindAtcResponse,
  extractText,
  getTextArray,
  type RawAtcClassificationData,
} from '@/lib/soap/xml-parser';
import type { AtcClassification, AtcSearchResponse, ApiResponse } from '@/lib/types';

/**
 * Determines the ATC level from the code length
 * Level 1: 1 char (A)
 * Level 2: 3 chars (A01)
 * Level 3: 4 chars (A01A)
 * Level 4: 5 chars (A01AA)
 * Level 5: 7 chars (A01AA01)
 */
function getAtcLevel(code: string): number {
  const length = code.length;
  if (length === 1) return 1;
  if (length === 3) return 2;
  if (length === 4) return 3;
  if (length === 5) return 4;
  if (length >= 7) return 5;
  return 0;
}

/**
 * Gets the parent code for an ATC code
 */
function getParentCode(code: string): string | undefined {
  const level = getAtcLevel(code);
  if (level <= 1) return undefined;

  switch (level) {
    case 2: return code.charAt(0); // A01 -> A
    case 3: return code.substring(0, 3); // A01A -> A01
    case 4: return code.substring(0, 4); // A01AA -> A01A
    case 5: return code.substring(0, 5); // A01AA01 -> A01AA
    default: return undefined;
  }
}

/**
 * Transforms raw ATC classification data to AtcClassification type
 */
function transformAtcClassification(raw: RawAtcClassificationData, language: string): AtcClassification {
  const code = raw.CommentedClassificationCode || '';

  return {
    code,
    name: extractText(getTextArray(raw.Title), language) || code,
    description: extractText(getTextArray(raw.Content), language) || undefined,
    parentCode: getParentCode(code),
    level: getAtcLevel(code),
  };
}

export interface SearchAtcParams {
  code?: string;
  query?: string;
  language?: string;
}

/**
 * Searches for ATC classifications
 * If no code is provided, returns top-level (level 1) categories
 * If a code is provided, returns that classification and its children
 */
export async function searchAtc(params: SearchAtcParams): Promise<ApiResponse<AtcSearchResponse>> {
  const language = params.language || 'en';

  try {
    const soapXml = buildFindAtcRequest({
      atcCode: params.code,
      anyNamePart: params.query,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'atc',
    });
    const parsed = parseFindAtcResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    // Transform all classifications
    const allClassifications = parsed.data.map((raw) => transformAtcClassification(raw, language));

    // If a specific code was requested, find it and its children
    if (params.code) {
      const targetLevel = getAtcLevel(params.code);
      const childLevel = targetLevel + 1;

      // Find the requested classification itself
      const parent = allClassifications.find(c => c.code === params.code);

      // Find direct children (classifications with parent = params.code)
      const children = allClassifications.filter(c =>
        c.parentCode === params.code && c.level === childLevel
      );

      return {
        success: true,
        data: {
          classifications: parent ? [parent] : [],
          children: children.length > 0 ? children : undefined,
        },
        meta: {
          searchDate: parsed.searchDate,
          samId: parsed.samId,
        },
      };
    }

    // No code specified - return top-level categories (level 1)
    const topLevel = allClassifications.filter(c => c.level === 1);

    return {
      success: true,
      data: {
        classifications: topLevel,
      },
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
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
 * Gets ATC classification by code with its children
 */
export async function getAtcByCode(
  code: string,
  language = 'en'
): Promise<ApiResponse<AtcSearchResponse>> {
  return searchAtc({ code, language });
}

/**
 * Gets top-level ATC categories
 */
export async function getTopLevelAtc(
  language = 'en'
): Promise<ApiResponse<AtcSearchResponse>> {
  return searchAtc({ language });
}
