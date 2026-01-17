'use client';

import { Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCurrentLanguage } from '@/lib/hooks/use-language';
import type { Language } from '@/server/types/domain';
import { LANGUAGES } from '@/server/types/domain';
import { cn } from '@/lib/utils/cn';

const LANGUAGE_NAMES: Record<Language, string> = {
  nl: 'Nederlands',
  fr: 'Français',
  de: 'Deutsch',
  en: 'English',
};

interface LanguageSelectorProps {
  className?: string;
}

function LanguageSelectorInner({ className }: LanguageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLanguage = useCurrentLanguage();

  const handleLanguageChange = (newLang: Language) => {
    if (newLang === currentLanguage) return;

    // Replace the language segment in the current path
    const pathSegments = pathname.split('/');

    // The first segment after the empty string should be the language
    if (pathSegments.length > 1 && LANGUAGES.includes(pathSegments[1] as Language)) {
      pathSegments[1] = newLang;
    } else {
      // If no language segment, prepend it
      pathSegments.splice(1, 0, newLang);
    }

    let newPath = pathSegments.join('/') || `/${newLang}`;

    // Preserve query parameters (like search term)
    const queryString = searchParams.toString();
    if (queryString) {
      newPath += `?${queryString}`;
    }

    // Set cookie for middleware to remember preference
    document.cookie = `medsearch-language=${newLang}; path=/; max-age=31536000; SameSite=Lax`;

    router.push(newPath);
  };

  return (
    <select
      value={currentLanguage}
      onChange={(e) => handleLanguageChange(e.target.value as Language)}
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
      {LANGUAGES.map((code) => (
        <option key={code} value={code}>
          {LANGUAGE_NAMES[code]}
        </option>
      ))}
    </select>
  );
}

// Fallback for Suspense - a simple placeholder that matches the select dimensions
function LanguageSelectorFallback({ className }: LanguageSelectorProps) {
  return (
    <div
      className={cn(
        'block rounded-lg border border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-800',
        'px-3 py-1.5 text-sm',
        'h-[34px] w-[120px] animate-pulse',
        className
      )}
    />
  );
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  return (
    <Suspense fallback={<LanguageSelectorFallback className={className} />}>
      <LanguageSelectorInner className={className} />
    </Suspense>
  );
}
