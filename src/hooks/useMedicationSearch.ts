'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientStaleTime } from '@/lib/cache';
import type { MedicationSearchResponse, MedicationSearchParams, ErrorResponse } from '@/lib/types';

/**
 * Custom error class that includes the error code from API responses.
 * Used to distinguish between server errors and user guidance messages.
 */
export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }

  /**
   * Check if this is a guidance error (user can fix it)
   * rather than a server failure
   */
  isGuidance(): boolean {
    return ['COMPANY_TOO_LARGE', 'UNSUPPORTED_COMBINATION'].includes(this.code);
  }
}

async function fetchMedications(params: MedicationSearchParams): Promise<MedicationSearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set('query', params.query);
  if (params.cnk) searchParams.set('cnk', params.cnk);
  if (params.ingredient) searchParams.set('ingredient', params.ingredient);
  if (params.companyActorNr) searchParams.set('company', params.companyActorNr);
  if (params.language) searchParams.set('lang', params.language);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const response = await fetch(`/api/medications?${searchParams.toString()}`);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new ApiError(error.code || 'UNKNOWN', error.message || 'Search failed');
  }

  return response.json();
}

export function useMedicationSearch(params: MedicationSearchParams, enabled = true) {
  const hasSearchCriteria = Boolean(
    params.query || params.cnk || params.ingredient || params.companyActorNr
  );

  return useQuery({
    queryKey: ['medications', 'search', params],
    queryFn: () => fetchMedications(params),
    enabled: enabled && hasSearchCriteria,
    staleTime: getClientStaleTime('medications'),
  });
}
