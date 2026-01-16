/**
 * AMP (Actual Medicinal Product) service
 * Handles searching and retrieving branded medication data
 */

import 'server-only';

import { soapRequest } from '@/lib/soap/client';
import { buildFindAmpRequest } from '@/lib/soap/xml-builder';
import {
  parseFindAmpResponse,
  extractText,
  extractTextWithLang,
  extractAllTextsWithLang,
  extractAllTextVersions,
  getTextArray,
  type RawAmpData,
  type RawAmppData,
  type RawAmpComponentData,
  type RawIngredientData,
  type RawDmppData,
} from '@/lib/soap/xml-parser';
import type {
  Medication,
  MedicationPackage,
  MedicationComponent,
  Ingredient,
  CnkCode,
  MedicationSearchResult,
  ApiResponse,
} from '@/lib/types';
import { normalizeCnk } from '@/lib/utils/format';

/**
 * Transforms raw ingredient data
 */
function transformIngredient(raw: RawIngredientData, language: string): Ingredient | null {
  if (!raw) return null;

  return {
    rank: raw['@_Rank'] || 0,
    type: raw.Type || 'UNKNOWN',
    substanceCode: raw.Substance?.['@_Code'] || '',
    substanceName: extractText(getTextArray(raw.Substance?.Name), language),
    strengthDescription: raw.StrengthDescription,
  };
}

/**
 * Transforms raw component data
 */
function transformComponent(raw: RawAmpComponentData, language: string): MedicationComponent {
  return {
    sequenceNr: raw['@_SequenceNr'] || 0,
    pharmaceuticalForm: raw.PharmaceuticalForm
      ? {
          code: raw.PharmaceuticalForm['@_Code'] || '',
          name: extractText(getTextArray(raw.PharmaceuticalForm.Name), language),
        }
      : undefined,
    routeOfAdministration: raw.RouteOfAdministration
      ? {
          code: raw.RouteOfAdministration['@_Code'] || '',
          name: extractText(getTextArray(raw.RouteOfAdministration.Name), language),
        }
      : undefined,
    ingredients: (raw.RealActualIngredient || [])
      .map((ing) => transformIngredient(ing, language))
      .filter((ing): ing is Ingredient => ing !== null),
  };
}

/**
 * Transforms raw CNK/DMPP data
 */
function transformCnkCode(raw: RawDmppData): CnkCode | null {
  if (!raw) return null;

  return {
    code: String(raw['@_Code'] || ''),
    deliveryEnvironment: (raw['@_DeliveryEnvironment'] as 'P' | 'H') || 'P',
    price: raw.Price,
    cheap: raw.Cheap || false,
    cheapest: raw.Cheapest || false,
    reimbursable: raw.Reimbursable || false,
  };
}

/**
 * Transforms raw package (AMPP) data
 */
function transformPackage(raw: RawAmppData, language: string): MedicationPackage {
  // Extract document links with language info
  const leafletData = extractTextWithLang(getTextArray(raw.LeafletUrl), language);
  const spcData = extractTextWithLang(getTextArray(raw.SpcUrl), language);

  // Extract ALL document links in all languages
  const allLeafletData = extractAllTextsWithLang(getTextArray(raw.LeafletUrl));
  const allSpcData = extractAllTextsWithLang(getTextArray(raw.SpcUrl));

  return {
    ctiExtended: raw['@_CtiExtended'],
    name: extractText(getTextArray(raw.PrescriptionName), language),
    authorisationNr: raw.AuthorisationNr,
    orphan: raw.Orphan || false,
    // Keep legacy fields for backward compatibility
    leafletUrl: leafletData.text || undefined,
    spcUrl: spcData.text || undefined,
    // Best match for requested language
    leaflet: leafletData.text ? { url: leafletData.text, language: leafletData.language } : undefined,
    spc: spcData.text ? { url: spcData.text, language: spcData.language } : undefined,
    // All available documents in all languages
    allLeaflets: allLeafletData.length > 0 ? allLeafletData.map(d => ({ url: d.text, language: d.language })) : undefined,
    allSpcs: allSpcData.length > 0 ? allSpcData.map(d => ({ url: d.text, language: d.language })) : undefined,
    packDisplayValue: raw.PackDisplayValue,
    status: raw.Status,
    exFactoryPrice: raw.ExFactoryPrice,
    atcCode: raw.Atc?.[0]?.['@_Code'],
    cnkCodes: (raw.Dmpp || [])
      .map((dmpp) => transformCnkCode(dmpp))
      .filter((cnk): cnk is CnkCode => cnk !== null),
  };
}

/**
 * Transforms raw AMP data to Medication type
 */
function transformAmp(raw: RawAmpData, language: string): Medication {
  const nameResult = extractTextWithLang(getTextArray(raw.Name), language);
  const allNames = extractAllTextVersions(getTextArray(raw.Name));

  return {
    ampCode: raw['@_Code'] || '',
    name: nameResult.text,
    nameLanguage: nameResult.language !== language ? nameResult.language : undefined,
    allNames: allNames.length > 0 ? allNames : undefined,
    abbreviatedName: extractText(getTextArray(raw.AbbreviatedName), language) || undefined,
    officialName: raw.OfficialName,
    companyActorNr: raw.CompanyActorNr,
    blackTriangle: raw.BlackTriangle || false,
    medicineType: raw.MedicineType,
    status: 'AUTHORIZED', // Default status
    vmpCode: raw['@_VmpCode'],
    packages: (raw.Ampp || []).map((ampp) => transformPackage(ampp, language)),
    components: (raw.AmpComponent || []).map((comp) => transformComponent(comp, language)),
  };
}

