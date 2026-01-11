'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientStaleTime } from '@/lib/cache';
import type { AtcSearchResponse, ErrorResponse } from '@/lib/types';

interface UseAtcBrowserParams {
  code?: string;
  language?: string;
}

async function fetchAtcClassifications(params: UseAtcBrowserParams): Promise<AtcSearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.code) searchParams.set('code', params.code);
  if (params.language) searchParams.set('lang', params.language);

  const response = await fetch(`/api/atc?${searchParams.toString()}`);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to fetch ATC classifications');
  }

  return response.json();
}

/**
 * Hook to fetch ATC classifications
 * @param params - code to fetch specific classification and its children, language for localization
 * @param enabled - whether the query should run
 */
export function useAtcBrowser(params: UseAtcBrowserParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['atc', params.code || 'top-level', params.language || 'en'],
    queryFn: () => fetchAtcClassifications(params),
    enabled,
    staleTime: getClientStaleTime('atc'),
  });
}

/**
 * Hook to fetch top-level ATC categories
 */
export function useTopLevelAtc(language = 'en') {
  return useAtcBrowser({ language });
}

/**
 * Hook to fetch a specific ATC code and its children
 */
export function useAtcByCode(code: string, language = 'en', enabled = true) {
  return useAtcBrowser({ code, language }, enabled && !!code);
}
