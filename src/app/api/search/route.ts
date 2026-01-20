import { NextRequest, NextResponse } from 'next/server';
import { executeSearch, type SearchFilters } from '@/server/queries/search';
import { createAPIError } from '@/server/types/api';
import { isValidEntityType, isValidLanguage, type EntityType, type Language } from '@/server/types/domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting
// In production, consider using Redis or a dedicated rate limiting service
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window per IP

function getRateLimitKey(request: NextRequest): string {
  // Use forwarded IP if behind proxy, otherwise use connection IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Clean up expired entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) rateLimitMap.delete(k);
    }
  }

  if (!record || record.resetTime < now) {
    // New window
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetTime - now };
}

export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = checkRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      createAPIError('RATE_LIMITED', 'Too many requests. Please try again later.'),
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
        },
      }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse relationship filter parameters
    const vtmCode = searchParams.get('vtm') || undefined;
    const vmpCode = searchParams.get('vmp') || undefined;
    const ampCode = searchParams.get('amp') || undefined;
    const atcCode = searchParams.get('atc') || undefined;
    const companyCode = searchParams.get('company') || undefined;
    const vmpGroupCode = searchParams.get('vmpGroup') || undefined;
    const substanceCode = searchParams.get('substance') || undefined;

    // Parse boolean filter parameters
    const reimbursableParam = searchParams.get('reimbursable');
    const reimbursable = reimbursableParam === 'true' ? true : undefined;
    const blackTriangleParam = searchParams.get('blackTriangle');
    const blackTriangle = blackTriangleParam === 'true' ? true : undefined;

    // Parse Phase B extended filter parameters
    const formParam = searchParams.get('form');
    const formCodes = formParam ? formParam.split(',').map(c => c.trim()).filter(Boolean) : undefined;
    const routeParam = searchParams.get('route');
    const routeCodes = routeParam ? routeParam.split(',').map(c => c.trim()).filter(Boolean) : undefined;
    const reimbCatParam = searchParams.get('reimbCategory');
    const reimbursementCategories = reimbCatParam ? reimbCatParam.split(',').map(c => c.trim()).filter(Boolean) : undefined;
    const priceMinParam = searchParams.get('priceMin');
    const priceMin = priceMinParam ? parseFloat(priceMinParam) : undefined;
    const priceMaxParam = searchParams.get('priceMax');
    const priceMax = priceMaxParam ? parseFloat(priceMaxParam) : undefined;

    const hasBasicFilters = vtmCode || vmpCode || ampCode || atcCode || companyCode || vmpGroupCode || substanceCode || reimbursable !== undefined || blackTriangle !== undefined;
    const hasExtendedFilters = (formCodes && formCodes.length > 0) || (routeCodes && routeCodes.length > 0) || (reimbursementCategories && reimbursementCategories.length > 0) || priceMin !== undefined || priceMax !== undefined;
    const hasFilters = hasBasicFilters || hasExtendedFilters;
    const filters: SearchFilters | undefined = hasFilters
      ? { vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode, substanceCode, reimbursable, blackTriangle, formCodes, routeCodes, reimbursementCategories, priceMin, priceMax }
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

    return NextResponse.json(results, {
      headers: {
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      createAPIError('SERVER_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
