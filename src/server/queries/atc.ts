import 'server-only';

import { sql, query } from '@/server/db/client';
import type { ATCWithRelations } from '@/server/types/entities';
import type { ATCSummary, AMPPSummary } from '@/server/types/summaries';

/**
 * Get parent ATC code (one level up)
 */
function getParentATCCode(code: string): string | null {
  // ATC codes have hierarchical structure:
  // Level 1: A (anatomical main group) - 1 letter
  // Level 2: A01 (therapeutic subgroup) - 1 letter + 2 digits
  // Level 3: A01A (pharmacological subgroup) - 1 letter + 2 digits + 1 letter
  // Level 4: A01AA (chemical subgroup) - 1 letter + 2 digits + 2 letters
  // Level 5: A01AA01 (chemical substance) - 1 letter + 2 digits + 2 letters + 2 digits

  if (code.length <= 1) return null;
  if (code.length <= 3) return code.charAt(0);
  if (code.length <= 4) return code.substring(0, 3);
  if (code.length <= 5) return code.substring(0, 4);
  return code.substring(0, 5);
}

/**
 * Get an ATC classification by code with relationships
 * Single query using JSON aggregation for performance
 */
export async function getATCWithRelations(
  code: string,
  packagesLimit = 50,
  packagesOffset = 0
): Promise<ATCWithRelations | null> {
  const result = await sql`
    SELECT
      atc.code,
      atc.description,
      -- Children classifications as JSON array
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'entityType', 'atc',
            'code', c.code,
            'description', c.description
          ) ORDER BY c.code
        ), '[]'::json)
        FROM atc_classification c
        WHERE c.code LIKE ${code + '%'}
          AND c.code != ${code}
          AND LENGTH(c.code) = ${code.length + (code.length === 1 ? 2 : code.length <= 4 ? 1 : 2)}
      ) as children,
      -- Package count
      (
        SELECT COUNT(DISTINCT ampp.cti_extended)::int
        FROM ampp
        WHERE ampp.atc_code LIKE ${code + '%'}
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) as package_count,
      -- Paginated packages as JSON array
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'entityType', 'ampp',
            'code', sub.code,
            'name', sub.name,
            'ampCode', sub.amp_code,
            'ampName', sub.amp_name,
            'packDisplayValue', sub.pack_display_value,
            'exFactoryPrice', sub.ex_factory_price,
            'cnkCode', sub.cnk_code,
            'reimbursable', sub.reimbursable
          )
        ), '[]'::json)
        FROM (
          SELECT DISTINCT ON (ampp.cti_extended)
            ampp.cti_extended as code,
            ampp.prescription_name as name,
            ampp.amp_code,
            amp.name as amp_name,
            ampp.pack_display_value,
            ampp.ex_factory_price,
            (
              SELECT d.code FROM dmpp d
              WHERE d.ampp_cti_extended = ampp.cti_extended
              AND d.delivery_environment = 'P'
              AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
              LIMIT 1
            ) as cnk_code,
            EXISTS(
              SELECT 1 FROM dmpp d
              WHERE d.ampp_cti_extended = ampp.cti_extended
              AND d.reimbursable = true
              AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
            ) as reimbursable
          FROM ampp
          JOIN amp ON amp.code = ampp.amp_code
          WHERE ampp.atc_code LIKE ${code + '%'}
            AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
          ORDER BY ampp.cti_extended, ampp.prescription_name->>'en'
          LIMIT ${packagesLimit}
          OFFSET ${packagesOffset}
        ) sub
      ) as packages
    FROM atc_classification atc
    WHERE atc.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const parentCode = getParentATCCode(code);

  return {
    code: row.code,
    description: row.description,
    parentCode,
    children: row.children as ATCSummary[],
    packages: row.packages as AMPPSummary[],
    packageCount: row.package_count,
  };
}

/**
 * Get ATC hierarchy breadcrumb
 * Uses a single query to fetch all ancestor codes
 */
export async function getATCHierarchy(code: string): Promise<ATCSummary[]> {
  // Build all possible ancestor codes based on ATC structure
  const ancestorCodes: string[] = [];
  let currentCode: string | null = code;

  while (currentCode) {
    ancestorCodes.push(currentCode);
    currentCode = getParentATCCode(currentCode);
  }

  if (ancestorCodes.length === 0) return [];

  // Fetch all ancestors in a single query using parameterized query
  const result = await query<{ code: string; description: string }>(
    `SELECT code, description
     FROM atc_classification
     WHERE code = ANY($1)
     ORDER BY LENGTH(code) ASC`,
    [ancestorCodes]
  );

  return result.rows.map((row) => ({
    entityType: 'atc' as const,
    code: row.code,
    description: row.description,
  }));
}
