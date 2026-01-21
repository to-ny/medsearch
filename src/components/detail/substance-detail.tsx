'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { EntityTypeBadge } from '@/components/entities/entity-type-badge';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { LocalizedText } from '@/components/shared/localized-text';
import { JsonLd } from '@/components/shared/json-ld';
import { Pagination } from '@/components/search/pagination';
import { Card } from '@/components/ui/card';
import { useLanguage, useLinks, useTranslation } from '@/lib/hooks';
import { formatValidityPeriod } from '@/lib/utils/format';
import type { SubstanceWithRelations } from '@/server/types/entities';

interface SubstanceDetailProps {
  substance: SubstanceWithRelations;
  currentPage: number;
  pageSize: number;
}

export function SubstanceDetail({ substance, currentPage, pageSize }: SubstanceDetailProps) {
  const router = useRouter();
  const { getLocalized } = useLanguage();
  const links = useLinks();
  const { t } = useTranslation();
  const name = getLocalized(substance.name);

  const breadcrumbs = [{ label: name }];
  const totalPages = Math.ceil(substance.usedInAmpCount / pageSize);

  const handlePageChange = (page: number) => {
    router.push(links.withPage(links.toIngredient(substance.name, substance.code), page));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <EntityHeader
            entityType="substance"
            name={substance.name}
            code={substance.code}
          />

          {/* Overview */}
          <Section title={t('detail.overview')}>
            <InfoList>
              <InfoRow
                label={t('detail.validity')}
                value={formatValidityPeriod(substance.startDate, substance.endDate)}
              />
              {/* Show all language variants */}
              {substance.name.nl && substance.name.nl !== name && (
                <InfoRow label={t('languages.dutch')} value={substance.name.nl} />
              )}
              {substance.name.fr && substance.name.fr !== name && (
                <InfoRow label={t('languages.french')} value={substance.name.fr} />
              )}
              {substance.name.en && substance.name.en !== name && (
                <InfoRow label={t('languages.english')} value={substance.name.en} />
              )}
              {substance.name.de && substance.name.de !== name && (
                <InfoRow label={t('languages.german')} value={substance.name.de} />
              )}
            </InfoList>
          </Section>

          {/* Products containing this ingredient */}
          <Section
            title={t('detail.productsContainingIngredient')}
            count={substance.usedInAmpCount}
            headerAction={
              substance.usedInAmpCount > 0 ? (
                <Link
                  href={links.toSearch({ substance: substance.code, types: 'amp' })}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title={t('common.searchAll')}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.searchAll')}</span>
                </Link>
              ) : undefined
            }
          >
            <div className="space-y-2">
              {substance.usedInAmps.map((amp) => (
                <Link
                  key={amp.code}
                  href={links.toMedication(amp.name, amp.code)}
                  className="block group"
                >
                  <Card hover padding="sm">
                    <div className="flex items-center gap-3">
                      <EntityTypeBadge type="amp" size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          <LocalizedText text={amp.name} />
                        </p>
                        {amp.companyName && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {amp.companyName}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                className="mt-6"
              />
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.brandProducts')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{substance.usedInAmpCount}</span>
              </div>
              {/* Validity indicator */}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.validity')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {substance.endDate && new Date(substance.endDate) < new Date() ? t('sidebar.expired') : t('sidebar.active')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON-LD Structured Data */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Substance',
          name: name,
          identifier: substance.code,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }}
      />
    </div>
  );
}
