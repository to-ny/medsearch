import 'server-only';

import { sql } from '@/server/db/client';
import type { AMPPWithRelations, DMPP, ReimbursementContext, ATCClassification, Copayment } from '@/server/types/entities';
import type { AMPSummary, ChapterIVParagraphSummary } from '@/server/types/summaries';

/**
 * Get an AMPP by CTI extended with all relationships
 */
export async function getAMPPWithRelations(ctiExtended: string): Promise<AMPPWithRelations | null> {
  const result = await sql`
    SELECT
      ampp.cti_extended,
      ampp.amp_code,
      ampp.prescription_name,
      ampp.authorisation_nr,
      ampp.orphan,
      ampp.leaflet_url,
      ampp.spc_url,
      ampp.pack_display_value,
      ampp.status,
      ampp.ex_factory_price,
      ampp.atc_code,
      ampp.start_date,
      ampp.end_date,
      (SELECT json_build_object(
        'entityType', 'amp',
        'code', amp.code,
        'name', amp.name,
        'status', amp.status,
        'vmpCode', amp.vmp_code,
        'companyActorNr', amp.company_actor_nr,
        'companyName', c.denomination,
        'blackTriangle', amp.black_triangle
      ) FROM amp
      LEFT JOIN company c ON c.actor_nr = amp.company_actor_nr
      WHERE amp.code = ampp.amp_code) as amp,
      CASE WHEN ampp.atc_code IS NOT NULL THEN
        (SELECT json_build_object(
          'code', atc.code,
          'description', atc.description
        ) FROM atc_classification atc WHERE atc.code = ampp.atc_code)
      ELSE NULL END as atc_classification,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'code', d.code,
            'deliveryEnvironment', d.delivery_environment,
            'amppCtiExtended', d.ampp_cti_extended,
            'price', d.price,
            'cheap', d.cheap,
            'cheapest', d.cheapest,
            'reimbursable', d.reimbursable,
            'startDate', d.start_date,
            'endDate', d.end_date
          ) ORDER BY d.delivery_environment, d.code)
          FROM dmpp d
          WHERE d.ampp_cti_extended = ampp.cti_extended
            AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
        ),
        '[]'::json
      ) as cnk_codes,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'chapterName', civ.chapter_name,
            'paragraphName', civ.paragraph_name,
            'keyString', civ.key_string
          ))
          FROM dmpp_chapter_iv dciv
          JOIN chapter_iv_paragraph civ ON civ.chapter_name = dciv.chapter_name AND civ.paragraph_name = dciv.paragraph_name
          JOIN dmpp d ON d.code = dciv.dmpp_code AND d.delivery_environment = dciv.delivery_environment
          WHERE d.ampp_cti_extended = ampp.cti_extended
        ),
        '[]'::json
      ) as chapter_iv_paragraphs
    FROM ampp
    WHERE ampp.cti_extended = ${ctiExtended}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get reimbursement contexts separately (complex nested query)
  const reimbursementResult = await sql`
    SELECT
      rc.id,
      rc.dmpp_code,
      rc.delivery_environment,
      rc.legal_reference_path,
      rc.reimbursement_criterion_category,
      rc.reimbursement_criterion_code,
      rc.flat_rate_system,
      rc.reference_price,
      rc.temporary,
      rc.reference_base_price,
      rc.reimbursement_base_price,
      rc.pricing_unit_quantity,
      rc.pricing_unit_label,
      rc.start_date,
      rc.end_date,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', cp.id,
            'regimenType', cp.regimen_type,
            'feeAmount', cp.fee_amount,
            'reimbursementAmount', cp.reimbursement_amount
          ) ORDER BY cp.regimen_type)
          FROM copayment cp
          WHERE cp.reimbursement_context_id = rc.id
        ),
        '[]'::json
      ) as copayments
    FROM reimbursement_context rc
    JOIN dmpp d ON d.code = rc.dmpp_code AND d.delivery_environment = rc.delivery_environment
    WHERE d.ampp_cti_extended = ${ctiExtended}
      AND (rc.end_date IS NULL OR rc.end_date > CURRENT_DATE)
    ORDER BY rc.reimbursement_criterion_category
  `;

  const reimbursementContexts: ReimbursementContext[] = reimbursementResult.rows.map((r) => ({
    id: r.id,
    dmppCode: r.dmpp_code,
    deliveryEnvironment: r.delivery_environment,
    legalReferencePath: r.legal_reference_path,
    reimbursementCriterionCategory: r.reimbursement_criterion_category,
    reimbursementCriterionCode: r.reimbursement_criterion_code,
    flatRateSystem: r.flat_rate_system,
    referencePrice: r.reference_price,
    temporary: r.temporary,
    referenceBasePrice: r.reference_base_price,
    reimbursementBasePrice: r.reimbursement_base_price,
    pricingUnitQuantity: r.pricing_unit_quantity,
    pricingUnitLabel: r.pricing_unit_label,
    startDate: r.start_date,
    endDate: r.end_date,
    copayments: r.copayments as Copayment[],
  }));

  return {
    ctiExtended: row.cti_extended,
    ampCode: row.amp_code,
    prescriptionName: row.prescription_name,
    authorisationNr: row.authorisation_nr,
    orphan: row.orphan,
    leafletUrl: row.leaflet_url,
    spcUrl: row.spc_url,
    packDisplayValue: row.pack_display_value,
    status: row.status,
    exFactoryPrice: row.ex_factory_price,
    atcCode: row.atc_code,
    startDate: row.start_date,
    endDate: row.end_date,
    amp: row.amp as AMPSummary,
    atcClassification: row.atc_classification as ATCClassification | null,
    cnkCodes: row.cnk_codes as DMPP[],
    reimbursementContexts,
    chapterIVParagraphs: row.chapter_iv_paragraphs as ChapterIVParagraphSummary[],
  };
}
