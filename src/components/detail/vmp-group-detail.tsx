'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { RelationshipList } from '@/components/entities/relationship-list';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { LocalizedText } from '@/components/shared/localized-text';
import { AlertBox } from '@/components/shared/alert-box';
import { JsonLd } from '@/components/shared/json-ld';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/hooks/use-language';
import { useTranslation } from '@/lib/hooks/use-translation';
import { formatQuantity, formatQuantityRange } from '@/lib/utils/format';
import { ValidityPeriod } from '@/components/shared/validity-period';
import type { VMPGroupWithRelations, StandardDosage } from '@/server/types/entities';

interface VMPGroupDetailProps {
  vmpGroup: VMPGroupWithRelations;
}

export function VMPGroupDetail({ vmpGroup }: VMPGroupDetailProps) {
  const { getLocalized } = useLanguage();
  const { t } = useTranslation();
  const name = getLocalized(vmpGroup.name);

  const breadcrumbs = [{ label: name }];

  const vmpItems = vmpGroup.vmps.map((vmp) => ({
    entityType: vmp.entityType,
    code: vmp.code,
    name: vmp.name,
    subtitle: vmp.status !== 'AUTHORIZED' ? (t(`status.${vmp.status}`) || vmp.status) : undefined,
  }));

  // Group dosages by target group
  const dosagesByTarget = vmpGroup.dosages.reduce((acc, dosage) => {
    const group = dosage.targetGroup;
    if (!acc[group]) acc[group] = [];
    acc[group].push(dosage);
    return acc;
  }, {} as Record<string, StandardDosage[]>);

  const targetGroupOrder = ['NEONATE', 'PAEDIATRICS', 'ADOLESCENT', 'ADULT'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <EntityHeader
            entityType="vmp_group"
            name={vmpGroup.name}
            code={vmpGroup.code}
          />

          {/* Warnings */}
          {(vmpGroup.patientFrailtyIndicator || vmpGroup.noGenericPrescriptionReason || vmpGroup.noSwitchReason) && (
            <div className="space-y-3">
              {vmpGroup.patientFrailtyIndicator && (
                <AlertBox
                  variant="warning"
                  title={t('detail.patientFrailtyIndicator')}
                  description={t('detail.patientFrailtyDescription')}
                />
              )}
              {vmpGroup.noGenericPrescriptionReason && (
                <AlertBox
                  variant="info"
                  title={t('detail.noGenericPrescription')}
                  description={vmpGroup.noGenericPrescriptionReason}
                />
              )}
              {vmpGroup.noSwitchReason && (
                <AlertBox
                  variant="info"
                  title={t('detail.noSwitching')}
                  description={vmpGroup.noSwitchReason}
                />
              )}
            </div>
          )}

          {/* Overview */}
          {(vmpGroup.startDate || vmpGroup.endDate ||
            (vmpGroup.name.nl && vmpGroup.name.nl !== name) ||
            (vmpGroup.name.fr && vmpGroup.name.fr !== name) ||
            (vmpGroup.name.en && vmpGroup.name.en !== name) ||
            (vmpGroup.name.de && vmpGroup.name.de !== name)) && (
            <Section title={t('detail.overview')}>
              <InfoList>
                <InfoRow
                  label={t('detail.validity')}
                  value={<ValidityPeriod startDate={vmpGroup.startDate} endDate={vmpGroup.endDate} />}
                />
                {/* Show all language variants */}
                {vmpGroup.name.nl && vmpGroup.name.nl !== name && (
                  <InfoRow label={t('languages.dutch')} value={vmpGroup.name.nl} />
                )}
                {vmpGroup.name.fr && vmpGroup.name.fr !== name && (
                  <InfoRow label={t('languages.french')} value={vmpGroup.name.fr} />
                )}
                {vmpGroup.name.en && vmpGroup.name.en !== name && (
                  <InfoRow label={t('languages.english')} value={vmpGroup.name.en} />
                )}
                {vmpGroup.name.de && vmpGroup.name.de !== name && (
                  <InfoRow label={t('languages.german')} value={vmpGroup.name.de} />
                )}
              </InfoList>
            </Section>
          )}

          {/* Member Products */}
          <RelationshipList
            title={t('detail.memberProducts')}
            items={vmpItems}
            searchFilter={{ type: 'vmpGroup', code: vmpGroup.code }}
            searchType="vmp"
          />

          {/* Dosage Recommendations */}
          {vmpGroup.dosages.length > 0 && (
            <Section title={t('detail.dosageRecommendations')} count={vmpGroup.dosages.length}>
              <div className="space-y-4">
                {targetGroupOrder.map((targetGroup) => {
                  const dosages = dosagesByTarget[targetGroup];
                  if (!dosages || dosages.length === 0) return null;

                  return (
                    <CollapsibleSection
                      key={targetGroup}
                      title={t(`targetGroups.${targetGroup}`) || targetGroup.charAt(0) + targetGroup.slice(1).toLowerCase()}
                      count={dosages.length}
                      defaultOpen={targetGroup === 'ADULT'}
                    >
                      <div className="space-y-3">
                        {dosages.map((dosage) => (
                          <DosageCard key={dosage.code} dosage={dosage} t={t} />
                        ))}
                      </div>
                    </CollapsibleSection>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Clinical Indicators */}
          {vmpGroup.patientFrailtyIndicator && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-200">{t('sidebar.frailtyWarning')}</span>
              </div>
            </div>
          )}
          {vmpGroup.noGenericPrescriptionReason && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Badge variant="info" size="sm">{t('sidebar.noGenericRx')}</Badge>
              </div>
            </div>
          )}
          {vmpGroup.noSwitchReason && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">{t('sidebar.noSwitching')}</Badge>
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.memberProducts')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vmpGroup.vmps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.dosageRecommendations')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{vmpGroup.dosages.length}</span>
              </div>
              {/* Validity indicator */}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.validity')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {vmpGroup.endDate && new Date(vmpGroup.endDate) < new Date() ? t('sidebar.expired') : t('sidebar.active')}
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
          '@type': 'MedicalTherapy',
          name: name,
          identifier: vmpGroup.code,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }}
      />
    </div>
  );
}

function DosageCard({ dosage, t }: { dosage: StandardDosage; t: (key: string) => string }) {
  const { getLocalized } = useLanguage();

  return (
    <Card padding="sm">
      <div className="space-y-3">
        {/* Header with indication and badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            {dosage.indicationName && (
              <p className="font-medium text-gray-900 dark:text-gray-100">
                <LocalizedText text={dosage.indicationName} />
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge size="sm" variant="outline">
                {t(`treatmentDuration.${dosage.treatmentDurationType}`) || dosage.treatmentDurationType.replace(/_/g, ' ')}
              </Badge>
              {dosage.kidneyFailureClass !== null && dosage.kidneyFailureClass > 0 && (
                <Badge size="sm" variant="warning">
                  {t('dosage.kidneyClass')} {dosage.kidneyFailureClass}
                </Badge>
              )}
              {dosage.liverFailureClass !== null && dosage.liverFailureClass > 0 && (
                <Badge size="sm" variant="warning">
                  {t('dosage.liverClass')} {dosage.liverFailureClass}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Textual dosage */}
        {dosage.textualDosage && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <LocalizedText text={dosage.textualDosage} />
          </p>
        )}

        {/* Dosage details */}
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {/* Quantity */}
          {(dosage.quantity !== null || (dosage.quantityRangeLower !== null && dosage.quantityRangeUpper !== null)) && (
            <p>
              <span className="font-medium">{t('dosage.quantity')}:</span>{' '}
              {dosage.quantity !== null
                ? formatQuantity(dosage.quantity, dosage.quantityDenominator)
                : formatQuantityRange(dosage.quantityRangeLower, dosage.quantityRangeUpper)}
            </p>
          )}

          {/* Frequency */}
          {dosage.administrationFrequencyQuantity !== null && (
            <p>
              <span className="font-medium">{t('dosage.frequency')}:</span>{' '}
              {dosage.administrationFrequencyIsMax ? `${t('dosage.max')} ` : ''}
              {dosage.administrationFrequencyQuantity}x
              {dosage.administrationFrequencyTimeframeValue && dosage.administrationFrequencyTimeframeUnit && (
                <> {t('dosage.per')} {dosage.administrationFrequencyTimeframeValue} {dosage.administrationFrequencyTimeframeUnit}</>
              )}
            </p>
          )}

          {/* Maximum daily */}
          {dosage.maximumDailyQuantityValue !== null && (
            <p>
              <span className="font-medium">{t('dosage.maxDaily')}:</span>{' '}
              {dosage.maximumDailyQuantityValue}
              {dosage.maximumDailyQuantityUnit && ` ${dosage.maximumDailyQuantityUnit}`}
            </p>
          )}

          {/* Duration */}
          {dosage.temporalityDurationValue !== null && dosage.temporalityDurationUnit && (
            <p>
              <span className="font-medium">{t('dosage.duration')}:</span>{' '}
              {dosage.temporalityDurationValue} {dosage.temporalityDurationUnit}
            </p>
          )}
        </div>

        {/* Parameter bounds */}
        {dosage.parameterBounds.length > 0 && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('dosage.parameterConstraints')}
            </p>
            <div className="flex flex-wrap gap-2">
              {dosage.parameterBounds.map((bound, idx) => (
                <Badge key={idx} size="sm" variant="outline">
                  {bound.parameterName ? getLocalized(bound.parameterName) : bound.parameterCode}
                  : {bound.lowerBoundValue !== null ? `${bound.lowerBoundValue}${bound.lowerBoundUnit || ''}` : ''}
                  {bound.lowerBoundValue !== null && bound.upperBoundValue !== null ? '-' : ''}
                  {bound.upperBoundValue !== null ? `${bound.upperBoundValue}${bound.upperBoundUnit || ''}` : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Additional info */}
        {(dosage.supplementaryInfo || dosage.routeSpecification || dosage.temporalityNote) && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            {dosage.supplementaryInfo && (
              <p><LocalizedText text={dosage.supplementaryInfo} /></p>
            )}
            {dosage.routeSpecification && (
              <p>{t('dosage.route')}: <LocalizedText text={dosage.routeSpecification} /></p>
            )}
            {dosage.temporalityNote && (
              <p>{t('dosage.note')}: <LocalizedText text={dosage.temporalityNote} /></p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
