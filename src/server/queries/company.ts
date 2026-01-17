import 'server-only';

import { sql } from '@/server/db/client';
import type { CompanyWithRelations } from '@/server/types/entities';
import type { AMPSummary } from '@/server/types/summaries';

/**
 * Get a company by actor number with products
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
      (
        SELECT COUNT(*)::int
        FROM amp
        WHERE amp.company_actor_nr = c.actor_nr
          AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
      ) as product_count
    FROM company c
    WHERE c.actor_nr = ${actorNr}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get paginated products
  const productsResult = await sql`
    SELECT DISTINCT ON (amp.code)
      amp.code,
      amp.name,
      amp.status,
      amp.vmp_code,
      amp.company_actor_nr,
      amp.black_triangle,
      c.denomination as company_name
    FROM amp
    LEFT JOIN company c ON c.actor_nr = amp.company_actor_nr
    WHERE amp.company_actor_nr = ${actorNr}
      AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
    ORDER BY amp.code, amp.name->>'en'
    LIMIT ${productsLimit}
    OFFSET ${productsOffset}
  `;

  const products: AMPSummary[] = productsResult.rows.map((p) => ({
    entityType: 'amp',
    code: p.code,
    name: p.name,
    status: p.status,
    vmpCode: p.vmp_code,
    companyActorNr: p.company_actor_nr,
    companyName: p.company_name,
    blackTriangle: p.black_triangle,
  }));

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
    products,
    productCount: row.product_count,
  };
}
