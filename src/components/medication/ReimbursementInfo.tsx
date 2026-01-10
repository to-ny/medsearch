'use client';

import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ChapterIVBadge, ChapterIVInfoBox } from '@/components/medication/ChapterIVBadge';
import { formatPrice } from '@/lib/utils/price';
import { getReimbursementCategoryDescription } from '@/lib/services/reimbursement';
import { hasChapterIVReimbursement } from '@/lib/utils/chapterIV';
import type { Reimbursement } from '@/lib/types';

interface ReimbursementInfoProps {
  reimbursements: Reimbursement[];
  medicationPrice?: number;
}

export function ReimbursementInfo({ reimbursements, medicationPrice }: ReimbursementInfoProps) {
  const t = useTranslations();

  if (!reimbursements.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('reimbursement.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">
            {t('reimbursement.noInfo')}
          </p>
          {medicationPrice !== undefined && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('reimbursement.estimatedCost')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPrice(medicationPrice)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('reimbursement.fullPriceNote')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Use first reimbursement context (usually public pharmacy)
  const reimbursement = reimbursements.find((r) => r.deliveryEnvironment === 'P') || reimbursements[0];

  // Find ambulatory copayment
  const ambulatoryCopay = reimbursement.copayments.find(
    (c) => c.regimen === 'AMBULATORY' || c.regimen.includes('AMB')
  );

  const patientCost = ambulatoryCopay?.feeAmount;
  const insurancePays = ambulatoryCopay?.reimbursementAmount;

  // Check if this is a Chapter IV medication
  const isChapterIV = hasChapterIVReimbursement(reimbursements);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('reimbursement.title')}</CardTitle>
          <div className="flex items-center gap-2">
            {isChapterIV && <ChapterIVBadge size="md" />}
            <Badge variant="success">{t('reimbursement.reimbursed')}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chapter IV Info Box */}
        {isChapterIV && <ChapterIVInfoBox />}
        {/* Category */}
        {reimbursement.criterion && (
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('reimbursement.category')}</p>
            <p className="text-lg text-gray-900 dark:text-white">
              {getReimbursementCategoryDescription(reimbursement.criterion.category)}
            </p>
          </div>
        )}

        {/* Cost breakdown */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Patient pays */}
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('reimbursement.youPay')}</p>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {patientCost !== undefined ? formatPrice(patientCost) : 'Varies'}
            </p>
            <p className="mt-1 text-sm text-blue-500 dark:text-blue-400">
              {t('reimbursement.outOfPocket')}
            </p>
          </div>

          {/* Insurance pays */}
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('reimbursement.insurancePays')}</p>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">
              {insurancePays !== undefined ? formatPrice(insurancePays) : 'Varies'}
            </p>
            <p className="mt-1 text-sm text-green-500 dark:text-green-400">
              {t('reimbursement.reimbursedAmount')}
            </p>
          </div>
        </div>

        {/* Full price comparison */}
        {medicationPrice !== undefined && patientCost !== undefined && (
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('reimbursement.fullPrice')}</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatPrice(medicationPrice)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('reimbursement.yourSavings')}</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatPrice(medicationPrice - patientCost)}
              </span>
            </div>
          </div>
        )}

        {/* Reference prices */}
        {(reimbursement.referencePrice || reimbursement.referenceBasePrice) && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {reimbursement.referencePrice && (
              <p>{t('reimbursement.referencePrice', { value: formatPrice(reimbursement.referencePrice) })}</p>
            )}
            {reimbursement.referenceBasePrice && (
              <p>{t('reimbursement.referenceBase', { value: formatPrice(reimbursement.referenceBasePrice) })}</p>
            )}
          </div>
        )}

        {/* Other regimens */}
        {reimbursement.copayments.length > 1 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
              {t('reimbursement.otherSettings')}
            </summary>
            <div className="mt-2 space-y-2">
              {reimbursement.copayments
                .filter((c) => c.regimen !== 'AMBULATORY' && !c.regimen.includes('AMB'))
                .map((copay, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{copay.regimen}</span>
                    <span className="text-gray-900 dark:text-white">
                      {t('reimbursement.patientAmount', { amount: formatPrice(copay.feeAmount) })}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
