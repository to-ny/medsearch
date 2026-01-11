'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '../LanguageSwitcher';

export function Header() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <svg
            className="h-8 w-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            MedSearch
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          <Link
            href="/search"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            {t('nav.search')}
          </Link>
          <Link
            href="/compare"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            {t('nav.compare')}
          </Link>
          <Link
            href="/companies"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            {t('nav.companies')}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label={t('nav.toggleMenu')}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
