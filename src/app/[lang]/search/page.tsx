'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { SearchBar } from '@/components/search/search-bar';
import { EntityTypeFilter } from '@/components/search/entity-type-filter';
import { Pagination } from '@/components/search/pagination';
import { EntityCard } from '@/components/entities/entity-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { useLanguage, useLinks, useSearch, useTranslation } from '@/lib/hooks';
import type { EntityType } from '@/server/types/domain';

const RESULTS_PER_PAGE = 20;

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const links = useLinks();
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
    router.push(links.toSearch({
      q: newQuery || undefined,
      types: newTypes.length > 0 ? newTypes : undefined,
      page: newPage > 1 ? newPage : undefined,
      vtm: vtmCode,
      vmp: vmpCode,
      amp: ampCode,
      atc: atcCode,
      company: companyCode,
      vmpGroup: vmpGroupCode,
    }));
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

  const removeFilter = (filterKey: string) => {
    router.push(links.toSearch({
      q: query || undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      vtm: filterKey !== 'vtm' ? vtmCode : undefined,
      vmp: filterKey !== 'vmp' ? vmpCode : undefined,
      amp: filterKey !== 'amp' ? ampCode : undefined,
      atc: filterKey !== 'atc' ? atcCode : undefined,
      company: filterKey !== 'company' ? companyCode : undefined,
      vmpGroup: filterKey !== 'vmpGroup' ? vmpGroupCode : undefined,
    }));
  };

  // Build active filters for display
  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; value: string }[] = [];
    if (vtmCode) list.push({ key: 'vtm', label: t('entityLabels.substance'), value: vtmCode });
    if (vmpCode) list.push({ key: 'vmp', label: t('entityLabels.generic'), value: vmpCode });
    if (ampCode) list.push({ key: 'amp', label: t('entityLabels.medication'), value: ampCode });
    if (atcCode) list.push({ key: 'atc', label: t('entityLabels.classification'), value: atcCode });
    if (companyCode) list.push({ key: 'company', label: t('entityLabels.company'), value: companyCode });
    if (vmpGroupCode) list.push({ key: 'vmpGroup', label: t('entityLabels.therapeuticGroup'), value: vmpGroupCode });
    return list;
  }, [vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode, t]);

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

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('search.filteredBy')}:
          </span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => removeFilter(filter.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <span>{filter.label}: {filter.value}</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}

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
