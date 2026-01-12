'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { SkeletonList } from '@/components/ui/Skeleton';
import { formatCountry } from '@/lib/utils/format';
import type { CompanySearchResponse, Company, ErrorResponse } from '@/lib/types';

async function searchCompanies(query: string): Promise<CompanySearchResponse> {
  const response = await fetch(`/api/companies?query=${encodeURIComponent(query)}`);
  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message);
  }
  return response.json();
}

export default function CompaniesPage() {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['companies', searchQuery],
    queryFn: () => searchCompanies(searchQuery),
    enabled: searchQuery.length >= 3,
  });

  const handleSearch = useCallback(() => {
    if (query.length >= 3) {
      setSearchQuery(query);
    }
  }, [query]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        {t('company.title')}
      </h1>

      {/* Search */}
      <div className="mb-8 flex gap-2">
        <div className="flex-1">
          <Input
            type="search"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('company.searchPlaceholder')}
            aria-label={t('company.title')}
          />
        </div>
        <Button onClick={handleSearch} loading={isLoading} disabled={query.length < 3}>
          {t('common.search')}
        </Button>
      </div>

      {/* Search hint */}
      <p className="mb-4 -mt-6 text-sm text-gray-500 dark:text-gray-400">
        {t('company.searchHint')}
      </p>

      {/* Results */}
      {isLoading && <SkeletonList count={5} />}

      {error && (
        <Card variant="outline" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent>
            <p className="text-red-600 dark:text-red-400">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <div>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {t('company.resultCount', { count: data.totalCount })}
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.companies.map((company) => (
              <CompanyCard key={company.actorNr} company={company} />
            ))}
          </div>
        </div>
      )}

      {!searchQuery && (
        <Card variant="outline">
          <CardContent className="py-12 text-center">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              {t('company.emptyStateTitle')}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('company.emptyStateDesc')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const t = useTranslations();
  return (
    <Link href={`/companies/${company.actorNr}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent>
          <h3 className="font-semibold text-gray-900 dark:text-white">{company.name}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('company.actorNr', { value: company.actorNr })}
          </p>

          {company.address && (
            <address className="mt-3 text-sm not-italic text-gray-600 dark:text-gray-400">
              {company.address.street && (
                <p>
                  {company.address.street} {company.address.number}
                </p>
              )}
              {(company.address.postcode || company.address.city) && (
                <p>
                  {company.address.postcode} {company.address.city}
                </p>
              )}
              {company.address.countryCode && (
                <p>{formatCountry(company.address.countryCode)}</p>
              )}
            </address>
          )}

          {company.phone && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('company.phone', { value: company.phone })}
            </p>
          )}

          {company.vatNr && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('company.vat', { value: `${company.vatNr.countryCode}${company.vatNr.number}` })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
