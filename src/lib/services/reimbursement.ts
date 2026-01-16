/**
 * Reimbursement service
 * Handles reimbursement information and pricing
 */

import 'server-only';

import { soapRequest } from '@/lib/soap/client';
import { buildFindReimbursementRequest } from '@/lib/soap/xml-builder';
import { parseFindReimbursementResponse, type RawReimbursementData } from '@/lib/soap/xml-parser';
import type { Reimbursement, Copayment, ApiResponse } from '@/lib/types';

interface RawCopayment {
  '@_RegimeType'?: string;
  FeeAmount?: number;
  ReimbursementAmount?: number;
}

// Map RegimeType values to readable names
const REGIME_TYPE_MAP: Record<string, string> = {
  '1': 'PREFERENTIAL',
  '2': 'REGULAR',
};

/**
 * Transforms raw copayment data
 */
function transformCopayment(raw: RawCopayment): Copayment | null {
  if (!raw) return null;

  const regimeType = raw['@_RegimeType'];
  return {
    regimen: REGIME_TYPE_MAP[regimeType || ''] || regimeType || 'UNKNOWN',
    feeAmount: raw.FeeAmount,
    reimbursementAmount: raw.ReimbursementAmount,
  };
}

/**
 * Transforms raw reimbursement data
 */
function transformReimbursement(raw: RawReimbursementData): Reimbursement {
  return {
    cnk: raw['@_Code'] || '',
    deliveryEnvironment: (raw['@_DeliveryEnvironment'] as 'P' | 'H') || 'P',
    legalReferencePath: raw['@_LegalReferencePath'],
    criterion: raw.ReimbursementCriterion
      ? {
          category: raw.ReimbursementCriterion['@_Category'] || '',
          code: raw.ReimbursementCriterion['@_Code'] || '',
        }
      : undefined,
    copayments: (raw.Copayment || [])
      .map((c) => transformCopayment(c as RawCopayment))
      .filter((c): c is Copayment => c !== null),
    referenceBasePrice: raw.ReferenceBasePrice,
    reimbursementBasePrice: raw.ReimbursementBasePrice,
    referencePrice: raw.ReferencePrice,
  };
}

/**
 * Gets reimbursement information for a CNK code
 */
export async function getReimbursementByCnk(
  cnk: string,
  language = 'en'
): Promise<ApiResponse<Reimbursement[]>> {
  try {
    const soapXml = buildFindReimbursementRequest({
      cnk,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'reimbursement',
    });
    const parsed = parseFindReimbursementResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const reimbursements = parsed.data.map(transformReimbursement);

    return {
      success: true,
      data: reimbursements,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: reimbursements.length,
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
 * Gets reimbursement information for an AMPP code
 */
export async function getReimbursementByAmpp(
  amppCode: string,
  language = 'en'
): Promise<ApiResponse<Reimbursement[]>> {
  try {
    const soapXml = buildFindReimbursementRequest({
      amppCode,
      language,
    });

    const response = await soapRequest('dics', soapXml, {
      cacheType: 'reimbursement',
    });
    const parsed = parseFindReimbursementResponse(response);

    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        error: parsed.error || { code: 'UNKNOWN', message: 'Unknown error' },
      };
    }

    const reimbursements = parsed.data.map(transformReimbursement);

    return {
      success: true,
      data: reimbursements,
      meta: {
        searchDate: parsed.searchDate,
        samId: parsed.samId,
        totalResults: reimbursements.length,
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

// Re-export pure calculation functions from utils for backward compatibility
export { calculatePatientCost, getReimbursementCategoryDescription } from '@/lib/utils/price';
