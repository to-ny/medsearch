'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useLanguage, useLinks, useTranslation } from '@/lib/hooks';
import { ReimbursementBadge } from '@/components/entities/reimbursement-badge';
import type { BatchLookupResponse, CNKLookupResult } from '@/server/actions/batch-lookup';

interface BatchResultsTableProps {
  response: BatchLookupResponse;
  className?: string;
}

/**
 * Formats a number as currency (EUR)
 */
function formatPrice(price: number | null): string {
  if (price === null) return '-';
  return new Intl.NumberFormat('de-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

/**
 * Get localized name from multilingual text
 */
function getLocalizedName(
  name: { nl?: string; fr?: string; en?: string; de?: string } | null,
  language: string
): string {
  if (!name) return '-';
  const lang = language as keyof typeof name;
  return name[lang] || name.nl || name.fr || name.en || name.de || '-';
}

/**
 * Table displaying batch lookup results
 */
export function BatchResultsTable({ response, className }: BatchResultsTableProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const links = useLinks();
  const [copied, setCopied] = useState(false);

  const foundResults = useMemo(
    () => response.results.filter((r) => r.found),
    [response.results]
  );

  const notFoundResults = useMemo(
    () => response.results.filter((r) => !r.found),
    [response.results]
  );

  /**
   * Export results to CSV
   */
  const handleExportCSV = useCallback(() => {
    const headers = [
      'CNK Code',
      'Found',
      'Medication Name',
      'Package Info',
      'Ex-Factory Price',
      'Public Price',
      'Reimbursement',
      'Reimbursable',
      'Status',
    ];

    const rows = response.results.map((result) => [
      result.cnkCode,
      result.found ? 'Yes' : 'No',
      result.found ? getLocalizedName(result.ampName, language) : '',
      result.packDisplayValue || '',
      result.exFactoryPrice?.toString() || '',
      result.publicPrice?.toString() || '',
      result.reimbursementCategory || '',
      result.reimbursable ? 'Yes' : 'No',
      result.status || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cnk-lookup-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [response.results, language]);

  /**
   * Copy results to clipboard as tab-separated values (for Excel paste)
   */
  const handleCopyToClipboard = useCallback(async () => {
    const headers = [
      'CNK Code',
      'Medication Name',
      'Package Info',
      'Ex-Factory Price',
      'Public Price',
      'Reimbursement',
      'Status',
    ];

    const rows = response.results
      .filter((r) => r.found)
      .map((result) => [
        result.cnkCode,
        getLocalizedName(result.ampName, language),
        result.packDisplayValue || '',
        result.exFactoryPrice?.toFixed(2) || '',
        result.publicPrice?.toFixed(2) || '',
        result.reimbursementCategory || '',
        result.status || '',
      ]);

    const tsv = [headers, ...rows].map((row) => row.join('\t')).join('\n');

    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = tsv;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [response.results, language]);

  if (!response.success && response.errors.length > 0) {
    return (
      <div
        className={cn(
          'rounded-lg bg-red-50 dark:bg-red-900/20 p-4',
          className
        )}
        role="alert"
      >
        <h3 className="font-medium text-red-800 dark:text-red-300 mb-2">Error</h3>
        <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400">
          {response.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (response.results.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {foundResults.length}
            </span>{' '}
            {t('pharmacist.resultsFound')}
          </span>
          {notFoundResults.length > 0 && (
            <span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {notFoundResults.length}
              </span>{' '}
              {t('pharmacist.codesNotFound')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyToClipboard}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm',
              'border border-gray-300 dark:border-gray-600',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors'
            )}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('pharmacist.copied')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {t('pharmacist.copyToClipboard')}
              </>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm',
              'bg-blue-600 text-white',
              'hover:bg-blue-700',
              'transition-colors'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('pharmacist.exportCsv')}
          </button>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                CNK
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t('pharmacist.medicationName')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell"
              >
                {t('pharmacist.packageInfo')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t('pharmacist.price')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {t('detail.reimbursement')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell"
              >
                {t('pharmacist.status')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {response.results.map((result, index) => (
              <ResultRow
                key={`${result.cnkCode}-${index}`}
                result={result}
                language={language}
                links={links}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Not found codes summary */}
      {notFoundResults.length > 0 && (
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            {t('pharmacist.codesNotFound')}:
          </h4>
          <div className="flex flex-wrap gap-2">
            {notFoundResults.map((result) => (
              <span
                key={result.cnkCode}
                className="px-2 py-1 rounded text-xs font-mono bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300"
              >
                {result.cnkCode}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Single row in the results table
 */
function ResultRow({
  result,
  language,
  links,
  t,
}: {
  result: CNKLookupResult;
  language: string;
  links: ReturnType<typeof useLinks>;
  t: (key: string) => string;
}) {
  if (!result.found) {
    return (
      <tr className="bg-red-50/50 dark:bg-red-900/10">
        <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-gray-900 dark:text-gray-100">
          {result.cnkCode}
        </td>
        <td
          colSpan={5}
          className="px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {t('pharmacist.notFound')}
        </td>
      </tr>
    );
  }

  const name = getLocalizedName(result.ampName, language);
  const packageLink = result.amppCtiExtended
    ? links.toPackage(result.ampName, result.amppCtiExtended)
    : null;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
          {result.cnkCode}
        </span>
      </td>
      <td className="px-4 py-3">
        {packageLink ? (
          <Link
            href={packageLink}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span className="text-sm text-gray-900 dark:text-gray-100">{name}</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
        {result.packDisplayValue || '-'}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <div className="text-sm">
          <div className="text-gray-900 dark:text-gray-100">
            {formatPrice(result.publicPrice)}
          </div>
          {result.exFactoryPrice !== result.publicPrice && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Ex-factory: {formatPrice(result.exFactoryPrice)}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {result.reimbursementCategory ? (
          <ReimbursementBadge category={result.reimbursementCategory} />
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center hidden sm:table-cell">
        <StatusBadge status={result.status} />
      </td>
    </tr>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">-</span>;

  const isAuthorized = status === 'AUTHORIZED';

  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 rounded text-xs font-medium',
        isAuthorized
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      )}
    >
      {status}
    </span>
  );
}
