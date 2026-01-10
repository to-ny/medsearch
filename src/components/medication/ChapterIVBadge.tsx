'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { getChapterIVInfoUrl } from '@/lib/utils/chapterIV';

interface ChapterIVBadgeProps {
  /**
   * Size of the badge
   */
  size?: 'sm' | 'md';
  /**
   * Whether to show the badge as a link to official information
   */
  showLink?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Badge component for Chapter IV medications
 *
 * Displays a warning badge indicating that prior authorization is required
 * for this medication. Optionally links to official RIZIV/INAMI information.
 */
export function ChapterIVBadge({
  size = 'sm',
  showLink = false,
  className = '',
}: ChapterIVBadgeProps) {
  const t = useTranslations();
  const locale = useLocale();

  const badge = (
    <Badge
      variant="warning"
      size={size}
      className={className}
      title={t('chapterIV.requiresPriorAuth')}
    >
      {t('chapterIV.badge')}
    </Badge>
  );

  if (showLink) {
    const infoUrl = getChapterIVInfoUrl(locale);
    return (
      <a
        href={infoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center"
        aria-label={t('chapterIV.learnMoreAriaLabel')}
      >
        {badge}
        <svg
          className="ml-1 h-3 w-3 text-yellow-600 dark:text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    );
  }

  return badge;
}

interface ChapterIVInfoBoxProps {
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * Info box component explaining Chapter IV requirements
 *
 * Provides detailed information about what Chapter IV means and
 * links to official resources.
 */
export function ChapterIVInfoBox({ className = '' }: ChapterIVInfoBoxProps) {
  const t = useTranslations();
  const locale = useLocale();
  const infoUrl = getChapterIVInfoUrl(locale);

  return (
    <div
      className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20 ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>

        <div className="flex-1">
          {/* Title */}
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
            {t('chapterIV.title')}
          </h4>

          {/* Description */}
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            {t('chapterIV.requiresPriorAuth')}
          </p>

          {/* Additional info */}
          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            {t('chapterIV.doctorMustSubmit')}
          </p>

          {/* Link to official info */}
          <a
            href={infoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center text-sm font-medium text-yellow-700 hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100"
          >
            {t('chapterIV.learnMore')}
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
