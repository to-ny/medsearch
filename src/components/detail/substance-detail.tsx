'use client';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { RelationshipList } from '@/components/entities/relationship-list';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { useLanguage } from '@/lib/hooks/use-language';
import { useTranslation } from '@/lib/hooks/use-translation';
import { formatValidityPeriod } from '@/lib/utils/format';
import type { SubstanceWithRelations } from '@/server/types/entities';

interface SubstanceDetailProps {
  substance: SubstanceWithRelations;
}

export function SubstanceDetail({ substance }: SubstanceDetailProps) {
  const { getLocalized } = useLanguage();
  const { t } = useTranslation();
  const name = getLocalized(substance.name);

  const breadcrumbs = [{ label: name }];

  const ampItems = substance.usedInAmps.map((amp) => ({
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
          <RelationshipList
            title={t('detail.productsContainingIngredient')}
            items={ampItems}
            searchFilter={{ type: 'substance', code: substance.code }}
            searchType="amp"
          />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
