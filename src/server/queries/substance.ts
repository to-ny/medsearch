import 'server-only';

import { sql } from '@/server/db/client';
import type { SubstanceWithRelations } from '@/server/types/entities';
import type { AMPSummary } from '@/server/types/summaries';

/**
 * Get a substance by code with relationships
 * Single query using JSON aggregation for performance
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
      ) as amp_count,
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
            c.denomination as company_name,
            amp.black_triangle
          FROM amp_ingredient ai
          JOIN amp ON amp.code = ai.amp_code
          LEFT JOIN company c ON c.actor_nr = amp.company_actor_nr
          WHERE ai.substance_code = s.code
            AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
          ORDER BY amp.code, amp.name->>'en'
          LIMIT ${ampsLimit}
          OFFSET ${ampsOffset}
        ) sub
      ) as used_in_amps
    FROM substance s
    WHERE s.code = ${code}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  return {
    code: row.code,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    usedInAmps: row.used_in_amps as AMPSummary[],
    usedInAmpCount: row.amp_count,
  };
}
