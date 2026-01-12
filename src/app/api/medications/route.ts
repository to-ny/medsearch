import { NextRequest, NextResponse } from 'next/server';
import { searchAmp } from '@/lib/services/amp';
import { createCacheHeaders } from '@/lib/cache';
import type { MedicationSearchParams, MedicationSearchResponse, ErrorResponse } from '@/lib/types';

// Medication data: 24 hour revalidation (REVALIDATE_TIMES.CORE_DATA)
export const revalidate = 86400;

/**
 * GET /api/medications
 * Search for medications by name, CNK, ingredient, or other criteria
 */
export async function GET(request: NextRequest): Promise<NextResponse<MedicationSearchResponse | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');

  const params: MedicationSearchParams = {
    query: searchParams.get('query') || undefined,
    cnk: searchParams.get('cnk') || undefined,
    ingredient: searchParams.get('ingredient') || undefined,
    companyActorNr: searchParams.get('company') || undefined,
    language: (searchParams.get('lang') as MedicationSearchParams['language']) || 'en',
    limit: rawLimit ? Math.min(Math.max(1, parseInt(rawLimit, 10) || 50), 100) : 50,
    offset: rawOffset ? Math.max(0, parseInt(rawOffset, 10) || 0) : 0,
  };

  // Validate: at least one search criterion required
  if (!params.query && !params.cnk && !params.ingredient && !params.companyActorNr) {
    return NextResponse.json(
      { code: 'MISSING_PARAMS', message: 'At least one search parameter required (query, cnk, ingredient, or company)' },
      { status: 400 }
    );
  }

  // Validate minimum query length
  if (params.query && params.query.length < 3) {
    return NextResponse.json(
      { code: 'QUERY_TOO_SHORT', message: 'Search query must be at least 3 characters' },
      { status: 400 }
    );
  }

  // Validate company actor number format (1-5 digits)
  if (params.companyActorNr && !/^\d{1,5}$/.test(params.companyActorNr)) {
    return NextResponse.json(
      { code: 'INVALID_COMPANY', message: 'Company actor number must be 1-5 digits' },
      { status: 400 }
    );
  }

  // Reject unsupported filter combination: ingredient + company
  // SAM API does not support combining FindByIngredient with FindByCompany
  if (params.ingredient && params.companyActorNr) {
    return NextResponse.json(
      { code: 'UNSUPPORTED_COMBINATION', message: 'Ingredient search cannot be combined with company filter. Please use name search to filter by company.' },
      { status: 422 }
    );
  }

  try {
    const result = await searchAmp({
      query: params.query,
      cnk: params.cnk,
      ingredient: params.ingredient,
      companyActorNr: params.companyActorNr,
      language: params.language,
    });

    if (!result.success || !result.data) {
      const errorCode = result.error?.code || 'UNKNOWN';
      // COMPANY_TOO_LARGE is a user guidance issue, not a server error
      const status = errorCode === 'COMPANY_TOO_LARGE' ? 422 : 500;
      return NextResponse.json(
        { code: errorCode, message: result.error?.message || 'Search failed' },
        { status }
      );
    }

    // Apply pagination
    const total = result.data.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;
    const paginatedResults = result.data.slice(offset, offset + limit);

    const response: MedicationSearchResponse = {
      results: paginatedResults,
      totalCount: total,
      hasMore: offset + limit < total,
    };

    return NextResponse.json(response, {
      headers: createCacheHeaders('medications'),
    });
  } catch (error) {
    console.error('Medication search error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
