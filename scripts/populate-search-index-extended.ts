/**
 * Targeted script to populate search_index_extended from existing production tables.
 * This avoids the full sync process which requires too much temporary storage.
 *
 * Run with: bun scripts/populate-search-index-extended.ts
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('======================================');
  console.log('   Populate search_index_extended');
  console.log('======================================\n');

  // Check current database size
  const sizeResult = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`;
  console.log(`Current database size: ${sizeResult[0].size}\n`);

  // Step 1: Drop existing table if exists
  console.log('1. Dropping existing search_index_extended table...');
  await sql`DROP TABLE IF EXISTS search_index_extended CASCADE`;
  console.log('   [OK] Dropped\n');

  // Step 2: Create the table
  console.log('2. Creating search_index_extended table...');
  await sql`
    CREATE TABLE search_index_extended (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      code TEXT NOT NULL,
      search_text TEXT NOT NULL,
      name JSONB,
      parent_code TEXT,
      parent_name JSONB,
      company_name TEXT,
      pack_info TEXT,
      price NUMERIC,
      reimbursable BOOLEAN,
      cnk_code TEXT,
      product_count INT,
      black_triangle BOOLEAN,
      vtm_code TEXT,
      vmp_code TEXT,
      amp_code TEXT,
      atc_code TEXT,
      company_actor_nr TEXT,
      vmp_group_code TEXT,
      end_date DATE,
      pharmaceutical_form_code VARCHAR(20),
      pharmaceutical_form_name JSONB,
      route_of_administration_code VARCHAR(20),
      route_of_administration_name JSONB,
      reimbursement_category VARCHAR(10),
      chapter_iv_exists BOOLEAN DEFAULT FALSE,
      delivery_environment CHAR(1),
      medicine_type VARCHAR(50),
      UNIQUE(entity_type, code)
    )
  `;
  console.log('   [OK] Created\n');

  // Step 3: Populate from production tables
  console.log('3. Populating from production tables...');
  console.log('   This may take a minute...\n');

  await sql`
    INSERT INTO search_index_extended (
      entity_type, code, search_text, name, parent_code, parent_name,
      company_name, pack_info, price, reimbursable, cnk_code,
      product_count, black_triangle,
      vtm_code, vmp_code, amp_code, atc_code, company_actor_nr, vmp_group_code,
      end_date,
      pharmaceutical_form_code, pharmaceutical_form_name,
      route_of_administration_code, route_of_administration_name,
      reimbursement_category, chapter_iv_exists, delivery_environment, medicine_type
    )

    -- VTM (no extended fields)
    SELECT * FROM (
      SELECT DISTINCT ON (code)
        'vtm'::text as entity_type, code,
        LOWER(COALESCE(name->>'en','') || ' ' || COALESCE(name->>'nl','') || ' ' ||
              COALESCE(name->>'fr','') || ' ' || COALESCE(name->>'de','')) as search_text,
        name, NULL::text as parent_code, NULL::jsonb as parent_name,
        NULL::text as company_name, NULL::text as pack_info, NULL::numeric as price, NULL::boolean as reimbursable, NULL::text as cnk_code,
        NULL::int as product_count, NULL::boolean as black_triangle,
        NULL::text as vtm_code, NULL::text as vmp_code, NULL::text as amp_code, NULL::text as atc_code, NULL::text as company_actor_nr, NULL::text as vmp_group_code,
        end_date,
        NULL::varchar(20) as pharmaceutical_form_code, NULL::jsonb as pharmaceutical_form_name,
        NULL::varchar(20) as route_of_administration_code, NULL::jsonb as route_of_administration_name,
        NULL::varchar(10) as reimbursement_category, FALSE as chapter_iv_exists, NULL::char(1) as delivery_environment, NULL::varchar(50) as medicine_type
      FROM vtm
      ORDER BY code
    ) vtm_sub

    UNION ALL

    -- VMP (no extended fields)
    SELECT * FROM (
      SELECT DISTINCT ON (v.code)
        'vmp'::text, v.code,
        LOWER(COALESCE(v.name->>'en','') || ' ' || COALESCE(v.name->>'nl','') || ' ' ||
              COALESCE(v.name->>'fr','') || ' ' || COALESCE(v.name->>'de','') || ' ' ||
              COALESCE(v.abbreviated_name->>'en','') || ' ' || COALESCE(v.abbreviated_name->>'nl','')),
        v.name, v.vtm_code, vtm.name,
        NULL::text, NULL::text, NULL::numeric, NULL::boolean, NULL::text,
        NULL::int, NULL::boolean,
        v.vtm_code, NULL::text, NULL::text, NULL::text, NULL::text, v.vmp_group_code,
        v.end_date,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(10), FALSE, NULL::char(1), NULL::varchar(50)
      FROM vmp v
      LEFT JOIN vtm ON vtm.code = v.vtm_code
      ORDER BY v.code
    ) vmp_sub

    UNION ALL

    -- AMP (with pharmaceutical_form, route_of_administration, medicine_type)
    SELECT * FROM (
      SELECT DISTINCT ON (a.code)
        'amp'::text, a.code,
        LOWER(COALESCE(a.name->>'en','') || ' ' || COALESCE(a.name->>'nl','') || ' ' ||
              COALESCE(a.name->>'fr','') || ' ' || COALESCE(a.name->>'de','') || ' ' ||
              COALESCE(a.abbreviated_name->>'en','') || ' ' || COALESCE(a.official_name,'')),
        a.name, a.vmp_code, v.name,
        c.denomination, NULL::text, NULL::numeric, NULL::boolean, NULL::text,
        NULL::int, a.black_triangle,
        v.vtm_code, a.vmp_code, NULL::text, NULL::text, a.company_actor_nr, NULL::text,
        a.end_date,
        comp.pharmaceutical_form_code, pf.name,
        comp.route_of_administration_code, roa.name,
        NULL::varchar(10), FALSE, NULL::char(1), a.medicine_type
      FROM amp a
      LEFT JOIN vmp v ON v.code = a.vmp_code
      LEFT JOIN company c ON c.actor_nr = a.company_actor_nr
      LEFT JOIN amp_component comp ON comp.amp_code = a.code AND comp.sequence_nr = 1
      LEFT JOIN pharmaceutical_form pf ON pf.code = comp.pharmaceutical_form_code
      LEFT JOIN route_of_administration roa ON roa.code = comp.route_of_administration_code
      ORDER BY a.code
    ) amp_sub

    UNION ALL

    -- AMPP (with reimbursement_category, chapter_iv_exists, delivery_environment)
    SELECT * FROM (
      SELECT DISTINCT ON (ampp.cti_extended)
        'ampp'::text, ampp.cti_extended,
        LOWER(COALESCE(ampp.prescription_name->>'en','') || ' ' ||
              COALESCE(ampp.prescription_name->>'nl','') || ' ' ||
              COALESCE(ampp.prescription_name->>'fr','') || ' ' ||
              COALESCE(amp.name->>'en','')),
        COALESCE(ampp.prescription_name, amp.name), ampp.amp_code, amp.name,
        NULL::text, ampp.pack_display_value, ampp.ex_factory_price,
        (SELECT EXISTS(
          SELECT 1 FROM dmpp d
          WHERE d.ampp_cti_extended = ampp.cti_extended
          AND d.reimbursable = true
          AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
        ))::boolean,
        (SELECT d.code FROM dmpp d
         WHERE d.ampp_cti_extended = ampp.cti_extended
         AND d.delivery_environment = 'P'
         AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
         LIMIT 1),
        NULL::int, NULL::boolean,
        v.vtm_code, amp.vmp_code, ampp.amp_code, ampp.atc_code, NULL::text, NULL::text,
        ampp.end_date,
        comp.pharmaceutical_form_code, pf.name,
        comp.route_of_administration_code, roa.name,
        (SELECT rc.reimbursement_criterion_category FROM reimbursement_context rc
         JOIN dmpp d ON d.code = rc.dmpp_code AND d.delivery_environment = rc.delivery_environment
         WHERE d.ampp_cti_extended = ampp.cti_extended
         AND (rc.end_date IS NULL OR rc.end_date > CURRENT_DATE)
         LIMIT 1),
        (SELECT EXISTS(
          SELECT 1 FROM dmpp d
          JOIN dmpp_chapter_iv dc ON dc.dmpp_code = d.code AND dc.delivery_environment = d.delivery_environment
          WHERE d.ampp_cti_extended = ampp.cti_extended
        ))::boolean,
        (SELECT d.delivery_environment FROM dmpp d
         WHERE d.ampp_cti_extended = ampp.cti_extended
         AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
         LIMIT 1),
        amp.medicine_type
      FROM ampp
      JOIN amp ON amp.code = ampp.amp_code
      LEFT JOIN vmp v ON v.code = amp.vmp_code
      LEFT JOIN amp_component comp ON comp.amp_code = amp.code AND comp.sequence_nr = 1
      LEFT JOIN pharmaceutical_form pf ON pf.code = comp.pharmaceutical_form_code
      LEFT JOIN route_of_administration roa ON roa.code = comp.route_of_administration_code
      ORDER BY ampp.cti_extended
    ) ampp_sub

    UNION ALL

    -- Company (no extended fields)
    SELECT * FROM (
      SELECT DISTINCT ON (c.actor_nr)
        'company'::text, c.actor_nr,
        LOWER(COALESCE(c.denomination,'')),
        jsonb_build_object('en', c.denomination, 'nl', c.denomination, 'fr', c.denomination, 'de', c.denomination),
        NULL::text, NULL::jsonb,
        NULL::text, NULL::text, NULL::numeric, NULL::boolean, NULL::text,
        (SELECT COUNT(*)::int FROM amp WHERE company_actor_nr = c.actor_nr), NULL::boolean,
        NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
        c.end_date,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(10), FALSE, NULL::char(1), NULL::varchar(50)
      FROM company c
      ORDER BY c.actor_nr
    ) company_sub

    UNION ALL

    -- VMP Group (no extended fields)
    SELECT * FROM (
      SELECT DISTINCT ON (code)
        'vmp_group'::text, code,
        LOWER(COALESCE(name->>'en','') || ' ' || COALESCE(name->>'nl','') || ' ' || COALESCE(name->>'fr','')),
        name, NULL::text, NULL::jsonb,
        NULL::text, NULL::text, NULL::numeric, NULL::boolean, NULL::text,
        NULL::int, NULL::boolean,
        NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
        end_date,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(10), FALSE, NULL::char(1), NULL::varchar(50)
      FROM vmp_group
      ORDER BY code
    ) vmp_group_sub

    UNION ALL

    -- Substance (no extended fields)
    SELECT * FROM (
      SELECT DISTINCT ON (code)
        'substance'::text, code,
        LOWER(COALESCE(name->>'en','') || ' ' || COALESCE(name->>'nl','') || ' ' || COALESCE(name->>'fr','')),
        name, NULL::text, NULL::jsonb,
        NULL::text, NULL::text, NULL::numeric, NULL::boolean, NULL::text,
        NULL::int, NULL::boolean,
        NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
        end_date,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(10), FALSE, NULL::char(1), NULL::varchar(50)
      FROM substance
      ORDER BY code
    ) substance_sub

    UNION ALL

    -- ATC (no extended fields)
    SELECT * FROM (
      SELECT DISTINCT ON (code)
        'atc'::text, code,
        LOWER(COALESCE(description,'')),
        jsonb_build_object('en', description, 'nl', description, 'fr', description, 'de', description),
        NULL::text, NULL::jsonb,
        NULL::text, NULL::text, NULL::numeric, NULL::boolean, NULL::text,
        NULL::int, NULL::boolean,
        NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
        NULL::date,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(20), NULL::jsonb,
        NULL::varchar(10), FALSE, NULL::char(1), NULL::varchar(50)
      FROM atc_classification
      ORDER BY code
    ) atc_sub
  `;
  console.log('   [OK] Data inserted\n');

  // Step 4: Create indexes
  console.log('4. Creating indexes...');

  // Base indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_text_trgm ON search_index_extended USING GIN (search_text gin_trgm_ops)`;
  console.log('   [OK] idx_search_ext_text_trgm');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_code ON search_index_extended (code)`;
  console.log('   [OK] idx_search_ext_code');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_cnk ON search_index_extended (cnk_code) WHERE cnk_code IS NOT NULL`;
  console.log('   [OK] idx_search_ext_cnk');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_vtm ON search_index_extended (vtm_code) WHERE vtm_code IS NOT NULL`;
  console.log('   [OK] idx_search_ext_vtm');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_vmp ON search_index_extended (vmp_code) WHERE vmp_code IS NOT NULL`;
  console.log('   [OK] idx_search_ext_vmp');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_amp ON search_index_extended (amp_code) WHERE amp_code IS NOT NULL`;
  console.log('   [OK] idx_search_ext_amp');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_atc ON search_index_extended (atc_code) WHERE atc_code IS NOT NULL`;
  console.log('   [OK] idx_search_ext_atc');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_company ON search_index_extended (company_actor_nr) WHERE company_actor_nr IS NOT NULL`;
  console.log('   [OK] idx_search_ext_company');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_vmp_group ON search_index_extended (vmp_group_code) WHERE vmp_group_code IS NOT NULL`;
  console.log('   [OK] idx_search_ext_vmp_group');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_entity_type ON search_index_extended (entity_type)`;
  console.log('   [OK] idx_search_ext_entity_type');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_end_date ON search_index_extended (end_date) WHERE end_date IS NOT NULL`;
  console.log('   [OK] idx_search_ext_end_date');

  // Extended filter indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_form ON search_index_extended (pharmaceutical_form_code) WHERE pharmaceutical_form_code IS NOT NULL`;
  console.log('   [OK] idx_search_ext_form');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_route ON search_index_extended (route_of_administration_code) WHERE route_of_administration_code IS NOT NULL`;
  console.log('   [OK] idx_search_ext_route');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_reimb_cat ON search_index_extended (reimbursement_category) WHERE reimbursement_category IS NOT NULL`;
  console.log('   [OK] idx_search_ext_reimb_cat');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_medicine_type ON search_index_extended (medicine_type) WHERE medicine_type IS NOT NULL`;
  console.log('   [OK] idx_search_ext_medicine_type');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_delivery_env ON search_index_extended (delivery_environment) WHERE delivery_environment IS NOT NULL`;
  console.log('   [OK] idx_search_ext_delivery_env');

  await sql`CREATE INDEX IF NOT EXISTS idx_search_ext_chapter_iv ON search_index_extended (chapter_iv_exists) WHERE chapter_iv_exists = TRUE`;
  console.log('   [OK] idx_search_ext_chapter_iv');

  // Step 5: Verify
  console.log('\n5. Verifying...');
  const countResult = await sql`SELECT COUNT(*) as count FROM search_index_extended`;
  console.log(`   Total rows: ${countResult[0].count}`);

  const sampleResult = await sql`
    SELECT entity_type, COUNT(*) as count
    FROM search_index_extended
    GROUP BY entity_type
    ORDER BY count DESC
  `;
  console.log('   By entity type:');
  sampleResult.forEach((r: any) => console.log(`     ${r.entity_type}: ${r.count}`));

  // Final size check
  const finalSize = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`;
  console.log(`\nFinal database size: ${finalSize[0].size}`);

  console.log('\n======================================');
  console.log('   Done!');
  console.log('======================================');

  process.exit(0);
}

main().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
