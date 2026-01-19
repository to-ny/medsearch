'use client';

import { SearchBar } from '@/components/search/search-bar';
import { useLinks, useTranslation } from '@/lib/hooks';

export default function HomePage() {
  const { t } = useTranslation();
  const links = useLinks();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Hero section */}
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-white"
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t('home.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-8">
          <SearchBar
            size="large"
            autoFocus
          />
        </div>

        {/* Examples */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-2">{t('home.examples')}:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <ExampleChip query="paracetamol" href={links.toSearch({ q: 'paracetamol' })} />
            <ExampleChip query="Dafalgan" href={links.toSearch({ q: 'Dafalgan' })} />
            <ExampleChip query="Ventolin" href={links.toSearch({ q: 'Ventolin' })} />
            <ExampleChip query="4757811" label={t('home.cnkCode')} href={links.toSearch({ q: '4757811' })} />
            <ExampleChip query="N02BE01" label={t('home.atcCode')} href={links.toSearch({ q: 'N02BE01' })} />
            <ExampleChip query="Janssen-Cilag" label={t('home.company')} href={links.toSearch({ q: 'Janssen-Cilag' })} />
          </div>
        </div>

        {/* Info cards */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <InfoCard
            title={t('home.infoSubstances')}
            description={t('home.infoSubstancesDescription')}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
          />
          <InfoCard
            title={t('home.infoBrands')}
            description={t('home.infoBrandsDescription')}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <InfoCard
            title={t('home.infoReimbursement')}
            description={t('home.infoReimbursementDescription')}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

function ExampleChip({ query, label, href }: { query: string; label?: string; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      <span className="font-medium">{query}</span>
      {label && (
        <span className="text-xs text-gray-500 dark:text-gray-400">({label})</span>
      )}
    </a>
  );
}

function InfoCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <div className="text-blue-600 dark:text-blue-400 mb-2">{icon}</div>
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}
