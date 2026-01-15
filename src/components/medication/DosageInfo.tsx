'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLanguage } from '@/components/LanguageSwitcher';
import { useDosage } from '@/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import type { StandardDosage, LocalizedText } from '@/lib/types';

interface DosageInfoProps {
  vmpGroupCode?: string;
  /** URL to SmPC for linking in disclaimer */
  spcUrl?: string;
}

/**
 * Capitalizes the first letter of a string
 */
function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Checks if the preferred language is available in the texts array
 */
function hasPreferredLanguage(texts: LocalizedText[] | undefined, preferredLang: string): boolean {
  if (!texts || texts.length === 0) return false;
  return texts.some((t) => t.language === preferredLang && t.text);
}

/**
 * Gets text in the preferred language from a localized text array
 * Returns the text if available, or first available text as fallback
 */
function getLocalizedText(texts: LocalizedText[] | undefined, preferredLang: string): string {
  if (!texts || texts.length === 0) return '';

  // Try preferred language first
  const preferred = texts.find((t) => t.language === preferredLang);
  if (preferred?.text) return preferred.text;

  // Try English fallback
  const english = texts.find((t) => t.language === 'en');
  if (english?.text) return english.text;

  // Return first available
  const first = texts.find((t) => t.text);
  return first?.text || '';
}

/**
 * Gets non-empty texts from a localized text array
 */
function getNonEmptyTexts(texts: LocalizedText[] | undefined): LocalizedText[] {
  if (!texts) return [];
  return texts.filter((t) => t.text);
}

interface LocalizedTextDisplayProps {
  texts: LocalizedText[] | undefined;
  language: string;
  /** Capitalize the first letter of each text */
  capitalize?: boolean;
  /** Class name for the text */
  className?: string;
}

/**
 * Displays localized text following the i18n pattern:
 * - If available in selected language: show just that text
 * - If NOT available: show all available translations with language badges
 */
function LocalizedTextDisplay({ texts, language, capitalize = false, className = '' }: LocalizedTextDisplayProps) {
  const nonEmptyTexts = getNonEmptyTexts(texts);

  if (nonEmptyTexts.length === 0) return null;

  const hasPreferred = hasPreferredLanguage(texts, language);

  if (hasPreferred) {
    // Show just the preferred language text
    let text = getLocalizedText(texts, language);
    if (capitalize) text = capitalizeFirst(text);
    return <span className={className}>{text}</span>;
  }

  // Show all available translations with language badges
  return (
    <div className="space-y-1">
      {nonEmptyTexts.map((item, index) => {
        const text = capitalize ? capitalizeFirst(item.text) : item.text;
        return (
          <div key={index} className="flex items-center gap-2">
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {item.language.toUpperCase()}
            </span>
            <span className={className}>{text}</span>
          </div>
        );
      })}
    </div>
  );
}


/**
 * Formats the administration frequency display
 */
function formatFrequency(dosage: StandardDosage, t: ReturnType<typeof useTranslations>): string {
  if (!dosage.administrationFrequencyQuantity || !dosage.administrationFrequencyTimeframe) {
    return '';
  }

  const qty = dosage.administrationFrequencyQuantity;
  const timeValue = dosage.administrationFrequencyTimeframe.value;
  const timeUnit = dosage.administrationFrequencyTimeframe.unit;

  // Common case: X times per day
  if (timeValue === 1 && timeUnit === 'd') {
    const isMax = dosage.administrationFrequencyIsMax;
    return isMax
      ? t('dosage.maxTimesPerDay', { count: qty })
      : t('dosage.timesPerDay', { count: qty });
  }

  // General format
  const unitKey = timeUnit === 'd' ? 'day' : timeUnit === 'w' ? 'week' : timeUnit === 'm' ? 'month' : 'unit';
  return t('dosage.frequency', { times: qty, timeValue, unit: t(`dosage.timeUnits.${unitKey}`) });
}

/**
 * Formats the treatment duration display
 */
