import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/server/db/client';
import { createAPIError } from '@/server/types/api';
import { isValidLanguage, type Language, type EntityType, type MultilingualText } from '@/server/types/domain';
import { getLocalizedText } from '@/server/utils/localization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface SearchSuggestion {
  entityType: EntityType;
  code: string;
  name: string;
  parentName?: string;
  cnkCode?: string;
}

interface RawSuggestion {
  entity_type: EntityType;
  code: string;
  name: MultilingualText;
  parent_name: MultilingualText | null;
  cnk_code: string | null;
  search_text: string;
}

/**
 * Calculate a simple relevance score for suggestions
 * Prioritizes prefix matches and exact matches
 */
function calculateSuggestionScore(
  result: RawSuggestion,
  query: string,
  lang: Language
): number {
  const normalizedQuery = query.toLowerCase().trim();
  const name = getLocalizedText(result.name, lang).toLowerCase();
  const searchText = result.search_text.toLowerCase();

  // Exact name match
  if (name === normalizedQuery) return 1.0;

  // Code exact match
  if (result.code.toLowerCase() === normalizedQuery) return 0.95;

  // CNK exact match
  if (result.cnk_code && result.cnk_code === normalizedQuery) return 0.95;

  // Name prefix match
  if (name.startsWith(normalizedQuery)) {
    const bonus = (normalizedQuery.length / name.length) * 0.1;
    return 0.8 + bonus;
  }

  // Word prefix match (any word starts with query)
  const words = name.split(/\s+/);
  if (words.some((word) => word.startsWith(normalizedQuery))) {
    return 0.7;
  }

  // Search text contains query (trigram match)
  if (searchText.includes(normalizedQuery)) {
    return 0.5;
  }

  return 0.3;
}

/**
 * Entity type priority for sorting suggestions
 */
const TYPE_PRIORITY: Record<EntityType, number> = {
  vtm: 1,
  vmp: 2,
  amp: 3,
  ampp: 4,
  company: 5,
  vmp_group: 6,
  substance: 7,
  atc: 8,
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 5), 10) : 5;
    const langParam = searchParams.get('lang');
    const lang: Language = isValidLanguage(langParam) ? langParam : 'en';

    // Require at least 2 characters
    if (query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const normalizedQuery = query.trim().toLowerCase();
    const searchPattern = `%${normalizedQuery}%`;
    const prefixPattern = `${normalizedQuery}%`;

    // Fast query using pg_trgm index - fetch more than needed for scoring
    const fetchLimit = limit * 4;

    const result = await sql.query<RawSuggestion>(
      `
      SELECT entity_type, code, name, parent_name, cnk_code, search_text
      FROM search_index
      WHERE (end_date IS NULL OR end_date > CURRENT_DATE)
        AND (search_text ILIKE $1 OR code ILIKE $2 OR cnk_code = $3)
      ORDER BY
        CASE WHEN code ILIKE $2 THEN 0 ELSE 1 END,
        CASE WHEN search_text ILIKE $4 THEN 0 ELSE 1 END,
        entity_type
      LIMIT $5
      `,
      [searchPattern, prefixPattern, query.trim(), prefixPattern, fetchLimit]
    );

    // Score and sort results
    const scored = result.rows.map((row) => ({
      row,
      score: calculateSuggestionScore(row, query, lang),
    }));

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return TYPE_PRIORITY[a.row.entity_type] - TYPE_PRIORITY[b.row.entity_type];
    });

    // Map to response format
    const suggestions: SearchSuggestion[] = scored.slice(0, limit).map(({ row }) => ({
      entityType: row.entity_type,
      code: row.code,
      name: getLocalizedText(row.name, lang),
      ...(row.parent_name && { parentName: getLocalizedText(row.parent_name, lang) }),
      ...(row.cnk_code && { cnkCode: row.cnk_code }),
    }));

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Suggestion error:', error);
    return NextResponse.json(
      createAPIError('SERVER_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
