'use client';

import { Badge } from '@/components/ui/badge';
import { REIMBURSEMENT_COLORS } from '@/server/types/domain';
import { useTranslation } from '@/lib/hooks/use-translation';

interface ReimbursementBadgeProps {
  category: string | null;
  showLabel?: boolean;
  className?: string;
}

export function ReimbursementBadge({ category, showLabel = false, className }: ReimbursementBadgeProps) {
  const { t } = useTranslation();

  if (!category) return null;

  const color = REIMBURSEMENT_COLORS[category] || '#6B7280';

  const getCategoryLabel = (cat: string): string => {
    switch (cat) {
      case 'A':
        return t('reimbursement.100');
      case 'B':
        return t('reimbursement.75');
      case 'C':
        return t('reimbursement.50');
      case 'Cs':
      case 'Cx':
        return t('reimbursement.special');
      case 'Fa':
      case 'Fb':
        return t('reimbursement.lumpSum');
      default:
        return cat;
    }
  };

  const fullLabel = getCategoryLabel(category);
  const label = showLabel ? fullLabel : category;

  return (
    <span title={fullLabel}>
      <Badge
        size="sm"
        className={className}
        style={{
          backgroundColor: `${color}20`,
          color: color,
        }}
      >
        {label}
      </Badge>
    </span>
  );
}
