'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { EntityTypeBadge } from '@/components/entities/entity-type-badge';
import { ReimbursementBadge } from '@/components/entities/reimbursement-badge';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { PriceDisplay } from '@/components/shared/price-display';
import { DocumentLinks } from '@/components/shared/document-links';
import { LocalizedText } from '@/components/shared/localized-text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage, useLinks, useTranslation } from '@/lib/hooks';
import { formatValidityPeriod, formatPrice } from '@/lib/utils/format';
import type { AMPPWithRelations } from '@/server/types/entities';

interface AMPPDetailProps {
  ampp: AMPPWithRelations;
}

export function AMPPDetail({ ampp }: AMPPDetailProps) {
  const { getLocalized } = useLanguage();
  const links = useLinks();
  const { t } = useTranslation();
  const name = ampp.prescriptionName
    ? getLocalized(ampp.prescriptionName)
    : getLocalized(ampp.amp.name);
  const ampName = getLocalized(ampp.amp.name);

  const breadcrumbs = [
    { label: ampName, href: links.toMedication(ampp.amp.name, ampp.amp.code) },
    { label: ampp.packDisplayValue || name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <EntityHeader
            entityType="ampp"
            name={ampp.prescriptionName || ampp.amp.name}
            code={ampp.ctiExtended}
            codeType="ctiExtended"
            status={ampp.status || undefined}
            subtitle={ampp.atcCode ? `${t('codes.atc')}: ${ampp.atcCode}` : undefined}
          />

          {/* Overview */}
          {(ampp.packDisplayValue || ampp.authorisationNr || ampp.orphan || ampp.status || ampp.startDate || ampp.endDate) && (
            <Section title={t('detail.overview')}>
              <InfoList>
                {ampp.packDisplayValue && (
                  <InfoRow label={t('detail.pack')} value={ampp.packDisplayValue} />
                )}
                {ampp.authorisationNr && (
                  <InfoRow label={t('detail.authorisationNr')} value={ampp.authorisationNr} />
                )}
                {ampp.orphan && (
                  <InfoRow
                    label={t('detail.orphanDrug')}
                    value={<Badge variant="info" size="sm">{t('detail.orphanDrug')}</Badge>}
                  />
                )}
                {ampp.status && (
                  <InfoRow
                    label={t('detail.status')}
                    value={t(`status.${ampp.status}`) || ampp.status}
                  />
                )}
                <InfoRow
                  label={t('detail.validity')}
                  value={formatValidityPeriod(ampp.startDate, ampp.endDate)}
                />
              </InfoList>
            </Section>
          )}

          {/* Brand Information */}
          <Section title={t('detail.brandInformation')}>
            <Link href={links.toMedication(ampp.amp.name, ampp.amp.code)} className="block group">
              <Card hover padding="sm">
                <div className="flex items-center gap-3">
                  <EntityTypeBadge type="amp" size="sm" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      <LocalizedText text={ampp.amp.name} showFallbackIndicator={false} />
                    </span>
                    {ampp.amp.companyName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {ampp.amp.companyName}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          </Section>

          {/* ATC Classification */}
          {ampp.atcClassification && (
            <Section title={t('detail.atcClassification')}>
              <Link href={links.toClassification(ampp.atcClassification.code, { en: ampp.atcClassification.description })} className="block group">
                <Card hover padding="sm">
                  <div className="flex items-center gap-3">
                    <EntityTypeBadge type="atc" size="sm" />
                    <div className="flex-1">
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {ampp.atcClassification.code}
                      </span>
                      <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {ampp.atcClassification.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            </Section>
          )}

          {/* Pricing & CNK Codes */}
          {ampp.cnkCodes.length > 0 && (
            <Section title={t('detail.pricingCnkCodes')}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('codes.cnk')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('chapterIV.environment')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('chapterIV.price')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('detail.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {ampp.cnkCodes.map((cnk) => (
                      <tr key={`${cnk.code}-${cnk.deliveryEnvironment}`}>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-gray-900 dark:text-gray-100">
                          {cnk.code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {cnk.deliveryEnvironment === 'P' ? t('detail.public') : t('detail.hospital')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <PriceDisplay amount={cnk.price} showNull nullText="-" />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {cnk.cheapest && (
                              <Badge variant="success" size="sm">{t('pricing.cheapest')}</Badge>
                            )}
                            {cnk.cheap && !cnk.cheapest && (
                              <Badge variant="primary" size="sm">{t('pricing.cheap')}</Badge>
                            )}
                            {cnk.reimbursable && (
                              <Badge variant="info" size="sm">{t('detail.reimbursable')}</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Reimbursement */}
          {ampp.reimbursementContexts.length > 0 && (
            <Section title={t('detail.reimbursement')} count={ampp.reimbursementContexts.length}>
              <div className="space-y-4">
                {ampp.reimbursementContexts.map((ctx) => (
                  <Card key={ctx.id} padding="md">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <ReimbursementBadge category={ctx.reimbursementCriterionCategory} showLabel />
                        {ctx.flatRateSystem && (
                          <Badge variant="outline" size="sm">{t('pricing.flatRate')}</Badge>
                        )}
                        {ctx.referencePrice && (
                          <Badge variant="outline" size="sm">{t('detail.referencePrice')}</Badge>
                        )}
                        {ctx.temporary && (
                          <Badge variant="warning" size="sm">{t('pricing.temporary')}</Badge>
                        )}
                      </div>

                      <InfoList>
                        {ctx.referenceBasePrice !== null && (
                          <InfoRow
                            label={t('detail.referencePrice')}
                            value={formatPrice(ctx.referenceBasePrice)}
                          />
                        )}
                        {/* Only show reimbursement amount if it's not 0, or if it's not a reference price system */}
                        {ctx.reimbursementBasePrice !== null && ctx.reimbursementBasePrice > 0 && (
                          <InfoRow
                            label={t('detail.reimbursement')}
                            value={formatPrice(ctx.reimbursementBasePrice)}
                          />
                        )}
                      </InfoList>

                      {/* Copayments */}
                      {ctx.copayments.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('detail.copayment')}
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                              <thead>
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {t('pricing.regimen')}
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {t('pricing.patientFee')}
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {t('detail.reimbursement')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {ctx.copayments.map((cp) => (
                                  <tr key={cp.id}>
                                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                                      {cp.regimenType === '1' ? t('pricing.preferential') : t('pricing.regular')}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {formatPrice(cp.feeAmount) || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {formatPrice(cp.reimbursementAmount) || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* Chapter IV Requirements */}
          {ampp.chapterIVParagraphs.length > 0 && (
            <Section title={t('detail.chapterIVRequirements')} count={ampp.chapterIVParagraphs.length}>
              <div className="space-y-2">
                {ampp.chapterIVParagraphs.map((para) => (
                  <Link
                    key={`${para.chapterName}-${para.paragraphName}`}
                    href={links.toChapterIV(para.chapterName, para.paragraphName)}
                    className="block group"
                  >
                    <Card hover padding="sm">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          Chapter {para.chapterName} - {para.paragraphName}
                        </p>
                        {para.keyString && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <LocalizedText text={para.keyString} />
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Documents */}
          {(ampp.leafletUrl || ampp.spcUrl) && (
            <Section title={t('detail.documents')}>
              <DocumentLinks
                leafletUrls={ampp.leafletUrl}
                spcUrls={ampp.spcUrl}
              />
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Orphan Drug Indicator */}
          {ampp.orphan && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Badge variant="info" size="sm">{t('sidebar.orphanDrug')}</Badge>
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              {ampp.amp.vmpCode && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('entityLabels.generic')}</span>
                  <Link
                    href={links.toGeneric({ en: ampp.amp.vmpCode }, ampp.amp.vmpCode)}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px]"
                  >
                    {ampp.amp.vmpCode}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('entityLabels.brand')}</span>
                <Link
                  href={links.toMedication(ampp.amp.name, ampp.amp.code)}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px]"
                >
                  {ampName}
                </Link>
              </div>
              {ampp.atcClassification && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('codes.atc')}</span>
                  <Link
                    href={links.toClassification(ampp.atcClassification.code, { en: ampp.atcClassification.description })}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {ampp.atcClassification.code}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('codes.cnk')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{ampp.cnkCodes.length}</span>
              </div>
              {ampp.exFactoryPrice !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('detail.exFactoryPrice')}</span>
                  <PriceDisplay amount={ampp.exFactoryPrice} />
                </div>
              )}
              {/* Chapter IV indicator */}
              {ampp.chapterIVParagraphs.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('sidebar.chapterIV')}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{ampp.chapterIVParagraphs.length}</span>
                </div>
              )}
              {/* Validity indicator */}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.validity')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {ampp.endDate && new Date(ampp.endDate) < new Date() ? t('sidebar.expired') : t('sidebar.active')}
                </span>
              </div>
            </div>
          </div>

          {/* Reimbursement summary */}
          {ampp.reimbursementContexts.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
                {t('detail.reimbursable')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {[...new Set(ampp.reimbursementContexts.map((c) => c.reimbursementCriterionCategory))].map(
                  (cat) => cat && <ReimbursementBadge key={cat} category={cat} showLabel />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
