/**
 * Caching Configuration for Vercel Deployment
 *
 * This module defines a tiered caching strategy based on data volatility:
 *
 * - REFERENCE_DATA (7 days): Static data that rarely changes (companies, ATC, reimbursement)
 * - CORE_DATA (24h): Core medication data (search results, product details)
 *
 * SAM v2 API data update frequency:
 * - Medication database: Updated weekly/monthly
 * - Company data: Updated infrequently
 * - Reimbursement: Updated monthly (RIZIV/INAMI schedule)
 * - ATC classifications: Very stable (WHO standard)
 *
 * With stale-while-revalidate, users always get cached data instantly
 * while fresh data is fetched in the background. This means revalidation
 * is invisible to end users.
 *
 * ## Cache Layers
 *
 * 1. **Vercel Data Cache**: Caches external SOAP API responses (serverCache duration)
 * 2. **Vercel CDN**: Caches API route responses (serverCache + staleWhileRevalidate)
 * 3. **React Query**: Client-side cache (clientStaleTime)
 *
 * Client staleTime is intentionally shorter than server cache to allow
 * React Query to refetch in the background, picking up any server-side
 * cache updates without blocking the UI.
 */

/**
 * Cache duration constants in seconds
 */
export const CACHE_DURATIONS = {
  /** Reference/static data - 7 days */
  REFERENCE_DATA: 604800,

  /** Core medication data - 24 hours */
  CORE_DATA: 86400,

  /** Stale-while-revalidate period - 14 days */
  SWR_LONG: 1209600,

  /** Stale-while-revalidate period - 7 days */
  SWR_MEDIUM: 604800,
} as const;

/**
 * Static revalidate values for API route exports.
 *
 * Next.js requires static values for route segment config, so these
 * cannot be computed from CACHE_DURATIONS. Keep these in sync with
 * CACHE_DURATIONS manually.
 *
 * Usage in API routes:
 * ```ts
 * // Use the static value directly (required by Next.js)
 * export const revalidate = 604800; // REVALIDATE_TIMES.REFERENCE_DATA
 * ```
 */
export const REVALIDATE_TIMES = {
  /** 7 days in seconds - for companies, ATC, reimbursement */
  REFERENCE_DATA: 604800,
  /** 24 hours in seconds - for medications, company products */
  CORE_DATA: 86400,
} as const;

/**
 * Cache configuration for different data types
 */
export const CACHE_CONFIG = {
  /**
   * Company data - rarely changes
   * - Company details (name, address, VAT)
   * - Company search results
   */
  companies: {
    serverCache: CACHE_DURATIONS.REFERENCE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_LONG,
    clientStaleTime: 60 * 60 * 1000, // 1 hour - allows background refresh
  },

  /**
   * Reimbursement data - updated monthly
   * - Reimbursement categories and rates
   * - Copayment information
   */
  reimbursement: {
    serverCache: CACHE_DURATIONS.REFERENCE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_LONG,
    clientStaleTime: 60 * 60 * 1000, // 1 hour
  },

  /**
   * ATC classifications - very stable (WHO standard)
   * Longest cache duration as this data almost never changes
   */
  atc: {
    serverCache: CACHE_DURATIONS.REFERENCE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_LONG,
    clientStaleTime: 60 * 60 * 1000, // 1 hour
  },

  /**
   * Medication data - updated weekly
   * - Search results
   * - Medication details
   * - Package information
   */
  medications: {
    serverCache: CACHE_DURATIONS.CORE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_MEDIUM,
    clientStaleTime: 5 * 60 * 1000, // 5 minutes
  },

  /**
   * Generic reference data - rarely changes
   * - VMP Groups (therapeutic equivalence)
   * - Other static reference data
   */
  referenceData: {
    serverCache: CACHE_DURATIONS.REFERENCE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_LONG,
    clientStaleTime: 60 * 60 * 1000, // 1 hour
  },
} as const;

export type CacheConfigKey = keyof typeof CACHE_CONFIG;
