/**
 * Reimbursement service
 * Handles reimbursement information and pricing
 */

import { soapRequest } from '@/lib/soap/client';
import { buildFindReimbursementRequest } from '@/lib/soap/xml-builder';
import { parseFindReimbursementResponse, type RawReimbursementData } from '@/lib/soap/xml-parser';
import type { Reimbursement, Copayment, ApiResponse } from '@/lib/types';

interface RawCopayment {
  '@_Regimen'?: string;
  FeeAmount?: number;
  ReimbursementAmount?: number;
}

/**
 * Transforms raw copayment data
 */
function transformCopayment(raw: RawCopayment): Copayment | null {
  if (!raw) return null;

  return {
    regimen: raw['@_Regimen'] || 'UNKNOWN',
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
    criterion: raw.ReimbursementCriterion
      ? {
          category: raw.ReimbursementCriterion.Category || '',
          code: raw.ReimbursementCriterion.Code || '',
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

/**
 * Calculates patient out-of-pocket cost
 */
export function calculatePatientCost(
  price: number | undefined,
  reimbursement: Reimbursement | undefined,
  regimen: string = 'AMBULATORY'
): number | undefined {
  if (price === undefined) return undefined;
  if (!reimbursement) return price; // No reimbursement = patient pays full price

  const copayment = reimbursement.copayments.find(
    (c) => c.regimen === regimen || c.regimen === 'AMBULATORY'
  );

  if (copayment?.feeAmount !== undefined) {
    return copayment.feeAmount;
  }

  if (copayment?.reimbursementAmount !== undefined) {
    return Math.max(0, price - copayment.reimbursementAmount);
  }

  return price;
}

/**
 * Gets reimbursement category description
 */
export function getReimbursementCategoryDescription(category: string | undefined): string {
  if (!category) return 'Unknown';

  const categories: Record<string, string> = {
    A: 'Category A - Essential medications',
    B: 'Category B - Useful medications',
    C: 'Category C - Comfort medications',
    Cs: 'Category Cs - Comfort (special)',
    Cx: 'Category Cx - Exception category',
    D: 'Category D - Not reimbursed',
  };

  return categories[category] || `Category ${category}`;
}
