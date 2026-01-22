'use server';

import 'server-only';

import { query } from '@/server/db/client';
import type { MultilingualText } from '@/server/types/domain';
import { CNK_BATCH_LIMIT, validateBatchInput, type ValidationMessage } from '@/lib/utils/cnk';

/** Result for a single CNK lookup */
export interface CNKLookupResult {
  cnkCode: string;
  found: boolean;
  ampName: MultilingualText | null;
  packDisplayValue: string | null;
  exFactoryPrice: number | null;
  publicPrice: number | null;
  reimbursementCategory: string | null;
  reimbursable: boolean;
  deliveryEnvironment: 'P' | 'H' | null;
  ampCode: string | null;
  amppCtiExtended: string | null;
  status: string | null;
}

/** Batch lookup response */
export interface BatchLookupResponse {
  success: boolean;
  results: CNKLookupResult[];
  notFound: string[];
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  totalRequested: number;
  totalFound: number;
}

/**
 * Batch lookup of CNK codes
 * Returns medication info for each valid CNK code
 */
export async function batchLookupCNK(input: string): Promise<BatchLookupResponse> {
  // Validate input
  const validation = validateBatchInput(input);

  if (!validation.isValid) {
    return {
      success: false,
      results: [],
      notFound: [],
      errors: validation.errors,
      warnings: validation.warnings,
      totalRequested: 0,
      totalFound: 0,
    };
  }

  const codes = validation.codes;

  if (codes.length === 0) {
    return {
      success: false,
      results: [],
      notFound: [],
      errors: [{ key: 'pharmacist.validation.noValidCodesProvided' }],
      warnings: validation.warnings,
      totalRequested: 0,
      totalFound: 0,
    };
  }

  if (codes.length > CNK_BATCH_LIMIT) {
    return {
      success: false,
      results: [],
      notFound: [],
      errors: [{ key: 'pharmacist.validation.maxCodesExceeded', params: { limit: CNK_BATCH_LIMIT, count: codes.length } }],
      warnings: validation.warnings,
      totalRequested: codes.length,
      totalFound: 0,
    };
  }

  try {
    // Build a single efficient query with parameterized placeholders
    const placeholders = codes.map((_, i) => `$${i + 1}`).join(', ');

    const queryText = `
      SELECT
        d.code as cnk_code,
        d.delivery_environment,
        d.price as public_price,
        d.reimbursable,
        ampp.cti_extended as ampp_cti_extended,
        ampp.pack_display_value,
        ampp.ex_factory_price,
        ampp.status,
        ampp.amp_code,
        amp.name as amp_name,
        (
          SELECT rc.reimbursement_criterion_category
          FROM reimbursement_context rc
          WHERE rc.dmpp_code = d.code
            AND rc.delivery_environment = d.delivery_environment
            AND (rc.end_date IS NULL OR rc.end_date > CURRENT_DATE)
          ORDER BY rc.reimbursement_criterion_category
          LIMIT 1
        ) as reimbursement_category
      FROM dmpp d
      JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
      JOIN amp ON amp.code = ampp.amp_code
      WHERE d.code IN (${placeholders})
        AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
      ORDER BY d.code, d.delivery_environment
    `;

    const dbResult = await query<{
      cnk_code: string;
      delivery_environment: 'P' | 'H';
      public_price: number | null;
      reimbursable: boolean;
      ampp_cti_extended: string;
      pack_display_value: string | null;
      ex_factory_price: number | null;
      status: string | null;
      amp_code: string;
      amp_name: MultilingualText;
      reimbursement_category: string | null;
    }>(queryText, codes);

    // Map results by CNK code (prefer Public over Hospital if both exist)
    const resultMap = new Map<string, CNKLookupResult>();

    for (const row of dbResult.rows) {
      const existing = resultMap.get(row.cnk_code);
      // Prefer Public (P) environment over Hospital (H)
      if (!existing || (existing.deliveryEnvironment === 'H' && row.delivery_environment === 'P')) {
        resultMap.set(row.cnk_code, {
          cnkCode: row.cnk_code,
          found: true,
          ampName: row.amp_name,
          packDisplayValue: row.pack_display_value,
          exFactoryPrice: row.ex_factory_price,
          publicPrice: row.public_price,
          reimbursementCategory: row.reimbursement_category,
          reimbursable: row.reimbursable,
          deliveryEnvironment: row.delivery_environment,
          ampCode: row.amp_code,
          amppCtiExtended: row.ampp_cti_extended,
          status: row.status,
        });
      }
    }

    // Build final results array, marking not found codes
    const results: CNKLookupResult[] = [];
    const notFound: string[] = [];

    for (const code of codes) {
      const result = resultMap.get(code);
      if (result) {
        results.push(result);
      } else {
        notFound.push(code);
        results.push({
          cnkCode: code,
          found: false,
          ampName: null,
          packDisplayValue: null,
          exFactoryPrice: null,
          publicPrice: null,
          reimbursementCategory: null,
          reimbursable: false,
          deliveryEnvironment: null,
          ampCode: null,
          amppCtiExtended: null,
          status: null,
        });
      }
    }

    return {
      success: true,
      results,
      notFound,
      errors: [],
      warnings: validation.warnings,
      totalRequested: codes.length,
      totalFound: results.filter((r) => r.found).length,
    };
  } catch (error) {
    console.error('Batch lookup error:', error);
    return {
      success: false,
      results: [],
      notFound: codes,
      errors: [{ key: 'pharmacist.validation.databaseError' }],
      warnings: validation.warnings,
      totalRequested: codes.length,
      totalFound: 0,
    };
  }
}

/**
 * Get the last sync metadata
 */
export async function getLastSyncMetadata(): Promise<{
  lastSyncDate: Date | null;
  sourceDate: Date | null;
  recordCounts: Record<string, number> | null;
} | null> {
  try {
    const result = await query<{
      completed_at: Date | null;
      source_date: Date | null;
      record_counts: Record<string, number> | null;
    }>(`
      SELECT completed_at, source_date, record_counts
      FROM sync_metadata
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      lastSyncDate: row.completed_at,
      sourceDate: row.source_date,
      recordCounts: row.record_counts,
    };
  } catch {
    return null;
  }
}

/**
 * Get database statistics for display
 */
export async function getDatabaseStats(): Promise<{
  totalMedications: number;
  totalPackages: number;
  totalSubstances: number;
} | null> {
  try {
    const result = await query<{
      amp_count: string;
      ampp_count: string;
      vtm_count: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM amp WHERE status = 'AUTHORIZED')::text as amp_count,
        (SELECT COUNT(*) FROM ampp WHERE status = 'AUTHORIZED' OR status IS NULL)::text as ampp_count,
        (SELECT COUNT(*) FROM vtm WHERE end_date IS NULL OR end_date > CURRENT_DATE)::text as vtm_count
    `);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      totalMedications: parseInt(row.amp_count, 10),
      totalPackages: parseInt(row.ampp_count, 10),
      totalSubstances: parseInt(row.vtm_count, 10),
    };
  } catch {
    return null;
  }
}
