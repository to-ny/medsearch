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
import { FilterDrawer, MobileFilterContent } from '@/components/search/filter-drawer';
import { FilterPanel } from '@/components/search/filter-panel';
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
  const substanceCode = searchParams.get('substance') || undefined;

  // Parse boolean filter parameters
  const reimbursable = searchParams.get('reimbursable') === 'true';
  const blackTriangle = searchParams.get('blackTriangle') === 'true';

  // Parse Phase B extended filter parameters (memoized to prevent dependency churn)
  const formParam = searchParams.get('form');
  const formCodes = useMemo(() => formParam ? formParam.split(',').filter(Boolean) : [], [formParam]);
  const routeParam = searchParams.get('route');
  const routeCodes = useMemo(() => routeParam ? routeParam.split(',').filter(Boolean) : [], [routeParam]);
  const reimbCatParam = searchParams.get('reimbCategory');
  const reimbCategories = useMemo(() => reimbCatParam ? reimbCatParam.split(',').filter(Boolean) : [], [reimbCatParam]);
  const priceMinParam = searchParams.get('priceMin');
  const priceMin = priceMinParam ? parseFloat(priceMinParam) : undefined;
  const priceMaxParam = searchParams.get('priceMax');
  const priceMax = priceMaxParam ? parseFloat(priceMaxParam) : undefined;

  const filters = useMemo(() => {
    const hasBasicFilters = vtmCode || vmpCode || ampCode || atcCode || companyCode || vmpGroupCode || substanceCode || reimbursable || blackTriangle;
    const hasExtendedFilters = formCodes.length > 0 || routeCodes.length > 0 || reimbCategories.length > 0 || priceMin !== undefined || priceMax !== undefined;
    const hasFilters = hasBasicFilters || hasExtendedFilters;
    return hasFilters ? {
      vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode, substanceCode,
      reimbursable: reimbursable || undefined,
      blackTriangle: blackTriangle || undefined,
      formCodes: formCodes.length > 0 ? formCodes : undefined,
      routeCodes: routeCodes.length > 0 ? routeCodes : undefined,
      reimbursementCategories: reimbCategories.length > 0 ? reimbCategories : undefined,
      priceMin,
      priceMax,
    } : undefined;
  }, [vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode, substanceCode, reimbursable, blackTriangle, formCodes, routeCodes, reimbCategories, priceMin, priceMax]);

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
    enabled: query.length >= 3 || !!filters,
    filters,
  });

  const updateUrl = (
    newQuery: string,
    newTypes: EntityType[],
    newPage: number,
    overrides?: {
      reimbursable?: boolean;
      blackTriangle?: boolean;
      form?: string[];
      route?: string[];
      reimbCategory?: string[];
      priceMin?: number;
      priceMax?: number;
    }
  ) => {
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
      substance: substanceCode,
      reimbursable: overrides?.reimbursable ?? (reimbursable || undefined),
      blackTriangle: overrides?.blackTriangle ?? (blackTriangle || undefined),
      form: overrides?.form ?? (formCodes.length > 0 ? formCodes : undefined),
      route: overrides?.route ?? (routeCodes.length > 0 ? routeCodes : undefined),
      reimbCategory: overrides?.reimbCategory ?? (reimbCategories.length > 0 ? reimbCategories : undefined),
      priceMin: overrides?.priceMin ?? priceMin,
      priceMax: overrides?.priceMax ?? priceMax,
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

  const handleReimbursableToggle = () => {
    updateUrl(query, selectedTypes, 1, { reimbursable: !reimbursable });
  };

  const handleBlackTriangleToggle = () => {
    updateUrl(query, selectedTypes, 1, { blackTriangle: !blackTriangle });
  };

  // Phase B filter handlers
  const handleFormChange = (codes: string[]) => {
    updateUrl(query, selectedTypes, 1, { form: codes.length > 0 ? codes : undefined });
  };

  const handleRouteChange = (codes: string[]) => {
    updateUrl(query, selectedTypes, 1, { route: codes.length > 0 ? codes : undefined });
  };

  const handleReimbCategoryChange = (categories: string[]) => {
    updateUrl(query, selectedTypes, 1, { reimbCategory: categories.length > 0 ? categories : undefined });
  };

  const handlePriceMinChange = (value: number | undefined) => {
    updateUrl(query, selectedTypes, 1, { priceMin: value });
  };

  const handlePriceMaxChange = (value: number | undefined) => {
    updateUrl(query, selectedTypes, 1, { priceMax: value });
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
      substance: filterKey !== 'substance' ? substanceCode : undefined,
      reimbursable: filterKey !== 'reimbursable' ? (reimbursable || undefined) : undefined,
      blackTriangle: filterKey !== 'blackTriangle' ? (blackTriangle || undefined) : undefined,
      // Phase B extended filters
      form: filterKey !== 'form' ? (formCodes.length > 0 ? formCodes : undefined) : undefined,
      route: filterKey !== 'route' ? (routeCodes.length > 0 ? routeCodes : undefined) : undefined,
      reimbCategory: filterKey !== 'reimbCategory' ? (reimbCategories.length > 0 ? reimbCategories : undefined) : undefined,
      priceMin: filterKey !== 'priceRange' ? priceMin : undefined,
      priceMax: filterKey !== 'priceRange' ? priceMax : undefined,
    }));
  };

  const clearAllFilters = () => {
    router.push(links.toSearch({
      q: query || undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
    }));
  };

  // Build active filters for display using names from API response when available
  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; value: string }[] = [];
    const apiFilters = data?.appliedFilters;

    // Helper to get name from API response or fallback to code
    const getFilterName = (type: string, code: string): string => {
      const found = apiFilters?.find(f => f.type === type && f.code === code);
      return found?.name || code;
    };

    if (vtmCode) list.push({ key: 'vtm', label: t('entityLabels.substance'), value: getFilterName('vtm', vtmCode) });
    if (vmpCode) list.push({ key: 'vmp', label: t('entityLabels.generic'), value: getFilterName('vmp', vmpCode) });
    if (ampCode) list.push({ key: 'amp', label: t('entityLabels.medication'), value: getFilterName('amp', ampCode) });
    if (atcCode) list.push({ key: 'atc', label: t('entityLabels.classification'), value: getFilterName('atc', atcCode) });
    if (companyCode) list.push({ key: 'company', label: t('entityLabels.company'), value: getFilterName('company', companyCode) });
    if (vmpGroupCode) list.push({ key: 'vmpGroup', label: t('entityLabels.therapeuticGroup'), value: getFilterName('vmpGroup', vmpGroupCode) });
    if (substanceCode) list.push({ key: 'substance', label: t('entityLabels.ingredient'), value: getFilterName('substance', substanceCode) });
    if (reimbursable) list.push({ key: 'reimbursable', label: t('search.reimbursableOnly'), value: '' });
    if (blackTriangle) list.push({ key: 'blackTriangle', label: t('search.blackTriangleOnly'), value: '' });

    // Phase B extended filters
    if (formCodes.length > 0) list.push({ key: 'form', label: t('search.pharmaceuticalForm'), value: `${formCodes.length} ${t('search.selected')}` });
    if (routeCodes.length > 0) list.push({ key: 'route', label: t('search.routeOfAdministration'), value: `${routeCodes.length} ${t('search.selected')}` });
    if (reimbCategories.length > 0) list.push({ key: 'reimbCategory', label: t('search.reimbursementCategory'), value: reimbCategories.join(', ') });
    if (priceMin !== undefined || priceMax !== undefined) {
      const priceLabel = priceMin !== undefined && priceMax !== undefined
        ? `${priceMin.toFixed(2)} - ${priceMax.toFixed(2)}`
        : priceMin !== undefined ? `>= ${priceMin.toFixed(2)}` : `<= ${priceMax?.toFixed(2)}`;
      list.push({ key: 'priceRange', label: t('search.priceRange'), value: priceLabel });
    }
    return list;
  }, [vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode, substanceCode, reimbursable, blackTriangle, formCodes, routeCodes, reimbCategories, priceMin, priceMax, t, data?.appliedFilters]);

  const totalPages = data ? Math.ceil(data.totalCount / RESULTS_PER_PAGE) : 0;

  // Count active contextual filters for mobile badge
  const contextualFilterCount = activeFilters.length;

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

      {/* Mobile filter drawer */}
      {data && (
        <div className="mb-4 md:hidden">
          <FilterDrawer activeFilterCount={contextualFilterCount}>
            <MobileFilterContent
              selectedTypes={selectedTypes}
              facets={data.facets.byType}
              onTypesChange={handleTypesChange}
              reimbursable={reimbursable}
              onReimbursableToggle={handleReimbursableToggle}
              blackTriangle={blackTriangle}
              onBlackTriangleToggle={handleBlackTriangleToggle}
              onClearAll={clearAllFilters}
              hasActiveFilters={activeFilters.length > 0 || reimbursable || blackTriangle}
            />
          </FilterDrawer>
        </div>
      )}

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
              <span>{filter.value ? `${filter.label}: ${filter.value}` : filter.label}</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          ))}
          {activeFilters.length > 1 && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t('search.clearAllFilters')}
            </button>
          )}
        </div>
      )}

      {/* Results area */}
      {query.length < 3 && !filters ? (
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
          {/* Type filters - hidden on mobile */}
          <div className="hidden md:block">
            <EntityTypeFilter
              selectedTypes={selectedTypes}
              facets={data.facets.byType}
              onChange={handleTypesChange}
            />
          </div>

          {/* Contextual filters - hidden on mobile */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            {/* Reimbursable toggle - only show if AMPP results exist */}
            {data.facets.byType.ampp > 0 && (
              <button
                onClick={handleReimbursableToggle}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  reimbursable
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                aria-pressed={reimbursable}
              >
                <span className="w-4 h-4 rounded border flex items-center justify-center text-xs">
                  {reimbursable && '✓'}
                </span>
                {t('search.reimbursableOnly')}
              </button>
            )}

            {/* Black triangle toggle - only show if AMP results exist */}
            {data.facets.byType.amp > 0 && (
              <button
                onClick={handleBlackTriangleToggle}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  blackTriangle
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                aria-pressed={blackTriangle}
              >
                <span className="text-xs">▲</span>
                {t('search.blackTriangleOnly')}
              </button>
            )}
          </div>

          {/* Phase B: Advanced Filter Panel - hidden on mobile */}
          <FilterPanel
            availableFilters={data.availableFilters}
            facets={data.facets.byType}
            selectedFormCodes={formCodes}
            selectedRouteCodes={routeCodes}
            selectedReimbCategories={reimbCategories}
            priceMin={priceMin}
            priceMax={priceMax}
            onFormChange={handleFormChange}
            onRouteChange={handleRouteChange}
            onReimbCategoryChange={handleReimbCategoryChange}
            onPriceMinChange={handlePriceMinChange}
            onPriceMaxChange={handlePriceMaxChange}
            className="hidden md:block"
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
