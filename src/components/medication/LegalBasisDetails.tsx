'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useLegislation } from '@/hooks';
import { getLegalText, getLegalBasisTitle } from '@/lib/utils/legislation';
import type { LegalBasis, LegalReference, LegalText, LocalizedText } from '@/lib/types';

/**
 * Displays localized text following the app's language pattern:
 * - If text exists in selected language: show just that text
 * - If not: show all available translations with language badges
 *
 * Note: Legal texts are only official in FR/NL/DE - we show them verbatim
 * without translation to preserve legal accuracy.
 */
function LocalizedLegalText({
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
  const hasInSelectedLang = texts.some((t) => t.language === language && t.text);

  if (hasInSelectedLang) {
    const text = getLegalText(texts, language);
    return <span className={className}>{text}</span>;
  }

  // Show all available translations with language badges
  // Filter to official languages (FR/NL/DE) and available translations
  const availableTexts = texts.filter(
    (t) => t.text && ['fr', 'nl', 'de'].includes(t.language)
  );

  if (availableTexts.length === 0) {
    // Fallback to any available text
    const anyText = texts.find((t) => t.text);
    if (anyText) {
      return <span className={className}>{anyText.text}</span>;
    }
    return null;
  }

  return (
    <div className="space-y-1">
      {availableTexts.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {item.language.toUpperCase()}
          </span>
          <span className={className}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Recursively renders legal text content
 */
function LegalTextContent({
  texts,
  language,
  depth = 0,
}: {
  texts: LegalText[];
  language: string;
  depth?: number;
}) {
  const maxDepth = 3; // Limit nesting depth for readability

  return (
    <div className={depth > 0 ? 'ml-4 mt-2' : ''}>
      {texts.map((text) => (
        <div key={text.key} className="mb-2">
          <LocalizedLegalText
            texts={text.content}
            language={language}
            className="text-sm text-gray-700 dark:text-gray-300"
          />
          {text.children && text.children.length > 0 && depth < maxDepth && (
            <LegalTextContent
              texts={text.children}
              language={language}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Renders a legal reference section with its content
 */
function LegalReferenceSection({
  reference,
  language,
  depth = 0,
}: {
  reference: LegalReference;
  language: string;
  depth?: number;
}) {
  const title = getLegalText(reference.title, language);
  const isLeaf = reference.legalTexts && reference.legalTexts.length > 0;
  const hasChildren = reference.legalReferences && reference.legalReferences.length > 0;

  // Skip rendering if no meaningful content
  if (!isLeaf && !hasChildren) return null;

  // For leaf nodes (has legal texts), show the content
  if (isLeaf) {
    return (
      <div className="mb-4">
        {title && (
          <h5 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            {reference.type === 'PARAGRAPH' ? `Paragraph ${title}` : title}
          </h5>
        )}
        <LegalTextContent texts={reference.legalTexts!} language={language} />
      </div>
    );
  }

  // For branch nodes (has children), recurse
  if (hasChildren) {
    return (
      <div className={depth > 0 ? 'ml-4' : ''}>
        {title && depth < 2 && (
          <h5 className="mb-2 font-medium text-gray-700 dark:text-gray-300">
            {reference.type === 'CHAPTER' ? `Chapter ${title}` : title}
          </h5>
        )}
        {reference.legalReferences!.map((childRef) => (
          <LegalReferenceSection
            key={childRef.key}
            reference={childRef}
            language={language}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  return null;
}

/**
 * Renders a single legal basis document
 */
function LegalBasisSection({
  basis,
  language,
}: {
  basis: LegalBasis;
  language: string;
}) {
  const title = getLegalBasisTitle(basis, language);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      {/* Legal basis header */}
      <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>

      {basis.effectiveOn && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Effective: {basis.effectiveOn}
        </p>
      )}

      {/* Legal references */}
      {basis.legalReferences.length > 0 && (
        <div className="mt-4">
          {basis.legalReferences.map((ref) => (
            <LegalReferenceSection
              key={ref.key}
              reference={ref}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LegalBasisDetailsProps {
  /**
   * CNK code for fetching legislation
   */
  cnk: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Progressive disclosure component for legislation (legal basis)
 *
 * Shows a button that, when clicked, fetches and displays the legal text
 * defining the reimbursement rules for a medication.
 *
 * Note: Legal texts are only official in French (FR), Dutch (NL), and German (DE).
 * We display them verbatim without translation to preserve legal accuracy.
 */
export function LegalBasisDetails({ cnk, className = '' }: LegalBasisDetailsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, error } = useLegislation({
    cnk,
    language: locale,
    enabled: isExpanded,
  });

  const legalBases = data?.legalBases || [];

  return (
    <div className={className}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700/50"
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          {isExpanded ? t('legislation.hideDetails') : t('legislation.viewLegalBasis')}
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
                className="h-5 w-5 animate-spin text-gray-600 dark:text-gray-400"
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
                {t('legislation.loading')}
              </span>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {t('legislation.errorLoading')}
            </p>
          )}

          {/* No data state */}
          {!isLoading && !error && legalBases.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('legislation.noLegalBasis')}
            </p>
          )}

          {/* Legal bases */}
          {!isLoading && legalBases.length > 0 && (
            <div className="space-y-4">
              {/* Language notice */}
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                {t('legislation.languageNote')}
              </p>

              {/* Legal basis sections */}
              {legalBases.map((basis) => (
                <LegalBasisSection key={basis.key} basis={basis} language={locale} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
