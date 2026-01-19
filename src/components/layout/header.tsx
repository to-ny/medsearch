'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LanguageSelector } from './language-selector';
import { useLinks, useTranslation, useLanguage } from '@/lib/hooks';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const links = useLinks();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const homePath = links.toHome();

  // Navigation links
  const batchLookupPath = `/${language}/batch-lookup`;

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg',
        'border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left section: Logo + Navigation */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link
              href={homePath}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                MedSearch
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden sm:flex items-center">
              <Link
                href={batchLookupPath}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname === batchLookupPath
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {t('pharmacist.batchLookup')}
              </Link>
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  );
}
