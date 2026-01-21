'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CheckIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';
import { useLanguage } from '@/lib/hooks/use-language';
import type { AvailableFilters, FilterOption } from '@/server/types/api';
import type { EntityType, MultilingualText } from '@/server/types/domain';

export interface ModalFilterValues {
  reimbursable: boolean;
  chapterIV: boolean;
  deliveryEnv: 'P' | 'H' | undefined;
  blackTriangle: boolean;
  medicineType: string | undefined;
  formCodes: string[];
  routeCodes: string[];
  reimbCategories: string[];
  priceMin: number | undefined;
  priceMax: number | undefined;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (values: ModalFilterValues) => void;
  onReset: () => void;
  initialValues: ModalFilterValues;
  availableFilters?: AvailableFilters;
  facets: Record<EntityType, number>;
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

const DEFAULT_VALUES: ModalFilterValues = {
  reimbursable: false,
  chapterIV: false,
  deliveryEnv: undefined,
  blackTriangle: false,
  medicineType: undefined,
  formCodes: [],
  routeCodes: [],
  reimbCategories: [],
  priceMin: undefined,
  priceMax: undefined,
};

/**
 * Get localized text from multilingual object
 */
function getLocalizedName(name: MultilingualText | undefined, lang: string): string {
  if (!name) return '';
  return name[lang as keyof MultilingualText] || name.en || name.nl || name.fr || '';
}

/**
 * Multi-select dropdown component for modal
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

export function FilterModal({
  isOpen,
  onClose,
  onApply,
  onReset,
  initialValues,
  availableFilters,
  facets,
}: FilterModalProps) {
  // Only render the modal content when open
  // This ensures fresh state each time the modal opens
  if (!isOpen) return null;

  return (
    <FilterModalContent
      onClose={onClose}
      onApply={onApply}
      onReset={onReset}
      initialValues={initialValues}
      availableFilters={availableFilters}
      facets={facets}
    />
  );
}

/**
 * Internal modal content component - remounts when modal opens
 * This ensures pendingValues is reset from initialValues on each open
 */
function FilterModalContent({
  onClose,
  onApply,
  onReset,
  initialValues,
  availableFilters,
  facets,
}: Omit<FilterModalProps, 'isOpen'>) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [pendingValues, setPendingValues] = useState<ModalFilterValues>(initialValues);

  // Close on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Determine which sections to show
  const hasAmppResults = facets.ampp > 0 || pendingValues.reimbursable || pendingValues.chapterIV || pendingValues.deliveryEnv;
  const hasAmpResults = facets.amp > 0 || pendingValues.blackTriangle || pendingValues.medicineType;
  const hasFormFilter = availableFilters?.forms && availableFilters.forms.length > 0;
  const hasRouteFilter = availableFilters?.routes && availableFilters.routes.length > 0;
  const hasReimbFilter = availableFilters?.reimbCategories && availableFilters.reimbCategories.length > 0;
  const hasPriceFilter = availableFilters?.priceRange !== undefined;

  const showAvailabilitySection = hasAmppResults;
  const showBrandSection = hasAmpResults || hasFormFilter || hasRouteFilter;
  const showPackageSection = hasAmppResults && (hasReimbFilter || hasPriceFilter);

  const handleApply = () => {
    onApply(pendingValues);
  };

  const handleReset = () => {
    setPendingValues(DEFAULT_VALUES);
    onReset();
  };

