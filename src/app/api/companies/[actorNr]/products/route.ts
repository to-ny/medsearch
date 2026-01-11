import { NextRequest, NextResponse } from 'next/server';
import { getCompanyProducts } from '@/lib/services/company';
import { createCacheHeaders } from '@/lib/cache';
import type { MedicationSearchResponse, ErrorResponse } from '@/lib/types';

// Company products: 24 hour revalidation (REVALIDATE_TIMES.CORE_DATA)
export const revalidate = 86400;

/**
 * GET /api/companies/[actorNr]/products
 * Get all medications manufactured by a company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actorNr: string }> }
): Promise<NextResponse<MedicationSearchResponse | ErrorResponse>> {
  const { actorNr } = await params;
  const searchParams = request.nextUrl.searchParams;
  const language = (searchParams.get('lang') as 'en' | 'nl' | 'fr' | 'de') || 'en';
  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');

  // Validate actor number format (1-5 digits, will be zero-padded to 5)
  if (!/^\d{1,5}$/.test(actorNr)) {
    return NextResponse.json(
      { code: 'INVALID_ACTOR_NR', message: 'Actor number must be a numeric code (1-5 digits)' },
      { status: 400 }
    );
  }

  const limit = rawLimit ? Math.min(Math.max(1, parseInt(rawLimit, 10) || 50), 100) : 50;
  const offset = rawOffset ? Math.max(0, parseInt(rawOffset, 10) || 0) : 0;

  try {
    const result = await getCompanyProducts({
      companyActorNr: actorNr,
      language,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { code: result.error?.code || 'UNKNOWN', message: result.error?.message || 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // Apply pagination
    const total = result.data.length;
    const paginatedResults = result.data.slice(offset, offset + limit);

    const response: MedicationSearchResponse = {
      results: paginatedResults,
      totalCount: total,
      hasMore: offset + limit < total,
    };

    return NextResponse.json(response, {
      headers: createCacheHeaders('companyProducts'),
    });
  } catch (error) {
    console.error('Company products lookup error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
