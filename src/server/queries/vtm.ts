import 'server-only';

import { sql } from '@/server/db/client';
import type { VTMWithRelations } from '@/server/types/entities';
import type { VMPSummary } from '@/server/types/summaries';

/**
 * Get a VTM by code with all relationships
 */
export async function getVTMWithRelations(code: string): Promise<VTMWithRelations | null> {
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
    entityType: 'vmp',
    code: v.code,
    name: v.name,
    status: v.status,
    vtmCode: v.vtm_code,
    vmpGroupCode: v.vmp_group_code,
  }));

  // Get AMP count
  const ampCountResult = await sql`
    SELECT COUNT(*)::int as count
    FROM amp
    WHERE amp.vmp_code IN (SELECT code FROM vmp WHERE vtm_code = ${code})
      AND (amp.end_date IS NULL OR amp.end_date > CURRENT_DATE)
  `;

  return {
    code: row.code,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    vmps,
    ampCount: ampCountResult.rows[0].count,
  };
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
