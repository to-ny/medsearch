/**
 * SOAP client for SAM v2 API
 *
 * Integrates with Next.js Data Cache for Vercel deployment.
 * SOAP responses are cached based on endpoint type to reduce
 * external API calls.
 */

import { createFetchCacheOptions, type CacheConfigKey, type FetchCacheOptions } from '@/lib/cache';

const ENDPOINTS = {
  dics: 'https://apps.samdb.ehealth.fgov.be/samv2/dics/v5',
  amp: 'https://apps.samdb.ehealth.fgov.be/samv2/consult/amp',
  vmp: 'https://apps.samdb.ehealth.fgov.be/samv2/consult/vmp',
  company: 'https://apps.samdb.ehealth.fgov.be/samv2/consult/company',
  rmb: 'https://apps.samdb.ehealth.fgov.be/samv2/consult/rmb',
} as const;

export type EndpointType = keyof typeof ENDPOINTS;

export interface SoapClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  /** Cache configuration type for Next.js Data Cache */
  cacheType?: CacheConfigKey;
  /** Custom revalidate time in seconds (overrides cacheType) */
  revalidate?: number;
  /** Cache tags for targeted invalidation */
  tags?: string[];
  /** Disable caching for this request */
  noCache?: boolean;
}

const DEFAULT_OPTIONS = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cacheType: undefined as CacheConfigKey | undefined,
  revalidate: undefined as number | undefined,
  tags: undefined as string[] | undefined,
  noCache: false,
} as const;

/**
 * Delays execution for the specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Makes a SOAP request with retry logic, exponential backoff, and Next.js caching
 *
 * Note: Next.js Data Cache caches based on the full request signature (URL + body).
 * This means identical SOAP requests will be cached and deduplicated.
 *
 * @example
 * ```ts
 * // With caching (recommended for most cases)
 * const response = await soapRequest('dics', soapXml, {
 *   cacheType: 'medications',
 * });
 *
 * // Without caching (for time-sensitive data)
 * const response = await soapRequest('dics', soapXml, {
 *   noCache: true,
 * });
 * ```
 */
export async function soapRequest(
  endpoint: EndpointType,
  soapXml: string,
  options: SoapClientOptions = {}
): Promise<string> {
  const { timeout, retries, retryDelay, cacheType, revalidate, tags, noCache } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const url = ENDPOINTS[endpoint];

  // Build Next.js cache options
  const cacheOptions = createFetchCacheOptions({
    cacheType,
    revalidate,
    tags,
    noCache,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
        },
        body: soapXml,
        signal: controller.signal,
        ...cacheOptions,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      return responseText;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
      }

      // Wait before retrying with exponential backoff
      if (attempt < retries) {
        const backoffDelay = retryDelay * Math.pow(2, attempt);
        await delay(backoffDelay);
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Gets the URL for an endpoint
 */
export function getEndpointUrl(endpoint: EndpointType): string {
  return ENDPOINTS[endpoint];
}

/**
 * Checks if a SOAP response contains a fault
 */
export function isSoapFault(xml: string): boolean {
  return xml.includes('Fault') || xml.includes('faultcode');
}
