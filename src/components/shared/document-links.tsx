'use client';

import { DocumentTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';
import type { MultilingualText, Language } from '@/server/types/domain';
import { LANGUAGES } from '@/server/types/domain';

interface DocumentLinksProps {
  leafletUrls: MultilingualText | null;
  spcUrls: MultilingualText | null;
  className?: string;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'EN',
  nl: 'NL',
  fr: 'FR',
  de: 'DE',
};

interface DocumentLinkGroupProps {
  title: string;
  urls: MultilingualText | null;
}

function DocumentLinkGroup({ title, urls }: DocumentLinkGroupProps) {
  if (!urls) return null;

  const availableUrls = LANGUAGES.filter((lang) => urls[lang]).map((lang) => ({
    lang,
    url: urls[lang] as string,
  }));

  if (availableUrls.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <DocumentTextIcon className="h-4 w-4" />
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {availableUrls.map(({ lang, url }) => (
          <a
            key={lang}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 text-sm',
              'bg-gray-100 dark:bg-gray-800 rounded',
              'text-blue-600 dark:text-blue-400 hover:underline',
              'transition-colors'
            )}
          >
            {LANGUAGE_LABELS[lang]}
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  );
}

export function DocumentLinks({ leafletUrls, spcUrls, className }: DocumentLinksProps) {
  if (!leafletUrls && !spcUrls) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <DocumentLinkGroup title="Package Leaflet" urls={leafletUrls} />
      <DocumentLinkGroup title="SmPC (Summary of Product Characteristics)" urls={spcUrls} />
    </div>
  );
}
