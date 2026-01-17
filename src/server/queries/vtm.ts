import 'server-only';

import { sql } from '@/server/db/client';
import type { VTMWithRelations } from '@/server/types/entities';
import type { VMPSummary, AMPSummary } from '@/server/types/summaries';

/**
 * Get a VTM by code with all relationships
 */
export async function getVTMWithRelations(code: string): Promise<VTMWithRelations | null> {
  try {
    // Get base VTM data
    const result = await sql`
      SELECT
        code,
        name,
        start_date,
        end_date
      FROM vtm
      WHERE code = ${code}
    `;

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Get VMPs
    const vmpsResult = await sql`
      SELECT DISTINCT ON (vmp.code)
        vmp.code,
        vmp.name,
        vmp.status,
        vmp.vtm_code,
        vmp.vmp_group_code
      FROM vmp
      WHERE vmp.vtm_code = ${code}
        AND (vmp.end_date IS NULL OR vmp.end_date > CURRENT_DATE)
      ORDER BY vmp.code, vmp.name->>'en'
    `;

    const vmps: VMPSummary[] = vmpsResult.rows.map((v) => ({
      entityType: 'vmp' as const,
      code: v.code,
      name: v.name ?? {},
      status: v.status ?? 'AUTHORIZED',
      vtmCode: v.vtm_code ?? null,
      vmpGroupCode: v.vmp_group_code ?? null,
    }));

    // Get AMPs (brand products)
    const ampsResult = await sql`
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
      WHERE amp.vmp_code IN (SELECT code FROM vmp WHERE vtm_code = ${code})
        AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
      ORDER BY amp.code, amp.name->>'en'
    `;

    const amps: AMPSummary[] = ampsResult.rows.map((a) => ({
      entityType: 'amp' as const,
      code: a.code,
      name: a.name ?? {},
      status: a.status ?? 'AUTHORIZED',
      vmpCode: a.vmp_code ?? null,
      companyActorNr: a.company_actor_nr ?? null,
      companyName: a.company_name ?? null,
      blackTriangle: a.black_triangle ?? false,
    }));

    return {
      code: row.code,
      name: row.name ?? {},
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
      vmps,
      amps,
    };
  } catch (error) {
    console.error('Error fetching VTM:', code, error);
    return null;
  }
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
