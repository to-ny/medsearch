'use client';

import { useQuery } from '@tanstack/react-query';
import { getClientStaleTime } from '@/lib/cache';
import type { ErrorResponse } from '@/lib/types';

export interface ExcipientResult {
  text?: string;
  language?: string;
  allTexts: { language: string; text: string }[];
  hasRequestedLanguage: boolean;
}

interface ExcipientOptions {
  ampCode?: string;
  language?: string;
  enabled?: boolean;
}

async function fetchExcipients(options: ExcipientOptions): Promise<ExcipientResult | null> {
  if (!options.ampCode) return null;

  const searchParams = new URLSearchParams();
  searchParams.set('ampCode', options.ampCode);
  if (options.language) searchParams.set('lang', options.language);

  const response = await fetch(`/api/excipients?${searchParams.toString()}`);

  if (response.status === 404) {
    // No excipient data available - not an error
    return null;
  }

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to fetch excipients');
  }

  return response.json();
}

export function useExcipients(options: ExcipientOptions) {
  const enabled = options.enabled !== false && Boolean(options.ampCode);

  return useQuery({
    queryKey: ['excipients', options.ampCode, options.language],
    queryFn: () => fetchExcipients(options),
    enabled,
    staleTime: getClientStaleTime('referenceData'),
  });
}
