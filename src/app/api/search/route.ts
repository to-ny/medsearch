import { NextRequest, NextResponse } from 'next/server';
import { executeSearch, type SearchFilters } from '@/server/queries/search';
import { createAPIError } from '@/server/types/api';
import { isValidEntityType, isValidLanguage, type EntityType, type Language } from '@/server/types/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse relationship filter parameters
    const vtmCode = searchParams.get('vtm') || undefined;
    const vmpCode = searchParams.get('vmp') || undefined;
    const ampCode = searchParams.get('amp') || undefined;
    const atcCode = searchParams.get('atc') || undefined;
    const companyCode = searchParams.get('company') || undefined;
    const vmpGroupCode = searchParams.get('vmpGroup') || undefined;

    const hasFilters = vtmCode || vmpCode || ampCode || atcCode || companyCode || vmpGroupCode;
    const filters: SearchFilters | undefined = hasFilters
      ? { vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode }
      : undefined;

    // Parse query parameter - allow empty if filters are present
    const query = searchParams.get('q') || '';
    if (!hasFilters && query.trim().length < 2) {
      return NextResponse.json(
        createAPIError('QUERY_TOO_SHORT', 'Search query must be at least 2 characters'),
        { status: 400 }
      );
    }

    // Parse language parameter
    const langParam = searchParams.get('lang');
    const lang: Language = isValidLanguage(langParam) ? langParam : 'en';

    // Parse types parameter
    const typesParam = searchParams.get('types');
    let types: EntityType[] | undefined;
    if (typesParam) {
      const typeList = typesParam.split(',').map((t) => t.trim());
      const invalidTypes = typeList.filter((t) => !isValidEntityType(t));
      if (invalidTypes.length > 0) {
        return NextResponse.json(
          createAPIError(
            'INVALID_PARAMS',
            `Invalid entity type: "${invalidTypes[0]}"`,
            { validTypes: ['vtm', 'vmp', 'amp', 'ampp', 'company', 'vmp_group', 'substance', 'atc'] }
          ),
          { status: 400 }
        );
      }
      types = typeList as EntityType[];
    }

    // Parse pagination parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100) : 20;
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

    // Execute search
    const results = await executeSearch(query.trim(), lang, types, limit, offset, filters);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      createAPIError('SERVER_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
