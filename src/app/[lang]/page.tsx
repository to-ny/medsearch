import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SearchBar } from '@/components/search/search-bar';
import { isValidLanguage, type Language } from '@/server/types/domain';
import { getDatabaseStats } from '@/server/actions/batch-lookup';

// Import translations for metadata and content
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
  const title = `${t.home.title} | ${t.home.subtitle}`;
  const description = t.pharmacist.heroSubtitle;

  return {
    title,
    description,
    alternates: {
      languages: {
        nl: `/nl`,
        fr: `/fr`,
        de: `/de`,
        en: `/en`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params;

  if (!isValidLanguage(lang)) {
    notFound();
  }

  const t = translations[lang as Language];
  const stats = await getDatabaseStats();

  return (
    <div className="bg-gradient-to-b from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-950 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            {t.home.title}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-6">
            {t.home.subtitle}
          </p>

          <div className="max-w-2xl mx-auto mb-4">
            <SearchBar size="large" autoFocus />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t.home.examples}:</span>
            <ExampleChip href={`/${lang}/search?q=paracetamol`} label="paracetamol" />
            <ExampleChip href={`/${lang}/search?q=Dafalgan`} label="Dafalgan" />
            <ExampleChip href={`/${lang}/search?q=0039347`} label="0039347" sublabel={t.home.cnkCode} />
            <ExampleChip href={`/${lang}/search?q=Pfizer`} label="Pfizer" sublabel={t.home.company} />
            <ExampleChip href={`/${lang}/search?q=N02BE01`} label="N02BE01" sublabel={t.home.atcCode} />
          </div>

        </div>
      </div>

      {stats && (
        <div className="mt-12 pt-8 border-t border-gray-200/30 dark:border-gray-700/30">
          <div className="flex justify-center gap-12 text-center">
            <div>
              <div className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
                {stats.totalMedications.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                {t.pharmacist.stats.medications}
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
                {stats.totalPackages.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                {t.pharmacist.stats.packages}
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-600 dark:text-gray-400">
                {stats.totalSubstances.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                {t.pharmacist.stats.substances}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExampleChip({ href, label, sublabel }: { href: string; label: string; sublabel?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
    >
      <span className="font-medium">{label}</span>
      {sublabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">({sublabel})</span>
      )}
    </Link>
  );
}
