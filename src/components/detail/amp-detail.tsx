'use client';

import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { EntityTypeBadge } from '@/components/entities/entity-type-badge';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { PriceDisplay } from '@/components/shared/price-display';
import { LocalizedText } from '@/components/shared/localized-text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/hooks/use-language';
import { useTranslation } from '@/lib/hooks/use-translation';
import { formatValidityPeriod } from '@/lib/utils/format';
import { generateEntitySlug, generateCompanySlug } from '@/lib/utils/slug';
import type { AMPWithRelations } from '@/server/types/entities';

interface AMPDetailProps {
  amp: AMPWithRelations;
}

export function AMPDetail({ amp }: AMPDetailProps) {
  const { getLocalized, language } = useLanguage();
  const { t } = useTranslation();
  const name = getLocalized(amp.name);
  const vmpName = amp.vmp ? getLocalized(amp.vmp.name) : null;

  // Generate slugs for links
  const vmpSlug = amp.vmp ? generateEntitySlug(amp.vmp.name, amp.vmp.code, language) : null;
  const companySlug = amp.company ? generateCompanySlug(amp.company.denomination, amp.company.actorNr) : null;

  const breadcrumbs = [
    ...(amp.vmp && vmpSlug ? [{ label: vmpName!, href: `/${language}/generics/${vmpSlug}` }] : []),
    { label: name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <EntityHeader
            entityType="amp"
            name={amp.name}
            code={amp.code}
            status={amp.status}
            subtitle={amp.company?.denomination}
            blackTriangle={amp.blackTriangle}
          />

          {/* Black Triangle Warning */}
          {amp.blackTriangle && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">
                    {t('detail.enhancedMonitoringRequired')}
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('detail.enhancedMonitoringDescription')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overview */}
          <Section title={t('detail.overview')}>
            <InfoList>
              {amp.officialName && amp.officialName !== name && (
                <InfoRow label={t('detail.officialName')} value={amp.officialName} />
              )}
              {amp.abbreviatedName && (
                <InfoRow
                  label={t('detail.abbreviatedName')}
                  value={<LocalizedText text={amp.abbreviatedName} />}
                />
              )}
              {amp.medicineType && (
                <InfoRow
                  label={t('detail.medicineType')}
                  value={t(`medicineTypes.${amp.medicineType}`) || amp.medicineType}
                />
              )}
              <InfoRow
                label={t('detail.validity')}
                value={formatValidityPeriod(amp.startDate, amp.endDate)}
              />
            </InfoList>
          </Section>

          {/* Generic Product */}
          {amp.vmp && vmpSlug && (
            <Section title={t('detail.genericProduct')}>
              <Link href={`/${language}/generics/${vmpSlug}`} className="block group">
                <Card hover padding="sm">
                  <div className="flex items-center gap-3">
                    <EntityTypeBadge type="vmp" size="sm" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      <LocalizedText text={amp.vmp.name} />
                    </span>
                  </div>
                </Card>
              </Link>
            </Section>
          )}

          {/* Manufacturer */}
          {amp.company && companySlug && (
            <Section title={t('detail.manufacturer')}>
              <Link href={`/${language}/companies/${companySlug}`} className="block group">
                <Card hover padding="sm">
                  <div className="flex items-center gap-3">
                    <EntityTypeBadge type="company" size="sm" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {amp.company.denomination}
                      </span>
                      {amp.company.city && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {amp.company.city}{amp.company.countryCode ? `, ${amp.company.countryCode}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            </Section>
          )}

          {/* Pharmaceutical Details */}
          {amp.components.length > 0 && (
            <Section title={t('detail.pharmaceuticalDetails')}>
              <div className="space-y-3">
                {amp.components.map((component) => (
                  <Card key={component.sequenceNr} padding="sm">
                    <InfoList>
                      {component.pharmaceuticalFormName && (
                        <InfoRow
                          label={t('detail.form')}
                          value={<LocalizedText text={component.pharmaceuticalFormName} />}
                        />
                      )}
                      {component.routeOfAdministrationName && (
                        <InfoRow
                          label={t('detail.route')}
                          value={<LocalizedText text={component.routeOfAdministrationName} />}
                        />
                      )}
                    </InfoList>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* Active Ingredients */}
          {amp.ingredients.length > 0 && (
            <Section title={t('detail.activeIngredients')} count={amp.ingredients.length}>
              <div className="space-y-2">
                {amp.ingredients.map((ingredient) => (
                  <div
                    key={`${ingredient.componentSequenceNr}-${ingredient.rank}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {ingredient.substanceName ? (
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          <LocalizedText text={ingredient.substanceName} />
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 italic">
                          {t('detail.unknownSubstance')}
                        </span>
                      )}
                      {ingredient.type === 'EXCIPIENT' && (
                        <Badge variant="outline" size="sm">{t('detail.excipients')}</Badge>
                      )}
                    </div>
                    {ingredient.strengthDescription && (
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {ingredient.strengthDescription}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Excipients */}
          {amp.excipients && (
            <CollapsibleSection title={t('detail.excipientInactiveIngredients')} defaultOpen={false}>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-line"><LocalizedText text={amp.excipients.text} /></p>
                {amp.excipients.sourceUrls && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    {t('detail.excipientSource')}
                  </p>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Packages */}
          <Section
            title={t('detail.availablePackages')}
            count={amp.packages.length}
            headerAction={
              amp.packages.length > 0 ? (
                <Link
                  href={`/${language}/search?amp=${amp.code}&types=ampp`}
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
              {amp.packages.map((pkg) => {
                const pkgSlug = generateEntitySlug(pkg.name, pkg.code, language);
                return (
                  <Link
                    key={pkg.code}
                    href={`/${language}/packages/${pkgSlug}`}
                    className="block group"
                  >
                    <Card hover padding="sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <EntityTypeBadge type="ampp" size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {pkg.packDisplayValue || <LocalizedText text={pkg.name} showFallbackIndicator={false} />}
                            </p>
                            {pkg.cnkCode && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                CNK: {pkg.cnkCode}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {pkg.reimbursable && (
                            <Badge variant="success" size="sm">{t('detail.reimbursable')}</Badge>
                          )}
                          <PriceDisplay amount={pkg.exFactoryPrice} size="sm" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              {amp.vmp && vmpSlug && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('entityLabels.generic')}</span>
                  <Link
                    href={`/${language}/generics/${vmpSlug}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px]"
                  >
                    {getLocalized(amp.vmp.name)}
                  </Link>
                </div>
              )}
              {amp.company && companySlug && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('entityLabels.company')}</span>
                  <Link
                    href={`/${language}/companies/${companySlug}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px]"
                  >
                    {amp.company.denomination}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.packages')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{amp.packages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.activeIngredients')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{amp.ingredients.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
