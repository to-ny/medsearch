'use client';

import { useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';

interface DocumentPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  language: string;
}

export function DocumentPreviewDialog({
  isOpen,
  onClose,
  url,
  title,
  language,
}: DocumentPreviewDialogProps) {
  // Only render the content when open
  // This ensures fresh state each time the dialog opens
  if (!isOpen) return null;

  return (
    <DocumentPreviewDialogContent
      onClose={onClose}
      url={url}
      title={title}
      language={language}
    />
  );
}

/**
 * Internal dialog content component - remounts when dialog opens
 */
function DocumentPreviewDialogContent({
  onClose,
  url,
  title,
  language,
}: Omit<DocumentPreviewDialogProps, 'isOpen'>) {
  const { t } = useTranslation();

  // Build proxy URL to bypass Content-Disposition: attachment header
  const proxyUrl = `/api/document-proxy?url=${encodeURIComponent(url)}`;

  // Close on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleDownload = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-0 sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-preview-title"
          className={cn(
            'relative bg-white dark:bg-gray-900 shadow-xl transition-all',
            'w-full h-[100dvh] sm:h-[90vh] sm:max-h-[900px] sm:max-w-5xl sm:rounded-lg',
            'flex flex-col'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2
              id="document-preview-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {title} ({language.toUpperCase()})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md',
                  'bg-blue-600 text-white hover:bg-blue-700',
                  'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {t('detail.download')}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={t('common.close')}
              >
                <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
            <iframe
              src={proxyUrl}
              className="w-full h-full border-0"
              title={`${title} (${language.toUpperCase()})`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
