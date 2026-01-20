'use client';

import useSWR from 'swr';
import type { SearchResponse } from '@/server/types/api';
import type { EntityType, Language } from '@/server/types/domain';
import type { SearchFilters } from '@/server/queries/search';

interface UseSearchOptions {
  query: string;
  lang?: Language;
  types?: EntityType[];
  limit?: number;
  offset?: number;
  enabled?: boolean;
  filters?: SearchFilters;
}

const fetcher = async (url: string): Promise<SearchResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error?.message || 'Search failed');
  }
  return response.json();
};

/**
 * Build search URL with parameters
 */
function buildSearchUrl(options: UseSearchOptions): string | null {
  const { query, lang, types, limit, offset, enabled = true, filters } = options;

  const hasBasicFilters = filters && (filters.vtmCode || filters.vmpCode || filters.ampCode || filters.atcCode || filters.companyCode || filters.vmpGroupCode || filters.substanceCode || filters.reimbursable !== undefined || filters.blackTriangle !== undefined);
  const hasExtendedFilters = filters && ((filters.formCodes && filters.formCodes.length > 0) || (filters.routeCodes && filters.routeCodes.length > 0) || (filters.reimbursementCategories && filters.reimbursementCategories.length > 0) || filters.priceMin !== undefined || filters.priceMax !== undefined);
  const hasFilters = hasBasicFilters || hasExtendedFilters;

  // Don't search if disabled or (query is too short and no filters)
  // Minimum 3 characters required for text search (trigram index requirement)
  if (!enabled || (!hasFilters && query.length < 3)) {
    return null;
  }

  const params = new URLSearchParams();
  if (query) {
    params.set('q', query);
  }

  if (lang) {
    params.set('lang', lang);
  }

  if (types && types.length > 0) {
    params.set('types', types.join(','));
  }

  if (limit) {
    params.set('limit', limit.toString());
  }

  if (offset) {
    params.set('offset', offset.toString());
  }

  // Add relationship filters
  if (filters?.vtmCode) {
    params.set('vtm', filters.vtmCode);
  }
  if (filters?.vmpCode) {
    params.set('vmp', filters.vmpCode);
  }
  if (filters?.ampCode) {
    params.set('amp', filters.ampCode);
  }
  if (filters?.atcCode) {
    params.set('atc', filters.atcCode);
  }
  if (filters?.companyCode) {
    params.set('company', filters.companyCode);
  }
  if (filters?.vmpGroupCode) {
    params.set('vmpGroup', filters.vmpGroupCode);
  }
  if (filters?.substanceCode) {
    params.set('substance', filters.substanceCode);
  }

  // Add boolean filters
  if (filters?.reimbursable === true) {
    params.set('reimbursable', 'true');
  }
  if (filters?.blackTriangle === true) {
    params.set('blackTriangle', 'true');
  }

  // Add Phase B extended filters
  if (filters?.formCodes && filters.formCodes.length > 0) {
    params.set('form', filters.formCodes.join(','));
  }
  if (filters?.routeCodes && filters.routeCodes.length > 0) {
    params.set('route', filters.routeCodes.join(','));
  }
  if (filters?.reimbursementCategories && filters.reimbursementCategories.length > 0) {
    params.set('reimbCategory', filters.reimbursementCategories.join(','));
  }
  if (filters?.priceMin !== undefined) {
    params.set('priceMin', filters.priceMin.toString());
  }
  if (filters?.priceMax !== undefined) {
    params.set('priceMax', filters.priceMax.toString());
  }

  return `/api/search?${params.toString()}`;
}

/**
 * Hook for searching with SWR caching
 */
export function useSearch(options: UseSearchOptions) {
  const url = buildSearchUrl(options);

  const { data, error, isLoading, isValidating, mutate } = useSWR<SearchResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300,
      keepPreviousData: true,
    }
  );

  return {
    data,
    error: error as Error | undefined,
    isLoading: isLoading && !data,
    isValidating,
    mutate,
  };
}
