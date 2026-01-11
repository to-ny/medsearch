'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { CACHE_CONFIG } from '@/lib/cache';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query provider with optimized cache settings for medication data.
 *
 * Default staleTime is set to 5 minutes (medications) as most queries
 * are for medication data. Individual hooks override this for different
 * data types (e.g., 24h for companies/reimbursement).
 *
 * gcTime (garbage collection time) is set to 30 minutes to keep cached
 * data in memory for fast repeat access while preventing memory bloat.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Default to medication staleTime (5 min) - most common query type
            staleTime: CACHE_CONFIG.medications.clientStaleTime,
            // Keep cached data for 30 minutes before garbage collection
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus - medication data is stable
            refetchOnWindowFocus: false,
            // Retry once on failure
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
