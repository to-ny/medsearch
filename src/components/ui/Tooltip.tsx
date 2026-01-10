'use client';

import { useState, useRef, useLayoutEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Calculate tooltip position based on viewport space
  // useLayoutEffect is intentional here: we need to measure DOM and update position
  // synchronously before paint to avoid visual flicker
  useLayoutEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Show below if too close to top of viewport
      const newPosition = rect.top < 60 ? 'bottom' : 'top';
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: DOM measurement requires effect + setState
      setPosition(newPosition);
    }
  }, [isVisible]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
    >
      {children}
      {isVisible && (
        <span
          role="tooltip"
          className={`absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-gray-700 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              position === 'top'
                ? 'top-full border-t-gray-900 dark:border-t-gray-700'
                : 'bottom-full border-b-gray-900 dark:border-b-gray-700'
            }`}
          />
        </span>
      )}
    </span>
  );
}

/**
 * List of known acronyms for validation
 */
const KNOWN_ACRONYMS = [
  'CNK', 'VMP', 'AMP', 'AMPP', 'ATC', 'VTM', 'RIZIV', 'INAMI',
  // Authorization abbreviations (language-specific)
  'MA', 'AMM', 'HVB', 'ZNr',
  // Product information document abbreviations (language-specific)
  'SmPC', 'RCP', 'SKP', 'FI'
] as const;
type KnownAcronym = typeof KNOWN_ACRONYMS[number];

interface AcronymProps {
  term: KnownAcronym | string;
  children?: ReactNode;
}

/**
 * Renders an acronym with a tooltip explanation
 * Tooltip content is translated based on current language
 */
export function Acronym({ term, children }: AcronymProps) {
  const t = useTranslations();

  // Check if this is a known acronym
  const isKnown = KNOWN_ACRONYMS.includes(term as KnownAcronym);

  if (!isKnown) {
    return <span>{children || term}</span>;
  }

  // Get translated definition
  const definition = t(`acronym.${term}`);

  return (
    <Tooltip content={definition}>
      <span className="cursor-help border-b border-dotted border-gray-400 dark:border-gray-500">
        {children || term}
      </span>
    </Tooltip>
  );
}
