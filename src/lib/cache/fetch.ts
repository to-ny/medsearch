/**
 * Next.js Data Cache Utilities
 *
 * Provides utilities for leveraging Next.js Data Cache
 * with external fetch calls (e.g., SOAP API).
 */

import { CACHE_CONFIG, type CacheConfigKey } from './config';

/**
 * Options for creating fetch cache options
 */
export interface FetchCacheOptions {
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
 * Creates Next.js cache options for fetch calls.
 *
 * Use this to add caching to external API calls (like SOAP requests).
 * The returned options should be spread into the fetch options.
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/fetch
 *
 * @example
 * ```ts
 * const cacheOptions = createFetchCacheOptions({ cacheType: 'medications' });
 * const response = await fetch(url, {
 *   method: 'POST',
 *   body: soapXml,
 *   ...cacheOptions,
 * });
 * ```
 */
export function createFetchCacheOptions(
  options: FetchCacheOptions = {}
): { next?: { revalidate?: number; tags?: string[] }; cache?: RequestCache } {
  const { cacheType, revalidate, tags, noCache } = options;

  if (noCache) {
    return { cache: 'no-store' };
  }

  const nextOptions: { revalidate?: number; tags?: string[] } = {};

  // Determine revalidate time from custom value or cache config
  if (revalidate !== undefined) {
    nextOptions.revalidate = revalidate;
  } else if (cacheType) {
    nextOptions.revalidate = CACHE_CONFIG[cacheType].serverCache;
  }

  // Add cache tags for targeted invalidation
  if (tags && tags.length > 0) {
    nextOptions.tags = tags;
  }

  return { next: nextOptions };
}
