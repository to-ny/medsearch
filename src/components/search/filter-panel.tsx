'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';
import { useLanguage } from '@/lib/hooks/use-language';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@heroicons/react/20/solid';
import type { AvailableFilters, FilterOption } from '@/server/types/api';
import type { MultilingualText, EntityType } from '@/server/types/domain';

interface FilterPanelProps {
  availableFilters?: AvailableFilters;
  facets: Record<EntityType, number>;
  // Currently selected values
  selectedFormCodes: string[];
  selectedRouteCodes: string[];
  selectedReimbCategories: string[];
  priceMin?: number;
  priceMax?: number;
  // Callbacks
  onFormChange: (codes: string[]) => void;
  onRouteChange: (codes: string[]) => void;
  onReimbCategoryChange: (categories: string[]) => void;
  onPriceMinChange: (value: number | undefined) => void;
  onPriceMaxChange: (value: number | undefined) => void;
  className?: string;
}

// Reimbursement category descriptions
const REIMB_CATEGORY_INFO: Record<string, { label: string; description: string }> = {
  'A': { label: 'A', description: '100%' },
  'B': { label: 'B', description: '75%' },
  'C': { label: 'C', description: '50%' },
  'Cs': { label: 'Cs', description: 'Special' },
  'Cx': { label: 'Cx', description: 'Special' },
  'Fa': { label: 'Fa', description: 'Lump-sum' },
  'Fb': { label: 'Fb', description: 'Lump-sum' },
};

/**
 * Get localized text from multilingual object
 */
function getLocalizedName(name: MultilingualText | undefined, lang: string): string {
  if (!name) return '';
  return name[lang as keyof MultilingualText] || name.en || name.nl || name.fr || '';
}

/**
 * Collapsible section component
 */
function FilterSection({
  title,
  children,
  defaultExpanded = true,
  hidden = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  hidden?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (hidden) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300"
        aria-expanded={isExpanded}
      >
        {title}
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>
      {isExpanded && <div className="pb-4">{children}</div>}
    </div>
  );
}

/**
 * Multi-select dropdown component
 */
