'use client';

import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { useLinks, useTranslation } from '@/lib/hooks';
import type { SearchLinkParams } from '@/lib/hooks/use-links';
import { cn } from '@/lib/utils/cn';

interface SearchAllLinkProps {
  /** Filter parameters to pass to the search page */
  filters: SearchLinkParams;
  /** Optional label override (defaults to translated "View all") */
  label?: string;
  /** Optional count to display */
  count?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show as a compact inline link */
  compact?: boolean;
}

/**
 * Standardized "View all in search" link component with filter params.
 * Generates URL using the existing useLinks().toSearch() pattern.
 */
export function SearchAllLink({
  filters,
  label,
  count,
  className,
  compact = false,
}: SearchAllLinkProps) {
  const links = useLinks();
  const { t } = useTranslation();

  const displayLabel = label || t('common.searchAll');
  const href = links.toSearch(filters);

  if (compact) {
    return (
      <Link
        href={href}
        className={cn(
          'inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors',
          className
        )}
        title={displayLabel}
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{displayLabel}</span>
        {count !== undefined && (
          <span className="text-gray-400 dark:text-gray-500">({count})</span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors',
        className
      )}
    >
      <MagnifyingGlassIcon className="h-4 w-4" />
      <span>{displayLabel}</span>
      {count !== undefined && (
        <span className="text-gray-400 dark:text-gray-500">({count})</span>
      )}
    </Link>
  );
}
