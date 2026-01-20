'use client';

import { useState, useCallback } from 'react';
import { InformationCircleIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/16/solid';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';

export type CodeType = 'cnk' | 'atc' | 'ctiExtended' | 'actorNr' | 'vmpCode' | 'ampCode';
export type CodeVariant = 'full' | 'short' | 'bare';

interface CodeDisplayProps {
  type: CodeType;
  value: string | number | null | undefined;
  variant?: CodeVariant;
  showTooltip?: boolean;
  /** Show a copy button to copy the code to clipboard */
  copyable?: boolean;
  className?: string;
}

export function CodeDisplay({
  type,
  value,
  variant = 'short',
  showTooltip = false,
  copyable = false,
  className,
}: CodeDisplayProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value === null || value === undefined) return;

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [value]);

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const displayValue = String(value);

  // Get the appropriate label based on variant
  const getLabel = (): string | null => {
    switch (variant) {
      case 'full':
        return t(`codes.${type}Full`);
      case 'short':
        return t(`codes.${type}`);
      case 'bare':
        return null;
    }
  };

  const label = getLabel();
  const tooltip = showTooltip ? t(`codes.${type}Tooltip`) : undefined;

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      title={tooltip}
    >
      {label && (
        <span className="text-gray-500 dark:text-gray-400">
          {label}:
        </span>
      )}
      <span className="font-mono">{displayValue}</span>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'p-0.5 rounded transition-colors',
            copied
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          )}
          title={copied ? t('pharmacist.copied') : t('pharmacist.copyToClipboard')}
          aria-label={copied ? t('pharmacist.copied') : t('pharmacist.copyToClipboard')}
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5" />
          ) : (
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {showTooltip && !copyable && (
        <InformationCircleIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      )}
    </span>
  );
}
