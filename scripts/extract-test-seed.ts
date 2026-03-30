#!/usr/bin/env bun
/**
 * Extract test seed data from production database.
 * Generates e2e/fixtures/seed.sql with only the entities needed by E2E tests.
 *
 * Usage: DATABASE_URL=postgres://... bun run scripts/extract-test-seed.ts
 */

import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Entity codes directly referenced in E2E tests
const TEST_ENTITIES = {
  vtm: ['974'],
  vmp: ['26377'],
  amp: ['SAM662556-00', 'SAM461564-00', 'SAM208966-00', 'SAM435434-00'],
  ampp: ['000025-02'],
  company: ['02605', '00413'],
  atc: ['C10AA05'],
  vmpGroup: ['18689'],
  substance: ['12581', '19'],
  chapterIV: [{ chapter: 'IV', paragraph: '4770000' }],
};

// Search terms used in tests (need entries in search_index)
const SEARCH_TERMS = ['paracetamol', 'ibuprofen', 'insulin', 'atorvastatin', 'vitamin', 'arnica', 'acid'];

// How many search_index rows per entity type per term
// AMPP must be the largest facet for paracetamol (matches prod behavior)
const SEARCH_ROWS_PER_TYPE = 10;
const SEARCH_AMPP_ROWS = 50; // More AMPPs to ensure Package badge is visible

