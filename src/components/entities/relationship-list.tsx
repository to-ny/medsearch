'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { EntityTypeBadge } from './entity-type-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useLinks, useTranslation } from '@/lib/hooks';
import { LocalizedText } from '@/components/shared/localized-text';
import type { EntityType, MultilingualText } from '@/server/types/domain';

interface RelationshipItem {
  entityType: EntityType;
  code: string;
  name: MultilingualText;
  subtitle?: string;
}

type SearchFilter =
  | { type: 'vtm'; code: string }
  | { type: 'vmp'; code: string }
  | { type: 'amp'; code: string }
  | { type: 'atc'; code: string }
  | { type: 'company'; code: string }
  | { type: 'vmpGroup'; code: string };

interface RelationshipListProps {
  title: string;
  items: RelationshipItem[];
  maxInitialDisplay?: number;
  className?: string;
  /** Filter for search link - uses proper relationship filtering instead of text search */
  searchFilter?: SearchFilter;
  /** Entity type to filter results by in search */
  searchType?: EntityType;
}

export function RelationshipList({
  title,
  items,
  maxInitialDisplay = 5,
  className,
  searchFilter,
  searchType,
}: RelationshipListProps) {
  const [showAll, setShowAll] = useState(false);
  const links = useLinks();
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  const displayedItems = showAll ? items : items.slice(0, maxInitialDisplay);
  const hasMore = items.length > maxInitialDisplay;

  // Build search URL with proper filter parameter
  let searchUrl: string | null = null;
  if (searchFilter && searchType) {
    searchUrl = links.toSearch({
      [searchFilter.type]: searchFilter.code,
      types: searchType,
    });
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({items.length})
          </span>
        </h3>
        {searchUrl && (
          <Link
            href={searchUrl}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title={t('common.searchAll')}
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.searchAll')}</span>
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {displayedItems.map((item) => (
          <Link
            key={`${item.entityType}-${item.code}`}
            href={links.toEntity(item.entityType, item.name, item.code)}
            className="group block"
          >
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              'bg-gray-50 dark:bg-gray-800/50',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors duration-150'
            )}>
              <EntityTypeBadge type={item.entityType} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <LocalizedText text={item.name} />
                </p>
                {item.subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full"
        >
          {showAll ? t('common.showLess') : `${t('common.showAll')} ${items.length}`}
        </Button>
      )}
    </div>
  );
}
