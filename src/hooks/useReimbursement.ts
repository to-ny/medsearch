'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientStaleTime } from '@/lib/cache';
import type { Reimbursement, ErrorResponse } from '@/lib/types';

interface ReimbursementResponse {
  reimbursements: Reimbursement[];
  patientCost?: number;
}

interface ReimbursementOptions {
  cnk?: string;
  ampp?: string;
  price?: number;
  language?: string;
}

async function fetchReimbursement(options: ReimbursementOptions): Promise<ReimbursementResponse> {
  const searchParams = new URLSearchParams();

  if (options.cnk) searchParams.set('cnk', options.cnk);
  if (options.ampp) searchParams.set('ampp', options.ampp);
  if (options.price) searchParams.set('price', String(options.price));
  if (options.language) searchParams.set('lang', options.language);

  const response = await fetch(`/api/reimbursement?${searchParams.toString()}`);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to fetch reimbursement');
  }

  return response.json();
}

export function useReimbursement(options: ReimbursementOptions) {
  const hasId = Boolean(options.cnk || options.ampp);

  return useQuery({
    queryKey: ['reimbursement', options],
    queryFn: () => fetchReimbursement(options),
    enabled: hasId,
    staleTime: getClientStaleTime('reimbursement'),
  });
}
