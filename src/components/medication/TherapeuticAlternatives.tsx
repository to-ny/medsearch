'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LocalizedName } from '@/components/ui/LocalizedName';
import type { EquivalentMedications } from '@/lib/types';

interface TherapeuticAlternativesProps {
  data: EquivalentMedications;
}

export function TherapeuticAlternatives({ data }: TherapeuticAlternativesProps) {
  const t = useTranslations();

  const { group, currentVmpCode, equivalents } = data;

  // Separate current VMP from alternatives
  const currentVmp = equivalents.find((eq) => eq.vmpCode === currentVmpCode);
  const otherVmps = equivalents.filter((eq) => eq.vmpCode !== currentVmpCode);

  const hasNoSwitchWarning = Boolean(group.noSwitchReason);
  const hasNoGenericWarning = Boolean(group.noGenericPrescriptionReason);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('medication.therapeuticAlternatives')}</CardTitle>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('medication.therapeuticAlternativesDesc')}
        </p>
      </CardHeader>
      <CardContent>
        {/* Group name */}
        <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            {t('medication.therapeuticGroup')}
          </p>
          <LocalizedName
            name={group.name}
            nameLanguage={group.nameLanguage}
            allNames={group.allNames}
            size="md"
          />
        </div>

        {/* Warnings */}
        {(hasNoSwitchWarning || hasNoGenericWarning) && (
          <div className="mb-4 space-y-2">
            {hasNoSwitchWarning && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
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
                <span>{t('medication.noSwitchWarning')}</span>
              </div>
            )}
            {hasNoGenericWarning && (
              <div className="flex items-start gap-2 rounded-md bg-blue-50 p-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{t('medication.noGenericWarning')}</span>
              </div>
            )}
          </div>
        )}

        {/* Current formulation */}
        {currentVmp && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              {t('medication.sameFormulation')}
            </p>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <LocalizedName
                name={currentVmp.name}
                nameLanguage={currentVmp.nameLanguage}
                allNames={currentVmp.allNames}
                size="sm"
              />
              <Badge variant="info" className="mt-2">
                {t('priceComparison.current')}
              </Badge>
            </div>
          </div>
        )}

        {/* Other formulations */}
        {otherVmps.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              {t('medication.otherFormulations')}
            </p>
            <ul className="space-y-2">
              {otherVmps.map((vmp) => (
                <li
                  key={vmp.vmpCode}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <LocalizedName
                      name={vmp.name}
                      nameLanguage={vmp.nameLanguage}
                      allNames={vmp.allNames}
                      size="sm"
                    />
                  </div>
                  <Link
                    href={`/search?vmp=${vmp.vmpCode}`}
                    className="ml-3 flex-shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {t('medication.findBrands')}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('medication.noOtherFormulations')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
