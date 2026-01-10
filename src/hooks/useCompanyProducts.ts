'use client';

import { useQuery } from '@tanstack/react-query';
import type { MedicationSearchResponse, ErrorResponse } from '@/lib/types';

interface UseCompanyProductsParams {
  actorNr: string;
  language?: string;
  limit?: number;
  offset?: number;
}

async function fetchCompanyProducts(params: UseCompanyProductsParams): Promise<MedicationSearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.language) searchParams.set('lang', params.language);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));

  const response = await fetch(`/api/companies/${params.actorNr}/products?${searchParams.toString()}`);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to fetch company products');
  }

  return response.json();
}

export function useCompanyProducts(params: UseCompanyProductsParams, enabled = true) {
  return useQuery({
    queryKey: ['company', params.actorNr, 'products', params.language, params.limit, params.offset],
    queryFn: () => fetchCompanyProducts(params),
    enabled: enabled && Boolean(params.actorNr),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