function MultiSelectDropdown({
  options,
  selectedCodes,
  onChange,
  placeholder,
  emptyMessage,
  lang,
}: {
  options: FilterOption[] | undefined;
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  placeholder: string;
  emptyMessage: string;
  lang: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!options || options.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
        {emptyMessage}
      </div>
    );
  }

  const filteredOptions = search
    ? options.filter(opt => {
        const name = getLocalizedName(opt.name, lang).toLowerCase();
        return name.includes(search.toLowerCase()) || opt.code.toLowerCase().includes(search.toLowerCase());
      })
    : options;

  const handleToggle = (code: string) => {
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter(c => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border',
          'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
          'hover:border-gray-400 dark:hover:border-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={cn(
          'truncate',
          selectedCodes.length === 0 && 'text-gray-500 dark:text-gray-400'
        )}>
          {selectedCodes.length === 0
            ? placeholder
            : `${selectedCodes.length} selected`}
        </span>
        <ChevronDownIcon className={cn('h-4 w-4 ml-2 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown content */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Clear button */}
          {selectedCodes.length > 0 && (
            <div className="px-2 py-1 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Options list */}
          <div className="overflow-y-auto max-h-44" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No matches found
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = selectedCodes.includes(option.code);
                const name = getLocalizedName(option.name, lang);

                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => handleToggle(option.code)}
                    className={cn(
                      'w-full flex items-center px-3 py-2 text-sm text-left',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      isSelected && 'bg-blue-50 dark:bg-blue-900/30'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className={cn(
                      'flex-shrink-0 w-4 h-4 mr-2 rounded border',
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    )}>
                      {isSelected && <CheckIcon className="w-4 h-4" />}
                    </span>
                    <span className="flex-1 truncate">{name || option.code}</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({option.count})
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Checkbox group for reimbursement categories
 */
function ReimbCategoryCheckboxes({
  options,
  selectedCategories,
  onChange,
}: {
  options: FilterOption[] | undefined;
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
}) {
  if (!options || options.length === 0) return null;

  const handleToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter(c => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  return (
    <div className="space-y-2">
      {options.map(option => {
        const isSelected = selectedCategories.includes(option.code);
        const info = REIMB_CATEGORY_INFO[option.code];

        return (
          <label
            key={option.code}
            className={cn(
              'flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer',
              'hover:bg-gray-100 dark:hover:bg-gray-700/50'
            )}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggle(option.code)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex-1 text-sm">
              <span className="font-medium">{info?.label || option.code}</span>
              {info?.description && (
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  ({info.description})
                </span>
              )}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {option.count}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * Price range inputs
 */
function PriceRangeInputs({
  availableRange,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  availableRange?: { min: number; max: number };
  minValue?: number;
  maxValue?: number;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
}) {
  const { t } = useTranslation();

  if (!availableRange) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{t('search.priceRange')}: {availableRange.min.toFixed(2)} - {availableRange.max.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="sr-only">{t('search.minPrice')}</label>
          <input
            type="number"
            min={availableRange.min}
            max={availableRange.max}
            step="0.01"
            value={minValue ?? ''}
            onChange={(e) => onMinChange(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder={t('search.minPrice')}
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <span className="text-gray-400">-</span>
        <div className="flex-1">
          <label className="sr-only">{t('search.maxPrice')}</label>
          <input
            type="number"
            min={availableRange.min}
            max={availableRange.max}
            step="0.01"
            value={maxValue ?? ''}
            onChange={(e) => onMaxChange(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder={t('search.maxPrice')}
            className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * FilterPanel - Advanced filters for Phase B
 * Shows filters based on available data from search results
 */
export function FilterPanel({
  availableFilters,
  facets,
  selectedFormCodes,
  selectedRouteCodes,
  selectedReimbCategories,
  priceMin,
  priceMax,
  onFormChange,
  onRouteChange,
  onReimbCategoryChange,
  onPriceMinChange,
  onPriceMaxChange,
  className,
}: FilterPanelProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Determine which sections to show based on facets and available filters
  const hasAmpResults = facets.amp > 0;
  const hasAmppResults = facets.ampp > 0;
  const hasFormFilter = availableFilters?.forms && availableFilters.forms.length > 0;
  const hasRouteFilter = availableFilters?.routes && availableFilters.routes.length > 0;
  const hasReimbFilter = availableFilters?.reimbCategories && availableFilters.reimbCategories.length > 0;
  const hasPriceFilter = availableFilters?.priceRange !== undefined;

  // Hide panel if no filters are available
  if (!availableFilters || (!hasFormFilter && !hasRouteFilter && !hasReimbFilter && !hasPriceFilter)) {
    return null;
  }

  return (
    <div className={cn('space-y-1', className)}>
      {/* Brand (AMP) Filters */}
      {(hasAmpResults || hasAmppResults) && (hasFormFilter || hasRouteFilter) && (
        <FilterSection title={t('search.brandFilters')} defaultExpanded>
          <div className="space-y-4">
            {/* Pharmaceutical Form */}
            {hasFormFilter && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('search.pharmaceuticalForm')}
                </label>
                <MultiSelectDropdown
                  options={availableFilters.forms}
                  selectedCodes={selectedFormCodes}
                  onChange={onFormChange}
                  placeholder={t('search.selectForms')}
                  emptyMessage={t('search.noFormsAvailable')}
                  lang={language}
                />
              </div>
            )}

            {/* Route of Administration */}
            {hasRouteFilter && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('search.routeOfAdministration')}
                </label>
                <MultiSelectDropdown
                  options={availableFilters.routes}
                  selectedCodes={selectedRouteCodes}
                  onChange={onRouteChange}
                  placeholder={t('search.selectRoutes')}
                  emptyMessage={t('search.noRoutesAvailable')}
                  lang={language}
                />
              </div>
            )}
          </div>
        </FilterSection>
      )}

      {/* Package (AMPP) Filters */}
      {hasAmppResults && (hasReimbFilter || hasPriceFilter) && (
        <FilterSection title={t('search.packageFilters')} defaultExpanded>
          <div className="space-y-4">
            {/* Reimbursement Category */}
            {hasReimbFilter && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('search.reimbursementCategory')}
                </label>
                <ReimbCategoryCheckboxes
                  options={availableFilters.reimbCategories}
                  selectedCategories={selectedReimbCategories}
                  onChange={onReimbCategoryChange}
                />
              </div>
            )}

            {/* Price Range */}
            {hasPriceFilter && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('search.priceRange')}
                </label>
                <PriceRangeInputs
                  availableRange={availableFilters.priceRange}
                  minValue={priceMin}
                  maxValue={priceMax}
                  onMinChange={onPriceMinChange}
                  onMaxChange={onPriceMaxChange}
                />
              </div>
            )}
          </div>
        </FilterSection>
      )}
    </div>
  );
}
