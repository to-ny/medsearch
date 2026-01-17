'use client';

import { InformationCircleIcon } from '@heroicons/react/16/solid';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from '@/lib/hooks/use-translation';

export type CodeType = 'cnk' | 'atc' | 'ctiExtended' | 'actorNr' | 'vmpCode' | 'ampCode';
export type CodeVariant = 'full' | 'short' | 'bare';

interface CodeDisplayProps {
  type: CodeType;
  value: string | number | null | undefined;
  variant?: CodeVariant;
  showTooltip?: boolean;
  className?: string;
}

export function CodeDisplay({
  type,
  value,
  variant = 'short',
  showTooltip = false,
  className,
}: CodeDisplayProps) {
  const { t } = useTranslation();

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
      {showTooltip && (
        <InformationCircleIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      )}
    </span>
  );
}
