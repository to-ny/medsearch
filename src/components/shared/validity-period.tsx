'use client';

import { useTranslation, useLanguage } from '@/lib/hooks';
import { formatDate } from '@/lib/utils/format';

interface ValidityPeriodProps {
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  className?: string;
}

export function ValidityPeriod({ startDate, endDate, className }: ValidityPeriodProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const start = formatDate(startDate, { locale: language });
  const end = formatDate(endDate, { locale: language });

  if (!start && !end) {
    return null;
  }

  if (start && end) {
    return <span className={className}>{start} – {end}</span>;
  }

  if (start) {
    return <span className={className}>{t('sidebar.validFrom')} {start}</span>;
  }

  return <span className={className}>{t('sidebar.validUntil')} {end}</span>;
}
