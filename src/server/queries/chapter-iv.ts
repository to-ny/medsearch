import 'server-only';

import { sql } from '@/server/db/client';
import type { ChapterIVParagraphWithRelations, ChapterIVVerse } from '@/server/types/entities';
import type { DMPPSummary } from '@/server/types/summaries';

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

  // Get linked products (DMPPs) with AMPP info for linking
  const productsResult = await sql`
    SELECT DISTINCT
      d.code,
      d.delivery_environment,
      d.price,
      d.reimbursable,
      d.ampp_cti_extended,
      ampp.prescription_name as ampp_name
    FROM dmpp_chapter_iv dciv
    JOIN dmpp d ON d.code = dciv.dmpp_code AND d.delivery_environment = dciv.delivery_environment
    LEFT JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
    WHERE dciv.chapter_name = ${chapterName}
      AND dciv.paragraph_name = ${paragraphName}
      AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
    ORDER BY d.code
    LIMIT 100
  `;

  const linkedProducts: DMPPSummary[] = productsResult.rows.map((p) => ({
    code: p.code,
    deliveryEnvironment: p.delivery_environment,
    price: p.price,
    reimbursable: p.reimbursable,
    amppCtiExtended: p.ampp_cti_extended,
    name: p.ampp_name,
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
  };
}
