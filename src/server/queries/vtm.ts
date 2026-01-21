import 'server-only';

import { sql } from '@/server/db/client';
import type { VTMWithRelations } from '@/server/types/entities';
import type { VMPSummary, AMPSummary, VMPGroupSummary } from '@/server/types/summaries';

/**
 * Get a VTM by code with all relationships
 * Single query using JSON aggregation for performance
 */
export async function getVTMWithRelations(code: string): Promise<VTMWithRelations | null> {
  const result = await sql`
    SELECT
      v.code,
      v.name,
      v.start_date,
      v.end_date,
      -- VMPs as JSON array
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'entityType', 'vmp',
            'code', sub.code,
            'name', sub.name,
            'status', sub.status,
            'vtmCode', sub.vtm_code,
            'vmpGroupCode', sub.vmp_group_code
          ) ORDER BY sub.name->>'en'
        ), '[]'::json)
        FROM (
          SELECT DISTINCT ON (vmp.code)
            vmp.code,
            vmp.name,
            vmp.status,
            vmp.vtm_code,
            vmp.vmp_group_code
          FROM vmp
          WHERE vmp.vtm_code = v.code
            AND (vmp.end_date IS NULL OR vmp.end_date > CURRENT_DATE)
          ORDER BY vmp.code
        ) sub
      ) as vmps,
      -- AMPs as JSON array (via VMP)
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'entityType', 'amp',
            'code', sub.code,
            'name', sub.name,
            'status', sub.status,
            'vmpCode', sub.vmp_code,
            'companyActorNr', sub.company_actor_nr,
            'companyName', sub.company_name,
            'blackTriangle', sub.black_triangle
          ) ORDER BY sub.name->>'en'
        ), '[]'::json)
        FROM (
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
          WHERE amp.vmp_code IN (SELECT code FROM vmp WHERE vtm_code = v.code)
            AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
          ORDER BY amp.code
        ) sub
      ) as amps,
      -- VMP Groups as JSON array (via VMPs)
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'entityType', 'vmp_group',
            'code', sub.code,
            'name', sub.name,
            'patientFrailtyIndicator', sub.patient_frailty_indicator
          ) ORDER BY sub.name->>'en'
        ), '[]'::json)
        FROM (
          SELECT DISTINCT ON (vg.code)
            vg.code,
            vg.name,
            vg.patient_frailty_indicator
          FROM vmp_group vg
          WHERE vg.code IN (
            SELECT DISTINCT vmp_group_code FROM vmp
            WHERE vtm_code = v.code
              AND vmp_group_code IS NOT NULL
              AND (end_date IS NULL OR end_date > CURRENT_DATE)
          )
          ORDER BY vg.code
        ) sub
      ) as vmp_groups,
      -- Package count
      (
        SELECT COUNT(DISTINCT ampp.cti_extended)::int
        FROM ampp
        JOIN amp ON amp.code = ampp.amp_code
        JOIN vmp ON vmp.code = amp.vmp_code
        WHERE vmp.vtm_code = v.code
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) as package_count,
      -- Min price (via VMP→AMP→AMPP→DMPP chain)
      (
        SELECT MIN(d.price)
        FROM dmpp d
        JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
        JOIN amp ON amp.code = ampp.amp_code
        JOIN vmp ON vmp.code = amp.vmp_code
        WHERE vmp.vtm_code = v.code
          AND d.price IS NOT NULL
          AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) as min_price,
      -- Max price
      (
        SELECT MAX(d.price)
        FROM dmpp d
        JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
        JOIN amp ON amp.code = ampp.amp_code
        JOIN vmp ON vmp.code = amp.vmp_code
        WHERE vmp.vtm_code = v.code
          AND d.price IS NOT NULL
          AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) as max_price,
      -- Reimbursable percentage
      (
        SELECT CASE
          WHEN COUNT(DISTINCT d.code) = 0 THEN NULL
          ELSE (COUNT(DISTINCT CASE WHEN d.reimbursable THEN d.code END)::float / COUNT(DISTINCT d.code)::float * 100)::int
        END
        FROM dmpp d
        JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
        JOIN amp ON amp.code = ampp.amp_code
        JOIN vmp ON vmp.code = amp.vmp_code
        WHERE vmp.vtm_code = v.code
          AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) as reimbursable_percentage
    FROM vtm v
    WHERE v.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  return {
    code: row.code,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    vmps: row.vmps as VMPSummary[],
    amps: row.amps as AMPSummary[],
    vmpGroups: row.vmp_groups as VMPGroupSummary[],
    packageCount: row.package_count,
    minPrice: row.min_price,
    maxPrice: row.max_price,
    reimbursablePercentage: row.reimbursable_percentage,
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
