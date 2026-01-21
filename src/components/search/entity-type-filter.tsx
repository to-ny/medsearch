'use client';

import { cn } from '@/lib/utils/cn';
import type { EntityType } from '@/server/types/domain';
import { ENTITY_TYPE_CONFIG } from '@/server/types/domain';
import { useTranslation } from '@/lib/hooks/use-translation';

interface EntityTypeFilterProps {
  selectedTypes: EntityType[];
  facets: Record<EntityType, number>;
  onChange: (types: EntityType[]) => void;
  className?: string;
  /** Entity types that have active filters targeting them (show even if count=0) */
  filteredTypes?: EntityType[];
}

const TYPE_ORDER: EntityType[] = ['vtm', 'vmp', 'amp', 'ampp', 'company', 'vmp_group', 'substance', 'atc'];

export function EntityTypeFilter({
  selectedTypes,
  facets,
  onChange,
  className,
  filteredTypes = [],
}: EntityTypeFilterProps) {
  const { t } = useTranslation();
  const totalCount = Object.values(facets).reduce((sum, count) => sum + count, 0);
  const isAllSelected = selectedTypes.length === 0;

  const handleTypeClick = (type: EntityType | 'all') => {
    if (type === 'all') {
      onChange([]);
    } else {
      if (selectedTypes.includes(type)) {
        const newTypes = selectedTypes.filter((t) => t !== type);
        onChange(newTypes);
      } else {
        onChange([...selectedTypes, type]);
      }
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        className
      )}
      role="group"
      aria-label="Filter by entity type"
    >
      {/* All filter */}
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

      {/* Type filters */}
      {TYPE_ORDER.map((type) => {
        const count = facets[type] || 0;
        const isSelected = selectedTypes.includes(type);
        const config = ENTITY_TYPE_CONFIG[type];
        const isFilteredType = filteredTypes.includes(type);

        // Hide if count is 0, unless this type has active filters targeting it
        if (count === 0 && !isFilteredType) return null;

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
            {t(config.labelKey)}
            <span className="text-xs opacity-75">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
