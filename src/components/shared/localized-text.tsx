'use client';

import { useLanguage } from '@/lib/hooks/use-language';
import type { MultilingualText, Language } from '@/server/types/domain';
import { cn } from '@/lib/utils/cn';

interface LocalizedTextProps {
  text: MultilingualText | null | undefined;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
  className?: string;
  showFallbackIndicator?: boolean;
}

/**
 * Language badge labels and tooltips
 */
const LANGUAGE_BADGES: Record<Language, { badge: string; title: string }> = {
  en: { badge: '[EN]', title: 'Content shown in English' },
  nl: { badge: '[NL]', title: 'Content shown in Dutch' },
  fr: { badge: '[FR]', title: 'Content shown in French' },
  de: { badge: '[DE]', title: 'Content shown in German' },
};

/**
 * A component that displays database content with a fallback indicator
 * When the content is not available in the user's selected language,
 * it shows a badge indicating which language the content is displayed in.
 */
export function LocalizedText({
  text,
  as: Component = 'span',
  className,
  showFallbackIndicator = true,
}: LocalizedTextProps) {
  const { getLocalizedWithMeta } = useLanguage();
  const { text: localizedText, actualLanguage, isFallback } = getLocalizedWithMeta(text);

  if (!localizedText) {
    return null;
  }

  const showBadge = showFallbackIndicator && isFallback && actualLanguage;

  return (
    <Component className={cn('inline', className)}>
      {localizedText}
      {showBadge && (
        <span
          className="ml-1 text-xs text-gray-400 opacity-75"
          title={LANGUAGE_BADGES[actualLanguage].title}
        >
          {LANGUAGE_BADGES[actualLanguage].badge}
        </span>
      )}
    </Component>
  );
}
