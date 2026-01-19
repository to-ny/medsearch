import 'server-only';

import { sql } from '@/server/db/client';
import type { VMPWithRelations } from '@/server/types/entities';
import type { VTMSummary, VMPGroupSummary, AMPSummary, StandardDosageSummary } from '@/server/types/summaries';

/**
 * Get a VMP by code with all relationships
 */
export async function getVMPWithRelations(code: string): Promise<VMPWithRelations | null> {
  // Get base VMP data
  const result = await sql`
    SELECT
      v.code,
      v.name,
      v.abbreviated_name,
      v.vtm_code,
      v.vmp_group_code,
      v.status,
      v.start_date,
      v.end_date
    FROM vmp v
    WHERE v.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get VTM if exists
  let vtm: VTMSummary | null = null;
  if (row.vtm_code) {
    const vtmResult = await sql`
      SELECT code, name FROM vtm WHERE code = ${row.vtm_code} LIMIT 1
    `;
    if (vtmResult.rows.length > 0) {
      vtm = {
        entityType: 'vtm',
        code: vtmResult.rows[0].code,
        name: vtmResult.rows[0].name,
      };
    }
  }

  // Get VMP Group if exists
  let vmpGroup: VMPGroupSummary | null = null;
  if (row.vmp_group_code) {
    const vmpGroupResult = await sql`
      SELECT code, name, patient_frailty_indicator FROM vmp_group WHERE code = ${row.vmp_group_code} LIMIT 1
    `;
    if (vmpGroupResult.rows.length > 0) {
      vmpGroup = {
        entityType: 'vmp_group',
        code: vmpGroupResult.rows[0].code,
        name: vmpGroupResult.rows[0].name,
        patientFrailtyIndicator: vmpGroupResult.rows[0].patient_frailty_indicator,
      };
    }
  }

  // Get AMPs
  const ampsResult = await sql`
    SELECT DISTINCT ON (amp.code)
      amp.code,
      amp.name,
      amp.status,
      amp.vmp_code,
      amp.company_actor_nr,
      c.denomination as company_name,
      amp.black_triangle
    FROM amp
    LEFT JOIN company c ON c.actor_nr = amp.company_actor_nr
    WHERE amp.vmp_code = ${code}
      AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
    ORDER BY amp.code, amp.name->>'en'
  `;

  const amps: AMPSummary[] = ampsResult.rows.map((a) => ({
    entityType: 'amp',
    code: a.code,
    name: a.name,
    status: a.status,
    vmpCode: a.vmp_code,
    companyActorNr: a.company_actor_nr,
    companyName: a.company_name,
    blackTriangle: a.black_triangle,
  }));

  // Get dosages
  const dosagesResult = await sql`
    SELECT DISTINCT ON (sd.code)
      sd.code,
      sd.target_group,
      sd.textual_dosage,
      sd.indication_name
    FROM standard_dosage sd
    WHERE sd.vmp_group_code = ${row.vmp_group_code}
      AND (sd.end_date IS NULL OR sd.end_date > CURRENT_DATE)
    ORDER BY sd.code, sd.target_group, sd.indication_name->>'en'
  `;

  const dosages: StandardDosageSummary[] = dosagesResult.rows.map((d) => ({
    code: d.code,
    targetGroup: d.target_group,
    textualDosage: d.textual_dosage,
    indicationName: d.indication_name,
  }));

  // Get package count
  const packageCountResult = await sql`
    SELECT COUNT(DISTINCT ampp.cti_extended)::int as count
    FROM ampp
    JOIN amp ON amp.code = ampp.amp_code
    WHERE amp.vmp_code = ${code}
      AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
  `;

  const packageCount = packageCountResult.rows[0]?.count || 0;

  return {
    code: row.code,
    name: row.name,
    abbreviatedName: row.abbreviated_name,
    vtmCode: row.vtm_code,
    vmpGroupCode: row.vmp_group_code,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    vtm,
    vmpGroup,
    amps,
    dosages,
    packageCount,
  };
}
