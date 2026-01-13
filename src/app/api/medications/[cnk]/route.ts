import { NextRequest, NextResponse } from 'next/server';
import { getAmpDetail, getAmpsByVmp } from '@/lib/services/amp';
import { getVmpDetail, getEquivalentMedications } from '@/lib/services/vmp';
import { getReimbursementByCnk } from '@/lib/services/reimbursement';
import { createCacheHeaders } from '@/lib/cache';
import { normalizeCnk } from '@/lib/utils/format';
import type { MedicationDetailResponse, ErrorResponse } from '@/lib/types';

// Medication data: 24 hour revalidation (REVALIDATE_TIMES.CORE_DATA)
export const revalidate = 86400;

interface RouteParams {
  params: Promise<{ cnk: string }>;
}

/**
 * GET /api/medications/[cnk]
 * Get detailed medication information by CNK or AMP code
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MedicationDetailResponse | ErrorResponse>> {
  const { cnk: rawId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const language = (searchParams.get('lang') as 'en' | 'nl' | 'fr' | 'de') || 'en';
  const includeReimbursement = searchParams.get('reimbursement') !== 'false';
  const includeEquivalents = searchParams.get('equivalents') !== 'false';

  // Normalize CNK codes (pad with leading zeros to 7 digits)
  const id = normalizeCnk(rawId);

  // Validate ID format
  const isCnk = /^\d{7}$/.test(id);
  const isAmpCode = /^SAM\d{6}-\d{2}$/.test(id);

  if (!isCnk && !isAmpCode) {
    return NextResponse.json(
      { code: 'INVALID_ID', message: 'ID must be a 7-digit CNK code or SAM AMP code (e.g., SAM123456-01)' },
      { status: 400 }
    );
  }

  try {
    // Get medication detail
    const medicationResult = await getAmpDetail(id, language);

    if (!medicationResult.success || !medicationResult.data) {
      return NextResponse.json(
        { code: medicationResult.error?.code || 'NOT_FOUND', message: medicationResult.error?.message || 'Medication not found' },
        { status: 404 }
      );
    }

    const medication = medicationResult.data;
    const response: MedicationDetailResponse = { medication };

    // Get reimbursement info if requested
    if (includeReimbursement) {
      // Find the first public CNK code
      const publicCnk = medication.packages
        .flatMap((p) => p.cnkCodes)
        .find((c) => c.deliveryEnvironment === 'P');

      if (publicCnk) {
        const reimbursementResult = await getReimbursementByCnk(publicCnk.code, language);
        if (reimbursementResult.success && reimbursementResult.data) {
          response.reimbursement = reimbursementResult.data;
        }
      }
    }

    // Get equivalents if requested and medication has a VMP code
    if (includeEquivalents && medication.vmpCode) {
      const vmpCode = String(medication.vmpCode);

      // Fetch VMP details and therapeutic alternatives in parallel
      const [vmpResult, equivalentsResult, therapeuticResult] = await Promise.all([
        getVmpDetail(vmpCode, language),
        getAmpsByVmp(vmpCode, language),
        getEquivalentMedications(vmpCode, language),
      ]);

      if (vmpResult.success && vmpResult.data) {
        response.genericProduct = vmpResult.data;
      }

      if (equivalentsResult.success && equivalentsResult.data) {
        // Filter out the current medication and sort by price
        response.equivalents = equivalentsResult.data
          .filter((eq) => eq.ampCode !== medication.ampCode)
          .sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
      }

      // Add therapeutic alternatives (VMP Group equivalents)
      if (therapeuticResult.success && therapeuticResult.data) {
        response.therapeuticAlternatives = therapeuticResult.data;
      }
    }

    return NextResponse.json(response, {
      headers: createCacheHeaders('medications'),
    });
  } catch (error) {
    console.error('Medication detail error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
