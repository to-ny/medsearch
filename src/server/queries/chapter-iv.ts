import 'server-only';

import { sql } from '@/server/db/client';
import type { ChapterIVParagraphWithRelations, ChapterIVVerse } from '@/server/types/entities';
import type { AMPPSummary } from '@/server/types/summaries';

/**
 * Get a Chapter IV Paragraph by chapter and paragraph name with all details
 */
export async function getChapterIVParagraphWithRelations(
  chapterName: string,
  paragraphName: string
): Promise<ChapterIVParagraphWithRelations | null> {
  // Build legal_reference_path for lookup: "IV/{paragraphName}"
  const legalRefPath = `${chapterName}/${paragraphName}`;

  const result = await sql`
    WITH RECURSIVE
    -- First compute hierarchy levels recursively
    text_hierarchy AS (
      -- Base case: top-level texts (no parent)
      SELECT key, parent_text_key, 1 as verse_level
      FROM legal_text
      WHERE legal_reference_path = ${legalRefPath}
        AND parent_text_key IS NULL
        AND (end_date IS NULL OR end_date > CURRENT_DATE)
      UNION ALL
      -- Recursive case: texts with parents
      SELECT lt.key, lt.parent_text_key, h.verse_level + 1
      FROM legal_text lt
      JOIN text_hierarchy h ON lt.parent_text_key = h.key
      WHERE lt.legal_reference_path = ${legalRefPath}
        AND (lt.end_date IS NULL OR lt.end_date > CURRENT_DATE)
    ),
    numbered_texts AS (
      -- Assign row numbers to legal_text entries for verse sequencing
      SELECT
        lt.key,
        lt.parent_text_key,
        lt.content,
        lt.sequence_nr,
        lt.start_date,
        th.verse_level,
        ROW_NUMBER() OVER (ORDER BY lt.sequence_nr, lt.key) as verse_seq
      FROM legal_text lt
      JOIN text_hierarchy th ON th.key = lt.key
      WHERE lt.legal_reference_path = ${legalRefPath}
        AND (lt.end_date IS NULL OR lt.end_date > CURRENT_DATE)
    ),
    texts_with_parents AS (
      -- Join to compute parent verse_seq for hierarchy
      SELECT
        t.key,
        t.content,
        t.sequence_nr,
        t.start_date,
        t.verse_seq,
        t.verse_level,
        COALESCE(p.verse_seq, 0) as verse_seq_parent
      FROM numbered_texts t
      LEFT JOIN numbered_texts p ON p.key = t.parent_text_key
    )
    SELECT
      civ.chapter_name,
      civ.paragraph_name,
      civ.key_string,
      civ.process_type,
      civ.process_type_overrule,
      civ.paragraph_version,
      civ.modification_status,
      civ.start_date,
      civ.end_date,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', v.verse_seq,
            'verseSeq', v.verse_seq,
            'verseNum', v.verse_seq,
            'verseSeqParent', v.verse_seq_parent,
            'verseLevel', v.verse_level,
            'text', v.content,
            'requestType', NULL,
            'agreementTermQuantity', NULL,
            'agreementTermUnit', NULL,
            'startDate', v.start_date
          ) ORDER BY v.verse_seq)
          FROM texts_with_parents v
        ),
        '[]'::json
      ) as verses
    FROM chapter_iv_paragraph civ
    WHERE civ.chapter_name = ${chapterName}
      AND civ.paragraph_name = ${paragraphName}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get linked packages (AMPPs) through dmpp_chapter_iv -> dmpp -> ampp
  // Using distinct AMPPs since one AMPP can have multiple DMPPs (different delivery environments)
  const productsResult = await sql`
    SELECT DISTINCT ON (ampp.cti_extended)
      ampp.cti_extended as code,
      ampp.prescription_name as name,
      ampp.amp_code,
      amp.name as amp_name,
      ampp.pack_display_value,
      ampp.ex_factory_price,
      (
        SELECT d2.code
        FROM dmpp d2
        WHERE d2.ampp_cti_extended = ampp.cti_extended
          AND d2.delivery_environment = 'P'
          AND (d2.end_date IS NULL OR d2.end_date > CURRENT_DATE)
        ORDER BY d2.start_date DESC
        LIMIT 1
      ) as cnk_code,
      COALESCE(
        (
          SELECT bool_or(d2.reimbursable)
          FROM dmpp d2
          WHERE d2.ampp_cti_extended = ampp.cti_extended
            AND (d2.end_date IS NULL OR d2.end_date > CURRENT_DATE)
        ),
        false
      ) as reimbursable
    FROM dmpp_chapter_iv dciv
    JOIN dmpp d ON d.code = dciv.dmpp_code AND d.delivery_environment = dciv.delivery_environment
    JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
    JOIN amp ON amp.code = ampp.amp_code
    WHERE dciv.chapter_name = ${chapterName}
      AND dciv.paragraph_name = ${paragraphName}
      AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
      AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
    ORDER BY ampp.cti_extended
    LIMIT 20
  `;

  // Get total count of linked AMPPs (without LIMIT)
  const countResult = await sql`
    SELECT COUNT(DISTINCT ampp.cti_extended)::int as count
    FROM dmpp_chapter_iv dciv
    JOIN dmpp d ON d.code = dciv.dmpp_code AND d.delivery_environment = dciv.delivery_environment
    JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
    WHERE dciv.chapter_name = ${chapterName}
      AND dciv.paragraph_name = ${paragraphName}
      AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
      AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
  `;

  const linkedProducts: AMPPSummary[] = productsResult.rows.map((p) => ({
    entityType: 'ampp' as const,
    code: p.code,
    name: p.name,
    ampCode: p.amp_code,
    ampName: p.amp_name,
    packDisplayValue: p.pack_display_value,
    exFactoryPrice: p.ex_factory_price,
    cnkCode: p.cnk_code,
    reimbursable: p.reimbursable,
  }));

  return {
    chapterName: row.chapter_name,
    paragraphName: row.paragraph_name,
    keyString: row.key_string,
    processType: row.process_type,
    processTypeOverrule: row.process_type_overrule,
    paragraphVersion: row.paragraph_version,
    modificationStatus: row.modification_status,
    startDate: row.start_date,
    endDate: row.end_date,
    verses: row.verses as ChapterIVVerse[],
    linkedProducts,
    linkedProductsCount: countResult.rows[0]?.count ?? 0,
  };
}
