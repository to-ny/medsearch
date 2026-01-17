'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { EntityHeader } from '@/components/entities/entity-header';
import { EntityTypeBadge } from '@/components/entities/entity-type-badge';
import { Section } from '@/components/shared/section';
import { PriceDisplay } from '@/components/shared/price-display';
import { CodeDisplay } from '@/components/shared/code-display';
import { Pagination } from '@/components/search/pagination';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/hooks/use-language';
import { useTranslation } from '@/lib/hooks/use-translation';
import { LocalizedText } from '@/components/shared/localized-text';
import type { ATCWithRelations } from '@/server/types/entities';
import type { ATCSummary } from '@/server/types/summaries';

interface ATCDetailProps {
  atc: ATCWithRelations;
  hierarchy: ATCSummary[];
  currentPage: number;
  pageSize: number;
}

function getAtcLevel(code: string): number {
  if (code.length === 1) return 1;
  if (code.length <= 3) return 2;
  if (code.length <= 4) return 3;
  if (code.length <= 5) return 4;
  return 5;
}

export function ATCDetail({ atc, hierarchy, currentPage, pageSize }: ATCDetailProps) {
  const router = useRouter();
  useLanguage(); // Hook required for reactivity
  const { t } = useTranslation();

  const breadcrumbs = [
    ...hierarchy.slice(0, -1).map((h) => ({
      label: h.code,
      href: `/atc/${h.code}`,
    })),
    { label: atc.code },
  ];

  const totalPages = Math.ceil(atc.packageCount / pageSize);
  const atcLevel = getAtcLevel(atc.code);

  const handlePageChange = (page: number) => {
    router.push(`/atc/${atc.code}?page=${page}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          <EntityHeader
            entityType="atc"
            name={{ en: `${atc.code} - ${atc.description}` }}
            code={atc.code}
            codeType="atc"
            subtitle={t(`atcLevels.level${atcLevel}`)}
          />

          {/* Hierarchy */}
          <Section title={t('detail.classificationHierarchy')}>
            <div className="flex items-center gap-2 flex-wrap bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              {hierarchy.map((h, idx) => (
                <div key={h.code} className="flex items-center">
                  {idx > 0 && (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 mr-2" />
                  )}
                  {h.code === atc.code ? (
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {h.code}
                    </span>
                  ) : (
                    <Link
                      href={`/atc/${h.code}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {h.code}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Child Classifications */}
          {atc.children.length > 0 && (
            <Section title={t('detail.childClassifications')} count={atc.children.length}>
              <div className="space-y-2">
                {atc.children.map((child) => (
                  <Link
                    key={child.code}
                    href={`/atc/${child.code}`}
                    className="block group"
                  >
                    <Card hover padding="sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400 w-16 flex-shrink-0">
                          {child.code}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {child.description}
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Products */}
          <Section
            title={t('detail.productsWithClassification')}
            count={atc.packageCount}
            headerAction={
              atc.packageCount > 0 ? (
                <Link
                  href={`/search?atc=${atc.code}&types=ampp`}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title={t('common.searchAll')}
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.searchAll')}</span>
                </Link>
              ) : undefined
            }
          >
            {atc.packages.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                {t('detail.noPackagesDirectly')}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {atc.packages.map((pkg) => (
                    <Link
                      key={pkg.code}
                      href={`/ampp/${pkg.code}`}
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
                                <CodeDisplay
                                  type="cnk"
                                  value={pkg.cnkCode}
                                  variant="short"
                                  showTooltip
                                  className="text-xs text-gray-500 dark:text-gray-400"
                                />
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
              </>
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              {atc.parentCode && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('detail.parent')}</span>
                  <Link
                    href={`/atc/${atc.parentCode}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {atc.parentCode}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.children')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{atc.children.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.products')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{atc.packageCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
