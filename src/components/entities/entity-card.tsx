'use client';

import Link from 'next/link';
import { ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import { Card } from '@/components/ui/card';
import { EntityTypeBadge } from './entity-type-badge';
import { ReimbursementBadge } from './reimbursement-badge';
import { CodeDisplay } from '@/components/shared/code-display';
import { useLinks, useTranslation } from '@/lib/hooks';
import { LocalizedText } from '@/components/shared/localized-text';
import { formatPrice } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { SearchResultItem } from '@/server/types/api';

interface EntityCardProps {
  entity: SearchResultItem;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function EntityCard({ entity, variant = 'default', className }: EntityCardProps) {
  const links = useLinks();
  const { t } = useTranslation();
  const href = links.toEntity(entity.entityType, entity.name, entity.code);

  const isCompact = variant === 'compact';

  return (
    <Link href={href} className="block group">
      <Card
        hover
        padding={isCompact ? 'sm' : 'md'}
        className={cn(
          'transition-all duration-200',
          className
        )}
      >
        <div className="flex items-start gap-3">
          {/* Type badge */}
          <EntityTypeBadge
            type={entity.entityType}
            size={isCompact ? 'sm' : 'md'}
            className="flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Primary name */}
            <div className="flex items-center gap-2">
              <h3 className={cn(
                'font-medium text-gray-900 dark:text-gray-100 truncate',
                'group-hover:text-blue-600 dark:group-hover:text-blue-400',
                isCompact ? 'text-sm' : 'text-base'
              )}>
                <LocalizedText text={entity.name} />
              </h3>
              {entity.blackTriangle && (
                <ExclamationTriangleIcon
                  className="h-4 w-4 text-amber-500 flex-shrink-0"
                  title={t('detail.enhancedMonitoringRequired')}
                />
              )}
            </div>

            {/* Secondary info */}
            {!isCompact && (
              <div className="mt-1 space-y-1">
                {/* Parent/context info */}
                {entity.parentName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {entity.entityType === 'amp' && t('card.generic') + ' '}
                    {entity.entityType === 'vmp' && t('card.substance') + ' '}
                    {entity.entityType === 'ampp' && t('card.brand') + ' '}
                    <LocalizedText text={entity.parentName} showFallbackIndicator={false} />
                  </p>
                )}

                {/* Company name */}
                {entity.companyName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {entity.companyName}
                  </p>
                )}

                {/* Pack info for AMPP */}
                {entity.packInfo && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {entity.packInfo}
                  </p>
                )}

                {/* Product count for company */}
                {entity.productCount !== undefined && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {entity.productCount} {t('common.products')}
                  </p>
                )}
              </div>
            )}

            {/* Footer with price/CNK/reimbursement */}
            {!isCompact && (entity.price !== undefined || entity.cnkCode || entity.reimbursable) && (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                {entity.cnkCode && (
                  <CodeDisplay
                    type="cnk"
                    value={entity.cnkCode}
                    variant="short"
                    showTooltip
                    className="text-xs text-gray-500 dark:text-gray-400"
                  />
                )}
                {entity.price !== undefined && (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatPrice(entity.price)}
                  </span>
                )}
                {entity.reimbursementCategory && (
                  <ReimbursementBadge category={entity.reimbursementCategory} />
                )}
              </div>
            )}
          </div>

          {/* Arrow */}
          <ChevronRightIcon
            className={cn(
              'flex-shrink-0 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300',
              'transition-transform group-hover:translate-x-0.5',
              isCompact ? 'h-4 w-4' : 'h-5 w-5'
            )}
          />
        </div>
      </Card>
    </Link>
  );
}