  const handleReimbCategoryToggle = (category: string) => {
    const current = pendingValues.reimbCategories;
    if (current.includes(category)) {
      setPendingValues({ ...pendingValues, reimbCategories: current.filter(c => c !== category) });
    } else {
      setPendingValues({ ...pendingValues, reimbCategories: [...current, category] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-modal-title"
          className={cn(
            'relative bg-white dark:bg-gray-900 shadow-xl transition-all',
            'w-full sm:max-w-lg sm:rounded-lg',
            'max-h-[90vh] sm:max-h-[80vh] flex flex-col',
            // Full screen on mobile
            'h-[100dvh] sm:h-auto rounded-t-2xl sm:rounded-lg'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2
              id="filter-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {t('search.filters')}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Availability Section */}
            {showAvailabilitySection && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  {t('search.availabilitySection')}
                </h3>
                <div className="space-y-3">
                  {/* Reimbursable */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pendingValues.reimbursable}
                      onChange={(e) => setPendingValues({ ...pendingValues, reimbursable: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {t('search.reimbursableOnly')}
                    </span>
                  </label>

                  {/* Chapter IV */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={pendingValues.chapterIV}
                      onChange={(e) => setPendingValues({ ...pendingValues, chapterIV: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100">
                      {t('search.chapterIVOnly')}
                      <span className="relative group/tooltip">
                        <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg z-10">
                          {t('search.chapterIVTooltip')}
                        </span>
                      </span>
                    </span>
                  </label>

                  {/* Delivery Environment */}
                  <div>
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('search.deliveryEnvironment')}
                    </div>
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <button
                        type="button"
                        onClick={() => setPendingValues({ ...pendingValues, deliveryEnv: undefined })}
                        className={cn(
                          'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                          !pendingValues.deliveryEnv
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        )}
                      >
                        {t('search.allEnvironments')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingValues({ ...pendingValues, deliveryEnv: 'P' })}
                        className={cn(
                          'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                          pendingValues.deliveryEnv === 'P'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        )}
                      >
                        {t('search.publicOnly')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingValues({ ...pendingValues, deliveryEnv: 'H' })}
                        className={cn(
                          'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                          pendingValues.deliveryEnv === 'H'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        )}
                      >
                        {t('search.hospitalOnly')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Brand Properties Section */}
            {showBrandSection && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  {t('search.brandPropertiesSection')}
                </h3>
                <div className="space-y-4">
                  {/* Black Triangle */}
                  {hasAmpResults && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={pendingValues.blackTriangle}
                        onChange={(e) => setPendingValues({ ...pendingValues, blackTriangle: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100">
                        <span className="text-xs">▲</span>
                        {t('search.blackTriangleOnly')}
                        <span className="relative group/tooltip">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg z-10">
                            {t('search.blackTriangleTooltip')}
                          </span>
                        </span>
                      </span>
                    </label>
                  )}

                  {/* Medicine Type */}
                  {hasAmpResults && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t('search.medicineType')}
                      </label>
                      <select
                        value={pendingValues.medicineType || ''}
                        onChange={(e) => setPendingValues({ ...pendingValues, medicineType: e.target.value || undefined })}
                        className="w-full px-3 py-2 rounded-md text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">{t('common.all')}</option>
                        <option value="ALLOPATHIC">{t('medicineTypes.ALLOPATHIC')}</option>
                        <option value="HOMEOPATHIC">{t('medicineTypes.HOMEOPATHIC')}</option>
                        <option value="PHYTOTHERAPY">{t('medicineTypes.PHYTOTHERAPY')}</option>
                        <option value="ANTHROPOSOPHIC">{t('medicineTypes.ANTHROPOSOPHIC')}</option>
                        <option value="TRADITIONAL_HERBAL">{t('medicineTypes.TRADITIONAL_HERBAL')}</option>
                      </select>
                    </div>
                  )}

                  {/* Pharmaceutical Form */}
                  {hasFormFilter && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t('search.pharmaceuticalForm')}
                      </label>
                      <MultiSelectDropdown
                        options={availableFilters?.forms}
                        selectedCodes={pendingValues.formCodes}
                        onChange={(codes) => setPendingValues({ ...pendingValues, formCodes: codes })}
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
                        options={availableFilters?.routes}
                        selectedCodes={pendingValues.routeCodes}
                        onChange={(codes) => setPendingValues({ ...pendingValues, routeCodes: codes })}
                        placeholder={t('search.selectRoutes')}
                        emptyMessage={t('search.noRoutesAvailable')}
                        lang={language}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Package Properties Section */}
            {showPackageSection && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  {t('search.packagePropertiesSection')}
                </h3>
                <div className="space-y-4">
                  {/* Reimbursement Category */}
                  {hasReimbFilter && availableFilters?.reimbCategories && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('search.reimbursementCategory')}
                      </label>
                      <div className="space-y-2">
                        {availableFilters.reimbCategories.map(option => {
                          const isSelected = pendingValues.reimbCategories.includes(option.code);
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
                                onChange={() => handleReimbCategoryToggle(option.code)}
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
                    </div>
                  )}

                  {/* Price Range */}
                  {hasPriceFilter && availableFilters?.priceRange && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('search.priceRange')}
                      </label>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>{availableFilters.priceRange.min.toFixed(2)} - {availableFilters.priceRange.max.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="sr-only">{t('search.minPrice')}</label>
                          <input
                            type="number"
                            min={availableFilters.priceRange.min}
                            max={availableFilters.priceRange.max}
                            step="0.01"
                            value={pendingValues.priceMin ?? ''}
                            onChange={(e) => setPendingValues({ ...pendingValues, priceMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder={t('search.minPrice')}
                            className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <span className="text-gray-400">-</span>
                        <div className="flex-1">
                          <label className="sr-only">{t('search.maxPrice')}</label>
                          <input
                            type="number"
                            min={availableFilters.priceRange.min}
                            max={availableFilters.priceRange.max}
                            step="0.01"
                            value={pendingValues.priceMax ?? ''}
                            onChange={(e) => setPendingValues({ ...pendingValues, priceMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder={t('search.maxPrice')}
                            className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No filters available message */}
            {!showAvailabilitySection && !showBrandSection && !showPackageSection && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No additional filters available
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              {t('search.reset')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('search.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
