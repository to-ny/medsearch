'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { EntityTypeBadge } from './entity-type-badge';
import { PriceDisplay } from '@/components/shared/price-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useLinks, useTranslation } from '@/lib/hooks';
import { LocalizedText } from '@/components/shared/localized-text';
import type { MultilingualText } from '@/server/types/domain';

interface ProductItem {
  code: string;
  name: MultilingualText | null;
  linkCode: string | null;  // amppCtiExtended for linking
  price?: number | null;
  reimbursable?: boolean;
  deliveryEnvironment?: 'P' | 'H';
  subtitle?: string;
}

interface ProductListProps {
  title: string;
  items: ProductItem[];
  maxInitialDisplay?: number;
  className?: string;
  /** URL for "search all" link */
  searchHref?: string;
}

export function ProductList({
  title,
  items,
  maxInitialDisplay = 5,
  className,
  searchHref,
}: ProductListProps) {
  const [showAll, setShowAll] = useState(false);
  const links = useLinks();
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  const displayedItems = showAll ? items : items.slice(0, maxInitialDisplay);
  const hasMore = items.length > maxInitialDisplay;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({items.length})
          </span>
        </h3>
        {searchHref && (
          <Link
            href={searchHref}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title={t('common.searchAll')}
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.searchAll')}</span>
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {displayedItems.map((item) => {
          const content = (
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              'bg-gray-50 dark:bg-gray-800/50',
              item.linkCode && 'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors duration-150'
            )}>
              <EntityTypeBadge type="ampp" size="sm" />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-medium text-gray-900 dark:text-gray-100 truncate',
                  item.linkCode && 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                )}>
                  {item.name ? <LocalizedText text={item.name} /> : item.code}
                </p>
                {item.subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {item.subtitle}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  CNK: {item.code}
                  {item.deliveryEnvironment && (
                    <span className="ml-2">
                      ({item.deliveryEnvironment === 'P' ? t('detail.public') : t('detail.hospital')})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.reimbursable && (
                  <Badge variant="success" size="sm">{t('detail.reimbursable')}</Badge>
                )}
                <PriceDisplay amount={item.price ?? null} size="sm" showNull nullText="-" />
                {item.linkCode && (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                )}
              </div>
            </div>
          );

          return item.linkCode ? (
            <Link
              key={`${item.code}-${item.deliveryEnvironment}`}
              href={links.toPackage(item.name, item.linkCode)}
              className="block group"
            >
              {content}
            </Link>
          ) : (
            <div key={`${item.code}-${item.deliveryEnvironment}`}>
              {content}
            </div>
          );
        })}
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
