'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/components/LanguageSwitcher';
import { useMedicationDetail } from '@/hooks';
import { MedicationCard } from '@/components/medication/MedicationCard';
import { IngredientList } from '@/components/medication/IngredientList';
import { ReimbursementInfo } from '@/components/medication/ReimbursementInfo';
import { PriceComparison } from '@/components/medication/PriceComparison';
import { AllergenWarnings } from '@/components/medication/AllergenWarnings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Acronym } from '@/components/ui/Tooltip';
import { LocalizedName } from '@/components/ui/LocalizedName';
import { getPrimaryPrice, calculatePricePerUnit, formatPricePerUnit } from '@/lib/utils/price';
import { formatLanguage, parsePackSize } from '@/lib/utils/format';
import { MedicationJsonLd } from '@/components/seo/MedicationJsonLd';

interface MedicationPageProps {
  params: Promise<{ cnk: string }>;
}

const INITIAL_PACKAGES_SHOWN = 3;

export default function MedicationPage({ params }: MedicationPageProps) {
  const t = useTranslations();
  const { cnk } = use(params);
  const [language] = useLanguage();
  const [showAllPackages, setShowAllPackages] = useState(false);
  const { data, isLoading, error } = useMedicationDetail(cnk, { language });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outline" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h1 className="mt-4 text-xl font-semibold text-red-800 dark:text-red-200">
              {t('medication.notFound')}
            </h1>
            <p className="mt-2 text-red-600 dark:text-red-400">
              {error?.message || t('medication.notFoundWithId', { id: cnk })}
            </p>
            <Link href="/">
              <Button className="mt-6">{t('common.backToSearch')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { medication, reimbursement, equivalents, genericProduct } = data;
  const price = getPrimaryPrice(medication);

  // Create search result format for comparison
  const pharmaceuticalForm = medication.components[0]?.pharmaceuticalForm?.name;
  const currentAsSearchResult = {
    ampCode: medication.ampCode,
    name: medication.name,
    companyName: medication.companyName,
    cnk: medication.packages[0]?.cnkCodes.find((c) => c.deliveryEnvironment === 'P')?.code,
    price,
    packDisplayValue: medication.packages[0]?.packDisplayValue,
    isReimbursed: Boolean(reimbursement?.length),
    status: medication.status,
  };

  return (
    <>
      <MedicationJsonLd medication={medication} reimbursed={Boolean(reimbursement?.length)} />
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
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-200">
              {t('nav.medications')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-gray-900 dark:text-white">{medication.name}</li>
        </ol>
      </nav>

      {/* Page heading */}
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        {medication.name}
      </h1>

      {/* Allergen warnings */}
      <AllergenWarnings components={medication.components} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Medication overview */}
          <MedicationCard medication={medication} showActions={false} />

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle>{t('medication.ingredients')}</CardTitle>
            </CardHeader>
            <CardContent>
              <IngredientList components={medication.components} showAllComponents={true} />
            </CardContent>
          </Card>

          {/* Generic info if available */}
          {genericProduct && (
            <Card>
              <CardHeader>
                <CardTitle>{t('medication.genericInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('medication.genericName')}
                    </p>
                    <LocalizedName
                      name={genericProduct.name}
                      nameLanguage={genericProduct.nameLanguage}
                      allNames={genericProduct.allNames}
                      size="lg"
                    />
                  </div>
                  {genericProduct.vmpGroup && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t('medication.therapeuticGroup')}
                      </p>
                      <LocalizedName
                        name={genericProduct.vmpGroup.name}
                        nameLanguage={genericProduct.vmpGroup.nameLanguage}
                        allNames={genericProduct.vmpGroup.allNames}
                        size="md"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price comparison */}
          {equivalents && equivalents.length > 0 && (
            <PriceComparison
              currentMedication={currentAsSearchResult}
              equivalents={equivalents}
              title={t('priceComparison.title')}
              pharmaceuticalForm={pharmaceuticalForm}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reimbursement */}
          <ReimbursementInfo reimbursements={reimbursement || []} medicationPrice={price} />

          {/* Package information */}
          {medication.packages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('medication.availablePackages')}
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    {t('medication.packagesCount', { count: medication.packages.length })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {(showAllPackages
                    ? medication.packages
                    : medication.packages.slice(0, INITIAL_PACKAGES_SHOWN)
                  ).map((pkg, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                    >
                      {/* Header with name and price */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {(() => {
                              const pharmaceuticalForm = medication.components[0]?.pharmaceuticalForm?.name;
                              const packInfo = parsePackSize(pkg.packDisplayValue || pkg.name, pharmaceuticalForm);
                              return packInfo.displayRaw
                                ? packInfo.rawValue
                                : t(`medication.packSizeUnits.${packInfo.unitKey}`, { count: packInfo.count ?? 0 });
                            })()}
                          </p>
                          {pkg.authorisationNr && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              <Acronym term={t('medication.authAbbr')}>{t('medication.authAbbr')}</Acronym>: {pkg.authorisationNr}
                            </p>
                          )}
                        </div>
                        {/* Primary price and price per unit - top right */}
                        {(() => {
                          const primaryPrice = pkg.cnkCodes.find(c => c.price !== undefined)?.price;
                          const pharmaceuticalForm = medication.components[0]?.pharmaceuticalForm?.name;
                          const pricePerUnitResult = calculatePricePerUnit(
                            primaryPrice,
                            pkg.packDisplayValue || pkg.name,
                            pharmaceuticalForm
                          );
                          return primaryPrice !== undefined ? (
                            <div className="text-right">
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                €{primaryPrice.toFixed(2)}
                              </span>
                              {pricePerUnitResult && formatPricePerUnit(pricePerUnitResult) && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {t(`priceComparison.pricePerUnit.${pricePerUnitResult.unit}`, {
                                    price: formatPricePerUnit(pricePerUnitResult) ?? '',
                                  })}
                                </p>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      {/* CNK codes */}
                      <div className="mt-2 space-y-1">
                        {pkg.cnkCodes.map((cnkCode) => (
                          <div
                            key={cnkCode.code}
                            className="text-sm text-gray-600 dark:text-gray-400"
                          >
                            <Acronym term="CNK">CNK</Acronym> {cnkCode.code} ({cnkCode.deliveryEnvironment === 'P' ? t('medication.cnkPharmacy') : t('medication.cnkHospital')})
                            {cnkCode.price !== undefined && pkg.cnkCodes.filter(c => c.price !== undefined).length > 1 && (
                              <span className="ml-2 text-gray-500">— €{cnkCode.price.toFixed(2)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Document Links - show selected language if available, otherwise all languages */}
                      {(pkg.leaflet || pkg.spc || (pkg.allLeaflets && pkg.allLeaflets.length > 0) || (pkg.allSpcs && pkg.allSpcs.length > 0)) && (
                        <div className="mt-3 space-y-2">
                          {/* Patient Leaflet */}
                          {(() => {
                            const hasSelectedLang = pkg.leaflet?.language === language;
                            if (hasSelectedLang && pkg.leaflet) {
                              // Show single link without badge
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('medication.patientLeaflet')}</span>
                                  <a
                                    href={pkg.leaflet.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    PDF
                                  </a>
                                </div>
                              );
                            } else if (pkg.allLeaflets && pkg.allLeaflets.length > 0) {
                              // Show all available with badges
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('medication.patientLeaflet')}</span>
                                  {pkg.allLeaflets.map((doc, i) => (
                                    <a
                                      key={`leaflet-${i}`}
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70"
                                    >
                                      {formatLanguage(doc.language)}
                                    </a>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {/* SmPC */}
                          {(() => {
                            const hasSelectedLang = pkg.spc?.language === language;
                            if (hasSelectedLang && pkg.spc) {
                              // Show single link without badge
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    <Acronym term={t('medication.smpcAbbr')}>{t('medication.smpc')}</Acronym>
                                  </span>
                                  <a
                                    href={pkg.spc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-green-600 hover:underline dark:text-green-400"
                                  >
                                    PDF
                                  </a>
                                </div>
                              );
                            } else if (pkg.allSpcs && pkg.allSpcs.length > 0) {
                              // Show all available with badges
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    <Acronym term={t('medication.smpcAbbr')}>{t('medication.smpc')}</Acronym>
                                  </span>
                                  {pkg.allSpcs.map((doc, i) => (
                                    <a
                                      key={`spc-${i}`}
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-sm font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70"
                                    >
                                      {formatLanguage(doc.language)}
                                    </a>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {medication.packages.length > INITIAL_PACKAGES_SHOWN && (
                  <button
                    onClick={() => setShowAllPackages(!showAllPackages)}
                    className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    {showAllPackages
                      ? t('common.showLess')
                      : t('medication.showMorePackages', { count: medication.packages.length - INITIAL_PACKAGES_SHOWN })}
                  </button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
