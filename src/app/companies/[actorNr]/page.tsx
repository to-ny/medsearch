'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLanguage } from '@/components/LanguageSwitcher';
import { formatCountry, formatLanguage } from '@/lib/utils/format';
import type { Company, ErrorResponse } from '@/lib/types';

async function fetchCompany(actorNr: string, language: string): Promise<Company> {
  const response = await fetch(`/api/companies/${actorNr}?lang=${language}`);
  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message);
  }
  return response.json();
}

export default function CompanyDetailPage({ params }: { params: Promise<{ actorNr: string }> }) {
  const t = useTranslations();
  const { actorNr } = use(params);
  const [language] = useLanguage();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', actorNr, language],
    queryFn: () => fetchCompany(actorNr, language),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-4 h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outline" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error.message}</p>
            <Link href="/companies" className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400">
              {t('company.backToList')}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!company) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <li>
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-200">
              {t('common.home')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/companies" className="hover:text-gray-700 dark:hover:text-gray-200">
              {t('nav.companies')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-gray-900 dark:text-white">{company.name}</li>
        </ol>
      </nav>

      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">{company.name}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('company.information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">{t('company.actorNumber')}</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{company.actorNr}</dd>
              </div>

              {company.legalForm && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('company.legalForm')}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{company.legalForm}</dd>
                </div>
              )}

              {company.vatNr && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('company.vatNumber')}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {company.vatNr.countryCode}{company.vatNr.number}
                  </dd>
                </div>
              )}

              {company.language && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('company.language')}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {formatLanguage(company.language)}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('company.contactInformation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {company.address && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('company.address')}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    <address className="not-italic">
                      {company.address.street && (
                        <p>{company.address.street} {company.address.number}</p>
                      )}
                      {company.address.postbox && <p>{t('company.postbox', { value: company.address.postbox })}</p>}
                      {(company.address.postcode || company.address.city) && (
                        <p>{company.address.postcode} {company.address.city}</p>
                      )}
                      {company.address.countryCode && (
                        <p>{formatCountry(company.address.countryCode)}</p>
                      )}
                    </address>
                  </dd>
                </div>
              )}

              {company.phone && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('company.phone', { value: '' }).replace(': ', '')}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    <a href={`tel:${company.phone}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      {company.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Search Products Link */}
      <div className="mt-6 flex justify-end">
        <Link
          href={`/search?company=${actorNr}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {t('company.searchTheirProducts')}
        </Link>
      </div>
    </div>
  );
}
