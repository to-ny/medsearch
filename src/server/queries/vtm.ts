import 'server-only';

import { sql } from '@/server/db/client';
import type { VTMWithRelations } from '@/server/types/entities';
import type { VMPSummary, AMPSummary, VMPGroupSummary } from '@/server/types/summaries';

/**
 * Get a VTM by code with all relationships
 */
export async function getVTMWithRelations(code: string): Promise<VTMWithRelations | null> {
  // Get base VTM data
  const result = await sql`
    SELECT
      code,
      name,
      start_date,
      end_date
    FROM vtm
    WHERE code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get VMPs
  const vmpsResult = await sql`
    SELECT DISTINCT ON (vmp.code)
      vmp.code,
      vmp.name,
      vmp.status,
      vmp.vtm_code,
      vmp.vmp_group_code
    FROM vmp
    WHERE vmp.vtm_code = ${code}
      AND (vmp.end_date IS NULL OR vmp.end_date > CURRENT_DATE)
    ORDER BY vmp.code, vmp.name->>'en'
  `;

  const vmps: VMPSummary[] = vmpsResult.rows.map((v) => ({
    entityType: 'vmp' as const,
    code: v.code,
    name: v.name,
    status: v.status,
    vtmCode: v.vtm_code,
    vmpGroupCode: v.vmp_group_code,
  }));

  // Get AMPs (brand products)
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
    WHERE amp.vmp_code IN (SELECT code FROM vmp WHERE vtm_code = ${code})
      AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
    ORDER BY amp.code, amp.name->>'en'
  `;

  const amps: AMPSummary[] = ampsResult.rows.map((a) => ({
    entityType: 'amp' as const,
    code: a.code,
    name: a.name,
    status: a.status,
    vmpCode: a.vmp_code,
    companyActorNr: a.company_actor_nr,
    companyName: a.company_name,
    blackTriangle: a.black_triangle,
  }));

  // Get VMP Groups (therapeutic groups) linked via VMPs
  const vmpGroupsResult = await sql`
    SELECT DISTINCT ON (vg.code)
      vg.code,
      vg.name,
      vg.patient_frailty_indicator
    FROM vmp_group vg
    WHERE vg.code IN (
      SELECT DISTINCT vmp_group_code FROM vmp
      WHERE vtm_code = ${code}
        AND vmp_group_code IS NOT NULL
        AND (end_date IS NULL OR end_date > CURRENT_DATE)
    )
    ORDER BY vg.code, vg.name->>'en'
  `;

  const vmpGroups: VMPGroupSummary[] = vmpGroupsResult.rows.map((vg) => ({
    entityType: 'vmp_group' as const,
    code: vg.code,
    name: vg.name,
    patientFrailtyIndicator: vg.patient_frailty_indicator,
  }));

  // Get package count
  const packageCountResult = await sql`
    SELECT COUNT(DISTINCT ampp.cti_extended)::int as count
    FROM ampp
    JOIN amp ON amp.code = ampp.amp_code
    JOIN vmp ON vmp.code = amp.vmp_code
    WHERE vmp.vtm_code = ${code}
      AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
  `;

  const packageCount = packageCountResult.rows[0]?.count || 0;

  return {
    code: row.code,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    vmps,
    amps,
    vmpGroups,
    packageCount,
  };
}

/**
 * Get basic VTM info
 */
export async function getVTM(code: string) {
  const result = await sql`
    SELECT code, name, start_date, end_date
    FROM vtm
    WHERE code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    code: row.code,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}
