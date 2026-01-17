'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/hooks/use-translation';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  if (status === 'AUTHORIZED') {
    return null; // Don't show badge for default state
  }

  const variant = status === 'REVOKED' ? 'error' : 'warning';
  const label = t(`status.${status}`) || status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <Badge variant={variant} size="sm" className={className}>
      {label}
    </Badge>
  );
}
