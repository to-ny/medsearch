'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { useChapterIV } from '@/hooks';
import { getChapterIVInfoUrl } from '@/lib/utils/chapterIV';
import { getLocalizedText, hasTextInLanguage } from '@/lib/utils/localization';
import type { ChapterIVParagraph, ChapterIVVerse, LocalizedText } from '@/lib/types';

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

/**
 * Displays localized text following the app's language pattern:
 * - If text exists in selected language: show just that text
 * - If not: show all available translations with language badges
 */
function LocalizedChapterText({
  texts,
  language,
  className = '',
}: {
  texts: LocalizedText[] | undefined;
  language: string;
  className?: string;
}) {
  if (!texts || texts.length === 0) return null;

  // Check if text exists in the selected language
  const hasInSelectedLang = hasTextInLanguage(texts, language);

  if (hasInSelectedLang) {
    // Just show the text in selected language
    const text = getLocalizedText(texts, language);
    return <span className={className}>{text}</span>;
  }

  // Show all available translations with language badges
  return (
    <div className="space-y-1">
      {texts
        .filter((t) => t.text)
        .map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {item.language.toUpperCase()}
            </span>
            <span className={className}>{item.text}</span>
          </div>
        ))}
    </div>
  );
}

interface ChapterIVDetailsProps {
  /**
   * CNK code for fetching Chapter IV details
   */
  cnk: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Displays a single verse with proper indentation based on level
 */
function VerseItem({ verse, language }: { verse: ChapterIVVerse; language: string }) {
  const t = useTranslations();

  // Check if there's any text to display
  if (!verse.text || verse.text.length === 0 || !verse.text.some((t) => t.text)) return null;

  // Indent based on verse level (level 1 = no indent, level 2 = 1 indent, etc.)
  const indentClass = verse.verseLevel > 1 ? `ml-${Math.min((verse.verseLevel - 1) * 4, 12)}` : '';

  return (
    <li className={`text-sm text-gray-700 dark:text-gray-300 ${indentClass}`}>
      <LocalizedChapterText texts={verse.text} language={language} />
      {verse.requestType && (
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          ({verse.requestType === 'N' ? t('chapterIV.firstRequest') : t('chapterIV.renewal')})
        </span>
      )}
      {verse.agreementTermQuantity && verse.agreementTermUnit && (
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          - {t('chapterIV.validFor', {
            quantity: verse.agreementTermQuantity,
            unit: t(`chapterIV.validityUnits.${verse.agreementTermUnit}`, { quantity: verse.agreementTermQuantity }),
          })}
        </span>
      )}
    </li>
  );
}

/**
 * Displays a single Chapter IV paragraph with its indication and requirements
 */
function ParagraphSection({ paragraph, language }: { paragraph: ChapterIVParagraph; language: string }) {
  const t = useTranslations();
  const hasIndication = paragraph.keyString && paragraph.keyString.some((t) => t.text);

  // Filter to meaningful verses (skip header verses with just paragraph number)
  const meaningfulVerses = paragraph.verses.filter((v) => {
    // Check if any text exists for this verse
    if (!v.text || v.text.length === 0) return false;
    // Check any language for paragraph-only headers
    return v.text.some((t) => t.text && !t.text.match(/^(Paragra(a)?f|Paragraph)\s+\d+$/i));
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      {/* Paragraph header */}
      <h5 className="font-medium text-gray-900 dark:text-white">
        {t('chapterIV.paragraph', { name: paragraph.paragraphName })}
      </h5>

      {/* Indication/condition */}
      {hasIndication && (
        <div className="mt-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('chapterIV.indication')}
          </span>
          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            <LocalizedChapterText texts={paragraph.keyString} language={language} />
          </div>
        </div>
      )}

      {/* Requirements list */}
      {meaningfulVerses.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('chapterIV.requirements')}
          </span>
          <ul className="mt-2 space-y-1">
            {meaningfulVerses.slice(0, 5).map((verse) => (
              <VerseItem key={verse.verseNum} verse={verse} language={language} />
            ))}
            {meaningfulVerses.length > 5 && (
              <li className="text-xs text-gray-500 dark:text-gray-400 italic">
                +{meaningfulVerses.length - 5} more requirements...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Progressive disclosure component for Chapter IV authorization requirements
 *
 * Shows a button that, when clicked, fetches and displays the detailed
 * Chapter IV paragraph information for a medication.
 */
export function ChapterIVDetails({ cnk, className = '' }: ChapterIVDetailsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const infoUrl = getChapterIVInfoUrl(locale);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, error } = useChapterIV({
    cnk,
    language: locale,
    enabled: isExpanded,
  });

  const paragraphs = data?.paragraphs || [];

  return (
    <div className={className}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-left text-sm font-medium text-yellow-800 transition-colors hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 dark:hover:bg-yellow-900/40"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          {/* Document icon */}
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isExpanded ? t('chapterIV.hideRequirements') : t('chapterIV.viewRequirements')}
        </span>
        {/* Chevron icon */}
        <svg
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <svg
                className="h-5 w-5 animate-spin text-yellow-600 dark:text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {t('chapterIV.loadingDetails')}
              </span>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {t('chapterIV.errorLoadingDetails')}
            </p>
          )}

          {/* No data state */}
          {!isLoading && !error && paragraphs.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('chapterIV.noDetails')}
            </p>
          )}

          {/* Paragraphs */}
          {!isLoading && paragraphs.length > 0 && (
            <div className="space-y-4">
              {paragraphs.map((paragraph) => (
                <ParagraphSection
                  key={paragraph.legalReferencePath}
                  paragraph={paragraph}
                  language={locale}
                />
              ))}
            </div>
          )}

          {/* Link to official info */}
          <a
            href={infoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-yellow-700 hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100"
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
      )}
    </div>
  );
}
