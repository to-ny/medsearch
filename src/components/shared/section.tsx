import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  description?: string;
  count?: number;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, count, children, className }: SectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {title}
          {count !== undefined && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({count})
            </span>
          )}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
