import { NextRequest, NextResponse } from 'next/server';
import { getLegislationByCnk, getLegislationByPath } from '@/lib/services/legislation';
import { createCacheHeaders } from '@/lib/cache';
import type { LegalBasis, ErrorResponse } from '@/lib/types';

// Legislation data: 7 day revalidation (REVALIDATE_TIMES.REFERENCE_DATA)
export const revalidate = 604800;

interface LegislationResponse {
  legalBases: LegalBasis[];
}

/**
 * GET /api/legislation
 * Get legislation (legal basis) for reimbursement rules
 *
 * Query parameters:
 * - cnk: 7-digit CNK code to get legislation for a specific medication
 * - path: Legal reference path (e.g., "RD20180201-IV-10680000")
 * - lang: Language preference (en, nl, fr, de) - note: legal texts only exist in FR/NL/DE
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<LegislationResponse | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  const cnk = searchParams.get('cnk');
  const path = searchParams.get('path');
  const language = (searchParams.get('lang') as 'en' | 'nl' | 'fr' | 'de') || 'en';

  if (!cnk && !path) {
    return NextResponse.json(
      { code: 'MISSING_PARAMS', message: 'Either cnk or path parameter is required' },
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
      ? await getLegislationByCnk(cnk, language)
      : await getLegislationByPath(path!, language);

    if (!result.success) {
      return NextResponse.json(
        {
          code: result.error?.code || 'INTERNAL_ERROR',
          message: result.error?.message || 'Failed to fetch legislation',
        },
        { status: 500 }
      );
    }

    // Empty result is valid - medication may not have legislation
    const response: LegislationResponse = {
      legalBases: result.data || [],
    };

    return NextResponse.json(response, {
      headers: createCacheHeaders('legislation'),
    });
  } catch (error) {
    console.error('Legislation lookup error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
