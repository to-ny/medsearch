'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LanguageSelector } from './language-selector';
import { SearchBarCompact } from '@/components/search/search-bar';
import { useLinks } from '@/lib/hooks';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const links = useLinks();
  const homePath = links.toHome();
  const searchPath = links.toSearch();

  // Check for home page (with or without language prefix)
  const isHomePage = pathname === '/' || pathname === homePath;

  // Check for search page (with language prefix)
  const isSearchPage = pathname === searchPath;

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

          {/* Search bar (hidden on home and search pages) */}
          {!isHomePage && !isSearchPage && (
            <div className="flex-1 max-w-2xl">
              <SearchBarCompact />
            </div>
          )}

          {/* Right section */}
          <div className="flex items-center gap-3">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  );
}
