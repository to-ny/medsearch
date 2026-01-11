import { NextRequest, NextResponse } from 'next/server';
import { searchAtc } from '@/lib/services/atc';
import { createCacheHeaders } from '@/lib/cache';
import type { AtcSearchResponse, ErrorResponse } from '@/lib/types';

// ATC classifications: 7 day revalidation (see CACHE_CONFIG.atc)
export const revalidate = 604800;

/**
 * GET /api/atc
 * Get ATC classifications
 *
 * Query parameters:
 * - code: ATC code to fetch (optional, returns top-level if not provided)
 * - query: Search by name (optional)
 * - lang: Language (en, nl, fr, de)
 */
export async function GET(request: NextRequest): Promise<NextResponse<AtcSearchResponse | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get('code') || undefined;
  const query = searchParams.get('query') || undefined;
  const language = (searchParams.get('lang') as 'en' | 'nl' | 'fr' | 'de') || 'en';

  // Validate code format if provided
  if (code && !/^[A-Z][0-9A-Z]*$/i.test(code)) {
    return NextResponse.json(
      { code: 'INVALID_CODE', message: 'Invalid ATC code format' },
      { status: 400 }
    );
  }

  // Validate query length if provided
  if (query && query.length < 2) {
    return NextResponse.json(
      { code: 'QUERY_TOO_SHORT', message: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    const result = await searchAtc({
      code,
      query,
      language,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { code: result.error?.code || 'UNKNOWN', message: result.error?.message || 'Search failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data, {
      headers: createCacheHeaders('atc'),
    });
  } catch (error) {
    console.error('ATC search error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