/**
 * Transforms AMP to search result (lightweight)
 */
function transformToSearchResult(medication: Medication): MedicationSearchResult {
  // Get primary CNK and price from first package
  const firstPackage = medication.packages[0];
  const firstCnk = firstPackage?.cnkCodes.find((c) => c.deliveryEnvironment === 'P');

  return {
    ampCode: medication.ampCode,
    name: medication.name,
    nameLanguage: medication.nameLanguage,
    allNames: medication.allNames,
    companyActorNr: medication.companyActorNr,
    cnk: firstCnk?.code,
    price: firstCnk?.price,
    isReimbursed: firstCnk?.reimbursable || false,
    status: medication.status,
    packDisplayValue: firstPackage?.packDisplayValue,
  };
}

export interface SearchAmpParams {
  query?: string;
  cnk?: string;
  ampCode?: string;
  ingredient?: string;
  vmpCode?: string;
  companyActorNr?: string;
  language?: string;
}

/**
 * Searches for medications (AMPs)
 * Note: SAM API expects companyActorNr as 5-digit zero-padded string (e.g., "01995")
 */
export async function searchAmp(params: SearchAmpParams): Promise<ApiResponse<MedicationSearchResult[]>> {
  const language = params.language || 'en';

  try {
    // Zero-pad companyActorNr to 5 digits if provided (SAM API format)
    const paddedCompanyActorNr = params.companyActorNr?.padStart(5, '0');

    const soapXml = buildFindAmpRequest({
      anyNamePart: params.query,
      cnk: params.cnk,
      ampCode: params.ampCode,
      ingredient: params.ingredient,
      vmpCode: params.vmpCode,
      companyActorNr: paddedCompanyActorNr,
      language,
    });

    // Company-only searches can return very large responses (16MB+) causing timeouts
    // Use a shorter timeout to fail fast and prompt user to add filters
    const isCompanyOnlySearch = paddedCompanyActorNr &&
      !params.query && !params.cnk && !params.ampCode && !params.ingredient && !params.vmpCode;

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'medications',
      ...(isCompanyOnlySearch && { timeout: 6000 }), // 6s for company-only, default (30s) otherwise
    });
    const parsed = parseFindAmpResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const medications = parsed.data.map((raw) => transformAmp(raw, language));
    const results = medications.map(transformToSearchResult);

    return {
      success: true,
      data: results,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: results.length,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Request failed';
    const isTimeout = errorMessage.toLowerCase().includes('timeout');
    const isCompanyOnlySearch = params.companyActorNr &&
      !params.query && !params.cnk && !params.ampCode && !params.ingredient && !params.vmpCode;

    // Company-only searches can timeout due to large response sizes (16MB+ for some companies)
    if (isTimeout && isCompanyOnlySearch) {
      return {
        success: false,
        error: {
          code: 'COMPANY_TOO_LARGE',
          message: 'This company has too many products to load at once. Please add a search term to narrow the results.',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: errorMessage,
      },
    };
  }
}

/**
 * Gets detailed medication information by CNK or AMP code
 */
export async function getAmpDetail(
  id: string,
  language = 'en'
): Promise<ApiResponse<Medication>> {
  try {
    // Normalize CNK codes (pad with leading zeros to 7 digits)
    const normalizedId = normalizeCnk(id);

    // Determine if it's a CNK (numeric) or AMP code (SAM prefix)
    const isCnk = /^\d{7}$/.test(normalizedId);
    const isAmpCode = normalizedId.startsWith('SAM');

    const soapXml = buildFindAmpRequest({
      cnk: isCnk ? normalizedId : undefined,
      ampCode: isAmpCode ? normalizedId : undefined,
      anyNamePart: !isCnk && !isAmpCode ? normalizedId : undefined,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'medications',
    });
    const parsed = parseFindAmpResponse(response);

    if (!parsed.success || !parsed.data || parsed.data.length === 0) {
      return {
        success: false,
        error: parsed.error || { code: 'NOT_FOUND', message: 'Medication not found' },
      };
    }

    // If searching by CNK, find the specific AMP that has this CNK
    let amp = parsed.data[0];
    if (isCnk && parsed.data.length > 1) {
      const found = parsed.data.find((a) =>
        a.Ampp?.some((ampp) =>
          ampp.Dmpp?.some((dmpp) => dmpp['@_Code'] === normalizedId)
        )
      );
      if (found) amp = found;
    }

    return {
      success: true,
      data: transformAmp(amp, language),
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
 * Gets medications by VMP code (find all brands of a generic)
 */
export async function getAmpsByVmp(
  vmpCode: string,
  language = 'en'
): Promise<ApiResponse<MedicationSearchResult[]>> {
  return searchAmp({ vmpCode, language });
}
