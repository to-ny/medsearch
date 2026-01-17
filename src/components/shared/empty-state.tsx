'use client';

import { MagnifyingGlassIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';

type EmptyStateVariant = 'no-query' | 'no-results' | 'error';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  query?: string;
  onRetry?: () => void;
  className?: string;
}

export function EmptyState({ variant, query, onRetry, className }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('text-center py-12 px-4', className)}>
      {variant === 'no-query' && (
        <>
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('emptyState.searchDatabaseTitle')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
            {t('emptyState.searchDatabaseDescription')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('home.examples')}: &quot;ibuprofen&quot;, &quot;3234567&quot; (CNK), &quot;Pfizer&quot;
          </p>
        </>
      )}

      {variant === 'no-results' && (
        <>
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('emptyState.noResultsFor')}{query && ` "${query}"`}
          </h3>
          <div className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            <p className="mb-3">{t('emptyState.tryTitle')}</p>
            <ul className="text-sm space-y-1 text-left inline-block">
              <li>&#8226; {t('emptyState.tryCheckSpelling')}</li>
              <li>&#8226; {t('emptyState.tryFewerWords')}</li>
              <li>&#8226; {t('emptyState.tryCnkCode')}</li>
              <li>&#8226; {t('emptyState.tryDifferentLanguage')}</li>
            </ul>
          </div>
        </>
      )}

      {variant === 'error' && (
        <>
          <ExclamationCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('emptyState.unableToLoadTitle')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
            {t('emptyState.unableToLoadDescription')}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="primary">
              {t('common.retrySearch')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
