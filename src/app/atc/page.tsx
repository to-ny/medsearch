'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/Card';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useAtcBrowser } from '@/hooks/useAtcBrowser';
import type { AtcClassification } from '@/lib/types';

/**
 * ATC level descriptions
 */
const ATC_LEVEL_NAMES: Record<number, string> = {
  1: 'Anatomical main group',
  2: 'Therapeutic subgroup',
  3: 'Pharmacological subgroup',
  4: 'Chemical subgroup',
  5: 'Chemical substance',
};

/**
 * Colors for different ATC levels
 */
const ATC_LEVEL_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  2: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  4: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  5: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
};

export default function AtcBrowserPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [selectedCode, setSelectedCode] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<AtcClassification[]>([]);

  // Fetch data for current selection
  const { data, isLoading, error } = useAtcBrowser(
    { code: selectedCode, language: locale },
    true
  );

  // Handle clicking on a category to drill down
  const handleCategoryClick = useCallback((classification: AtcClassification) => {
    // Level 5 is the deepest - navigate to search with ATC filter
    if (classification.level >= 5) {
      // Don't expand further, could link to search
      return;
    }

    // Add current classification to breadcrumbs and select it
    setBreadcrumbs((prev) => {
      // Find if we're clicking on something already in breadcrumbs
      const existingIndex = prev.findIndex((b) => b.code === classification.code);
      if (existingIndex >= 0) {
        // Truncate breadcrumbs to this point
        return prev.slice(0, existingIndex + 1);
      }
      return [...prev, classification];
    });
    setSelectedCode(classification.code);
  }, []);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index < 0) {
      // Go to root
      setBreadcrumbs([]);
      setSelectedCode(undefined);
    } else {
      // Go to specific breadcrumb
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
      setSelectedCode(breadcrumbs[index]?.code);
    }
  }, [breadcrumbs]);

  // Current parent classification (if drilling down)
  const currentClassification = data?.classifications?.[0];
  const children = data?.children || [];

  // Determine what to show - either children of selected or top-level
  const displayItems = selectedCode ? children : (data?.classifications || []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
        {t('atc.title')}
      </h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">
        {t('atc.description')}
      </p>

      {/* Breadcrumbs */}
      <nav aria-label={t('atc.breadcrumbLabel')} className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          <li>
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className={`rounded px-2 py-1 transition-colors ${
                breadcrumbs.length === 0
                  ? 'font-semibold text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {t('atc.allCategories')}
            </button>
          </li>
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.code} className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`rounded px-2 py-1 transition-colors ${
                  index === breadcrumbs.length - 1
                    ? 'font-semibold text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <span className="font-mono text-xs">{crumb.code}</span>
                <span className="ml-1">{crumb.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Current category info */}
      {currentClassification && selectedCode && (
        <Card className="mb-6 border-l-4 border-l-blue-500">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
                    {currentClassification.code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ATC_LEVEL_COLORS[currentClassification.level] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {t(`atc.level${currentClassification.level}`)}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                  {currentClassification.name}
                </h2>
                {currentClassification.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {currentClassification.description}
                  </p>
                )}
              </div>
              {currentClassification.level >= 4 && (
                <Link
                  href={`/search?atc=${currentClassification.code}`}
                  className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {t('atc.viewMedications')}
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && <SkeletonList count={7} />}

      {/* Error state */}
      {error && (
        <Card variant="outline" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent>
            <p className="text-red-600 dark:text-red-400">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Categories grid */}
      {!isLoading && !error && displayItems.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayItems.map((classification) => (
            <AtcCategoryCard
              key={classification.code}
              classification={classification}
              onClick={handleCategoryClick}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Empty state when no children */}
      {!isLoading && !error && displayItems.length === 0 && selectedCode && (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              {t('atc.noSubcategories')}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('atc.viewMedicationsHint')}
            </p>
            <Link
              href={`/search?atc=${selectedCode}`}
              className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {t('atc.viewMedications')}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Initial empty state */}
      {!isLoading && !error && !selectedCode && displayItems.length === 0 && (
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              {t('atc.emptyStateTitle')}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('atc.emptyStateDesc')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AtcCategoryCardProps {
  classification: AtcClassification;
  onClick: (classification: AtcClassification) => void;
  t: ReturnType<typeof useTranslations>;
}

function AtcCategoryCard({ classification, onClick, t }: AtcCategoryCardProps) {
  const isExpandable = classification.level < 5;

  const handleClick = () => {
    onClick(classification);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(classification);
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isExpandable ? 'hover:border-blue-300 dark:hover:border-blue-600' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${classification.code}: ${classification.name}${isExpandable ? `, ${t('atc.clickToExpand')}` : ''}`}
    >
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                {classification.code}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  ATC_LEVEL_COLORS[classification.level] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {t(`atc.level${classification.level}`)}
              </span>
            </div>
            <h3 className="mt-1 font-medium text-gray-900 dark:text-white">
              {classification.name}
            </h3>
            {classification.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {classification.description}
              </p>
            )}
          </div>
          {isExpandable && (
            <svg
              className="h-5 w-5 flex-shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
