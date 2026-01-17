'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import { EntityTypeBadge } from './entity-type-badge';
import { StatusBadge } from './status-badge';
import { cn } from '@/lib/utils/cn';
import type { EntityType, MultilingualText } from '@/server/types/domain';
import { useLanguage } from '@/lib/hooks/use-language';
import { useTranslation } from '@/lib/hooks/use-translation';
import { LocalizedText } from '@/components/shared/localized-text';

interface EntityHeaderProps {
  entityType: EntityType;
  name: MultilingualText;
  code: string;
  status?: string;
  subtitle?: string;
  blackTriangle?: boolean;
  className?: string;
}

export function EntityHeader({
  entityType,
  name,
  code,
  status,
  subtitle,
  blackTriangle,
  className,
}: EntityHeaderProps) {
  useLanguage(); // Hook required for reactivity
  const { t } = useTranslation();

  return (
    <div className={cn('space-y-2', className)}>
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <EntityTypeBadge type={entityType} size="lg" />
        {status && <StatusBadge status={status} />}
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
        <LocalizedText text={name} as="span" />
        {blackTriangle && (
          <ExclamationTriangleIcon
            className="h-6 w-6 text-amber-500 flex-shrink-0"
            title={t('detail.enhancedMonitoringRequired')}
          />
        )}
      </h1>

      {/* Subtitle */}
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <span className="font-mono">{t('detail.code')}: {code}</span>
        {subtitle && (
          <>
            <span className="hidden sm:inline">•</span>
            <span>{subtitle}</span>
          </>
        )}
      </div>
    </div>
  );
}
