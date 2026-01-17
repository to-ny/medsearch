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
import { Pagination } from '@/components/search/pagination';
import { Card } from '@/components/ui/card';
import { formatValidityPeriod, formatAddress, formatCountryName } from '@/lib/utils/format';
import type { CompanyWithRelations } from '@/server/types/entities';
import { useLanguage, useLinks, useTranslation } from '@/lib/hooks';

interface CompanyDetailProps {
  company: CompanyWithRelations;
  currentPage: number;
  pageSize: number;
}

export function CompanyDetail({ company, currentPage, pageSize }: CompanyDetailProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const links = useLinks();
  const { t } = useTranslation();
  const breadcrumbs = [{ label: company.denomination }];

  const totalPages = Math.ceil(company.productCount / pageSize);

  const handlePageChange = (page: number) => {
    router.push(links.withPage(links.toCompany(company.denomination, company.actorNr), page));
  };

  const addressLines = formatAddress(
    company.streetName,
    company.streetNum,
    company.postbox,
    company.postcode,
    company.city,
    company.countryCode,
    language
  );

  const countryName = formatCountryName(company.countryCode, language);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <EntityHeader
            entityType="company"
            name={{ en: company.denomination }}
            code={company.actorNr}
            codeType="actorNr"
            subtitle={company.city ? `${company.city}${countryName ? `, ${countryName}` : ''}` : undefined}
          />

          {/* Contact Information */}
          <Section title={t('detail.contactInformation')}>
            <InfoList>
              {addressLines.length > 0 && (
                <InfoRow
                  label={t('company.address')}
                  value={
                    <div className="space-y-0.5">
                      {addressLines.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  }
                />
              )}
              {company.phone && (
                <InfoRow
                  label={t('company.phone')}
                  value={
                    <a
                      href={`tel:${company.phone}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {company.phone}
                    </a>
                  }
                />
              )}
              {company.language && (
                <InfoRow label={t('company.preferredLanguage')} value={company.language.toUpperCase()} />
              )}
            </InfoList>
          </Section>

          {/* Legal Information */}
          <Section title={t('detail.legalInformation')}>
            <InfoList>
              {company.legalForm && (
                <InfoRow label={t('company.legalForm')} value={company.legalForm} />
              )}
              {(company.vatCountryCode || company.vatNumber) && (
                <InfoRow
                  label={t('company.vat')}
                  value={`${company.vatCountryCode || ''}${company.vatNumber || ''}`}
                />
              )}
              <InfoRow
                label={t('detail.validity')}
                value={formatValidityPeriod(company.startDate, company.endDate)}
              />
            </InfoList>
          </Section>

          {/* Products */}
          <Section
            title={t('detail.products')}
            count={company.productCount}
            headerAction={
              company.productCount > 0 ? (
                <Link
                  href={links.toSearch({ company: company.actorNr, types: 'amp' })}
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
              {company.products.map((product) => (
                <Link
                  key={product.code}
                  href={links.toMedication(product.name, product.code)}
                  className="block group"
                >
                  <Card hover padding="sm">
                    <div className="flex items-center gap-3">
                      <EntityTypeBadge type="amp" size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          <LocalizedText text={product.name} />
                        </p>
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
                <span className="text-gray-500 dark:text-gray-400">{t('detail.products')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{company.productCount}</span>
              </div>
              {countryName && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('company.country')}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{countryName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
