/**
 * Cache Header Utilities
 *
 * Provides functions for generating consistent Cache-Control headers
 * optimized for Vercel's CDN and data caching.
 */

import { CACHE_CONFIG, type CacheConfigKey } from './config';

/**
 * Options for generating cache headers
 */
interface CacheHeaderOptions {
  /** Whether the response is public (cacheable by CDN) */
  isPublic?: boolean;
  /** Whether to add stale-while-revalidate */
  allowStale?: boolean;
  /** Custom cache tags for targeted invalidation */
  tags?: string[];
}

/**
 * Generates Cache-Control header value for a given data type
 */
export function getCacheControlHeader(
  dataType: CacheConfigKey,
  options: CacheHeaderOptions = {}
): string {
  const config = CACHE_CONFIG[dataType];
  const { isPublic = true, allowStale = true } = options;

  const parts: string[] = [];

  if (isPublic) {
    parts.push('public');
  }

  // s-maxage for CDN caching (Vercel)
  parts.push(`s-maxage=${config.sMaxAge}`);

  // stale-while-revalidate for better UX
  if (allowStale) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  return parts.join(', ');
}

/**
 * Creates headers object with Cache-Control for API responses
 */
export function createCacheHeaders(
  dataType: CacheConfigKey,
  options: CacheHeaderOptions = {}
): HeadersInit {
  const headers: HeadersInit = {
    'Cache-Control': getCacheControlHeader(dataType, options),
  };

  // Add cache tags if provided (for Vercel cache invalidation)
  if (options.tags && options.tags.length > 0) {
    headers['x-vercel-cache-tags'] = options.tags.join(',');
  }

  return headers;
}

/**
 * Gets the revalidate value for Next.js route segment config
 * Use this with `export const revalidate = getRevalidateValue('medications');`
 */
export function getRevalidateValue(dataType: CacheConfigKey): number {
  return CACHE_CONFIG[dataType].revalidate;
}

/**
 * Gets the client-side stale time for React Query
 */
export function getClientStaleTime(dataType: CacheConfigKey): number {
  return CACHE_CONFIG[dataType].clientStaleTime;
}
