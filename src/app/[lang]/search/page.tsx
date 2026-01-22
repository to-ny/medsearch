'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { SearchBar } from '@/components/search/search-bar';
import { QuickFilters } from '@/components/search/quick-filters';
import { Pagination } from '@/components/search/pagination';
import { EntityCard } from '@/components/entities/entity-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { FilterModal, type ModalFilterValues } from '@/components/search/filter-modal';
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

  // Parse Phase C extended filter parameters
  const chapterIV = searchParams.get('chapterIV') === 'true';
  const chapterIVParagraph = searchParams.get('chapterIVPara') || undefined;
  const deliveryEnvParam = searchParams.get('deliveryEnv');
  const deliveryEnv: 'P' | 'H' | undefined = (deliveryEnvParam === 'P' || deliveryEnvParam === 'H') ? deliveryEnvParam : undefined;
  const medicineType = searchParams.get('medicineType') || undefined;

  const filters = useMemo(() => {
    const hasBasicFilters = vtmCode || vmpCode || ampCode || atcCode || companyCode || vmpGroupCode || substanceCode || reimbursable || blackTriangle;
    const hasExtendedFilters = formCodes.length > 0 || routeCodes.length > 0 || reimbCategories.length > 0 || priceMin !== undefined || priceMax !== undefined || chapterIV || chapterIVParagraph || deliveryEnv || medicineType;
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
      chapterIV: chapterIV || undefined,
      chapterIVParagraph,
      deliveryEnvironment: deliveryEnv,
      medicineType,
    } : undefined;
  }, [vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode, substanceCode, reimbursable, blackTriangle, formCodes, routeCodes, reimbCategories, priceMin, priceMax, chapterIV, chapterIVParagraph, deliveryEnv, medicineType]);

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

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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

  // Compute active filter count for modal filters
  const activeFilterCount = useMemo(() => {
    return [
      reimbursable,
      blackTriangle,
      chapterIV,
      deliveryEnv !== undefined,
      medicineType !== undefined,
      formCodes.length > 0,
      routeCodes.length > 0,
      reimbCategories.length > 0,
      priceMin !== undefined,
      priceMax !== undefined,
    ].filter(Boolean).length;
  }, [reimbursable, blackTriangle, chapterIV, deliveryEnv, medicineType, formCodes, routeCodes, reimbCategories, priceMin, priceMax]);

  // Build modal initial values from current URL params
  const modalInitialValues: ModalFilterValues = useMemo(() => ({
    reimbursable,
    chapterIV,
    deliveryEnv,
    blackTriangle,
    medicineType,
    formCodes,
    routeCodes,
    reimbCategories,
    priceMin,
    priceMax,
  }), [reimbursable, chapterIV, deliveryEnv, blackTriangle, medicineType, formCodes, routeCodes, reimbCategories, priceMin, priceMax]);

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
      chapterIV?: boolean;
      deliveryEnv?: 'P' | 'H';
      medicineType?: string;
    }
  ) => {
    // For each override, check if the key exists in overrides (allowing explicit undefined to clear values)
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
      reimbursable: overrides && 'reimbursable' in overrides ? overrides.reimbursable : (reimbursable || undefined),
      blackTriangle: overrides && 'blackTriangle' in overrides ? overrides.blackTriangle : (blackTriangle || undefined),
      form: overrides && 'form' in overrides ? overrides.form : (formCodes.length > 0 ? formCodes : undefined),
      route: overrides && 'route' in overrides ? overrides.route : (routeCodes.length > 0 ? routeCodes : undefined),
      reimbCategory: overrides && 'reimbCategory' in overrides ? overrides.reimbCategory : (reimbCategories.length > 0 ? reimbCategories : undefined),
      priceMin: overrides && 'priceMin' in overrides ? overrides.priceMin : priceMin,
      priceMax: overrides && 'priceMax' in overrides ? overrides.priceMax : priceMax,
      chapterIV: overrides && 'chapterIV' in overrides ? overrides.chapterIV : (chapterIV || undefined),
      deliveryEnv: overrides && 'deliveryEnv' in overrides ? overrides.deliveryEnv : deliveryEnv,
      medicineType: overrides && 'medicineType' in overrides ? overrides.medicineType : medicineType,
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

  // Handler for batch apply from modal
  const handleApplyFilters = (values: ModalFilterValues) => {
    updateUrl(query, selectedTypes, 1, {
      reimbursable: values.reimbursable || undefined,
      blackTriangle: values.blackTriangle || undefined,
      chapterIV: values.chapterIV || undefined,
      deliveryEnv: values.deliveryEnv,
      medicineType: values.medicineType,
      form: values.formCodes.length > 0 ? values.formCodes : undefined,
      route: values.routeCodes.length > 0 ? values.routeCodes : undefined,
      reimbCategory: values.reimbCategories.length > 0 ? values.reimbCategories : undefined,
      priceMin: values.priceMin,
      priceMax: values.priceMax,
    });
    setIsFilterModalOpen(false);
  };

  // Reset handler for modal
  const handleResetModalFilters = () => {
    // Reset is handled in modal - it sets pendingValues to defaults
    // User must click Apply to apply the reset
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
      // Phase C extended filters
      chapterIV: filterKey !== 'chapterIV' ? (chapterIV || undefined) : undefined,
      chapterIVParagraph: filterKey !== 'chapterIVPara' ? chapterIVParagraph : undefined,
      deliveryEnv: filterKey !== 'deliveryEnv' ? deliveryEnv : undefined,
      medicineType: filterKey !== 'medicineType' ? medicineType : undefined,
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
    if (chapterIVParagraph) list.push({ key: 'chapterIVPara', label: t('entityLabels.chapterIV'), value: getFilterName('chapterIVParagraph', chapterIVParagraph) });
    // Note: reimbursable, blackTriangle, chapterIV, deliveryEnv, medicineType are NOT added here because they're visible via modal badge count

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
  }, [vtmCode, vmpCode, ampCode, atcCode, companyCode, vmpGroupCode, substanceCode, chapterIVParagraph, formCodes, routeCodes, reimbCategories, priceMin, priceMax, t, data?.appliedFilters]);

  // Compute which entity types have active filters targeting them
  // This allows showing badges with count=0 when filters cause empty results
  const filteredTypes = useMemo(() => {
    const types: EntityType[] = [];
    // Filters targeting AMP
    if (blackTriangle || medicineType) {
      types.push('amp');
    }
    // Filters targeting AMPP
    if (reimbursable || chapterIV || deliveryEnv) {
      types.push('ampp');
    }
    return types;
  }, [blackTriangle, medicineType, reimbursable, chapterIV, deliveryEnv]);

  const totalPages = data ? Math.ceil(data.totalCount / RESULTS_PER_PAGE) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search bar */}
      <div className="mb-4">
        <SearchBar
          defaultValue={query}
          onSearch={handleSearch}
          autoFocus={!query && !filters}
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
        <div className="space-y-4">
          {/* Quick filters (entity types + filters button) */}
          <QuickFilters
            selectedTypes={selectedTypes}
            facets={data.facets.byType}
            onTypesChange={handleTypesChange}
            filteredTypes={filteredTypes}
            activeFilterCount={activeFilterCount}
            onFiltersClick={() => setIsFilterModalOpen(true)}
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

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilters}
        onReset={handleResetModalFilters}
        initialValues={modalInitialValues}
        availableFilters={data?.availableFilters}
        facets={data?.facets.byType || { vtm: 0, vmp: 0, amp: 0, ampp: 0, company: 0, vmp_group: 0, substance: 0, atc: 0 }}
      />
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
