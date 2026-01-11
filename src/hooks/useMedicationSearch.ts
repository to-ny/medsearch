'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientStaleTime } from '@/lib/cache';
import type { MedicationSearchResponse, MedicationSearchParams, ErrorResponse } from '@/lib/types';

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
    throw new Error(error.message || 'Search failed');
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
