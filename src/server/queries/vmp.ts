import 'server-only';

import { sql } from '@/server/db/client';
import type { VMPWithRelations } from '@/server/types/entities';
import type { VTMSummary, VMPGroupSummary, AMPSummary, StandardDosageSummary } from '@/server/types/summaries';
import type { MultilingualText } from '@/server/types/domain';

/**
 * Get a VMP by code with all relationships
 * Single query using LEFT JOINs and JSON aggregation for performance
 */
export async function getVMPWithRelations(code: string): Promise<VMPWithRelations | null> {
  const result = await sql`
    SELECT
      v.code,
      v.name,
      v.abbreviated_name,
      v.vtm_code,
      v.vmp_group_code,
      v.status,
      v.start_date,
      v.end_date,
      -- VTM as JSON object (or null)
      CASE WHEN vtm.code IS NOT NULL THEN
        json_build_object(
          'entityType', 'vtm',
          'code', vtm.code,
          'name', vtm.name
        )
      ELSE NULL END AS vtm,
      -- VMP Group as JSON object (or null)
      CASE WHEN vg.code IS NOT NULL THEN
        json_build_object(
          'entityType', 'vmp_group',
          'code', vg.code,
          'name', vg.name,
          'patientFrailtyIndicator', vg.patient_frailty_indicator
        )
      ELSE NULL END AS vmp_group,
      -- AMPs as JSON array
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
          SELECT DISTINCT ON (a.code)
            a.code,
            a.name,
            a.status,
            a.vmp_code,
            a.company_actor_nr,
            c.denomination as company_name,
            a.black_triangle
          FROM amp a
          LEFT JOIN company c ON c.actor_nr = a.company_actor_nr
          WHERE a.vmp_code = v.code
            AND (a.end_date IS NULL OR a.end_date > CURRENT_DATE)
          ORDER BY a.code
        ) sub
      ) AS amps,
      -- Dosages as JSON array
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'code', sub.code,
            'targetGroup', sub.target_group,
            'textualDosage', sub.textual_dosage,
            'indicationName', sub.indication_name
          ) ORDER BY sub.target_group, sub.indication_name->>'en'
        ), '[]'::json)
        FROM (
          SELECT DISTINCT ON (sd.code)
            sd.code,
            sd.target_group,
            sd.textual_dosage,
            sd.indication_name
          FROM standard_dosage sd
          WHERE sd.vmp_group_code = v.vmp_group_code
            AND (sd.end_date IS NULL OR sd.end_date > CURRENT_DATE)
          ORDER BY sd.code
        ) sub
      ) AS dosages,
      -- Package count
      (
        SELECT COUNT(DISTINCT ampp.cti_extended)::int
        FROM ampp
        JOIN amp ON amp.code = ampp.amp_code
        WHERE amp.vmp_code = v.code
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) AS package_count,
      -- Min price (via AMP→AMPP→DMPP chain)
      (
        SELECT MIN(d.price)
        FROM dmpp d
        JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
        JOIN amp ON amp.code = ampp.amp_code
        WHERE amp.vmp_code = v.code
          AND d.price IS NOT NULL
          AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) AS min_price,
      -- Max price
      (
        SELECT MAX(d.price)
        FROM dmpp d
        JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
        JOIN amp ON amp.code = ampp.amp_code
        WHERE amp.vmp_code = v.code
          AND d.price IS NOT NULL
          AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) AS max_price,
      -- Reimbursable percentage
      (
        SELECT CASE
          WHEN COUNT(DISTINCT d.code) = 0 THEN NULL
          ELSE (COUNT(DISTINCT CASE WHEN d.reimbursable THEN d.code END)::float / COUNT(DISTINCT d.code)::float * 100)::int
        END
        FROM dmpp d
        JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
        JOIN amp ON amp.code = ampp.amp_code
        WHERE amp.vmp_code = v.code
          AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) AS reimbursable_percentage,
      -- Has Chapter IV
      (
        SELECT EXISTS(
          SELECT 1
          FROM dmpp_chapter_iv dch
          JOIN dmpp d ON d.code = dch.dmpp_code AND d.delivery_environment = dch.delivery_environment
          JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
          JOIN amp ON amp.code = ampp.amp_code
          WHERE amp.vmp_code = v.code
            AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
            AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
        )
      ) AS has_chapter_iv,
      -- Cheapest package
      (
        SELECT json_build_object(
          'ctiExtended', sub.cti_extended,
          'price', sub.price,
          'cnkCode', sub.cnk_code,
          'name', sub.name
        )
        FROM (
          SELECT
            ampp.cti_extended,
            d.price,
            d.code as cnk_code,
            ampp.prescription_name as name
          FROM dmpp d
          JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
          JOIN amp ON amp.code = ampp.amp_code
          WHERE amp.vmp_code = v.code
            AND d.price IS NOT NULL
            AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
            AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
          ORDER BY d.price ASC
          LIMIT 1
        ) sub
      ) AS cheapest_package
    FROM vmp v
    LEFT JOIN vtm ON vtm.code = v.vtm_code
    LEFT JOIN vmp_group vg ON vg.code = v.vmp_group_code
    WHERE v.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  return {
    code: row.code,
    name: row.name,
    abbreviatedName: row.abbreviated_name,
    vtmCode: row.vtm_code,
    vmpGroupCode: row.vmp_group_code,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    vtm: row.vtm as VTMSummary | null,
    vmpGroup: row.vmp_group as VMPGroupSummary | null,
    amps: row.amps as AMPSummary[],
    dosages: row.dosages as StandardDosageSummary[],
    packageCount: row.package_count,
    minPrice: row.min_price,
    maxPrice: row.max_price,
    reimbursablePercentage: row.reimbursable_percentage,
    hasChapterIV: row.has_chapter_iv,
    cheapestPackage: row.cheapest_package as { ctiExtended: string; price: number; cnkCode: string; name: MultilingualText | null } | null,
  };
}
