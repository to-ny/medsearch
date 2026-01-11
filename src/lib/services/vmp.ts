/**
 * VMP (Virtual Medicinal Product) service
 * Handles searching and retrieving generic product data
 */

import { soapRequest } from '@/lib/soap/client';
import { buildFindVmpRequest } from '@/lib/soap/xml-builder';
import {
  parseFindVmpResponse,
  extractText,
  extractTextWithLang,
  extractAllTextVersions,
  getTextArray,
  type RawVmpData,
  type RawVmpComponentData,
  type RawVirtualIngredientData,
} from '@/lib/soap/xml-parser';
import type { GenericProduct, GenericComponent, Ingredient, ApiResponse } from '@/lib/types';

/**
 * Transforms raw virtual ingredient data
 */
function transformVirtualIngredient(raw: RawVirtualIngredientData, language: string): Ingredient | null {
  if (!raw) return null;

  return {
    rank: raw['@_Rank'] || 0,
    type: raw.Type || 'UNKNOWN',
    substanceCode: raw.Substance?.['@_Code'] || '',
    substanceName: extractText(getTextArray(raw.Substance?.Name), language),
    strengthDescription: raw.StrengthRange,
  };
}

/**
 * Transforms raw VMP component data
 */
function transformVmpComponent(raw: RawVmpComponentData, language: string): GenericComponent {
  return {
    sequenceNr: raw['@_SequenceNr'] || 0,
    name: extractText(getTextArray(raw.Name), language) || undefined,
    ingredients: (raw.VirtualIngredient || [])
      .map((ing) => transformVirtualIngredient(ing, language))
      .filter((ing): ing is Ingredient => ing !== null),
  };
}

/**
 * Transforms raw VMP data to GenericProduct type
 * Tracks actual language returned when it differs from requested
 */
function transformVmp(raw: RawVmpData, language: string): GenericProduct {
  const nameResult = extractTextWithLang(getTextArray(raw.Name), language);
  const allNames = extractAllTextVersions(getTextArray(raw.Name));
  const vmpGroupNameResult = raw.VmpGroup
    ? extractTextWithLang(getTextArray(raw.VmpGroup.Name), language)
    : null;
  const vmpGroupAllNames = raw.VmpGroup
    ? extractAllTextVersions(getTextArray(raw.VmpGroup.Name))
    : [];

  return {
    vmpCode: raw['@_Code'] || '',
    name: nameResult.text,
    // Only include language if it differs from requested (fallback occurred)
    nameLanguage: nameResult.language !== language ? nameResult.language : undefined,
    // Include all available language versions
    allNames: allNames.length > 0 ? allNames : undefined,
    abbreviatedName: extractText(getTextArray(raw.AbbreviatedName), language) || undefined,
    status: 'AUTHORIZED',
    vtmCode: raw.Vtm?.['@_Code'],
    vmpGroup: raw.VmpGroup
      ? {
          code: raw.VmpGroup['@_Code'] || '',
          name: vmpGroupNameResult!.text,
          // Only include language if it differs from requested
          nameLanguage: vmpGroupNameResult!.language !== language ? vmpGroupNameResult!.language : undefined,
          // Include all available language versions
          allNames: vmpGroupAllNames.length > 0 ? vmpGroupAllNames : undefined,
        }
      : undefined,
    components: (raw.VmpComponent || []).map((comp) => transformVmpComponent(comp, language)),
  };
}

export interface SearchVmpParams {
  query?: string;
  vmpCode?: string;
  ingredient?: string;
  vtmCode?: string;
  language?: string;
}

/**
 * Searches for generic products (VMPs)
 */
export async function searchVmp(params: SearchVmpParams): Promise<ApiResponse<GenericProduct[]>> {
  const language = params.language || 'en';

  try {
    const soapXml = buildFindVmpRequest({
      anyNamePart: params.query,
      vmpCode: params.vmpCode,
      ingredient: params.ingredient,
      vtmCode: params.vtmCode,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'medications',
    });
    const parsed = parseFindVmpResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const generics = parsed.data.map((raw) => transformVmp(raw, language));

    return {
      success: true,
      data: generics,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: generics.length,
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
 * Gets a generic product by VMP code
 */
export async function getVmpDetail(
  vmpCode: string,
  language = 'en'
): Promise<ApiResponse<GenericProduct>> {
  try {
    const soapXml = buildFindVmpRequest({
      vmpCode,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'medications',
    });
    const parsed = parseFindVmpResponse(response);

    if (!parsed.success || !parsed.data || parsed.data.length === 0) {
      return {
        success: false,
        error: parsed.error || { code: 'NOT_FOUND', message: 'Generic product not found' },
      };
    }

    return {
      success: true,
      data: transformVmp(parsed.data[0], language),
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
 * Gets the VMP code for a medication (for finding equivalents)
 */
export async function getVmpForAmp(
  vmpCode: string,
  language = 'en'
): Promise<ApiResponse<GenericProduct>> {
  return getVmpDetail(vmpCode, language);
}
