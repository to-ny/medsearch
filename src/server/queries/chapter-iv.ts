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
  const result = await sql`
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
            'id', v.id,
            'verseSeq', v.verse_seq,
            'verseNum', v.verse_num,
            'verseSeqParent', v.verse_seq_parent,
            'verseLevel', v.verse_level,
            'text', v.text,
            'requestType', v.request_type,
            'agreementTermQuantity', v.agreement_term_quantity,
            'agreementTermUnit', v.agreement_term_unit,
            'startDate', v.start_date
          ) ORDER BY v.verse_seq)
          FROM chapter_iv_verse v
          WHERE v.chapter_name = civ.chapter_name
            AND v.paragraph_name = civ.paragraph_name
        ),
        '[]'::json
      ) as verses
    FROM chapter_iv_paragraph civ
    WHERE civ.chapter_name = ${chapterName}
      AND civ.paragraph_name = ${paragraphName}
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Get linked products (DMPPs)
  const productsResult = await sql`
    SELECT DISTINCT
      d.code,
      d.delivery_environment,
      d.price,
      d.reimbursable
    FROM dmpp_chapter_iv dciv
    JOIN dmpp d ON d.code = dciv.dmpp_code AND d.delivery_environment = dciv.delivery_environment
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
