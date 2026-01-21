'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { useTranslation } from '@/lib/hooks';
import { cn } from '@/lib/utils/cn';

interface SummaryItem {
  /** Label for the item */
  label: string;
  /** Value to display (can be string, number, or custom ReactNode) */
  value: ReactNode;
  /** Optional link to wrap the value */
  href?: string;
}

interface SummaryBoxProps {
  /** Optional title for the box */
  title?: string;
  /** Items to display as key-value pairs */
  items: SummaryItem[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Key-value list display component for sidebar summaries.
 * Consistent styling with existing sidebar summary patterns.
 */
export function SummaryBox({ title, items, className }: SummaryBoxProps) {
  const { t } = useTranslation();
  const displayTitle = title || t('detail.summary');

  return (
    <div className={cn('bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4', className)}>
      {displayTitle && (
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{displayTitle}</h3>
      )}
      <div className="space-y-2 text-sm">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
            {item.href ? (
              <Link
                href={item.href}
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px]"
              >
                {item.value}
              </Link>
            ) : (
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
