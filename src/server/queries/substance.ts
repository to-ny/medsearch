import 'server-only';

import { sql } from '@/server/db/client';
import type { SubstanceWithRelations } from '@/server/types/entities';
import type { AMPSummary } from '@/server/types/summaries';

/**
 * Get a substance by code with relationships
 */
export async function getSubstanceWithRelations(
  code: string,
  ampsLimit = 50,
  ampsOffset = 0
): Promise<SubstanceWithRelations | null> {
  const result = await sql`
    SELECT
      s.code,
      s.name,
      s.start_date,
      s.end_date,
      (
        SELECT COUNT(DISTINCT amp.code)::int
        FROM amp_ingredient ai
        JOIN amp ON amp.code = ai.amp_code
        WHERE ai.substance_code = s.code
          AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
      ) as used_in_amp_count
    FROM substance s
    WHERE s.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get paginated AMPs using this substance
  const ampsResult = await sql`
    SELECT DISTINCT
      amp.code,
      amp.name,
      amp.status,
      amp.vmp_code,
      amp.company_actor_nr,
      amp.black_triangle,
      c.denomination as company_name
    FROM amp_ingredient ai
    JOIN amp ON amp.code = ai.amp_code
    LEFT JOIN company c ON c.actor_nr = amp.company_actor_nr
    WHERE ai.substance_code = ${code}
      AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
    ORDER BY amp.name->>'en'
    LIMIT ${ampsLimit}
    OFFSET ${ampsOffset}
  `;

  const usedInAmps: AMPSummary[] = ampsResult.rows.map((a) => ({
    entityType: 'amp',
    code: a.code,
    name: a.name,
    status: a.status,
    vmpCode: a.vmp_code,
    companyActorNr: a.company_actor_nr,
    companyName: a.company_name,
    blackTriangle: a.black_triangle,
  }));

  return {
    code: row.code,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    usedInAmps,
    usedInAmpCount: row.used_in_amp_count,
  };
}
