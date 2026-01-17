'use client';

import { useLanguage } from '@/lib/hooks/use-language';
import type { Language } from '@/server/types/domain';
import { cn } from '@/lib/utils/cn';

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  nl: 'Nederlands',
  fr: 'Français',
  de: 'Deutsch',
};

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      className={cn(
        'block rounded-lg border border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-800',
        'text-gray-900 dark:text-gray-100',
        'px-3 py-1.5 text-sm',
        'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'cursor-pointer',
        className
      )}
      aria-label="Select language"
    >
      {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}
