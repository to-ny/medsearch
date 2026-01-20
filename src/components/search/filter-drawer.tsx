'use client';

import { useState, useCallback, useEffect } from 'react';
import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks';
import type { EntityType } from '@/server/types/domain';

interface FilterDrawerProps {
  children: React.ReactNode;
  activeFilterCount: number;
}

export function FilterDrawer({ children, activeFilterCount }: FilterDrawerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    // Prevent body scroll when drawer is open
    document.body.style.overflow = 'hidden';
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = '';
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeDrawer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      {/* Mobile filter button - only visible on small screens */}
      <button
        type="button"
        onClick={openDrawer}
        className="md:hidden inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('search.filters')}
        aria-expanded={isOpen}
        aria-controls="filter-drawer"
      >
        <FunnelIcon className="h-5 w-5" />
        <span>{t('search.filters')}</span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-medium">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Drawer backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        id="filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('search.filters')}
        className={cn(
          'md:hidden fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-gray-900 shadow-xl',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('search.filters')}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Drawer content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {/* Drawer footer */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={closeDrawer}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('search.applyFilters')}
          </button>
        </div>
      </div>
    </>
  );
}

interface MobileFilterContentProps {
  /** Entity type filter */
  selectedTypes: EntityType[];
  facets: Record<EntityType, number>;
  onTypesChange: (types: EntityType[]) => void;
  /** Reimbursable toggle */
  reimbursable: boolean;
  onReimbursableToggle: () => void;
  /** Black triangle toggle */
  blackTriangle: boolean;
  onBlackTriangleToggle: () => void;
  /** Clear all */
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function MobileFilterContent({
  selectedTypes,
  facets,
  onTypesChange,
  reimbursable,
  onReimbursableToggle,
  blackTriangle,
  onBlackTriangleToggle,
  onClearAll,
  hasActiveFilters,
}: MobileFilterContentProps) {
  const { t } = useTranslation();

  const entityTypes: { key: EntityType; label: string }[] = [
    { key: 'vtm', label: t('entityLabels.substance') },
    { key: 'vmp', label: t('entityLabels.generic') },
    { key: 'amp', label: t('entityLabels.brand') },
    { key: 'ampp', label: t('entityLabels.package') },
    { key: 'company', label: t('entityLabels.company') },
    { key: 'vmp_group', label: t('entityLabels.group') },
    { key: 'substance', label: t('entityLabels.ingredient') },
    { key: 'atc', label: t('entityLabels.atc') },
  ];

  const handleTypeToggle = (type: EntityType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Clear all button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {t('search.clearAllFilters')}
        </button>
      )}

      {/* Entity type filters */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('search.entityTypes')}
        </h3>
        <div className="space-y-2">
          {entityTypes.map(({ key, label }) => {
            const count = facets[key] || 0;
            const isSelected = selectedTypes.includes(key);
            const isDisabled = count === 0 && !isSelected;

            return (
              <button
                key={key}
                type="button"
                onClick={() => !isDisabled && handleTypeToggle(key)}
                disabled={isDisabled}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  isSelected
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : isDisabled
                    ? 'opacity-50 cursor-not-allowed text-gray-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                )}
              >
                <span>{label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contextual filters */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('search.contextFilters')}
        </h3>
        <div className="space-y-2">
          {/* Reimbursable toggle */}
          {facets.ampp > 0 && (
            <button
              type="button"
              onClick={onReimbursableToggle}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                reimbursable
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              <span>{t('search.reimbursableOnly')}</span>
              <span className="w-4 h-4 rounded border flex items-center justify-center text-xs">
                {reimbursable && '✓'}
              </span>
            </button>
          )}

          {/* Black triangle toggle */}
          {facets.amp > 0 && (
            <button
              type="button"
              onClick={onBlackTriangleToggle}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                blackTriangle
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">▲</span>
                {t('search.blackTriangleOnly')}
              </span>
              <span className="w-4 h-4 rounded border flex items-center justify-center text-xs">
                {blackTriangle && '✓'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
