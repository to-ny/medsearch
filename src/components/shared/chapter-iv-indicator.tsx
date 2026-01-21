'use client';

import { useTranslation } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface ChapterIVIndicatorProps {
  /** Whether the entity has Chapter IV requirements */
  hasChapterIV: boolean;
  /** Optional count of Chapter IV requirements */
  count?: number;
  /** Whether to use compact display */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays Chapter IV (prior authorization) indicator.
 * Shows Yes/No or icon-based indicator with optional count.
 */
export function ChapterIVIndicator({
  hasChapterIV,
  count,
  compact = false,
  className,
}: ChapterIVIndicatorProps) {
  const { t } = useTranslation();

  if (compact) {
    if (!hasChapterIV) {
      return (
        <span className={cn('text-gray-400 dark:text-gray-500', className)}>
          {t('common.no')}
        </span>
      );
    }

    return (
      <span className={cn('font-medium text-amber-600 dark:text-amber-400', className)}>
        {t('common.yes')}
        {count !== undefined && count > 0 && (
          <span className="text-gray-400 dark:text-gray-500 ml-1">({count})</span>
        )}
      </span>
    );
  }

  if (!hasChapterIV) {
    return null;
  }

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Badge variant="warning" size="sm">
        {t('sidebar.chapterIV')}
      </Badge>
      {count !== undefined && count > 0 && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({count})
        </span>
      )}
    </div>
  );
}
