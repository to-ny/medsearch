/**
 * Cache Module
 *
 * Centralized caching utilities for the medication search application.
 * Designed for Vercel deployment with Next.js Data Cache.
 *
 * ## Usage
 *
 * ### API Routes
 * ```ts
 * import { createCacheHeaders, REVALIDATE_TIMES } from '@/lib/cache';
 *
 * // Static revalidate (required by Next.js - must be literal value)
 * export const revalidate = 604800; // REVALIDATE_TIMES.REFERENCE_DATA
 *
 * export async function GET() {
 *   const data = await fetchData();
 *   return NextResponse.json(data, {
 *     headers: createCacheHeaders('medications'),
 *   });
 * }
 * ```
 *
 * ### Services (SOAP client)
 * ```ts
 * import { createFetchCacheOptions } from '@/lib/cache';
 *
 * const cacheOptions = createFetchCacheOptions({ cacheType: 'medications' });
 * const response = await fetch(url, { ...options, ...cacheOptions });
 * ```
 *
 * ### React Query Hooks
 * ```ts
 * import { getClientStaleTime } from '@/lib/cache';
 *
 * useQuery({
 *   queryKey: ['medications'],
 *   queryFn: fetchMedications,
 *   staleTime: getClientStaleTime('medications'),
 * });
 * ```
 */

export {
  CACHE_DURATIONS,
  CACHE_CONFIG,
  REVALIDATE_TIMES,
  type CacheConfigKey,
} from './config';

export {
  getCacheControlHeader,
  createCacheHeaders,
  getClientStaleTime,
  getServerCacheDuration,
} from './headers';

export {
  createFetchCacheOptions,
  type FetchCacheOptions,
} from './fetch';
