import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLanguage, type Language } from '@/server/types/domain';
import { BatchLookupClient } from './batch-lookup-client';

// Import translations for metadata
import en from '@/locales/en.json';
import nl from '@/locales/nl.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';

const translations = { en, nl, fr, de };

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;

  if (!isValidLanguage(lang)) {
    return {};
  }

  const t = translations[lang as Language];
  const title = t.pharmacist.batchLookupTitle;
  const description = t.pharmacist.batchLookupSubtitle;

  return {
    title,
    description,
    alternates: {
      languages: {
        nl: `/nl/batch-lookup`,
        fr: `/fr/batch-lookup`,
        de: `/de/batch-lookup`,
        en: `/en/batch-lookup`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function BatchLookupPage({ params }: Props) {
  const { lang } = await params;

  if (!isValidLanguage(lang)) {
    notFound();
  }

  const t = translations[lang as Language];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t.pharmacist.batchLookupTitle}
        </h1>
      </div>

      {/* How it works - inline above form */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-medium text-blue-900 dark:text-blue-100">{t.pharmacist.howItWorks}:</span>
          <span className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs flex items-center justify-center font-medium">1</span>
            {t.pharmacist.step1}
          </span>
          <span className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs flex items-center justify-center font-medium">2</span>
            {t.pharmacist.step2}
          </span>
          <span className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs flex items-center justify-center font-medium">3</span>
            {t.pharmacist.step3}
          </span>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <BatchLookupClient />
    </div>
  );
}
