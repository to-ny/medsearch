'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientStaleTime } from '@/lib/cache';
import type { StandardDosage, ErrorResponse } from '@/lib/types';

interface DosagesResponse {
  dosages: StandardDosage[];
  totalCount: number;
}

interface UseDosageOptions {
  vmpGroupCode?: string;
  language?: string;
  /** Only fetch when explicitly enabled (for progressive disclosure) */
  enabled?: boolean;
}

async function fetchDosages(options: UseDosageOptions): Promise<DosagesResponse> {
  if (!options.vmpGroupCode) {
    return { dosages: [], totalCount: 0 };
  }

  const searchParams = new URLSearchParams();
  if (options.language) searchParams.set('lang', options.language);

  const url = `/api/dosages/${options.vmpGroupCode}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      // No dosages found is not an error
      return { dosages: [], totalCount: 0 };
    }
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to fetch dosage information');
  }

  return response.json();
}

/**
 * Hook for fetching standard dosage information
 *
 * @param options.vmpGroupCode - VmpGroup code to look up dosages for
 * @param options.language - Preferred language for text
 * @param options.enabled - Set to true to trigger the fetch (for progressive disclosure)
 */
export function useDosage(options: UseDosageOptions) {
  const hasVmpGroupCode = Boolean(options.vmpGroupCode);
  const isEnabled = options.enabled ?? true;

  return useQuery({
    queryKey: ['dosages', options.vmpGroupCode, options.language],
    queryFn: () => fetchDosages(options),
    enabled: hasVmpGroupCode && isEnabled,
    staleTime: getClientStaleTime('medications'),
  });
}