function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function toInsert(table: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const lines = rows.map(row => `(${cols.map(c => escapeValue(row[c])).join(', ')})`);
  // Chunk to avoid huge statements
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += 50) {
    const chunk = lines.slice(i, i + 50);
    chunks.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${chunk.join(',\n')}\nON CONFLICT DO NOTHING;\n`);
  }
  return chunks.join('\n');
}

async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

async function main() {
  const out: string[] = [];
  out.push('-- Auto-generated test seed data');
  out.push('-- Run: scripts/extract-test-seed.ts to regenerate');
  out.push('-- Contains only entities needed by E2E tests');
  out.push('');
  out.push('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  out.push('');
  out.push('-- Disable FK checks during seed loading (back-filled entities may have partial chains)');
  out.push('SET session_replication_role = replica;');
  out.push('');

  // 1. Discover all needed entity codes by following relationships
  console.log('Discovering entity relationships...');

  // Pull extra AMPs/AMPPs for relationship filter tests
  const substanceAmps = await query(`SELECT DISTINCT ai.amp_code FROM amp_ingredient ai WHERE ai.substance_code = '12581' LIMIT 10`);
  const companyAmps = await query(`SELECT DISTINCT a.code FROM amp a WHERE a.company_actor_nr = '00413' LIMIT 10`);
  // Also get AMPPs from company 00413 for company filter test
  const companyAmpps = await query(`SELECT DISTINCT ampp.cti_extended FROM ampp JOIN amp ON amp.code = ampp.amp_code WHERE amp.company_actor_nr = '00413' LIMIT 10`);
  const atcAmpps = await query(`SELECT DISTINCT cti_extended, amp_code FROM ampp WHERE atc_code LIKE 'C10AA05%' LIMIT 10`);
  const vmpGroupVmps = await query(`SELECT code FROM vmp WHERE vmp_group_code = '18689' LIMIT 5`);
  // For chapter IV filter test: need ampp entries with chapter_iv_exists=true
  const chapterIVAmpps = await query(`SELECT DISTINCT d.ampp_cti_extended FROM dmpp_chapter_iv dc JOIN dmpp d ON d.code = dc.dmpp_code LIMIT 10`);
  // For deliveryEnv filter: need ampp with both P and H
  const deliveryPAmpps = await query(`SELECT DISTINCT ampp_cti_extended FROM dmpp WHERE delivery_environment = 'P' LIMIT 5`);
  const deliveryHAmpps = await query(`SELECT DISTINCT ampp_cti_extended FROM dmpp WHERE delivery_environment = 'H' LIMIT 5`);
  // For reimbursable filter: need mix
  const reimbursableAmpps = await query(`SELECT DISTINCT ampp_cti_extended FROM dmpp WHERE reimbursable = true LIMIT 5`);
  const nonReimbursableAmpps = await query(`SELECT DISTINCT d.ampp_cti_extended FROM dmpp d WHERE d.reimbursable = false AND NOT EXISTS (SELECT 1 FROM dmpp d2 WHERE d2.ampp_cti_extended = d.ampp_cti_extended AND d2.reimbursable = true) LIMIT 5`);

  const extraAmpCodes = [
    ...substanceAmps.map(r => r.amp_code as string),
    ...companyAmps.map(r => r.code as string),
    ...atcAmpps.map(r => r.amp_code as string),
  ];
  const extraAmppCodes = [
    ...atcAmpps.map(r => r.cti_extended as string),
    ...chapterIVAmpps.map(r => r.ampp_cti_extended as string),
    ...deliveryPAmpps.map(r => r.ampp_cti_extended as string),
    ...deliveryHAmpps.map(r => r.ampp_cti_extended as string),
    ...reimbursableAmpps.map(r => r.ampp_cti_extended as string),
    ...nonReimbursableAmpps.map(r => r.ampp_cti_extended as string),
    ...companyAmpps.map(r => r.cti_extended as string),
  ];
  // Get AMP codes from extra AMPPs
  const extraAmppParentAmps = await query(`SELECT DISTINCT amp_code FROM ampp WHERE cti_extended = ANY($1)`, [extraAmppCodes]);
  const extraVmpCodes = vmpGroupVmps.map(r => r.code as string);
  // AMPs linked to VMP 26377 (detail page needs brand products + packages)
  const vmp26377LinkedAmps = await query(`SELECT code FROM amp WHERE vmp_code = '26377' LIMIT 5`);
  extraAmpCodes.push(...vmp26377LinkedAmps.map(r => r.code as string));
  const vmp26377LinkedAmpps = await query(`SELECT cti_extended FROM ampp WHERE amp_code IN (SELECT code FROM amp WHERE vmp_code = '26377') LIMIT 10`);
  extraAmppCodes.push(...vmp26377LinkedAmpps.map(r => r.cti_extended as string));

  // Get AMPs for test AMPPs
  const amppParents = await query(`SELECT amp_code FROM ampp WHERE cti_extended = ANY($1)`, [TEST_ENTITIES.ampp]);
  const allAmpCodes = [...new Set([
    ...TEST_ENTITIES.amp,
    ...amppParents.map(r => r.amp_code as string),
    ...extraAmpCodes,
    ...extraAmppParentAmps.map(r => r.amp_code as string),
  ])];

  // Get VMP codes from AMPs
  const ampVmpCodes = await query(`SELECT DISTINCT vmp_code FROM amp WHERE code = ANY($1) AND vmp_code IS NOT NULL`, [allAmpCodes]);
  const allVmpCodes = [...new Set([...TEST_ENTITIES.vmp, ...ampVmpCodes.map(r => r.vmp_code as string)])];

  // Navigation test: VTM 974 → VMP → AMP → AMPP chain (discover first, merge later)
  const navChain = await query(`
    SELECT v.code as vmp_code, a.code as amp_code, ampp.cti_extended as ampp_code
    FROM vmp v JOIN amp a ON a.vmp_code = v.code JOIN ampp ampp ON ampp.amp_code = a.code
    WHERE v.vtm_code = '974' LIMIT 3
  `);

  // Merge all entity codes (direct refs + FK-discovered + nav chain + extras)
  const finalVmpCodes = [...new Set([...allVmpCodes, ...navChain.map(r => r.vmp_code as string), ...extraVmpCodes])];
  const finalAmpCodes = [...new Set([...allAmpCodes, ...navChain.map(r => r.amp_code as string)])];
  const finalAmppCodes = [...new Set([...TEST_ENTITIES.ampp, ...navChain.map(r => r.ampp_code as string), ...extraAmppCodes])];

  // Get AMPPs for test AMPs (for detail page package lists)
  const ampAmppCodes = await query(`SELECT cti_extended FROM ampp WHERE amp_code = ANY($1) LIMIT 20`, [finalAmpCodes]);
  const allAmppCodes = [...new Set([...finalAmppCodes, ...ampAmppCodes.map(r => r.cti_extended as string)])];

  // Now resolve ALL foreign keys from the final entity sets
  const vmpVtmCodes = await query(`SELECT DISTINCT vtm_code FROM vmp WHERE code = ANY($1) AND vtm_code IS NOT NULL`, [finalVmpCodes]);
  const allVtmCodes = [...new Set([...TEST_ENTITIES.vtm, ...vmpVtmCodes.map(r => r.vtm_code as string)])];

  const vmpGroupCodes = await query(`SELECT DISTINCT vmp_group_code FROM vmp WHERE code = ANY($1) AND vmp_group_code IS NOT NULL`, [finalVmpCodes]);
  const allVmpGroupCodes = [...new Set([...TEST_ENTITIES.vmpGroup, ...vmpGroupCodes.map(r => r.vmp_group_code as string)])];

  const ampCompanyCodes = await query(`SELECT DISTINCT company_actor_nr FROM amp WHERE code = ANY($1) AND company_actor_nr IS NOT NULL`, [finalAmpCodes]);
  const allCompanyCodes = [...new Set([...TEST_ENTITIES.company, ...ampCompanyCodes.map(r => r.company_actor_nr as string)])];

  // ATC codes from AMPPs + hierarchy
  const amppAtcCodes = await query(`SELECT DISTINCT atc_code FROM ampp WHERE cti_extended = ANY($1) AND atc_code IS NOT NULL`, [allAmppCodes]);
  const baseAtcCodes = [...new Set([...TEST_ENTITIES.atc, ...amppAtcCodes.map(r => r.atc_code as string)])];
  const allAtcCodes: string[] = [];
  for (const code of baseAtcCodes) {
    for (let i = 1; i <= code.length; i++) {
      const prefix = code.substring(0, i);
      if (!allAtcCodes.includes(prefix)) allAtcCodes.push(prefix);
    }
  }

  // Substance codes from amp_ingredient
  const ingredientSubstances = await query(`SELECT DISTINCT substance_code FROM amp_ingredient WHERE amp_code = ANY($1) AND substance_code IS NOT NULL`, [finalAmpCodes]);
  const allSubstanceCodes = [...new Set([...TEST_ENTITIES.substance, ...ingredientSubstances.map(r => r.substance_code as string)])];

  // Pharmaceutical form and route codes from amp_component
  const compFormRoute = await query(`
    SELECT DISTINCT pharmaceutical_form_code, route_of_administration_code
    FROM amp_component WHERE amp_code = ANY($1)
  `, [finalAmpCodes]);
  const formCodes = compFormRoute.map(r => r.pharmaceutical_form_code).filter(Boolean) as string[];
  const routeCodes = compFormRoute.map(r => r.route_of_administration_code).filter(Boolean) as string[];

  console.log(`Entities: ${allVtmCodes.length} VTMs, ${finalVmpCodes.length} VMPs, ${finalAmpCodes.length} AMPs, ${allAmppCodes.length} AMPPs`);

  // 2. Extract and write each table
  console.log('Extracting data...');

  // Reference tables
  const substances = await query(`SELECT * FROM substance WHERE code = ANY($1)`, [allSubstanceCodes]);
  out.push('-- Substances'); out.push(toInsert('substance', substances));

  const forms = await query(`SELECT * FROM pharmaceutical_form WHERE code = ANY($1)`, [formCodes]);
  out.push('-- Pharmaceutical forms'); out.push(toInsert('pharmaceutical_form', forms));

  const routes = await query(`SELECT * FROM route_of_administration WHERE code = ANY($1)`, [routeCodes]);
  out.push('-- Routes of administration'); out.push(toInsert('route_of_administration', routes));

  const atcs = await query(`SELECT * FROM atc_classification WHERE code = ANY($1)`, [allAtcCodes]);
  out.push('-- ATC classifications'); out.push(toInsert('atc_classification', atcs));

  const companies = await query(`SELECT * FROM company WHERE actor_nr = ANY($1)`, [allCompanyCodes]);
  out.push('-- Companies'); out.push(toInsert('company', companies));

  // Core entity tables
  const vtms = await query(`SELECT * FROM vtm WHERE code = ANY($1)`, [allVtmCodes]);
  out.push('-- VTMs'); out.push(toInsert('vtm', vtms));

  const vmpGroups = await query(`SELECT * FROM vmp_group WHERE code = ANY($1)`, [allVmpGroupCodes]);
  out.push('-- VMP Groups'); out.push(toInsert('vmp_group', vmpGroups));

  const vmps = await query(`SELECT * FROM vmp WHERE code = ANY($1)`, [finalVmpCodes]);
  out.push('-- VMPs'); out.push(toInsert('vmp', vmps));

  const amps = await query(`SELECT * FROM amp WHERE code = ANY($1)`, [finalAmpCodes]);
  out.push('-- AMPs'); out.push(toInsert('amp', amps));

  const ampComponents = await query(`SELECT * FROM amp_component WHERE amp_code = ANY($1)`, [finalAmpCodes]);
  out.push('-- AMP Components'); out.push(toInsert('amp_component', ampComponents));

  const ampIngredients = await query(`SELECT * FROM amp_ingredient WHERE amp_code = ANY($1)`, [finalAmpCodes]);
  out.push('-- AMP Ingredients'); out.push(toInsert('amp_ingredient', ampIngredients));

  const ampps = await query(`SELECT * FROM ampp WHERE cti_extended = ANY($1)`, [allAmppCodes]);
  out.push('-- AMPPs'); out.push(toInsert('ampp', ampps));

  // DMPP (pricing) for test AMPPs
  const dmpps = await query(`SELECT * FROM dmpp WHERE ampp_cti_extended = ANY($1)`, [allAmppCodes]);
  out.push('-- DMPPs'); out.push(toInsert('dmpp', dmpps));

  // Reimbursement contexts for test DMPPs
  const dmppCodes = dmpps.map(r => r.code as string);
  if (dmppCodes.length > 0) {
    const reimbContexts = await query(`SELECT * FROM reimbursement_context WHERE dmpp_code = ANY($1)`, [dmppCodes]);
    out.push('-- Reimbursement contexts'); out.push(toInsert('reimbursement_context', reimbContexts));

    const rcIds = reimbContexts.map(r => r.id as number);
    if (rcIds.length > 0) {
      const copayments = await query(`SELECT * FROM copayment WHERE reimbursement_context_id = ANY($1)`, [rcIds]);
      out.push('-- Copayments'); out.push(toInsert('copayment', copayments));
    }
  }

  // Chapter IV
  const chapterIVs = await query(`SELECT * FROM chapter_iv_paragraph WHERE chapter_name = 'IV' AND paragraph_name = '4770000'`);
  out.push('-- Chapter IV paragraphs'); out.push(toInsert('chapter_iv_paragraph', chapterIVs));

  const chapterIVVerses = await query(`SELECT * FROM chapter_iv_verse WHERE chapter_name = 'IV' AND paragraph_name = '4770000'`);
  if (chapterIVVerses.length > 0) {
    out.push('-- Chapter IV verses'); out.push(toInsert('chapter_iv_verse', chapterIVVerses));
  }

  // DMPP Chapter IV links — include all chapter IV paragraphs referenced
  if (dmppCodes.length > 0) {
    const dmppChapterIV = await query(`SELECT * FROM dmpp_chapter_iv WHERE dmpp_code = ANY($1)`, [dmppCodes]);
    if (dmppChapterIV.length > 0) {
      // Ensure referenced chapter IV paragraphs exist
      const chapterIVRefs = await query(`
        SELECT DISTINCT dc.chapter_name, dc.paragraph_name FROM dmpp_chapter_iv dc
        WHERE dc.dmpp_code = ANY($1) AND NOT (dc.chapter_name = 'IV' AND dc.paragraph_name = '4770000')
      `, [dmppCodes]);
      if (chapterIVRefs.length > 0) {
        const extraChapterIVs = await query(`
          SELECT * FROM chapter_iv_paragraph WHERE (chapter_name, paragraph_name) IN
          (SELECT DISTINCT chapter_name, paragraph_name FROM dmpp_chapter_iv WHERE dmpp_code = ANY($1))
        `, [dmppCodes]);
        out.push('-- Extra Chapter IV paragraphs'); out.push(toInsert('chapter_iv_paragraph', extraChapterIVs));
      }
      out.push('-- DMPP Chapter IV links'); out.push(toInsert('dmpp_chapter_iv', dmppChapterIV));
    }
  }

  // Legal basis/reference/text for Chapter IV
  const legalBases = await query(`SELECT * FROM legal_basis LIMIT 5`);
  out.push('-- Legal bases'); out.push(toInsert('legal_basis', legalBases));

  const legalRefs = await query(`SELECT * FROM legal_reference WHERE legal_basis_key = ANY($1) LIMIT 20`, [legalBases.map(r => r.key)]);
  if (legalRefs.length > 0) {
    out.push('-- Legal references'); out.push(toInsert('legal_reference', legalRefs));
  }

  // Excipients for test AMPs
  const excipients = await query(`SELECT * FROM amp_excipient WHERE amp_code = ANY($1)`, [finalAmpCodes]);
  if (excipients.length > 0) {
    out.push('-- AMP Excipients'); out.push(toInsert('amp_excipient', excipients));
  }

  // 3. Search index — extract rows for each test search term
  console.log('Extracting search index data...');

  const searchIndexRows: Record<string, unknown>[] = [];
  const searchExtRows: Record<string, unknown>[] = [];
  const seenIndexCodes = new Set<string>();
  const seenExtCodes = new Set<string>();

  for (const term of SEARCH_TERMS) {
    const pattern = `%${term}%`;

    // Pull a balanced mix of entity types per search term
    for (const entityType of ['vtm', 'vmp', 'amp', 'ampp', 'company', 'vmp_group', 'substance', 'atc']) {
      const rows = await query(`
        SELECT * FROM search_index
        WHERE search_text ILIKE $1 AND entity_type = $2 AND (end_date IS NULL OR end_date > CURRENT_DATE)
        ORDER BY code LIMIT ${entityType === 'ampp' ? SEARCH_AMPP_ROWS : SEARCH_ROWS_PER_TYPE}
      `, [pattern, entityType]);
      for (const row of rows) {
        const key = `${row.entity_type}-${row.code}`;
        if (!seenIndexCodes.has(key)) {
          seenIndexCodes.add(key);
          searchIndexRows.push(row);
        }
      }
    }

    // Extended search index — same balanced approach
    for (const entityType of ['vtm', 'vmp', 'amp', 'ampp', 'company', 'vmp_group', 'substance', 'atc']) {
      const extRows = await query(`
        SELECT * FROM search_index_extended
        WHERE search_text ILIKE $1 AND entity_type = $2 AND (end_date IS NULL OR end_date > CURRENT_DATE)
        ORDER BY code LIMIT ${entityType === 'ampp' ? SEARCH_AMPP_ROWS : SEARCH_ROWS_PER_TYPE}
      `, [pattern, entityType]);

      for (const row of extRows) {
        const key = `${row.entity_type}-${row.code}`;
        if (!seenExtCodes.has(key)) {
          seenExtCodes.add(key);
          searchExtRows.push(row);
        }
      }
    }
  }

  // Add AMPs/AMPPs related to VMP 26377 (detail page test needs brand products + packages)
  const vmp26377Amps = await query(`SELECT * FROM search_index WHERE entity_type = 'amp' AND vtm_code IN (SELECT vtm_code FROM vmp WHERE code = '26377') LIMIT 10`);
  for (const row of vmp26377Amps) {
    const key = `${row.entity_type}-${row.code}`;
    if (!seenIndexCodes.has(key)) { seenIndexCodes.add(key); searchIndexRows.push(row); }
  }
  const vmp26377ExtAmps = await query(`SELECT * FROM search_index_extended WHERE entity_type = 'amp' AND code IN (SELECT code FROM amp WHERE vmp_code = '26377') LIMIT 10`);
  for (const row of vmp26377ExtAmps) {
    const key = `${row.entity_type}-${row.code}`;
    if (!seenExtCodes.has(key)) { seenExtCodes.add(key); searchExtRows.push(row); }
  }

  // Also add search_index entries for directly referenced entities
  const directCodes = [...allVtmCodes, ...finalVmpCodes, ...finalAmpCodes, ...allAmppCodes, ...allCompanyCodes, ...allVmpGroupCodes, ...allSubstanceCodes];
  const directSearchRows = await query(`SELECT * FROM search_index WHERE code = ANY($1)`, [directCodes]);
  for (const row of directSearchRows) {
    const key = `${row.entity_type}-${row.code}`;
    if (!seenIndexCodes.has(key)) {
      seenIndexCodes.add(key);
      searchIndexRows.push(row);
    }
  }
  const directExtRows = await query(`SELECT * FROM search_index_extended WHERE code = ANY($1)`, [directCodes]);
  for (const row of directExtRows) {
    const key = `${row.entity_type}-${row.code}`;
    if (!seenExtCodes.has(key)) {
      seenExtCodes.add(key);
      searchExtRows.push(row);
    }
  }

  // Back-fill entity data for AMPPs in search_index that aren't in our entity tables
  const searchAmppCodes = searchIndexRows
    .filter(r => r.entity_type === 'ampp')
    .map(r => r.code as string)
    .filter(c => !allAmppCodes.includes(c));

  if (searchAmppCodes.length > 0) {
    console.log(`Back-filling ${searchAmppCodes.length} AMPPs from search index...`);
    const extraAmpps = await query(`SELECT * FROM ampp WHERE cti_extended = ANY($1)`, [searchAmppCodes]);
    out.push('-- Back-filled AMPPs from search index'); out.push(toInsert('ampp', extraAmpps));

    // Their parent AMPs
    const extraAmpCodesFromSearch = [...new Set(extraAmpps.map(r => r.amp_code as string).filter(c => !finalAmpCodes.includes(c)))];
    if (extraAmpCodesFromSearch.length > 0) {
      const extraAmpsFromSearch = await query(`SELECT * FROM amp WHERE code = ANY($1)`, [extraAmpCodesFromSearch]);
      out.push('-- Back-filled AMPs'); out.push(toInsert('amp', extraAmpsFromSearch));

      // Their VMPs, companies, etc.
      const extraVmpCodes2 = extraAmpsFromSearch.map(r => r.vmp_code).filter(Boolean) as string[];
      if (extraVmpCodes2.length > 0) {
        const extraVmps2 = await query(`SELECT * FROM vmp WHERE code = ANY($1)`, [extraVmpCodes2]);
        out.push(toInsert('vmp', extraVmps2));
        const extraVtmCodes2 = extraVmps2.map(r => r.vtm_code).filter(Boolean) as string[];
        if (extraVtmCodes2.length > 0) out.push(toInsert('vtm', await query(`SELECT * FROM vtm WHERE code = ANY($1)`, [extraVtmCodes2])));
        const extraVmpGroupCodes2 = extraVmps2.map(r => r.vmp_group_code).filter(Boolean) as string[];
        if (extraVmpGroupCodes2.length > 0) out.push(toInsert('vmp_group', await query(`SELECT * FROM vmp_group WHERE code = ANY($1)`, [extraVmpGroupCodes2])));
      }
      const extraCompanyCodes2 = extraAmpsFromSearch.map(r => r.company_actor_nr).filter(Boolean) as string[];
      if (extraCompanyCodes2.length > 0) out.push(toInsert('company', await query(`SELECT * FROM company WHERE actor_nr = ANY($1)`, [extraCompanyCodes2])));
    }

    // DMPPs for back-filled AMPPs (critical for delivery env filter tests)
    const extraDmpps = await query(`SELECT * FROM dmpp WHERE ampp_cti_extended = ANY($1)`, [searchAmppCodes]);
    if (extraDmpps.length > 0) {
      out.push('-- Back-filled DMPPs'); out.push(toInsert('dmpp', extraDmpps));
      // And their reimbursement contexts
      const extraDmppCodes = extraDmpps.map(r => r.code as string);
      const extraReimb = await query(`SELECT * FROM reimbursement_context WHERE dmpp_code = ANY($1)`, [extraDmppCodes]);
      if (extraReimb.length > 0) out.push(toInsert('reimbursement_context', extraReimb));
      // And chapter IV links
      const extraDmppChIV = await query(`SELECT * FROM dmpp_chapter_iv WHERE dmpp_code = ANY($1)`, [extraDmppCodes]);
      if (extraDmppChIV.length > 0) {
        const extraChIVParagraphs = await query(`SELECT * FROM chapter_iv_paragraph WHERE (chapter_name, paragraph_name) IN (SELECT chapter_name, paragraph_name FROM dmpp_chapter_iv WHERE dmpp_code = ANY($1))`, [extraDmppCodes]);
        out.push(toInsert('chapter_iv_paragraph', extraChIVParagraphs));
        out.push(toInsert('dmpp_chapter_iv', extraDmppChIV));
      }
    }
  }

  out.push('-- Search index'); out.push(toInsert('search_index', searchIndexRows));
  out.push('-- Search index extended'); out.push(toInsert('search_index_extended', searchExtRows));

  // Sync metadata (for home page stats)
  out.push('-- Sync metadata');
  out.push(`INSERT INTO sync_metadata (sync_type, started_at, completed_at, status, record_counts) VALUES ('sam', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'completed', '{"amp": 6, "vmp": 4, "vtm": 4, "ampp": 23}');`);
  out.push('');
  out.push('-- Re-enable FK checks');
  out.push('SET session_replication_role = DEFAULT;');
  out.push('');

  // 4. Write to file
  const outputPath = 'e2e/fixtures/seed.sql';
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, out.join('\n'));

  console.log(`\nSeed file written to ${outputPath}`);
  console.log(`  Search index: ${searchIndexRows.length} rows`);
  console.log(`  Search ext: ${searchExtRows.length} rows`);
  console.log(`  Total entities: VTM=${allVtmCodes.length} VMP=${finalVmpCodes.length} AMP=${finalAmpCodes.length} AMPP=${allAmppCodes.length}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
