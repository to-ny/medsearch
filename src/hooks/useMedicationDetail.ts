'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientStaleTime } from '@/lib/cache';
import type { MedicationDetailResponse, ErrorResponse, Company } from '@/lib/types';

interface DetailOptions {
  language?: string;
  includeReimbursement?: boolean;
  includeEquivalents?: boolean;
}

async function fetchCompanyName(actorNr: string, language: string): Promise<string | undefined> {
  try {
    const response = await fetch(`/api/companies/${actorNr}?lang=${language}`);
    if (!response.ok) return undefined;
    const company: Company = await response.json();
    return company.name;
  } catch {
    return undefined;
  }
}

async function fetchMedicationDetail(
  id: string,
  options: DetailOptions = {}
): Promise<MedicationDetailResponse> {
  const searchParams = new URLSearchParams();
  const language = options.language || 'en';

  if (options.language) searchParams.set('lang', options.language);
  if (options.includeReimbursement === false) searchParams.set('reimbursement', 'false');
  if (options.includeEquivalents === false) searchParams.set('equivalents', 'false');

  const response = await fetch(`/api/medications/${id}?${searchParams.toString()}`);

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to fetch medication');
  }

  const data: MedicationDetailResponse = await response.json();

  // If medication has companyActorNr but no companyName, fetch it
  if (data.medication.companyActorNr && !data.medication.companyName) {
    const companyName = await fetchCompanyName(data.medication.companyActorNr, language);
    if (companyName) {
      data.medication.companyName = companyName;
    }
  }

  return data;
}

export function useMedicationDetail(id: string | undefined, options: DetailOptions = {}) {
  return useQuery({
    queryKey: ['medications', 'detail', id, options],
    queryFn: () => fetchMedicationDetail(id!, options),
    enabled: Boolean(id),
    staleTime: getClientStaleTime('medications'),
  });
}
