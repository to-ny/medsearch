'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientStaleTime } from '@/lib/cache';
import type { LegalBasis, ErrorResponse } from '@/lib/types';

interface LegislationResponse {
  legalBases: LegalBasis[];
}

interface LegislationOptions {
  cnk?: string;
  path?: string;
  language?: string;
  /** Only fetch when explicitly enabled (for progressive disclosure) */
  enabled?: boolean;
}

async function fetchLegislation(options: LegislationOptions): Promise<LegislationResponse> {
  const searchParams = new URLSearchParams();

  if (options.cnk) searchParams.set('cnk', options.cnk);
  if (options.path) searchParams.set('path', options.path);
  if (options.language) searchParams.set('lang', options.language);

  const response = await fetch(`/api/legislation?${searchParams.toString()}`);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to fetch legislation');
  }

  return response.json();
}

/**
 * Hook for fetching legislation (legal basis) on demand
 *
 * @param options.cnk - CNK code to look up legislation for a medication
 * @param options.path - Legal reference path to look up specific legislation
 * @param options.language - Preferred language (note: legal texts only in FR/NL/DE)
 * @param options.enabled - Set to true to trigger the fetch (for progressive disclosure)
 */
export function useLegislation(options: LegislationOptions) {
  const hasQuery = Boolean(options.cnk || options.path);
  const isEnabled = options.enabled ?? false;

  return useQuery({
    queryKey: ['legislation', options.cnk, options.path, options.language],
    queryFn: () => fetchLegislation(options),
    enabled: hasQuery && isEnabled,
    staleTime: getClientStaleTime('legislation'),
  });
}
