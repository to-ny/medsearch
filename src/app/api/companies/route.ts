import { NextRequest, NextResponse } from 'next/server';
import { searchCompany, getCompanyByActorNr } from '@/lib/services/company';
import { createCacheHeaders } from '@/lib/cache';
import type { CompanySearchResponse, Company, ErrorResponse } from '@/lib/types';

// Company data: 24 hour revalidation (see CACHE_CONFIG.companies)
export const revalidate = 86400;

/**
 * GET /api/companies
 * Search for pharmaceutical companies or get a specific company by actor number
 */
export async function GET(request: NextRequest): Promise<NextResponse<CompanySearchResponse | Company | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  const query = searchParams.get('query');
  const actorNr = searchParams.get('actorNr');
  const language = (searchParams.get('lang') as 'en' | 'nl' | 'fr' | 'de') || 'en';

  // If actorNr is provided, return single company
  if (actorNr) {
    // Validate actor number format (5 digits)
    if (!/^\d{5}$/.test(actorNr)) {
      return NextResponse.json(
        { code: 'INVALID_ACTOR_NR', message: 'Actor number must be a 5-digit code' },
        { status: 400 }
      );
    }

    try {
      const result = await getCompanyByActorNr(actorNr, language);

      if (!result.success || !result.data) {
        return NextResponse.json(
          { code: result.error?.code || 'NOT_FOUND', message: result.error?.message || 'Company not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.data, {
        headers: createCacheHeaders('companies'),
      });
    } catch (error) {
      console.error('Company lookup error:', error);
      return NextResponse.json(
        { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  // Otherwise search by name
  if (!query) {
    return NextResponse.json(
      { code: 'MISSING_PARAMS', message: 'Either query or actorNr parameter is required' },
      { status: 400 }
    );
  }

  if (query.length < 3) {
    return NextResponse.json(
      { code: 'QUERY_TOO_SHORT', message: 'Search query must be at least 3 characters' },
      { status: 400 }
    );
  }

  try {
    const result = await searchCompany({ query, language });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { code: result.error?.code || 'UNKNOWN', message: result.error?.message || 'Search failed' },
        { status: 500 }
      );
    }

    const response: CompanySearchResponse = {
      companies: result.data,
      totalCount: result.data.length,
    };

    return NextResponse.json(response, {
      headers: createCacheHeaders('companies'),
    });
  } catch (error) {
    console.error('Company search error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
