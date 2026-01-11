/**
 * Cache Module
 *
 * Centralized caching utilities for the medication search application.
 * Designed for Vercel deployment with Next.js Data Cache.
 *
 * @example
 * ```ts
 * // In API routes - use cache headers
 * import { createCacheHeaders, CACHE_CONFIG } from '@/lib/cache';
 *
 * export const revalidate = CACHE_CONFIG.medications.revalidate;
 *
 * export async function GET() {
 *   const data = await fetchData();
 *   return NextResponse.json(data, {
 *     headers: createCacheHeaders('medications'),
 *   });
 * }
 * ```
 *
 * @example
 * ```ts
 * // In services - use cached fetch
 * import { cachedFetch, CACHE_CONFIG } from '@/lib/cache';
 *
 * const response = await cachedFetch(url, {
 *   cacheType: 'medications',
 * });
 * ```
 *
 * @example
 * ```ts
 * // In React Query hooks - use client stale time
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
  type CacheConfigKey,
} from './config';

export {
  getCacheControlHeader,
  createCacheHeaders,
  getRevalidateValue,
  getClientStaleTime,
} from './headers';

export {
  cachedFetch,
  createFetchCacheOptions,
  type CachedFetchOptions,
} from './fetch';
