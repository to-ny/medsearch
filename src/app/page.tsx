'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero - compact */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('home.title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('home.tagline')}
        </p>
      </div>

      {/* Navigation cards - primary actions */}
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <Link
            href="/search"
            className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 text-center transition-all hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition-transform group-hover:scale-110 dark:bg-blue-900/50 dark:text-blue-400">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              {t('home.searchMedications')}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('home.searchMedicationsDesc')}
            </p>
          </Link>

          {/* Compare */}
          <Link
            href="/compare"
            className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 text-center transition-all hover:border-green-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-green-600"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600 transition-transform group-hover:scale-110 dark:bg-green-900/50 dark:text-green-400">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              {t('home.comparePrices')}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('home.comparePricesDesc')}
            </p>
          </Link>

          {/* Companies */}
          <Link
            href="/companies"
            className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 text-center transition-all hover:border-purple-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-600"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 transition-transform group-hover:scale-110 dark:bg-purple-900/50 dark:text-purple-400">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              {t('home.browseCompanies')}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('home.browseCompaniesDesc')}
            </p>
          </Link>

          {/* Browse by Category (ATC) */}
          <Link
            href="/atc"
            className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 text-center transition-all hover:border-orange-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-600"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 transition-transform group-hover:scale-110 dark:bg-orange-900/50 dark:text-orange-400">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              {t('home.browseByCategory')}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('home.browseByCategoryDesc')}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
