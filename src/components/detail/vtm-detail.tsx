'use client';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { RelationshipList } from '@/components/entities/relationship-list';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { useLanguage } from '@/lib/hooks/use-language';
import { useTranslation } from '@/lib/hooks/use-translation';
import { formatValidityPeriod } from '@/lib/utils/format';
import type { VTMWithRelations } from '@/server/types/entities';

interface VTMDetailProps {
  vtm: VTMWithRelations;
}

export function VTMDetail({ vtm }: VTMDetailProps) {
  const { getLocalized } = useLanguage();
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
          <Section title={t('detail.overview')}>
            <InfoList>
              <InfoRow
                label={t('detail.validity')}
                value={formatValidityPeriod(vtm.startDate, vtm.endDate)}
              />
              {/* Show all language variants */}
              {vtm.name.nl && vtm.name.nl !== getLocalized(vtm.name) && (
                <InfoRow label={t('languages.dutch')} value={vtm.name.nl} />
              )}
              {vtm.name.fr && vtm.name.fr !== getLocalized(vtm.name) && (
                <InfoRow label={t('languages.french')} value={vtm.name.fr} />
              )}
              {vtm.name.en && vtm.name.en !== getLocalized(vtm.name) && (
                <InfoRow label={t('languages.english')} value={vtm.name.en} />
              )}
              {vtm.name.de && vtm.name.de !== getLocalized(vtm.name) && (
                <InfoRow label={t('languages.german')} value={vtm.name.de} />
              )}
            </InfoList>
          </Section>

          {/* Generic Products */}
          <RelationshipList
            title={t('detail.genericProducts')}
            items={vmpItems}
          />

          {/* Brand Products */}
          <RelationshipList
            title={t('detail.brandProducts')}
            items={ampItems}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.genericProducts')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vtm.vmps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.brandProducts')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vtm.amps.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
