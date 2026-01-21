'use client';

import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { RelationshipList } from '@/components/entities/relationship-list';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { PriceRange } from '@/components/shared/price-range';
import { JsonLd } from '@/components/shared/json-ld';
import { useLanguage, useLinks, useTranslation } from '@/lib/hooks';
import { formatValidityPeriod } from '@/lib/utils/format';
import type { VTMWithRelations } from '@/server/types/entities';

interface VTMDetailProps {
  vtm: VTMWithRelations;
}

export function VTMDetail({ vtm }: VTMDetailProps) {
  const { getLocalized } = useLanguage();
  const links = useLinks();
  const { t } = useTranslation();
  const name = getLocalized(vtm.name);

  const breadcrumbs = [{ label: name }];

  const vmpItems = vtm.vmps.map((vmp) => ({
    entityType: vmp.entityType,
    code: vmp.code,
    name: vmp.name,
    subtitle: vmp.status !== 'AUTHORIZED' ? (t(`status.${vmp.status}`) || vmp.status) : undefined,
  }));

  const ampItems = vtm.amps.map((amp) => ({
    entityType: amp.entityType,
    code: amp.code,
    name: amp.name,
    subtitle: amp.companyName || undefined,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <EntityHeader
            entityType="vtm"
            name={vtm.name}
            code={vtm.code}
          />

          {/* Overview */}
          {(vtm.startDate || vtm.endDate ||
            (vtm.name.nl && vtm.name.nl !== name) ||
            (vtm.name.fr && vtm.name.fr !== name) ||
            (vtm.name.en && vtm.name.en !== name) ||
            (vtm.name.de && vtm.name.de !== name)) && (
            <Section title={t('detail.overview')}>
              <InfoList>
                <InfoRow
                  label={t('detail.validity')}
                  value={formatValidityPeriod(vtm.startDate, vtm.endDate)}
                />
                {/* Show all language variants */}
                {vtm.name.nl && vtm.name.nl !== name && (
                  <InfoRow label={t('languages.dutch')} value={vtm.name.nl} />
                )}
                {vtm.name.fr && vtm.name.fr !== name && (
                  <InfoRow label={t('languages.french')} value={vtm.name.fr} />
                )}
                {vtm.name.en && vtm.name.en !== name && (
                  <InfoRow label={t('languages.english')} value={vtm.name.en} />
                )}
                {vtm.name.de && vtm.name.de !== name && (
                  <InfoRow label={t('languages.german')} value={vtm.name.de} />
                )}
              </InfoList>
            </Section>
          )}

          {/* Generic Products */}
          <RelationshipList
            title={t('detail.genericProducts')}
            items={vmpItems}
            searchFilter={{ type: 'vtm', code: vtm.code }}
            searchType="vmp"
          />

          {/* Brand Products */}
          <RelationshipList
            title={t('detail.brandProducts')}
            items={ampItems}
            searchFilter={{ type: 'vtm', code: vtm.code }}
            searchType="amp"
          />

          {/* Available Packages */}
          {vtm.packageCount > 0 && (
            <Section
              title={t('detail.availablePackages')}
              count={vtm.packageCount}
              headerAction={
                <Link
                  href={links.toSearch({ vtm: vtm.code, types: 'ampp' })}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title={t('common.searchAll')}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.searchAll')}</span>
                </Link>
              }
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('detail.clickSearchToViewPackages')}
              </p>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              {/* Therapeutic Groups */}
              {vtm.vmpGroups.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 dark:text-gray-400">{t('detail.therapeuticGroup')}</span>
                  <div className="text-right">
                    {vtm.vmpGroups.slice(0, 2).map((group) => (
                      <Link
                        key={group.code}
                        href={links.toTherapeuticGroup(group.name, group.code)}
                        className="block font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px]"
                      >
                        {getLocalized(group.name)}
                      </Link>
                    ))}
                    {vtm.vmpGroups.length > 2 && (
                      <span className="text-gray-500 dark:text-gray-400 text-xs">+{vtm.vmpGroups.length - 2} more</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.genericProducts')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vtm.vmps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.brandProducts')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vtm.amps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('sidebar.packageCount')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vtm.packageCount}</span>
              </div>
              {/* Price Range */}
              {(vtm.minPrice !== null || vtm.maxPrice !== null) && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">{t('search.priceRange')}</span>
                  <PriceRange min={vtm.minPrice} max={vtm.maxPrice} size="sm" />
                </div>
              )}
              {/* Reimbursable Percentage */}
              {vtm.reimbursablePercentage !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('sidebar.reimbursablePercent')}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{vtm.reimbursablePercentage}%</span>
                </div>
              )}
              {/* Validity indicator */}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.validity')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {vtm.endDate && new Date(vtm.endDate) < new Date() ? t('sidebar.expired') : t('sidebar.active')}
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
          '@type': 'Drug',
          name: name,
          identifier: vtm.code,
          activeIngredient: name,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }}
      />
    </div>
  );
}
