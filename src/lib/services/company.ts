/**
 * Company service
 * Handles pharmaceutical company data
 */

import { soapRequest } from '@/lib/soap/client';
import { buildFindCompanyRequest } from '@/lib/soap/xml-builder';
import { parseFindCompanyResponse, type RawCompanyData } from '@/lib/soap/xml-parser';
import type { Company, ApiResponse } from '@/lib/types';

/**
 * Transforms raw company data
 */
function transformCompany(raw: RawCompanyData): Company {
  return {
    actorNr: raw['@_ActorNr'] || '',
    name: raw.Denomination || '',
    legalForm: raw.LegalForm,
    vatNr: raw.VatNr
      ? {
          countryCode: raw.VatNr['@_CountryCode'] || '',
          number: String(raw.VatNr['#text'] || ''),
        }
      : undefined,
    address: {
      street: raw.StreetName,
      number: raw.StreetNum,
      postbox: raw.Postbox,
      postcode: raw.Postcode,
      city: raw.City,
      countryCode: raw.CountryCode,
    },
    phone: raw.Phone,
    language: raw.Language,
  };
}

export interface SearchCompanyParams {
  query?: string;
  actorNr?: string;
  vatNr?: string;
  language?: string;
}

/**
 * Searches for pharmaceutical companies
 * Note: SAM API expects actorNr as 5-digit zero-padded string (e.g., "01995")
 */
export async function searchCompany(params: SearchCompanyParams): Promise<ApiResponse<Company[]>> {
  const language = params.language || 'en';

  try {
    // Zero-pad actorNr to 5 digits if provided (SAM API format)
    const paddedActorNr = params.actorNr?.padStart(5, '0');

    const soapXml = buildFindCompanyRequest({
      anyNamePart: params.query,
      companyActorNr: paddedActorNr,
      vatNr: params.vatNr,
      language,
    });

    const response = await soapRequest('dics', soapXml);
    const parsed = parseFindCompanyResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const companies = parsed.data.map(transformCompany);

    return {
      success: true,
      data: companies,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: companies.length,
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
 * Gets a company by actor number
 * Note: SAM API expects actorNr as 5-digit zero-padded string (e.g., "01995")
 */
export async function getCompanyByActorNr(
  actorNr: string,
  language = 'en'
): Promise<ApiResponse<Company>> {
  try {
    // Zero-pad actorNr to 5 digits if needed (SAM API format)
    const paddedActorNr = actorNr.padStart(5, '0');

    const soapXml = buildFindCompanyRequest({
      companyActorNr: paddedActorNr,
      language,
    });

    const response = await soapRequest('dics', soapXml);
    const parsed = parseFindCompanyResponse(response);

    if (!parsed.success || !parsed.data || parsed.data.length === 0) {
      return {
        success: false,
        error: parsed.error || { code: 'NOT_FOUND', message: 'Company not found' },
      };
    }

    return {
      success: true,
      data: transformCompany(parsed.data[0]),
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
 * Gets all products (medications) manufactured by a company
 * Uses the FindAmp API with companyActorNr parameter
 */
export { searchAmp as getCompanyProducts } from './amp';
