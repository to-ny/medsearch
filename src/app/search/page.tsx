'use client';

import { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  vmpFromUrl: string | null,
  language: Language,
  offset: number
): MedicationSearchParams {
  const params: MedicationSearchParams = { language, offset };

  if (companyFromUrl) {
    params.companyActorNr = companyFromUrl;
  }

  // VMP code search takes priority (used by "Find brands" links)
  if (vmpFromUrl) {
    params.vmpCode = vmpFromUrl;
    return params;
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
  const vmpFromUrl = urlParams.get('vmp');

  // Local UI state only for company filter input (before applying)
  const [companyFilterInput, setCompanyFilterInput] = useState(companyFromUrl || '');
  // Company filter is expanded only when there's a company in URL or user explicitly expands it
  const [isCompanyFilterExpanded, setIsCompanyFilterExpanded] = useState(Boolean(companyFromUrl));

  // Local UI state for VMP (generic) filter input (before applying)
  const [vmpFilterInput, setVmpFilterInput] = useState(vmpFromUrl || '');
  // VMP filter is expanded only when there's a VMP code in URL or user explicitly expands it
  const [isVmpFilterExpanded, setIsVmpFilterExpanded] = useState(Boolean(vmpFromUrl));

  // Pagination offset resets when URL changes (intentional - new search = page 1)
  const [paginationOffset, setPaginationOffset] = useState(0);

  // Company filter is disabled for ingredient search (SAM API limitation)
  const isCompanyFilterDisabled = typeFromUrl === 'ingredient';

  // Reset pagination when URL params change
  const urlKey = `${queryFromUrl}-${typeFromUrl}-${companyFromUrl}-${vmpFromUrl}`;
  const [prevUrlKey, setPrevUrlKey] = useState(urlKey);
  if (urlKey !== prevUrlKey) {
    setPrevUrlKey(urlKey);
    setPaginationOffset(0);
    // Also sync company filter input and expanded state when URL changes (e.g., back/forward)
    setCompanyFilterInput(companyFromUrl || '');
    setIsCompanyFilterExpanded(Boolean(companyFromUrl));
    // Also sync VMP filter input and expanded state when URL changes
    setVmpFilterInput(vmpFromUrl || '');
    setIsVmpFilterExpanded(Boolean(vmpFromUrl));
  }

  // Clear company filter when ingredient search has company in URL (unsupported combination)
  // This handles direct navigation to URLs like /search?q=test&type=ingredient&company=01995
  useEffect(() => {
    if (typeFromUrl === 'ingredient' && companyFromUrl) {
      const newParams = new URLSearchParams();
      if (queryFromUrl) newParams.set('q', queryFromUrl);
      newParams.set('type', 'ingredient');
      router.replace(`/search?${newParams.toString()}`, { scroll: false });
    }
  }, [typeFromUrl, companyFromUrl, queryFromUrl, router]);

  // Derive search params from URL (single source of truth)
  const searchParams = useMemo(
    () => buildSearchParams(queryFromUrl, typeFromUrl, companyFromUrl, vmpFromUrl, language, paginationOffset),
    [queryFromUrl, typeFromUrl, companyFromUrl, vmpFromUrl, language, paginationOffset]
  );

  // Derived state from URL
  const hasSearched = Boolean(queryFromUrl || companyFromUrl || vmpFromUrl);

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
    setIsCompanyFilterExpanded(false);
    updateUrl({ q: queryFromUrl || undefined, type: typeFromUrl, company: undefined });
  }, [queryFromUrl, typeFromUrl, updateUrl]);

  const handleToggleCompanyFilter = useCallback(() => {
    setIsCompanyFilterExpanded((prev) => !prev);
  }, []);

  const handleApplyVmpFilter = useCallback(() => {
    const trimmed = vmpFilterInput.trim();
    if (trimmed) {
      // VMP filter replaces any text search - navigate to VMP search URL
      const newParams = new URLSearchParams();
      newParams.set('vmp', trimmed);
      if (companyFromUrl) newParams.set('company', companyFromUrl);
      router.replace(`/search?${newParams.toString()}`, { scroll: false });
    }
  }, [vmpFilterInput, companyFromUrl, router]);

  const handleClearVmpFilter = useCallback(() => {
    setVmpFilterInput('');
    setIsVmpFilterExpanded(false);
    // Clear VMP from URL, keep other search params
    const newParams = new URLSearchParams();
    if (queryFromUrl) newParams.set('q', queryFromUrl);
    if (typeFromUrl && typeFromUrl !== 'name') newParams.set('type', typeFromUrl);
    if (companyFromUrl) newParams.set('company', companyFromUrl);
    const newUrl = newParams.toString() ? `/search?${newParams.toString()}` : '/search';
    router.replace(newUrl, { scroll: false });
  }, [queryFromUrl, typeFromUrl, companyFromUrl, router]);

  const handleToggleVmpFilter = useCallback(() => {
    setIsVmpFilterExpanded((prev) => !prev);
  }, []);

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

        {/* Company filter - collapsible, disabled for ingredient search */}
        {!companyFromUrl && !isCompanyFilterExpanded ? (
          <button
            onClick={handleToggleCompanyFilter}
            disabled={isCompanyFilterDisabled}
            className={`mt-4 flex items-center gap-2 text-sm ${
              isCompanyFilterDisabled
                ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title={isCompanyFilterDisabled ? t('search.companyFilterDisabledHint') : undefined}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {t('search.filterByCompany')}
            {isCompanyFilterDisabled ? (
              <span className="text-xs">({t('search.notAvailableForIngredient')})</span>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        ) : (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('search.companyFilter')}
              </span>
              {!companyFromUrl && (
                <button
                  onClick={handleToggleCompanyFilter}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={t('search.collapseFilter')}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              {companyFromUrl ? (
                <>
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-700 dark:bg-blue-900/30">
                    <svg className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate text-sm font-medium text-blue-800 dark:text-blue-200">
                      {companyData?.name || `#${companyFromUrl}`}
                    </span>
                    {companyData && (
                      <Link
                        href={`/companies/${companyFromUrl}`}
                        className="ml-auto flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        {t('search.viewCompany')}
                      </Link>
                    )}
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
            {!companyFromUrl && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('search.companyFilterHint')}
              </p>
            )}
          </div>
        )}

        {/* VMP (generic) filter - mirrors company filter structure */}
        {!vmpFromUrl && !isVmpFilterExpanded ? (
          <button
            onClick={handleToggleVmpFilter}
            className="mt-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            {t('search.filterByGeneric')}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('search.genericFilter')}
              </span>
              {!vmpFromUrl && (
                <button
                  onClick={handleToggleVmpFilter}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={t('search.collapseFilter')}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              {vmpFromUrl ? (
                <>
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-700 dark:bg-green-900/30">
                    <svg className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span className="truncate text-sm font-medium text-green-800 dark:text-green-200">
                      {t('search.genericCode')} {vmpFromUrl}
                    </span>
                  </div>
                  <Button variant="outline" onClick={handleClearVmpFilter}>
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
                      value={vmpFilterInput}
                      onChange={(e) => setVmpFilterInput(e.target.value)}
                      placeholder={t('search.genericFilterPlaceholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && vmpFilterInput.trim()) {
                          handleApplyVmpFilter();
                        }
                      }}
                    />
                  </div>
                  <Button onClick={handleApplyVmpFilter} disabled={!vmpFilterInput.trim()}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="sr-only">{t('search.applyFilter')}</span>
                  </Button>
                </>
              )}
            </div>
            {!vmpFromUrl && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('search.genericFilterHint')}
              </p>
            )}
          </div>
        )}
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
