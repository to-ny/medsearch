import { cn } from '@/lib/utils/cn';
import { getLastSyncMetadata } from '@/server/actions/batch-lookup';

interface SAMDataBadgeProps {
  className?: string;
  showDate?: boolean;
}

/**
 * Server component that displays SAM data attribution badge with last sync date
 * Cached for 1 hour (using Next.js cache)
 */
export async function SAMDataBadge({
  className,
  showDate = true,
}: SAMDataBadgeProps) {
  const syncMetadata = await getLastSyncMetadata();

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-BE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const lastSyncDate = syncMetadata?.lastSyncDate
    ? formatDate(syncMetadata.lastSyncDate)
    : null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 group relative',
        className
      )}
    >
      <a
        href="https://www.famhp.be/en"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
          'bg-blue-50 dark:bg-blue-900/30',
          'text-blue-700 dark:text-blue-300',
          'hover:bg-blue-100 dark:hover:bg-blue-900/50',
          'transition-colors text-xs font-medium'
        )}
        title="SAM (Specialized and Authentic Medicines) is Belgium's official medication database maintained by FAMHP/AFMPS."
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>Official SAM Data</span>
        {showDate && lastSyncDate && (
          <span className="text-blue-500 dark:text-blue-400">
            ({lastSyncDate})
          </span>
        )}
      </a>
    </div>
  );
}

/**
 * Client-friendly wrapper that doesn't fetch data
 * Use this when you only want the static badge without sync date
 */
export function SAMDataBadgeStatic({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <a
        href="https://www.famhp.be/en"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
          'bg-blue-50 dark:bg-blue-900/30',
          'text-blue-700 dark:text-blue-300',
          'hover:bg-blue-100 dark:hover:bg-blue-900/50',
          'transition-colors text-xs font-medium'
        )}
        title="SAM (Specialized and Authentic Medicines) is Belgium's official medication database maintained by FAMHP/AFMPS."
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>Official SAM Data</span>
      </a>
    </div>
  );
}
