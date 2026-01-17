import 'server-only';

import { sql } from '@/server/db/client';
import type { SubstanceWithRelations } from '@/server/types/entities';
import type { AMPSummary } from '@/server/types/summaries';

/**
 * Get a substance by code with relationships
 */
export async function getSubstanceWithRelations(
  code: string
): Promise<SubstanceWithRelations | null> {
  // Get base substance data
  const result = await sql`
    SELECT
      code,
      name,
      start_date,
      end_date
    FROM substance
    WHERE code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get AMPs using this substance as ingredient
  const ampsResult = await sql`
    SELECT DISTINCT ON (amp.code)
      amp.code,
      amp.name,
      amp.status,
      amp.vmp_code,
      amp.company_actor_nr,
      c.denomination as company_name,
      amp.black_triangle
    FROM amp_ingredient ai
    JOIN amp ON amp.code = ai.amp_code
    LEFT JOIN company c ON c.actor_nr = amp.company_actor_nr
    WHERE ai.substance_code = ${code}
      AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
    ORDER BY amp.code, amp.name->>'en'
    LIMIT 50
  `;

  const usedInAmps: AMPSummary[] = ampsResult.rows.map((a) => ({
    entityType: 'amp' as const,
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
    usedInAmpCount: usedInAmps.length,
  };
}
