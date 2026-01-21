'use client';

import { useTranslation } from '@/lib/hooks';
import { cn } from '@/lib/utils/cn';

interface ReimbursementIndicatorProps {
  /** Percentage of reimbursable packages (0-100) */
  percentage: number | null;
  /** Optional detailed count */
  count?: {
    reimbursable: number;
    total: number;
  };
  /** Whether to use compact display for sidebars */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays reimbursement percentage with optional counts.
 * Shows percentage with % symbol.
 * Compact mode for sidebar use.
 */
export function ReimbursementIndicator({
  percentage,
  count,
  compact = false,
  className,
}: ReimbursementIndicatorProps) {
  const { t } = useTranslation();

  // Handle null/undefined percentage
  if (percentage === null || percentage === undefined) {
    return null;
  }

  // Round to integer
  const roundedPercent = Math.round(percentage);

  // Determine color based on percentage
  const getColorClass = () => {
    if (roundedPercent >= 75) return 'text-green-600 dark:text-green-400';
    if (roundedPercent >= 50) return 'text-blue-600 dark:text-blue-400';
    if (roundedPercent > 0) return 'text-amber-600 dark:text-amber-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  if (compact) {
    return (
      <span className={cn('font-medium', getColorClass(), className)}>
        {roundedPercent}%
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn('font-medium', getColorClass())}>
        {roundedPercent}%
      </span>
      {count && (
        <span className="text-gray-400 dark:text-gray-500 text-sm">
          ({count.reimbursable}/{count.total})
        </span>
      )}
      <span className="text-gray-500 dark:text-gray-400 text-sm">
        {t('sidebar.reimbursablePercent')}
      </span>
    </span>
  );
}
