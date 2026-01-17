'use client';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Section } from '@/components/shared/section';
import { InfoList, InfoRow } from '@/components/shared/info-row';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { PriceDisplay } from '@/components/shared/price-display';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/hooks/use-language';
import { useTranslation } from '@/lib/hooks/use-translation';
import { LocalizedText } from '@/components/shared/localized-text';
import { formatValidityPeriod, formatAgreementTerm } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { ChapterIVParagraphWithRelations, ChapterIVVerse } from '@/server/types/entities';

interface ChapterIVDetailProps {
  chapterIV: ChapterIVParagraphWithRelations;
}

export function ChapterIVDetail({ chapterIV }: ChapterIVDetailProps) {
  const { getLocalized } = useLanguage();
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
          {/* Header */}
          <div className="space-y-2">
            <Badge
              size="lg"
              style={{
                backgroundColor: '#EF444420',
                color: '#EF4444',
              }}
            >
              Chapter IV
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Chapter {chapterIV.chapterName} - {chapterIV.paragraphName}
            </h1>
            {keyString && (
              <p className="text-lg text-gray-600 dark:text-gray-400">
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
                  value={formatValidityPeriod(chapterIV.startDate, chapterIV.endDate)}
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
            <CollapsibleSection
              title={t('chapterIV.coveredProducts')}
              count={chapterIV.linkedProducts.length}
              defaultOpen={false}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('chapterIV.cnkCode')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('chapterIV.environment')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('chapterIV.price')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('detail.reimbursable')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {chapterIV.linkedProducts.map((product) => (
                      <tr key={`${product.code}-${product.deliveryEnvironment}`}>
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">
                          {product.code}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {product.deliveryEnvironment === 'P' ? t('detail.public') : t('detail.hospital')}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <PriceDisplay amount={product.price} showNull nullText="-" />
                        </td>
                        <td className="px-3 py-2">
                          {product.reimbursable ? (
                            <Badge variant="success" size="sm">{t('common.yes')}</Badge>
                          ) : (
                            <span className="text-gray-400">{t('common.no')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{t('detail.summary')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('chapterIV.conditions')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{chapterIV.verses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('detail.products')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{chapterIV.linkedProducts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
