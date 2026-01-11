/**
 * Cached Fetch Utilities
 *
 * Provides fetch wrappers that leverage Next.js Data Cache
 * for Vercel deployment optimization.
 */

import { CACHE_CONFIG, type CacheConfigKey } from './config';

/**
 * Options for cached fetch
 */
export interface CachedFetchOptions extends RequestInit {
  /** Data type for cache configuration */
  cacheType?: CacheConfigKey;
  /** Custom revalidate time in seconds (overrides cacheType) */
  revalidate?: number;
  /** Cache tags for targeted invalidation */
  tags?: string[];
  /** Force no caching */
  noCache?: boolean;
}

/**
 * Creates Next.js cache options for fetch
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/fetch
 */
export function createFetchCacheOptions(
  options: CachedFetchOptions = {}
): { next?: { revalidate?: number; tags?: string[] }; cache?: RequestCache } {
  const { cacheType, revalidate, tags, noCache } = options;

  if (noCache) {
    return { cache: 'no-store' };
  }

  const nextOptions: { revalidate?: number; tags?: string[] } = {};

  // Determine revalidate time
  if (revalidate !== undefined) {
    nextOptions.revalidate = revalidate;
  } else if (cacheType) {
    nextOptions.revalidate = CACHE_CONFIG[cacheType].revalidate;
  }

  // Add cache tags
  if (tags && tags.length > 0) {
    nextOptions.tags = tags;
  }

  return { next: nextOptions };
}

/**
 * Wrapper around fetch that applies Next.js caching options
 *
 * @example
 * ```ts
 * // Use predefined cache config
 * const response = await cachedFetch(url, {
 *   cacheType: 'medications',
 * });
 *
 * // Use custom revalidate time
 * const response = await cachedFetch(url, {
 *   revalidate: 3600,
 *   tags: ['medication-123'],
 * });
 * ```
 */
export async function cachedFetch(
  url: string | URL,
  options: CachedFetchOptions = {}
): Promise<Response> {
  const { cacheType, revalidate, tags, noCache, ...fetchOptions } = options;
  const cacheOptions = createFetchCacheOptions({ cacheType, revalidate, tags, noCache });

  return fetch(url, {
    ...fetchOptions,
    ...cacheOptions,
  });
}
