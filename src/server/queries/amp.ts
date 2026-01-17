import 'server-only';

import { sql } from '@/server/db/client';
import type { AMPWithRelations, AMPComponent, AMPIngredient, AMPExcipient } from '@/server/types/entities';
import type { VMPSummary, CompanySummary, AMPPSummary } from '@/server/types/summaries';

/**
 * Get an AMP by code with all relationships
 */
export async function getAMPWithRelations(code: string): Promise<AMPWithRelations | null> {
  // Get base AMP data
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
      a.end_date
    FROM amp a
    WHERE a.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get VMP if exists
  let vmp: VMPSummary | null = null;
  if (row.vmp_code) {
    const vmpResult = await sql`
      SELECT code, name, status, vtm_code, vmp_group_code
      FROM vmp WHERE code = ${row.vmp_code} LIMIT 1
    `;
    if (vmpResult.rows.length > 0) {
      vmp = {
        entityType: 'vmp',
        code: vmpResult.rows[0].code,
        name: vmpResult.rows[0].name,
        status: vmpResult.rows[0].status,
        vtmCode: vmpResult.rows[0].vtm_code,
        vmpGroupCode: vmpResult.rows[0].vmp_group_code,
      };
    }
  }

  // Get company if exists
  let company: CompanySummary | null = null;
  if (row.company_actor_nr) {
    const companyResult = await sql`
      SELECT actor_nr, denomination, city, country_code
      FROM company WHERE actor_nr = ${row.company_actor_nr} LIMIT 1
    `;
    if (companyResult.rows.length > 0) {
      company = {
        entityType: 'company',
        actorNr: companyResult.rows[0].actor_nr,
        denomination: companyResult.rows[0].denomination,
        city: companyResult.rows[0].city,
        countryCode: companyResult.rows[0].country_code,
      };
    }
  }

  // Get components
  const componentsResult = await sql`
    SELECT DISTINCT ON (ac.sequence_nr)
      ac.sequence_nr,
      ac.pharmaceutical_form_code,
      pf.name as pharmaceutical_form_name,
      ac.route_of_administration_code,
      roa.name as route_of_administration_name
    FROM amp_component ac
    LEFT JOIN pharmaceutical_form pf ON pf.code = ac.pharmaceutical_form_code
    LEFT JOIN route_of_administration roa ON roa.code = ac.route_of_administration_code
    WHERE ac.amp_code = ${code}
    ORDER BY ac.sequence_nr
  `;

  const components: AMPComponent[] = componentsResult.rows.map((c) => ({
    sequenceNr: c.sequence_nr,
    pharmaceuticalFormCode: c.pharmaceutical_form_code,
    pharmaceuticalFormName: c.pharmaceutical_form_name,
    routeOfAdministrationCode: c.route_of_administration_code,
    routeOfAdministrationName: c.route_of_administration_name,
  }));

  // Get ingredients
  const ingredientsResult = await sql`
    SELECT DISTINCT ON (ai.component_sequence_nr, ai.rank)
      ai.component_sequence_nr,
      ai.rank,
      ai.type,
      ai.substance_code,
      s.name as substance_name,
      ai.strength_description
    FROM amp_ingredient ai
    LEFT JOIN substance s ON s.code = ai.substance_code
    WHERE ai.amp_code = ${code}
    ORDER BY ai.component_sequence_nr, ai.rank
  `;

  const ingredients: AMPIngredient[] = ingredientsResult.rows.map((i) => ({
    componentSequenceNr: i.component_sequence_nr,
    rank: i.rank,
    type: i.type,
    substanceCode: i.substance_code,
    substanceName: i.substance_name,
    strengthDescription: i.strength_description,
  }));

  // Get excipients (may not exist in all databases)
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

  // Get packages
  const packagesResult = await sql`
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
    WHERE ampp.amp_code = ${code}
      AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
    ORDER BY ampp.cti_extended, ampp.pack_display_value
  `;

  const packages: AMPPSummary[] = packagesResult.rows.map((p) => ({
    entityType: 'ampp',
    code: p.code,
    name: p.name,
    ampCode: p.amp_code,
    ampName: row.name,
    packDisplayValue: p.pack_display_value,
    exFactoryPrice: p.ex_factory_price,
    cnkCode: p.cnk_code,
    reimbursable: p.reimbursable,
  }));

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
    vmp,
    company,
    components,
    ingredients,
    excipients,
    packages,
  };
}
