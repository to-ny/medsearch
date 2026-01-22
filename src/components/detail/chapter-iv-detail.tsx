'use client';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ProductList } from '@/components/entities/product-list';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { JsonLd } from '@/components/shared/json-ld';
import { Badge } from '@/components/ui/badge';
import { useLanguage, useLinks, useTranslation } from '@/lib/hooks';
import { LocalizedText } from '@/components/shared/localized-text';
import { formatAgreementTerm } from '@/lib/utils/format';
import { ValidityPeriod } from '@/components/shared/validity-period';
import { cn } from '@/lib/utils/cn';
import type { ChapterIVParagraphWithRelations, ChapterIVVerse } from '@/server/types/entities';

interface ChapterIVDetailProps {
  chapterIV: ChapterIVParagraphWithRelations;
}

export function ChapterIVDetail({ chapterIV }: ChapterIVDetailProps) {
  const { getLocalized } = useLanguage();
  const links = useLinks();
  const { t } = useTranslation();
  const keyString = chapterIV.keyString ? getLocalized(chapterIV.keyString) : null;

  const breadcrumbs = [
    { label: `Chapter ${chapterIV.chapterName} - ${chapterIV.paragraphName}` },
  ];

  // Build hierarchical verse structure
  const rootVerses = chapterIV.verses.filter((v) => v.verseSeqParent === 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Custom header for Chapter IV (not in EntityType) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" size="lg">{t('entityLabels.chapterIV')}</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Chapter {chapterIV.chapterName} - {chapterIV.paragraphName}
            </h1>
            {keyString && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {keyString}
              </p>
            )}
          </div>

          {/* Overview */}
          {(chapterIV.processType || chapterIV.processTypeOverrule || chapterIV.paragraphVersion !== null || chapterIV.modificationStatus || chapterIV.startDate || chapterIV.endDate) && (
            <Section title={t('detail.overview')}>
              <InfoList>
                {chapterIV.processType && (
                  <InfoRow label={t('chapterIV.processType')} value={chapterIV.processType} />
                )}
                {chapterIV.processTypeOverrule && (
                  <InfoRow label={t('chapterIV.processOverride')} value={chapterIV.processTypeOverrule} />
                )}
                {chapterIV.paragraphVersion !== null && (
                  <InfoRow label={t('chapterIV.version')} value={chapterIV.paragraphVersion.toString()} />
                )}
                {chapterIV.modificationStatus && (
                  <InfoRow label={t('chapterIV.modificationStatus')} value={chapterIV.modificationStatus} />
                )}
                <InfoRow
                  label={t('detail.validity')}
                  value={<ValidityPeriod startDate={chapterIV.startDate} endDate={chapterIV.endDate} />}
                />
              </InfoList>
            </Section>
          )}

          {/* Requirements & Conditions */}
          {chapterIV.verses.length > 0 && (
            <Section title={t('chapterIV.requirementsConditions')} count={chapterIV.verses.length}>
              <div className="space-y-2">
                {rootVerses.map((verse) => (
                  <VerseItem
                    key={verse.id}
                    verse={verse}
                    allVerses={chapterIV.verses}
                    level={0}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Covered Products */}
          {chapterIV.linkedProducts.length > 0 && (
            <ProductList
              title={t('chapterIV.coveredProducts')}
              items={chapterIV.linkedProducts.map(p => ({
                code: p.code,
                name: p.name,
                linkCode: p.amppCtiExtended,
                price: p.price,
                reimbursable: p.reimbursable,
                deliveryEnvironment: p.deliveryEnvironment,
              }))}
              searchHref={links.toSearch({ chapterIVParagraph: chapterIV.paragraphName, types: 'ampp' })}
              maxInitialDisplay={5}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              {chapterIV.processType && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('chapterIV.processType')}</span>
                  <Badge variant="outline" size="sm">{chapterIV.processType}</Badge>
                </div>
              )}
              {chapterIV.paragraphVersion !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{t('chapterIV.version')}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">v{chapterIV.paragraphVersion}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('chapterIV.conditions')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{chapterIV.verses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.products')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{chapterIV.linkedProducts.length}</span>
              </div>
              {/* Validity indicator */}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.validity')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {chapterIV.endDate && new Date(chapterIV.endDate) < new Date() ? t('sidebar.expired') : t('sidebar.active')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON-LD Structured Data */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MedicalGuideline',
          name: `Chapter ${chapterIV.chapterName} - ${chapterIV.paragraphName}`,
          identifier: `${chapterIV.chapterName}-${chapterIV.paragraphName}`,
          description: keyString || undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }}
      />
    </div>
  );
}

function VerseItem({
  verse,
  allVerses,
  level,
}: {
  verse: ChapterIVVerse;
  allVerses: ChapterIVVerse[];
  level: number;
}) {
  useLanguage(); // Hook required for reactivity
  const { t } = useTranslation();

  // Find children
  const children = allVerses.filter((v) => v.verseSeqParent === verse.verseSeq);

  return (
    <div
      className={cn(
        'border-l-2 pl-4',
        level === 0 ? 'border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700',
        level > 0 && 'ml-4'
      )}
    >
      <div className="py-2">
        <div className="flex items-start gap-2">
          {verse.verseNum > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex-shrink-0">
              {verse.verseNum}.
            </span>
          )}
          <div className="flex-1">
            {verse.text && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <LocalizedText text={verse.text} />
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {verse.requestType && (
                <Badge size="sm" variant={verse.requestType === 'N' ? 'primary' : 'info'}>
                  {verse.requestType === 'N' ? t('chapterIV.newRequest') : t('chapterIV.prolongation')}
                </Badge>
              )}
              {verse.agreementTermQuantity !== null && verse.agreementTermUnit && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('chapterIV.validFor')}: {formatAgreementTerm(verse.agreementTermQuantity, verse.agreementTermUnit)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="space-y-1">
          {children.map((child) => (
            <VerseItem
              key={child.id}
              verse={child}
              allVerses={allVerses}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