function formatDuration(dosage: StandardDosage, t: ReturnType<typeof useTranslations>): string {
  switch (dosage.treatmentDurationType) {
    case 'ONE_OFF':
      return t('dosage.duration.oneOff');
    case 'CHRONIC':
      return t('dosage.duration.chronic');
    case 'IF_NECESSARY':
      return t('dosage.duration.ifNecessary');
    case 'TEMPORARY':
      if (dosage.temporalityDuration) {
        const { value, unit } = dosage.temporalityDuration;
        const unitKey = unit === 'd' ? 'day' : unit === 'w' ? 'week' : unit === 'm' ? 'month' : 'unit';
        return t('dosage.duration.temporary', { value, unit: t(`dosage.timeUnits.${unitKey}`, { count: value }) });
      }
      return t('dosage.duration.temporaryUnspecified');
    default:
      return '';
  }
}

/**
 * Gets a readable label for the target group
 */
function getTargetGroupLabel(targetGroup: string, t: ReturnType<typeof useTranslations>): string {
  const labels: Record<string, string> = {
    ADULT: t('dosage.targetGroup.adult'),
    PAEDIATRICS: t('dosage.targetGroup.paediatrics'),
    ADOLESCENT: t('dosage.targetGroup.adolescent'),
    NEONATE: t('dosage.targetGroup.neonate'),
  };
  return labels[targetGroup] || targetGroup;
}

/**
 * Gets a readable label for organ impairment
 */
function getOrganImpairmentLabel(
  dosage: StandardDosage,
  t: ReturnType<typeof useTranslations>
): string | null {
  const parts: string[] = [];

  if (dosage.kidneyFailureClass !== undefined && dosage.kidneyFailureClass > 0) {
    parts.push(t('dosage.renalImpairment', { level: dosage.kidneyFailureClass }));
  }

  if (dosage.liverFailureClass !== undefined && dosage.liverFailureClass > 0) {
    parts.push(t('dosage.hepaticImpairment', { level: dosage.liverFailureClass }));
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Groups dosages by indication for display
 */
function groupByIndication(dosages: StandardDosage[]): Map<string, StandardDosage[]> {
  const groups = new Map<string, StandardDosage[]>();

  for (const dosage of dosages) {
    const key = dosage.indication?.code || 'general';
    const existing = groups.get(key) || [];
    existing.push(dosage);
    groups.set(key, existing);
  }

  return groups;
}

interface DosageGroupProps {
  dosages: StandardDosage[];
  language: string;
  defaultExpanded?: boolean;
}

function DosageGroup({ dosages, language, defaultExpanded = false }: DosageGroupProps) {
  const t = useTranslations();
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Sort dosages: adults first, then pediatrics, then by organ impairment
  const sortedDosages = [...dosages].sort((a, b) => {
    const order = { ADULT: 0, ADOLESCENT: 1, PAEDIATRICS: 2, NEONATE: 3 };
    const aOrder = order[a.targetGroup] ?? 4;
    const bOrder = order[b.targetGroup] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;

    // Then by organ impairment (normal function first)
    const aImpairment = (a.kidneyFailureClass || 0) + (a.liverFailureClass || 0);
    const bImpairment = (b.kidneyFailureClass || 0) + (b.liverFailureClass || 0);
    return aImpairment - bImpairment;
  });

  // Get indication name from first dosage with indication
  const indicationName = dosages.find((d) => d.indication?.name)?.indication?.name;
  const hasIndicationName = getNonEmptyTexts(indicationName).length > 0;

  return (
    <div className="border-b border-gray-200 last:border-b-0 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
        aria-expanded={expanded}
      >
        <span className="font-medium text-gray-900 dark:text-white">
          {hasIndicationName ? (
            <LocalizedTextDisplay texts={indicationName} language={language} capitalize />
          ) : (
            t('dosage.generalUse')
          )}
        </span>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          {sortedDosages.map((dosage, index) => (
            <DosageItem key={dosage.code || index} dosage={dosage} language={language} />
          ))}
        </div>
      )}
    </div>
  );
}

interface DosageItemProps {
  dosage: StandardDosage;
  language: string;
}

