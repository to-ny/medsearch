import 'server-only';

import { sql } from '@/server/db/client';
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
 */
export async function getATCWithRelations(
  code: string,
  packagesLimit = 50,
  packagesOffset = 0
): Promise<ATCWithRelations | null> {
  const result = await sql`
    SELECT
      atc.code,
      atc.description
    FROM atc_classification atc
    WHERE atc.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const parentCode = getParentATCCode(code);

  // Get child classifications
  const childrenResult = await sql`
    SELECT code, description
    FROM atc_classification
    WHERE code LIKE ${code + '%'}
      AND code != ${code}
      AND LENGTH(code) = ${code.length + (code.length === 1 ? 2 : code.length <= 4 ? 1 : 2)}
    ORDER BY code
  `;

  const children: ATCSummary[] = childrenResult.rows.map((c) => ({
    entityType: 'atc',
    code: c.code,
    description: c.description,
  }));

  // Get package count
  const countResult = await sql`
    SELECT COUNT(DISTINCT ampp.cti_extended)::int as count
    FROM ampp
    WHERE ampp.atc_code LIKE ${code + '%'}
      AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
  `;

  // Get paginated packages
  const packagesResult = await sql`
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
  `;

  const packages: AMPPSummary[] = packagesResult.rows.map((p) => ({
    entityType: 'ampp',
    code: p.code,
    name: p.name,
    ampCode: p.amp_code,
    ampName: p.amp_name,
    packDisplayValue: p.pack_display_value,
    exFactoryPrice: p.ex_factory_price,
    cnkCode: p.cnk_code,
    reimbursable: p.reimbursable,
  }));

  return {
    code: row.code,
    description: row.description,
    parentCode,
    children,
    packages,
    packageCount: countResult.rows[0].count,
  };
}

/**
 * Get ATC hierarchy breadcrumb
 */
export async function getATCHierarchy(code: string): Promise<ATCSummary[]> {
  const hierarchy: ATCSummary[] = [];
  let currentCode: string | null = code;

  while (currentCode) {
    const result = await sql`
      SELECT code, description
      FROM atc_classification
      WHERE code = ${currentCode}
    `;

    if (result.rows.length > 0) {
      hierarchy.unshift({
        entityType: 'atc',
        code: result.rows[0].code,
        description: result.rows[0].description,
      });
    }

    currentCode = getParentATCCode(currentCode);
  }

  return hierarchy;
}
