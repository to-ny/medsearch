'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/components/LanguageSwitcher';
import { useCompanyProducts } from '@/hooks/useCompanyProducts';
import { formatCountry, formatLanguage } from '@/lib/utils/format';
import { formatPrice } from '@/lib/utils/price';
import type { Company, ErrorResponse, MedicationSearchResult } from '@/lib/types';

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

      {/* Products Section */}
      <CompanyProducts actorNr={actorNr} companyName={company.name} language={language} />
    </div>
  );
}

const INITIAL_PRODUCTS_LIMIT = 10;

interface CompanyProductsProps {
  actorNr: string;
  companyName: string;
  language: string;
}

function CompanyProducts({ actorNr, companyName, language }: CompanyProductsProps) {
  const t = useTranslations();
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, error } = useCompanyProducts({
    actorNr,
    language,
  });

  const products = data?.results || [];
  const totalCount = data?.totalCount || 0;
  const displayedProducts = showAll ? products : products.slice(0, INITIAL_PRODUCTS_LIMIT);
  const hasMoreToShow = totalCount > INITIAL_PRODUCTS_LIMIT && !showAll;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('company.productsTitle')}</span>
          {totalCount > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              {t('company.productCount', { count: totalCount })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonList count={3} />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400">{t('company.productsError')}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {t('company.noProducts', { name: companyName })}
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-3" role="list">
              {displayedProducts.map((product) => (
                <li key={product.ampCode}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>

            {hasMoreToShow && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('common.showMore', { count: totalCount - INITIAL_PRODUCTS_LIMIT })}
                </button>
              </div>
            )}

            {showAll && totalCount > INITIAL_PRODUCTS_LIMIT && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAll(false)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {t('common.showLess')}
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ProductCardProps {
  product: MedicationSearchResult;
}

function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations();
  const linkHref = product.cnk
    ? `/medication/${product.cnk}`
    : `/medication/${encodeURIComponent(product.ampCode)}`;

  return (
    <Link href={linkHref}>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md dark:border-gray-700">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white">{product.name}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {product.cnk && <span>{t('medication.cnkLabel')}: {product.cnk}</span>}
            {product.packDisplayValue && (
              <>
                <span aria-hidden="true">-</span>
                <span>{product.packDisplayValue}</span>
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.isReimbursed && (
              <Badge variant="success" size="sm">
                {t('badge.reimbursed')}
              </Badge>
            )}
          </div>
        </div>

        <div className="ml-4 text-right">
          {product.price !== undefined ? (
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatPrice(product.price)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">{t('common.priceNA')}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
