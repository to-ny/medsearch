'use client';

import { Badge } from '@/components/ui/badge';
import type { EntityType } from '@/server/types/domain';
import { ENTITY_TYPE_CONFIG } from '@/server/types/domain';
import { useTranslation } from '@/lib/hooks/use-translation';

interface EntityTypeBadgeProps {
  type: EntityType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EntityTypeBadge({ type, size = 'md', className }: EntityTypeBadgeProps) {
  const { t } = useTranslation();
  const config = ENTITY_TYPE_CONFIG[type];

  // Get translated label from locale files
  const getLabel = (): string => {
    switch (type) {
      case 'vtm':
        return t('entityLabels.substance');
      case 'vmp':
        return t('entityLabels.generic');
      case 'amp':
        return t('entityLabels.brand');
      case 'ampp':
        return t('entityLabels.package');
      case 'company':
        return t('entityLabels.company');
      case 'vmp_group':
        return t('entityLabels.group');
      case 'substance':
        return t('entityLabels.ingredient');
      case 'atc':
        return t('entityLabels.atc');
      default:
        return config.label;
    }
  };

  return (
    <Badge
      size={size}
      className={className}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
      }}
    >
      {getLabel()}
    </Badge>
  );
}
