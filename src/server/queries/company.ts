import 'server-only';

import { sql } from '@/server/db/client';
import type { CompanyWithRelations } from '@/server/types/entities';
import type { AMPSummary } from '@/server/types/summaries';

/**
 * Get a company by actor number with products
 * Single query using JSON aggregation for performance
 */
export async function getCompanyWithRelations(
  actorNr: string,
  productsLimit = 50,
  productsOffset = 0
): Promise<CompanyWithRelations | null> {
  const result = await sql`
    SELECT
      c.actor_nr,
      c.denomination,
      c.legal_form,
      c.vat_country_code,
      c.vat_number,
      c.street_name,
      c.street_num,
      c.postbox,
      c.postcode,
      c.city,
      c.country_code,
      c.phone,
      c.language,
      c.start_date,
      c.end_date,
      -- Product count
      (
        SELECT COUNT(*)::int
        FROM amp
        WHERE amp.company_actor_nr = c.actor_nr
          AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
      ) as product_count,
      -- Distinct VMP count
      (
        SELECT COUNT(DISTINCT vmp_code)::int
        FROM amp
        WHERE amp.company_actor_nr = c.actor_nr
          AND amp.vmp_code IS NOT NULL
          AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
      ) as vmp_count,
      -- Package count
      (
        SELECT COUNT(DISTINCT ampp.cti_extended)::int
        FROM ampp
        JOIN amp ON amp.code = ampp.amp_code
        WHERE amp.company_actor_nr = c.actor_nr
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
      ) as package_count,
      -- Reimbursable package count
      (
        SELECT COUNT(DISTINCT ampp.cti_extended)::int
        FROM ampp
        JOIN amp ON amp.code = ampp.amp_code
        JOIN dmpp ON dmpp.ampp_cti_extended = ampp.cti_extended
        WHERE amp.company_actor_nr = c.actor_nr
          AND dmpp.reimbursable = true
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
          AND (dmpp.end_date IS NULL OR dmpp.end_date > CURRENT_DATE)
      ) as reimbursable_count,
      -- Paginated products as JSON array
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
          )
        ), '[]'::json)
        FROM (
          SELECT DISTINCT ON (amp.code)
            amp.code,
            amp.name,
            amp.status,
            amp.vmp_code,
            amp.company_actor_nr,
            amp.black_triangle,
            c.denomination as company_name
          FROM amp
          WHERE amp.company_actor_nr = c.actor_nr
            AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
          ORDER BY amp.code, amp.name->>'en'
          LIMIT ${productsLimit}
          OFFSET ${productsOffset}
        ) sub
      ) as products
    FROM company c
    WHERE c.actor_nr = ${actorNr}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  return {
    actorNr: row.actor_nr,
    denomination: row.denomination,
    legalForm: row.legal_form,
    vatCountryCode: row.vat_country_code,
    vatNumber: row.vat_number,
    streetName: row.street_name,
    streetNum: row.street_num,
    postbox: row.postbox,
    postcode: row.postcode,
    city: row.city,
    countryCode: row.country_code,
    phone: row.phone,
    language: row.language,
    startDate: row.start_date,
    endDate: row.end_date,
    products: row.products as AMPSummary[],
    productCount: row.product_count,
    vmpCount: row.vmp_count,
    packageCount: row.package_count,
    reimbursableCount: row.reimbursable_count,
  };
}
