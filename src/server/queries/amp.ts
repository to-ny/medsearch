import 'server-only';

import { sql } from '@/server/db/client';
import type { AMPWithRelations, AMPComponent, AMPIngredient, AMPExcipient } from '@/server/types/entities';
import type { VMPSummary, CompanySummary, AMPPSummary } from '@/server/types/summaries';

/**
 * Get an AMP by code with all relationships
 * Single query using LEFT JOINs and JSON aggregation for performance
 * Note: Excipients fetched separately due to table potentially not existing
 */
export async function getAMPWithRelations(code: string): Promise<AMPWithRelations | null> {
  const result = await sql`
    SELECT
      a.code,
      a.name,
      a.abbreviated_name,
      a.official_name,
      a.vmp_code,
      a.company_actor_nr,
      a.black_triangle,
      a.medicine_type,
      a.status,
      a.start_date,
      a.end_date,
      -- VMP as JSON object (or null)
      CASE WHEN v.code IS NOT NULL THEN
        json_build_object(
          'entityType', 'vmp',
          'code', v.code,
          'name', v.name,
          'status', v.status,
          'vtmCode', v.vtm_code,
          'vmpGroupCode', v.vmp_group_code
        )
      ELSE NULL END AS vmp,
      -- Company as JSON object (or null)
      CASE WHEN c.actor_nr IS NOT NULL THEN
        json_build_object(
          'entityType', 'company',
          'actorNr', c.actor_nr,
          'denomination', c.denomination,
          'city', c.city,
          'countryCode', c.country_code
        )
      ELSE NULL END AS company,
      -- Components as JSON array
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'sequenceNr', sub.sequence_nr,
            'pharmaceuticalFormCode', sub.pharmaceutical_form_code,
            'pharmaceuticalFormName', sub.pharmaceutical_form_name,
            'routeOfAdministrationCode', sub.route_of_administration_code,
            'routeOfAdministrationName', sub.route_of_administration_name
          ) ORDER BY sub.sequence_nr
        ), '[]'::json)
        FROM (
          SELECT DISTINCT ON (ac.sequence_nr)
            ac.sequence_nr,
            ac.pharmaceutical_form_code,
            pf.name as pharmaceutical_form_name,
            ac.route_of_administration_code,
            roa.name as route_of_administration_name
          FROM amp_component ac
          LEFT JOIN pharmaceutical_form pf ON pf.code = ac.pharmaceutical_form_code
          LEFT JOIN route_of_administration roa ON roa.code = ac.route_of_administration_code
          WHERE ac.amp_code = a.code
          ORDER BY ac.sequence_nr
        ) sub
      ) AS components,
      -- Ingredients as JSON array
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'componentSequenceNr', sub.component_sequence_nr,
            'rank', sub.rank,
            'type', sub.type,
            'substanceCode', sub.substance_code,
            'substanceName', sub.substance_name,
            'strengthDescription', sub.strength_description
          ) ORDER BY sub.component_sequence_nr, sub.rank
        ), '[]'::json)
        FROM (
          SELECT DISTINCT ON (ai.component_sequence_nr, ai.rank)
            ai.component_sequence_nr,
            ai.rank,
            ai.type,
            ai.substance_code,
            s.name as substance_name,
            ai.strength_description
          FROM amp_ingredient ai
          LEFT JOIN substance s ON s.code = ai.substance_code
          WHERE ai.amp_code = a.code
          ORDER BY ai.component_sequence_nr, ai.rank
        ) sub
      ) AS ingredients,
      -- Packages as JSON array
      (
        SELECT COALESCE(json_agg(
          json_build_object(
            'entityType', 'ampp',
            'code', sub.code,
            'name', sub.name,
            'ampCode', sub.amp_code,
            'ampName', a.name,
            'packDisplayValue', sub.pack_display_value,
            'exFactoryPrice', sub.ex_factory_price,
            'cnkCode', sub.cnk_code,
            'reimbursable', sub.reimbursable
          ) ORDER BY sub.pack_display_value
        ), '[]'::json)
        FROM (
          SELECT DISTINCT ON (ampp.cti_extended)
            ampp.cti_extended as code,
            ampp.prescription_name as name,
            ampp.amp_code,
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
          WHERE ampp.amp_code = a.code
            AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
          ORDER BY ampp.cti_extended
        ) sub
      ) AS packages
    FROM amp a
    LEFT JOIN vmp v ON v.code = a.vmp_code
    LEFT JOIN company c ON c.actor_nr = a.company_actor_nr
    WHERE a.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Fetch excipients separately (table may not exist in all deployments)
  let excipients: AMPExcipient | null = null;
  try {
    const excipientsResult = await sql`
      SELECT amp_code, text, source_urls, parsed_at
      FROM amp_excipient
      WHERE amp_code = ${code}
      LIMIT 1
    `;
    if (excipientsResult.rows.length > 0) {
      excipients = {
        ampCode: excipientsResult.rows[0].amp_code,
        text: excipientsResult.rows[0].text,
        sourceUrls: excipientsResult.rows[0].source_urls,
        parsedAt: excipientsResult.rows[0].parsed_at,
      };
    }
  } catch {
    // Table may not exist, ignore error
  }

  return {
    code: row.code,
    name: row.name,
    abbreviatedName: row.abbreviated_name,
    officialName: row.official_name,
    vmpCode: row.vmp_code,
    companyActorNr: row.company_actor_nr,
    blackTriangle: row.black_triangle,
    medicineType: row.medicine_type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    vmp: row.vmp as VMPSummary | null,
    company: row.company as CompanySummary | null,
    components: row.components as AMPComponent[],
    ingredients: row.ingredients as AMPIngredient[],
    excipients,
    packages: row.packages as AMPPSummary[],
  };
}
