'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getMedicationWarnings, type MedicationWarning, type WarningLevel } from '@/lib/utils/allergens';
import type { MedicationComponent } from '@/lib/types';

interface AllergenWarningsProps {
  components: MedicationComponent[];
  excludedIngredients?: string[];
}

const warningStyles: Record<WarningLevel, { container: string; icon: string; text: string; dismiss: string }> = {
  none: {
    container: '',
    icon: '',
    text: '',
    dismiss: '',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: 'text-blue-500 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-200',
    dismiss: 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    icon: 'text-yellow-500 dark:text-yellow-400',
    text: 'text-yellow-800 dark:text-yellow-200',
    dismiss: 'text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-200',
  },
  danger: {
    container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    icon: 'text-red-500 dark:text-red-400',
    text: 'text-red-800 dark:text-red-200',
    dismiss: 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200',
  },
};

const warningIcons: Record<WarningLevel, React.ReactNode> = {
  none: null,
  info: (
    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  danger: (
    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
};

export function AllergenWarnings({ components, excludedIngredients = [] }: AllergenWarningsProps) {
  const t = useTranslations('allergenWarnings');
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  const warnings = useMemo(() => {
    return getMedicationWarnings(components, excludedIngredients);
  }, [components, excludedIngredients]);

  const visibleWarnings = warnings.filter(
    (warning) => !dismissedWarnings.has(`${warning.type}-${warning.message}`)
  );

  const dismissWarning = (warning: MedicationWarning) => {
    setDismissedWarnings((prev) => {
      const next = new Set(prev);
      next.add(`${warning.type}-${warning.message}`);
      return next;
    });
  };

  if (visibleWarnings.length === 0) {
    return null;
  }

  const getWarningTitle = (warning: MedicationWarning): string => {
    if (warning.type === 'excluded_ingredient') {
      return t('excludedIngredientTitle');
    }
    return t('allergenTitle');
  };

  const getWarningMessage = (warning: MedicationWarning): string => {
    if (warning.type === 'excluded_ingredient') {
      // Extract the ingredient names from the message
      const match = warning.message.match(/Contains excluded ingredient\(s\): (.+)/);
      if (match) {
        return t('excludedIngredientMessage', { ingredients: match[1] });
      }
    }
    if (warning.type === 'allergen') {
      // Extract the allergen name from the message
      const match = warning.message.match(/Contains common allergen: (.+)/);
      if (match) {
        return t('allergenMessage', { allergen: match[1] });
      }
    }
    return warning.message;
  };

  return (
    <div className="mb-6 space-y-3" role="alert" aria-live="polite">
      {visibleWarnings.map((warning, index) => {
        const styles = warningStyles[warning.level];
        const icon = warningIcons[warning.level];

        return (
          <div
            key={`${warning.type}-${warning.message}-${index}`}
            className={`rounded-lg border p-4 ${styles.container}`}
          >
            <div className="flex items-start gap-3">
              <div className={styles.icon}>{icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium ${styles.text}`}>
                  {getWarningTitle(warning)}
                </h3>
                <p className={`mt-1 text-sm ${styles.text} opacity-90`}>
                  {getWarningMessage(warning)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissWarning(warning)}
                className={`flex-shrink-0 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.dismiss}`}
                aria-label={t('dismiss')}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
