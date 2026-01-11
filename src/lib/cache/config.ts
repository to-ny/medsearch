/**
 * Caching Configuration for Vercel Deployment
 *
 * This module defines a tiered caching strategy based on data volatility:
 *
 * - REFERENCE_DATA (24h): Static data that rarely changes (companies, ATC, reimbursement)
 * - CORE_DATA (6h): Core medication data (search results, product details)
 * - DYNAMIC_DATA (15min): Frequently changing data (not currently used)
 *
 * SAM v2 API data update frequency:
 * - Medication database: Updated weekly/monthly
 * - Company data: Updated infrequently
 * - Reimbursement: Updated monthly (RIZIV/INAMI schedule)
 * - ATC classifications: Very stable (WHO standard)
 */

/**
 * Cache duration constants in seconds
 */
export const CACHE_DURATIONS = {
  /** Reference/static data - 24 hours */
  REFERENCE_DATA: 86400, // 24 * 60 * 60

  /** Core medication data - 6 hours */
  CORE_DATA: 21600, // 6 * 60 * 60

  /** Dynamic/user-specific data - 15 minutes */
  DYNAMIC_DATA: 900, // 15 * 60

  /** Stale-while-revalidate period - 7 days */
  SWR_LONG: 604800, // 7 * 24 * 60 * 60

  /** Stale-while-revalidate period - 1 day */
  SWR_MEDIUM: 86400, // 24 * 60 * 60
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
    revalidate: CACHE_DURATIONS.REFERENCE_DATA,
    sMaxAge: CACHE_DURATIONS.REFERENCE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_LONG,
    clientStaleTime: 24 * 60 * 60 * 1000, // 24 hours in ms
  },

  /**
   * Reimbursement data - updated monthly
   * - Reimbursement categories and rates
   * - Copayment information
   */
  reimbursement: {
    revalidate: CACHE_DURATIONS.REFERENCE_DATA,
    sMaxAge: CACHE_DURATIONS.REFERENCE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_LONG,
    clientStaleTime: 24 * 60 * 60 * 1000, // 24 hours in ms
  },

  /**
   * ATC classifications - very stable (WHO standard)
   * Longest cache duration as this data almost never changes
   */
  atc: {
    revalidate: CACHE_DURATIONS.REFERENCE_DATA,
    sMaxAge: CACHE_DURATIONS.REFERENCE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_LONG,
    clientStaleTime: 24 * 60 * 60 * 1000, // 24 hours in ms
  },

  /**
   * Medication data - updated weekly
   * - Search results
   * - Medication details
   * - Package information
   */
  medications: {
    revalidate: CACHE_DURATIONS.CORE_DATA,
    sMaxAge: CACHE_DURATIONS.CORE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_MEDIUM,
    clientStaleTime: 5 * 60 * 1000, // 5 minutes in ms
  },

  /**
   * Company products - same as medications
   */
  companyProducts: {
    revalidate: CACHE_DURATIONS.CORE_DATA,
    sMaxAge: CACHE_DURATIONS.CORE_DATA,
    staleWhileRevalidate: CACHE_DURATIONS.SWR_MEDIUM,
    clientStaleTime: 5 * 60 * 1000, // 5 minutes in ms
  },
} as const;

export type CacheConfigKey = keyof typeof CACHE_CONFIG;
