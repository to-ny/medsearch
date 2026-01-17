'use client';

import useSWR from 'swr';
import type { SearchResponse } from '@/server/types/api';
import type { EntityType, Language } from '@/server/types/domain';

interface UseSearchOptions {
  query: string;
  lang?: Language;
  types?: EntityType[];
  limit?: number;
  offset?: number;
  enabled?: boolean;
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
  const { query, lang, types, limit, offset, enabled = true } = options;

  // Don't search if disabled or query is too short
  if (!enabled || query.length < 2) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('q', query);

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
