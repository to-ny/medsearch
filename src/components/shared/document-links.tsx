'use client';

import { useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';
import type { MultilingualText, Language } from '@/server/types/domain';
import { LANGUAGES } from '@/server/types/domain';
import { DocumentPreviewDialog } from './document-preview-dialog';

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

interface PreviewState {
  url: string;
  title: string;
  language: Language;
}

interface DocumentLinkGroupProps {
  title: string;
  titleKey: string;
  urls: MultilingualText | null;
  onPreview: (url: string, title: string, language: Language) => void;
}

function DocumentLinkGroup({ title, titleKey, urls, onPreview }: DocumentLinkGroupProps) {
  const { t } = useTranslation();

  if (!urls) return null;

  const availableUrls = LANGUAGES.filter((lang) => urls[lang]).map((lang) => ({
    lang,
    url: urls[lang] as string,
  }));

  if (availableUrls.length === 0) return null;

  const localizedTitle = t(titleKey);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <DocumentTextIcon className="h-4 w-4" />
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {availableUrls.map(({ lang, url }) => (
          <button
            key={lang}
            type="button"
            onClick={() => onPreview(url, localizedTitle, lang)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 text-sm',
              'bg-gray-100 dark:bg-gray-800 rounded',
              'text-blue-600 dark:text-blue-400 hover:underline',
              'transition-colors cursor-pointer'
            )}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DocumentLinks({ leafletUrls, spcUrls, className }: DocumentLinksProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<PreviewState | null>(null);

  if (!leafletUrls && !spcUrls) {
    return null;
  }

  const handlePreview = (url: string, title: string, language: Language) => {
    setPreview({ url, title, language });
  };

  const handleClosePreview = () => {
    setPreview(null);
  };

  return (
    <>
      <div className={cn('space-y-4', className)}>
        <DocumentLinkGroup
          title={t('detail.packageLeaflet')}
          titleKey="detail.packageLeaflet"
          urls={leafletUrls}
          onPreview={handlePreview}
        />
        <DocumentLinkGroup
          title={t('detail.smpc')}
          titleKey="detail.smpc"
          urls={spcUrls}
          onPreview={handlePreview}
        />
      </div>

      <DocumentPreviewDialog
        isOpen={preview !== null}
        onClose={handleClosePreview}
        url={preview?.url ?? ''}
        title={preview?.title ?? ''}
        language={preview?.language ?? 'en'}
      />
    </>
  );
}
