'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { EntityTypeFilter } from '@/components/search/entity-type-filter';
import { Pagination } from '@/components/search/pagination';
import { EntityCard } from '@/components/entities/entity-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { useSearch } from '@/lib/hooks/use-search';
import { useLanguage } from '@/lib/hooks/use-language';
import { useTranslation } from '@/lib/hooks/use-translation';
import type { EntityType } from '@/server/types/domain';

const RESULTS_PER_PAGE = 20;

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { t } = useTranslation();

  const queryParam = searchParams.get('q') || '';
  const typesParam = searchParams.get('types');
  const pageParam = searchParams.get('page');

  // Parse relationship filter parameters
  const vtmCode = searchParams.get('vtm') || undefined;
  const vmpCode = searchParams.get('vmp') || undefined;
  const ampCode = searchParams.get('amp') || undefined;
  const atcCode = searchParams.get('atc') || undefined;
  const companyCode = searchParams.get('company') || undefined;
  const vmpGroupCode = searchParams.get('vmpGroup') || undefined;

  const filters = useMemo(() => {
    const hasFilters = vtmCode || vmpCode || ampCode || atcCode || companyCode || vmpGroupCode;
    return hasFilters ? { vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode } : undefined;
  }, [vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode]);

  const [query, setQuery] = useState(queryParam);
  const [selectedTypes, setSelectedTypes] = useState<EntityType[]>(() => {
    if (typesParam) {
      return typesParam.split(',').filter(Boolean) as EntityType[];
    }
    return [];
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const page = parseInt(pageParam || '1', 10);
    return isNaN(page) || page < 1 ? 1 : page;
  });

  // Sync state with URL params
  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (typesParam) {
      setSelectedTypes(typesParam.split(',').filter(Boolean) as EntityType[]);
    } else {
      setSelectedTypes([]);
    }
  }, [typesParam]);

  useEffect(() => {
    const page = parseInt(pageParam || '1', 10);
    setCurrentPage(isNaN(page) || page < 1 ? 1 : page);
  }, [pageParam]);

  const { data, error, isLoading } = useSearch({
    query: query,
    lang: language,
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
    limit: RESULTS_PER_PAGE,
    offset: (currentPage - 1) * RESULTS_PER_PAGE,
    enabled: query.length >= 2 || !!filters,
    filters,
  });

  const updateUrl = (newQuery: string, newTypes: EntityType[], newPage: number) => {
    const params = new URLSearchParams();
    if (newQuery) params.set('q', newQuery);
    if (newTypes.length > 0) params.set('types', newTypes.join(','));
    if (newPage > 1) params.set('page', newPage.toString());
    // Preserve filters in URL
    if (vtmCode) params.set('vtm', vtmCode);
    if (vmpCode) params.set('vmp', vmpCode);
    if (ampCode) params.set('amp', ampCode);
    if (atcCode) params.set('atc', atcCode);
    if (companyCode) params.set('company', companyCode);
    if (vmpGroupCode) params.set('vmpGroup', vmpGroupCode);
    router.push(`/${language}/search?${params.toString()}`);
  };

  const handleSearch = (newQuery: string) => {
    updateUrl(newQuery, selectedTypes, 1);
  };

  const handleTypesChange = (newTypes: EntityType[]) => {
    setSelectedTypes(newTypes);
    updateUrl(query, newTypes, 1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateUrl(query, selectedTypes, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = data ? Math.ceil(data.totalCount / RESULTS_PER_PAGE) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search bar */}
      <div className="mb-6">
        <SearchBar
          defaultValue={query}
          onSearch={handleSearch}
          autoFocus={!query}
        />
      </div>

      {/* Results area */}
      {query.length < 2 && !filters ? (
        <EmptyState variant="no-query" />
      ) : isLoading ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <SkeletonList count={5} />
        </div>
      ) : error ? (
        <EmptyState
          variant="error"
          onRetry={() => {
            router.refresh();
          }}
        />
      ) : data && data.results.length === 0 ? (
        <EmptyState variant="no-results" query={query} />
      ) : data ? (
        <div className="space-y-6">
          {/* Results header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {data.totalCount} {data.totalCount !== 1 ? t('common.results') : t('common.result')}
              {data.query ? (
                <> {t('search.resultsFor').toLowerCase()} &quot;{data.query}&quot;</>
              ) : null}
            </h2>
          </div>

          {/* Type filters */}
          <EntityTypeFilter
            selectedTypes={selectedTypes}
            facets={data.facets.byType}
            onChange={handleTypesChange}
          />

          {/* Results list */}
          <div className="space-y-3">
            {data.results.map((result) => (
              <EntityCard
                key={`${result.entityType}-${result.code}`}
                entity={result}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SkeletonList count={5} />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
