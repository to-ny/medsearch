'use client';

import { useLanguage } from '@/components/LanguageSwitcher';
import type { LocalizedText } from '@/lib/types';

interface LocalizedNameProps {
  /** All available language versions */
  allNames?: LocalizedText[];
  /** The primary/displayed name (in selected or fallback language) */
  name: string;
  /** The actual language of the displayed name (if different from selected) */
  nameLanguage?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class for the text */
  className?: string;
}

/**
 * Displays a localized name with proper language handling:
 * - If text is available in selected language: show just the text (no badge)
 * - If text is NOT available in selected language: show each available
 *   translation on its own line with language badge in front
 */
export function LocalizedName({ allNames, name, nameLanguage, size = 'md', className = '' }: LocalizedNameProps) {
  // Hook triggers re-render on language change; value not directly used as nameLanguage indicates mismatch
  useLanguage();
  const textSizeClass = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base';

  // Check if the displayed name is in the selected language
  // nameLanguage is only set when it differs from the requested language
  const isInSelectedLanguage = !nameLanguage;

  // If text is in selected language, or no alternatives available, just show the name
  if (isInSelectedLanguage || !allNames || allNames.length === 0) {
    return (
      <span className={`${textSizeClass} text-gray-900 dark:text-white ${className}`}>
        {name}
      </span>
    );
  }

  // Text is NOT in selected language - show all available translations
  // Each on its own line with language badge in front
  return (
    <div className="space-y-1">
      {allNames.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {item.language.toUpperCase()}
          </span>
          <span className={`${textSizeClass} text-gray-900 dark:text-white ${className}`}>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}
