'use client';

import { useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { SearchBar, SearchResults, type SearchType } from '@/components/search';
import { useLanguage, type Language } from '@/components/LanguageSwitcher';
import { useMedicationSearch } from '@/hooks';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { MedicationSearchParams, Company } from '@/lib/types';

// Fetch company details for the filter display
async function fetchCompany(actorNr: string, language: string): Promise<Company | null> {
  try {
    const response = await fetch(`/api/companies/${actorNr}?lang=${language}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// Build search params from URL - pure function, no side effects
function buildSearchParams(
  queryFromUrl: string | null,
  typeFromUrl: SearchType | null,
  companyFromUrl: string | null,
  language: Language,
  offset: number
): MedicationSearchParams {
  const params: MedicationSearchParams = { language, offset };

  if (companyFromUrl) {
    params.companyActorNr = companyFromUrl;
  }

  if (queryFromUrl) {
    const type = typeFromUrl || 'name';
    switch (type) {
      case 'cnk':
        params.cnk = queryFromUrl;
        break;
      case 'ingredient':
        params.ingredient = queryFromUrl;
        break;
      default:
        params.query = queryFromUrl;
    }
  }

  return params;
}

function SearchContent() {
  const t = useTranslations();
  const router = useRouter();
  const urlParams = useSearchParams();
  const [language] = useLanguage();

  // URL is the single source of truth for search state
  const queryFromUrl = urlParams.get('q');
  const typeFromUrl = (urlParams.get('type') as SearchType | null) || 'name';
  const companyFromUrl = urlParams.get('company');

  // Local UI state only for company filter input (before applying)
  const [companyFilterInput, setCompanyFilterInput] = useState(companyFromUrl || '');

  // Pagination offset resets when URL changes (intentional - new search = page 1)
  const [paginationOffset, setPaginationOffset] = useState(0);

  // Reset pagination when URL params change
  const urlKey = `${queryFromUrl}-${typeFromUrl}-${companyFromUrl}`;
  const [prevUrlKey, setPrevUrlKey] = useState(urlKey);
  if (urlKey !== prevUrlKey) {
    setPrevUrlKey(urlKey);
    setPaginationOffset(0);
    // Also sync company filter input when URL changes (e.g., back/forward)
    setCompanyFilterInput(companyFromUrl || '');
  }

  // Derive search params from URL (single source of truth)
  const searchParams = useMemo(
    () => buildSearchParams(queryFromUrl, typeFromUrl, companyFromUrl, language, paginationOffset),
    [queryFromUrl, typeFromUrl, companyFromUrl, language, paginationOffset]
  );

  // Derived state from URL
  const hasSearched = Boolean(queryFromUrl || companyFromUrl);

  // Helper to update URL (the only way to change search state)
  const updateUrl = useCallback((params: { q?: string; type?: SearchType; company?: string }) => {
    const newParams = new URLSearchParams();
    if (params.q) newParams.set('q', params.q);
    if (params.type && params.type !== 'name') newParams.set('type', params.type);
    if (params.company) newParams.set('company', params.company);

    const newUrl = newParams.toString() ? `/search?${newParams.toString()}` : '/search';
    router.replace(newUrl, { scroll: false });
  }, [router]);

  // Fetch company details when filter is active
  const { data: companyData } = useQuery({
    queryKey: ['company', companyFromUrl, language],
    queryFn: () => fetchCompany(companyFromUrl!, language),
    enabled: Boolean(companyFromUrl),
  });

  const { data, isLoading, error } = useMedicationSearch(searchParams);

  const handleSearch = useCallback((query: string, type: SearchType) => {
    // Only update URL - derived state will follow
    updateUrl({ q: query, type, company: companyFromUrl || undefined });
  }, [companyFromUrl, updateUrl]);

  const handleApplyCompanyFilter = useCallback(() => {
    const trimmed = companyFilterInput.trim();
    if (trimmed) {
      updateUrl({ q: queryFromUrl || undefined, type: typeFromUrl, company: trimmed });
    }
  }, [companyFilterInput, queryFromUrl, typeFromUrl, updateUrl]);

  const handleClearCompanyFilter = useCallback(() => {
    setCompanyFilterInput('');
    updateUrl({ q: queryFromUrl || undefined, type: typeFromUrl, company: undefined });
  }, [queryFromUrl, typeFromUrl, updateUrl]);

  const handleLoadMore = useCallback(() => {
    if (data?.hasMore) {
      setPaginationOffset((prev) => prev + 50);
    }
  }, [data?.hasMore]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        {t('search.title')}
      </h1>

      {/* Search */}
      <div className="mb-8">
        <SearchBar
          key={`${queryFromUrl || ''}-${typeFromUrl}`}
          onSearch={handleSearch}
          loading={isLoading}
          placeholder={t('search.placeholder')}
          initialQuery={queryFromUrl || ''}
          initialType={typeFromUrl}
        />

        {/* Company filter */}
        <div className="mt-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="min-w-[120px] justify-between"
              disabled
            >
              {t('search.companyFilter')}
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </Button>

            {companyFromUrl ? (
              <>
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-700 dark:bg-blue-900/30">
                  <span className="truncate text-sm font-medium text-blue-800 dark:text-blue-200">
                    {companyData?.name || `#${companyFromUrl}`}
                  </span>
                </div>
                <Button variant="outline" onClick={handleClearCompanyFilter}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="sr-only">{t('common.clearFilter')}</span>
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={companyFilterInput}
                    onChange={(e) => setCompanyFilterInput(e.target.value)}
                    placeholder={t('search.companyFilterPlaceholder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && companyFilterInput.trim()) {
                        handleApplyCompanyFilter();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleApplyCompanyFilter} disabled={!companyFilterInput.trim()}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="sr-only">{t('search.applyFilter')}</span>
                </Button>
              </>
            )}
          </div>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('search.companyFilterHint')}
          </p>
        </div>
      </div>

      {/* Results */}
      {hasSearched ? (
        <div>
          <SearchResults
            results={data?.results}
            loading={isLoading}
            error={error}
            totalCount={data?.totalCount}
            hasMore={data?.hasMore}
            onLoadMore={handleLoadMore}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {t('search.emptyStateTitle')}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('search.emptyStateDescription')}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-8 h-10 w-64" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="mt-4 h-12 w-full" />
    </div>
  );
}