function DosageItem({ dosage, language }: DosageItemProps) {
  const t = useTranslations();

  const targetGroupLabel = getTargetGroupLabel(dosage.targetGroup, t);
  const organImpairment = getOrganImpairmentLabel(dosage, t);

  // Check which fields have content
  const hasRoute = getNonEmptyTexts(dosage.routeOfAdministration?.name).length > 0;
  const hasSupplementaryInfo = getNonEmptyTexts(dosage.supplementaryInfo).length > 0;
  const hasPosology = getNonEmptyTexts(dosage.additionalFields?.posology).length > 0;
  const hasDosageString = getNonEmptyTexts(dosage.additionalFields?.dosageString).length > 0;

  // Parameter bounds (e.g., weight range)
  const weightBounds = dosage.parameterBounds?.find((pb) => pb.parameter.code === 'weight');
  let weightRange = '';
  if (weightBounds) {
    if (weightBounds.lowerBound && weightBounds.upperBound) {
      weightRange = `${weightBounds.lowerBound.value}-${weightBounds.upperBound.value} ${weightBounds.lowerBound.unit}`;
    } else if (weightBounds.lowerBound) {
      weightRange = `>${weightBounds.lowerBound.value} ${weightBounds.lowerBound.unit}`;
    } else if (weightBounds.upperBound) {
      weightRange = `<${weightBounds.upperBound.value} ${weightBounds.upperBound.unit}`;
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      {/* Header with target group and badges */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-900 dark:text-white">
          {targetGroupLabel}
        </span>
        {weightRange && (
          <Badge variant="default" className="text-xs">
            {weightRange}
          </Badge>
        )}
        {organImpairment && (
          <Badge variant="warning" className="text-xs">
            {organImpairment}
          </Badge>
        )}
      </div>

      {/* Dosage details */}
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        {/* Use pre-formatted dosage if available */}
        {hasDosageString && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{t('dosage.dose')}: </span>
            <LocalizedTextDisplay texts={dosage.additionalFields?.dosageString} language={language} />
          </div>
        )}

        {/* Frequency/posology */}
        {hasPosology ? (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{t('dosage.posology')}: </span>
            <LocalizedTextDisplay texts={dosage.additionalFields?.posology} language={language} />
          </div>
        ) : (
          formatFrequency(dosage, t) && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('dosage.frequency')}: </span>
              {formatFrequency(dosage, t)}
            </div>
          )
        )}

        {/* Duration */}
        {formatDuration(dosage, t) && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{t('dosage.durationLabel')}: </span>
            {formatDuration(dosage, t)}
          </div>
        )}

        {/* Route */}
        {hasRoute && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{t('dosage.route')}: </span>
            <LocalizedTextDisplay texts={dosage.routeOfAdministration?.name} language={language} />
          </div>
        )}

        {/* Supplementary info (max daily dose, etc.) */}
        {hasSupplementaryInfo && (
          <div className="mt-2 rounded bg-amber-50 p-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <LocalizedTextDisplay texts={dosage.supplementaryInfo} language={language} />
          </div>
        )}
      </div>
    </div>
  );
}

export function DosageInfo({ vmpGroupCode, spcUrl }: DosageInfoProps) {
  const t = useTranslations();
  const [language] = useLanguage();

  const { data, isLoading, error } = useDosage({
    vmpGroupCode,
    language,
    enabled: Boolean(vmpGroupCode),
  });

  // Don't render if no vmpGroupCode provided
  if (!vmpGroupCode) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dosage.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error or no data
  if (error || !data || data.dosages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dosage.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            {t('dosage.noInfo')}
          </p>
          {spcUrl && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('dosage.consultSmPC')}{' '}
              <a
                href={spcUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {t('dosage.viewSmPC')}
              </a>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Group dosages by indication
  const groupedDosages = groupByIndication(data.dosages);
  const indicationKeys = Array.from(groupedDosages.keys());

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dosage.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {indicationKeys.map((key, index) => (
          <DosageGroup
            key={key}
            dosages={groupedDosages.get(key)!}
            language={language}
            defaultExpanded={index === 0}
          />
        ))}

        {/* Disclaimer */}
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('dosage.disclaimer')}
            {spcUrl && (
              <>
                {' '}
                <a
                  href={spcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t('dosage.viewSmPC')}
                </a>
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
