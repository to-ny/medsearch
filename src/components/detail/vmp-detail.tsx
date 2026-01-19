'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { EntityTypeBadge } from '@/components/entities/entity-type-badge';
import { RelationshipList } from '@/components/entities/relationship-list';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { LocalizedText } from '@/components/shared/localized-text';
import { Card } from '@/components/ui/card';
import { useLanguage, useLinks, useTranslation } from '@/lib/hooks';
import { formatValidityPeriod } from '@/lib/utils/format';
import type { VMPWithRelations } from '@/server/types/entities';

interface VMPDetailProps {
  vmp: VMPWithRelations;
}

export function VMPDetail({ vmp }: VMPDetailProps) {
  const { getLocalized } = useLanguage();
  const links = useLinks();
  const { t } = useTranslation();
  const name = getLocalized(vmp.name);
  const vtmName = vmp.vtm ? getLocalized(vmp.vtm.name) : null;

  const breadcrumbs = [
    ...(vmp.vtm ? [{ label: vtmName!, href: links.toSubstance(vmp.vtm.name, vmp.vtm.code) }] : []),
    { label: name },
  ];

  const ampItems = vmp.amps.map((amp) => ({
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
            entityType="vmp"
            name={vmp.name}
            code={vmp.code}
            status={vmp.status}
          />

          {/* Overview */}
          {(vmp.abbreviatedName || vmp.startDate || vmp.endDate ||
            (vmp.name.nl && vmp.name.nl !== name) ||
            (vmp.name.fr && vmp.name.fr !== name) ||
            (vmp.name.en && vmp.name.en !== name) ||
            (vmp.name.de && vmp.name.de !== name)) && (
            <Section title={t('detail.overview')}>
              <InfoList>
                {vmp.abbreviatedName && (
                  <InfoRow
                    label={t('detail.abbreviatedName')}
                    value={<LocalizedText text={vmp.abbreviatedName} />}
                  />
                )}
                <InfoRow
                  label={t('detail.validity')}
                  value={formatValidityPeriod(vmp.startDate, vmp.endDate)}
                />
                {/* Show all language variants */}
                {vmp.name.nl && vmp.name.nl !== name && (
                  <InfoRow label={t('languages.dutch')} value={vmp.name.nl} />
                )}
                {vmp.name.fr && vmp.name.fr !== name && (
                  <InfoRow label={t('languages.french')} value={vmp.name.fr} />
                )}
                {vmp.name.en && vmp.name.en !== name && (
                  <InfoRow label={t('languages.english')} value={vmp.name.en} />
                )}
                {vmp.name.de && vmp.name.de !== name && (
                  <InfoRow label={t('languages.german')} value={vmp.name.de} />
                )}
              </InfoList>
            </Section>
          )}

          {/* Active Substance */}
          {vmp.vtm && (
            <Section title={t('detail.activeSubstance')}>
              <Link href={links.toSubstance(vmp.vtm.name, vmp.vtm.code)} className="block group">
                <Card hover padding="sm">
                  <div className="flex items-center gap-3">
                    <EntityTypeBadge type="vtm" size="sm" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      <LocalizedText text={vmp.vtm.name} />
                    </span>
                  </div>
                </Card>
              </Link>
            </Section>
          )}

          {/* Therapeutic Group */}
          {vmp.vmpGroup && (
            <Section title={t('detail.therapeuticGroup')}>
              <Link href={links.toTherapeuticGroup(vmp.vmpGroup.name, vmp.vmpGroup.code)} className="block group">
                <Card hover padding="sm">
                  <div className="flex items-center gap-3">
                    <EntityTypeBadge type="vmp_group" size="sm" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        <LocalizedText text={vmp.vmpGroup.name} />
                      </span>
                      {vmp.vmpGroup.patientFrailtyIndicator && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                          {t('detail.patientFrailtyIndicator')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            </Section>
          )}

          {/* Brand Products */}
          <RelationshipList
            title={t('detail.brandProducts')}
            items={ampItems}
            searchFilter={{ type: 'vmp', code: vmp.code }}
            searchType="amp"
          />

          {/* Dosage Recommendations */}
          {vmp.dosages.length > 0 && (
            <Section title={t('detail.dosageRecommendations')} count={vmp.dosages.length}>
              <div className="space-y-3">
                {vmp.dosages.map((dosage) => (
                  <Card key={dosage.code} padding="sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {dosage.targetGroup}
                        </span>
                        {dosage.indicationName && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            <LocalizedText text={dosage.indicationName} />
                          </span>
                        )}
                      </div>
                      {dosage.textualDosage && (
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          <LocalizedText text={dosage.textualDosage} />
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              {vmp.vtm && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('entityLabels.substance')}</span>
                  <Link
                    href={links.toSubstance(vmp.vtm.name, vmp.vtm.code)}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px]"
                  >
                    {getLocalized(vmp.vtm.name)}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.brandProducts')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vmp.amps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('sidebar.packageCount')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vmp.packageCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.dosageRecommendations')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vmp.dosages.length}</span>
              </div>
              {/* Validity indicator */}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.validity')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {vmp.endDate && new Date(vmp.endDate) < new Date() ? t('sidebar.expired') : t('sidebar.active')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
