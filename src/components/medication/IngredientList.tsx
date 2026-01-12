'use client';

import { useTranslations } from 'next-intl';
import { useLanguage } from '@/components/LanguageSwitcher';
import { getExcipients } from '@/lib/services/excipients';
import { formatLanguage } from '@/lib/utils/format';
import type { MedicationComponent } from '@/lib/types';

interface IngredientListProps {
  components: MedicationComponent[];
  showAllComponents?: boolean;
  ampCode?: string;
}

export function IngredientList({
  components,
  showAllComponents = false,
  ampCode,
}: IngredientListProps) {
  const t = useTranslations();
  const [language] = useLanguage();

  // Get ingredients from API
  const allIngredients = components.flatMap((c) => c.ingredients);
  const activeIngredients = allIngredients.filter((i) => i.type === 'ACTIVE_SUBSTANCE');

  // Get excipients from database with language preference
  const excipientResult = ampCode
    ? getExcipients(ampCode, language as 'fr' | 'nl' | 'de' | 'en')
    : null;

  // Get form and route info from first component
  const primaryComponent = components[0];

  return (
    <div className="space-y-6">
      {/* Form & Administration */}
      {showAllComponents && primaryComponent && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {primaryComponent.pharmaceuticalForm && (
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                {t('ingredients.pharmaceuticalForm')}
              </dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {primaryComponent.pharmaceuticalForm.name}
              </dd>
            </div>
          )}
          {primaryComponent.routeOfAdministration && (
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                {t('ingredients.routeOfAdmin')}
              </dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {primaryComponent.routeOfAdministration.name}
              </dd>
            </div>
          )}
        </dl>
      )}

      {/* Active ingredients */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('ingredients.activeIngredients')}
        </h4>
        {activeIngredients.length > 0 ? (
          <ul className="space-y-1">
            {activeIngredients.map((ingredient, index) => (
              <li
                key={`active-${index}`}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <span className="text-gray-900 dark:text-white">
                  {ingredient.substanceName}
                </span>
                {ingredient.strengthDescription && (
                  <span className="ml-3 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {ingredient.strengthDescription}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('ingredients.noActiveIngredients')}
          </p>
        )}
      </div>

      {/* Excipients from SmPC database - collapsible */}
      {showAllComponents && excipientResult && (
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 list-none">
            <svg
              className="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{t('ingredients.otherIngredients')}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({t('ingredients.fromSmPC')})
            </span>
          </summary>

          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            {excipientResult.hasRequestedLanguage ? (
              // User's preferred language is available - show single text
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                {excipientResult.text}
              </p>
            ) : (
              // Preferred language not available - show all with language badges
              <div className="space-y-4">
                {excipientResult.allTexts.map(({ language: lang, text }) => (
                  <div key={lang}>
                    <span className="mb-1.5 inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {formatLanguage(lang)}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {/* Empty state when excipient data is unavailable */}
      {showAllComponents && ampCode && !excipientResult && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('ingredients.otherIngredients')}
          </h4>
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            {t('ingredients.excipientDataUnavailable')}
          </p>
        </div>
      )}
    </div>
  );
}
