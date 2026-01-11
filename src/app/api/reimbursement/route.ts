import { NextRequest, NextResponse } from 'next/server';
import { getReimbursementByCnk, getReimbursementByAmpp, calculatePatientCost } from '@/lib/services/reimbursement';
import { createCacheHeaders } from '@/lib/cache';
import type { Reimbursement, ErrorResponse } from '@/lib/types';

// Reimbursement data: 7 day revalidation (see CACHE_CONFIG.reimbursement)
export const revalidate = 604800;

interface ReimbursementResponse {
  reimbursements: Reimbursement[];
  patientCost?: number;
}

/**
 * GET /api/reimbursement
 * Get reimbursement information for a CNK or AMPP code
 */
export async function GET(request: NextRequest): Promise<NextResponse<ReimbursementResponse | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  const cnk = searchParams.get('cnk');
  const ampp = searchParams.get('ampp');
  const rawPrice = searchParams.get('price');
  const parsedPrice = rawPrice ? parseFloat(rawPrice) : undefined;
  const price = parsedPrice !== undefined && !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : undefined;
  const language = (searchParams.get('lang') as 'en' | 'nl' | 'fr' | 'de') || 'en';

  if (!cnk && !ampp) {
    return NextResponse.json(
      { code: 'MISSING_PARAMS', message: 'Either cnk or ampp parameter is required' },
      { status: 400 }
    );
  }

  // Validate CNK format
  if (cnk && !/^\d{7}$/.test(cnk)) {
    return NextResponse.json(
      { code: 'INVALID_CNK', message: 'CNK must be a 7-digit code' },
      { status: 400 }
    );
  }

  try {
    const result = cnk
      ? await getReimbursementByCnk(cnk, language)
      : await getReimbursementByAmpp(ampp!, language);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { code: result.error?.code || 'NOT_FOUND', message: result.error?.message || 'Reimbursement info not found' },
        { status: 404 }
      );
    }

    const response: ReimbursementResponse = {
      reimbursements: result.data,
    };

    // Calculate patient cost if price is provided
    if (price !== undefined && result.data.length > 0) {
      response.patientCost = calculatePatientCost(price, result.data[0]);
    }

    return NextResponse.json(response, {
      headers: createCacheHeaders('reimbursement'),
    });
  } catch (error) {
    console.error('Reimbursement lookup error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
