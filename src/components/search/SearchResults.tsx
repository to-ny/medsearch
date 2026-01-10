'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ChapterIVBadge } from '@/components/medication/ChapterIVBadge';
import { SkeletonList } from '@/components/ui/Skeleton';
import { formatPrice } from '@/lib/utils/price';
import type { MedicationSearchResult } from '@/lib/types';

interface SearchResultsProps {
  results: MedicationSearchResult[] | undefined;
  loading?: boolean;
  error?: Error | null;
  totalCount?: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function SearchResults({
  results,
  loading = false,
  error = null,
  totalCount = 0,
  hasMore = false,
  onLoadMore,
}: SearchResultsProps) {
  const t = useTranslations();
  const announcementRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef<number | undefined>(undefined);

  // Announce search results to screen readers
  useEffect(() => {
    if (loading || error) return;

    // Only announce when results change (not on initial load)
    if (previousCountRef.current !== undefined && previousCountRef.current !== totalCount) {
      const announcement = results?.length
        ? t('search.resultsAnnouncement', { count: totalCount })
        : t('search.noResultsAnnouncement');

      if (announcementRef.current) {
        announcementRef.current.textContent = announcement;
      }
    }
    previousCountRef.current = totalCount;
  }, [results, totalCount, loading, error, t]);

  if (loading && !results?.length) {
    return (
      <>
        <div
          ref={announcementRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
        <SkeletonList count={5} />
      </>
    );
  }

  if (error) {
    return (
      <Card variant="outline" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <CardContent>
          <div className="flex items-center gap-3">
            <svg
              className="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">{t('search.failed')}</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results?.length) {
    return (
      <Card variant="outline">
        <CardContent className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">{t('search.noResults')}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('search.noResultsHint')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Live region for screen reader announcements */}
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {t('search.resultCount', { count: totalCount })}
      </p>

      {/* Results list */}
      <ul className="space-y-4" role="list" aria-label="Search results">
        {results.map((medication) => (
          <li key={medication.ampCode}>
            <MedicationResultCard medication={medication} />
          </li>
        ))}
      </ul>

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div className="mt-6 text-center">
          <button
            onClick={onLoadMore}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('search.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}

interface MedicationResultCardProps {
  medication: MedicationSearchResult;
}

function MedicationResultCard({ medication }: MedicationResultCardProps) {
  const t = useTranslations();
  const linkHref = medication.cnk
    ? `/medication/${medication.cnk}`
    : `/medication/${encodeURIComponent(medication.ampCode)}`;

  return (
    <Link href={linkHref}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{medication.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {medication.cnk && <span>{t('medication.cnkLabel')}: {medication.cnk}</span>}
              {medication.companyName && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{medication.companyName}</span>
                </>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {medication.isReimbursed && (
                <Badge variant="success" size="sm">
                  {t('badge.reimbursed')}
                </Badge>
              )}
              {medication.isChapterIV && <ChapterIVBadge size="sm" />}
              {medication.status !== 'AUTHORIZED' && (
                <Badge variant="warning" size="sm">
                  {medication.status}
                </Badge>
              )}
            </div>
          </div>

          <div className="ml-4 text-right">
            {medication.price !== undefined ? (
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {formatPrice(medication.price)}
              </span>
            ) : (
              <span className="text-sm text-gray-400">{t('common.priceNA')}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
