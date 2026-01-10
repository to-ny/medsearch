'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LocalizedName } from '@/components/ui/LocalizedName';
import { formatPrice, calculateSavings, calculatePricePerUnit, formatPricePerUnit, type PricePerUnitResult } from '@/lib/utils/price';
import type { MedicationSearchResult } from '@/lib/types';

interface MedicationWithPricePerUnit extends MedicationSearchResult {
  pricePerUnit: PricePerUnitResult | null;
}

interface PriceComparisonProps {
  currentMedication: MedicationSearchResult;
  equivalents: MedicationSearchResult[];
  title?: string;
  showCompareLink?: boolean;
  /** Pharmaceutical form for calculating price per unit */
  pharmaceuticalForm?: string;
}

export function PriceComparison({
  currentMedication,
  equivalents,
  title,
  showCompareLink = true,
  pharmaceuticalForm,
}: PriceComparisonProps) {
  const t = useTranslations();
  const displayTitle = title || t('priceComparison.title');

  // Calculate price per unit for current medication
  const currentPricePerUnit = calculatePricePerUnit(
    currentMedication.price,
    currentMedication.packDisplayValue,
    pharmaceuticalForm
  );

  // Sort by price, cheapest first, and calculate price per unit
  const sortedEquivalents: MedicationWithPricePerUnit[] = [...equivalents]
    .filter((eq) => eq.price !== undefined)
    .map((eq) => ({
      ...eq,
      pricePerUnit: calculatePricePerUnit(eq.price, eq.packDisplayValue, pharmaceuticalForm),
    }))
    .sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

  // Find best value (lowest price per unit) among items with the same unit type
  // Only consider items where we can calculate price per unit
  const getBestValueIndex = (): number => {
    const itemsWithPricePerUnit = sortedEquivalents
      .map((eq, idx) => ({ eq, idx }))
      .filter(({ eq }) => eq.pricePerUnit !== null);

    if (itemsWithPricePerUnit.length === 0) return -1;

    // Get the unit type from the first item that has price per unit
    const primaryUnit = currentPricePerUnit?.unit || itemsWithPricePerUnit[0]?.eq.pricePerUnit?.unit;
    if (!primaryUnit) return -1;

    // Only compare items with the same unit type
    const sameUnitItems = itemsWithPricePerUnit.filter(
      ({ eq }) => eq.pricePerUnit?.unit === primaryUnit
    );

    if (sameUnitItems.length === 0) return -1;

    // Include current medication in comparison if it has the same unit
    let lowestPricePerUnit = currentPricePerUnit?.unit === primaryUnit
      ? currentPricePerUnit.pricePerUnit
      : Infinity;
    let bestValueIdx = -1; // -1 means current medication is best value

    for (const { eq, idx } of sameUnitItems) {
      if (eq.pricePerUnit && eq.pricePerUnit.pricePerUnit < lowestPricePerUnit) {
        lowestPricePerUnit = eq.pricePerUnit.pricePerUnit;
        bestValueIdx = idx;
      }
    }

    return bestValueIdx;
  };

  const bestValueIndex = getBestValueIndex();

  const cheapest = sortedEquivalents[0];
  const currentPrice = currentMedication.price;

  if (!sortedEquivalents.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{displayTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            {t('priceComparison.noEquivalents')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{displayTitle}</CardTitle>
          <Badge variant="default">{t('priceComparison.optionCount', { count: sortedEquivalents.length })}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Potential savings */}
        {currentPrice !== undefined && cheapest?.price !== undefined && currentPrice > cheapest.price && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {t('priceComparison.savingsAvailable')}
            </p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {t('priceComparison.saveUpTo', { amount: formatPrice(calculateSavings(currentPrice, cheapest.price).amount) })}
            </p>
            <p className="text-sm text-green-500 dark:text-green-400">
              {t('priceComparison.savingsPercent', { percent: calculateSavings(currentPrice, cheapest.price).percentage.toFixed(0) })}
            </p>
          </div>
        )}

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('priceComparison.columnMedication')}
                </th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('priceComparison.columnPrice')}
                </th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('priceComparison.columnPerUnit')}
                </th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('priceComparison.columnVsCurrent')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Current medication */}
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                <td className="py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge variant="info" size="sm">{t('priceComparison.current')}</Badge>
                    {bestValueIndex === -1 && currentPricePerUnit && (
                      <Badge variant="success" size="sm">{t('priceComparison.bestValue')}</Badge>
                    )}
                    <span className="flex items-center gap-2">
                      <LocalizedName
                        name={currentMedication.name}
                        nameLanguage={currentMedication.nameLanguage}
                        allNames={currentMedication.allNames}
                        size="sm"
                        className="font-medium"
                      />
                      {currentMedication.companyName && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          · {currentMedication.companyName}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">
                  {formatPrice(currentPrice)}
                </td>
                <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                  {currentPricePerUnit && formatPricePerUnit(currentPricePerUnit) && (
                    <span className={bestValueIndex === -1 ? 'font-medium text-green-600 dark:text-green-400' : ''}>
                      {t(`priceComparison.pricePerUnit.${currentPricePerUnit.unit}`, {
                        price: formatPricePerUnit(currentPricePerUnit) ?? '',
                      })}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right text-gray-500 dark:text-gray-400">—</td>
              </tr>

              {/* Equivalents */}
              {sortedEquivalents.map((eq, index) => {
                const isLowestEquivalent = index === 0;
                const savings =
                  currentPrice !== undefined && eq.price !== undefined
                    ? calculateSavings(currentPrice, eq.price)
                    : null;
                // Only mark as "cheapest" if it's actually cheaper than current
                const isCheaperThanCurrent = savings !== null && savings.amount > 0;
                const rowHighlight = isCheaperThanCurrent && isLowestEquivalent
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : '';

                return (
                  <tr key={eq.ampCode} className={rowHighlight}>
                    <td className="py-3">
                      <Link
                        href={`/medication/${eq.cnk || eq.ampCode}`}
                        className="hover:underline"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {isLowestEquivalent && (
                            <Badge
                              variant={isCheaperThanCurrent ? 'success' : 'default'}
                              size="sm"
                            >
                              {isCheaperThanCurrent ? t('priceComparison.cheapest') : t('priceComparison.lowestAlternative')}
                            </Badge>
                          )}
                          <span className="flex items-center gap-2">
                            <LocalizedName
                              name={eq.name}
                              nameLanguage={eq.nameLanguage}
                              allNames={eq.allNames}
                              size="sm"
                              className="font-medium"
                            />
                            {eq.companyName && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                · {eq.companyName}
                              </span>
                            )}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatPrice(eq.price)}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                      {eq.pricePerUnit && formatPricePerUnit(eq.pricePerUnit) && (
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <span className={index === bestValueIndex ? 'font-medium text-green-600 dark:text-green-400' : ''}>
                            {t(`priceComparison.pricePerUnit.${eq.pricePerUnit.unit}`, {
                              price: formatPricePerUnit(eq.pricePerUnit) ?? '',
                            })}
                          </span>
                          {index === bestValueIndex && (
                            <Badge variant="success" size="sm">{t('priceComparison.bestValue')}</Badge>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {savings && savings.amount !== 0 ? (
                        <span
                          className={
                            savings.amount > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {savings.amount > 0 ? '-' : '+'}
                          {formatPrice(Math.abs(savings.amount))}
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">{t('priceComparison.same')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Link to full comparison */}
        {showCompareLink && (
          <div className="mt-4 text-center">
            <Link
              href={`/compare?base=${currentMedication.cnk || currentMedication.ampCode}`}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {t('priceComparison.viewFullComparison')} →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
