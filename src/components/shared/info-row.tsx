import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function InfoRow({ label, value, className }: InfoRowProps) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4', className)}>
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-40 flex-shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100">
        {value}
      </dd>
    </div>
  );
}

interface InfoListProps {
  children: ReactNode;
  className?: string;
}

export function InfoList({ children, className }: InfoListProps) {
  return (
    <dl className={cn('space-y-3', className)}>
      {children}
    </dl>
  );
}
