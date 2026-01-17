'use client';

import useSWR from 'swr';
import type { SearchResponse } from '@/server/types/api';
import type { EntityType, Language } from '@/server/types/domain';

interface SearchFilters {
  vtmCode?: string;
  vmpCode?: string;
  ampCode?: string;
  atcCode?: string;
  companyCode?: string;
  vmpGroupCode?: string;
}

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

  const hasFilters = filters && (filters.vtmCode || filters.vmpCode || filters.ampCode || filters.atcCode || filters.companyCode || filters.vmpGroupCode);

  // Don't search if disabled or (query is too short and no filters)
  if (!enabled || (!hasFilters && query.length < 2)) {
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
