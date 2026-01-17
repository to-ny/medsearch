'use client';

import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const { t } = useTranslation();

  return (
    <footer
      className={cn(
        'border-t border-gray-200 dark:border-gray-700',
        'bg-gray-50 dark:bg-gray-900',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            {t('footer.disclaimer')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Made with &#10084;&#65039; by{' '}
            <a
              href="https://to-ny.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              to-ny
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
