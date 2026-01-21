'use client';

import { useState } from 'react';
import { FunnelIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';
import type { EntityType } from '@/server/types/domain';
import { ENTITY_TYPE_CONFIG } from '@/server/types/domain';

// Maps entity types to their user-friendly label translation keys
const ENTITY_LABEL_KEYS: Record<EntityType, string> = {
  vtm: 'entityLabels.substance',
  vmp: 'entityLabels.generic',
  amp: 'entityLabels.brand',
  ampp: 'entityLabels.package',
  company: 'entityLabels.company',
  vmp_group: 'entityLabels.group',
  substance: 'entityLabels.ingredient',
  atc: 'entityLabels.atc',
};

interface QuickFiltersProps {
  selectedTypes: EntityType[];
  facets: Record<EntityType, number>;
  onTypesChange: (types: EntityType[]) => void;
  filteredTypes?: EntityType[];
  activeFilterCount: number;
  onFiltersClick: () => void;
  className?: string;
}

const TYPE_ORDER: EntityType[] = ['vtm', 'vmp', 'amp', 'ampp', 'company', 'vmp_group', 'substance', 'atc'];

export function QuickFilters({
  selectedTypes,
  facets,
  onTypesChange,
  filteredTypes = [],
  activeFilterCount,
  onFiltersClick,
  className,
}: QuickFiltersProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const totalCount = Object.values(facets).reduce((sum, count) => sum + count, 0);
  const isAllSelected = selectedTypes.length === 0;

  const handleTypeClick = (type: EntityType | 'all') => {
    if (type === 'all') {
      onTypesChange([]);
    } else {
      if (selectedTypes.includes(type)) {
        onTypesChange(selectedTypes.filter((t) => t !== type));
      } else {
        onTypesChange([...selectedTypes, type]);
      }
    }
  };

  // Get visible badges based on expand/collapse state
  const getVisibleBadges = () => {
    // Filter to types with results or targeted by filters
    const availableTypes = TYPE_ORDER.filter(t => facets[t] > 0 || filteredTypes.includes(t));

    // Sort by count descending
    const sortedByCount = [...availableTypes].sort((a, b) => (facets[b] || 0) - (facets[a] || 0));

    if (isExpanded) {
      return { visible: sortedByCount, overflow: 0 };
    }

    // Take top 3
    const top3 = sortedByCount.slice(0, 3);

    // Add any selected types not in top 3
    const selectedNotInTop3 = selectedTypes.filter(t => !top3.includes(t) && availableTypes.includes(t));

    // Also add filteredTypes that are in availableTypes but not in top 3 (these have active filters targeting them)
    const filteredNotInTop3 = filteredTypes.filter(t => !top3.includes(t) && availableTypes.includes(t));

    const visible = [...new Set([...top3, ...selectedNotInTop3, ...filteredNotInTop3])];

    // Calculate overflow count
    const overflow = sortedByCount.length - visible.length;

    return { visible, overflow };
  };

  const { visible: visibleTypes, overflow } = getVisibleBadges();

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Entity type badges */}
      <button
        onClick={() => handleTypeClick('all')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isAllSelected
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
        )}
        aria-pressed={isAllSelected}
      >
        {t('common.all')}
        <span className="text-xs opacity-75">({totalCount})</span>
      </button>

      {visibleTypes.map((type) => {
        const count = facets[type] || 0;
        const isSelected = selectedTypes.includes(type);
        const config = ENTITY_TYPE_CONFIG[type];

        return (
          <button
            key={type}
            onClick={() => handleTypeClick(type)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              isSelected
                ? 'text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
            style={{
              backgroundColor: isSelected ? config.color : undefined,
            }}
            aria-pressed={isSelected}
          >
            {t(ENTITY_LABEL_KEYS[type])}
            <span className="text-xs opacity-75">({count})</span>
          </button>
        );
      })}

      {/* Expand/Collapse button */}
      {(overflow > 0 || isExpanded) && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          )}
          aria-expanded={isExpanded}
        >
          {isExpanded ? t('search.showLess') : `+${overflow}`}
        </button>
      )}

      {/* Filters button */}
      <button
        onClick={onFiltersClick}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          activeFilterCount > 0
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
        )}
      >
        <FunnelIcon className="h-4 w-4" />
        {t('search.filters')}
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-xs">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}
