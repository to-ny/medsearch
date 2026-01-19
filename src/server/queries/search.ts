import 'server-only';

import { sql } from '@/server/db/client';
import type { EntityType, Language } from '@/server/types/domain';
import type { SearchResultItem, SearchResponse } from '@/server/types/api';
import { getLocalizedText } from '@/server/utils/localization';

const MAX_SEARCH_RESULTS = 2000; // Maximum results we can serve for pagination

interface RawSearchResult {
  entityType: EntityType;
  code: string;
  name: Record<string, string>;
  parentName?: Record<string, string> | null;
  parentCode?: string | null;
  companyName?: string | null;
  packInfo?: string | null;
  price?: number | null;
  reimbursable?: boolean;
  reimbursementCategory?: string | null;
  cnkCode?: string | null;
  productCount?: number;
  blackTriangle?: boolean;
}

/**
 * Calculate match score for a result
 */
function calculateScore(
  result: RawSearchResult,
  query: string,
  lang: Language
): { score: number; matchedField: 'name' | 'code' | 'cnk' | 'company' | 'substance' } {
  const normalizedQuery = query.toLowerCase().trim();
  const name = getLocalizedText(result.name, lang).toLowerCase();

  // Exact name match
  if (name === normalizedQuery) {
    return { score: 1.0, matchedField: 'name' };
  }

  // Code exact match
  if (result.code.toLowerCase() === normalizedQuery) {
    return { score: 0.95, matchedField: 'code' };
  }

  // CNK exact match
  if (result.cnkCode && result.cnkCode === normalizedQuery) {
    return { score: 0.95, matchedField: 'cnk' };
  }

  // Name prefix match
  if (name.startsWith(normalizedQuery)) {
    const bonus = (normalizedQuery.length / name.length) * 0.1;
    return { score: 0.8 + bonus, matchedField: 'name' };
  }

  // Word prefix match
  const words = name.split(/\s+/);
  if (words.some((word) => word.startsWith(normalizedQuery))) {
    const bonus = (normalizedQuery.length / name.length) * 0.1;
    return { score: 0.6 + bonus, matchedField: 'name' };
  }

  // Contains match
  if (name.includes(normalizedQuery)) {
    return { score: 0.4, matchedField: 'name' };
  }

  // Company name match
  if (result.companyName?.toLowerCase().includes(normalizedQuery)) {
    return { score: 0.5, matchedField: 'company' };
  }

  // Fallback
  return { score: 0.2, matchedField: 'name' };
}

/**
 * Entity type priority for sorting
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

/**
 * Relationship filters for search
 */
export interface SearchFilters {
  vtmCode?: string;       // Filter VMPs by VTM code, or AMPs by VTM code (via VMP)
  vmpCode?: string;       // Filter AMPs by VMP code
  ampCode?: string;       // Filter AMPPs by AMP code
  atcCode?: string;       // Filter AMPPs by ATC code
  companyCode?: string;   // Filter AMPs by company actor_nr
  vmpGroupCode?: string;  // Filter VMPs by VMP Group code
  substanceCode?: string; // Filter AMPs by substance code (via amp_ingredient)
}

/**
 * Execute search across all entity types using unified search_index table
 */
export async function executeSearch(
  query: string,
  lang: Language = 'en',
  types?: EntityType[],
  limit = 20,
  offset = 0,
  filters?: SearchFilters
): Promise<SearchResponse> {
  const normalizedQuery = query.trim().toLowerCase();

  // Minimum query length validation (skip for filter-only queries)
  const hasTextQuery = normalizedQuery.length > 0;
  const hasFilters = filters && (
    filters.vtmCode || filters.vmpCode || filters.ampCode ||
    filters.atcCode || filters.companyCode || filters.vmpGroupCode
  );

  if (hasTextQuery && normalizedQuery.length < 3) {
    return {
      query,
      totalCount: 0,
      results: [],
      facets: { byType: { vtm: 0, vmp: 0, amp: 0, ampp: 0, company: 0, vmp_group: 0, substance: 0, atc: 0 } },
      pagination: { limit, offset, hasMore: false },
    };
  }

  // If no text query and no filters, return empty results
  if (!hasTextQuery && !hasFilters) {
    return {
      query,
      totalCount: 0,
      results: [],
      facets: { byType: { vtm: 0, vmp: 0, amp: 0, ampp: 0, company: 0, vmp_group: 0, substance: 0, atc: 0 } },
      pagination: { limit, offset, hasMore: false },
    };
  }

  // Detect special query types
  const isCnkQuery = /^\d{7}$/.test(query.trim());
  const isAtcQuery = /^[A-Z]\d{2}[A-Z]{0,2}\d{0,2}$/i.test(query.trim());

  const searchPattern = `%${normalizedQuery}%`;
  const prefixPattern = `${normalizedQuery}%`;

  // Build WHERE conditions - separate base conditions from type filter
  // Base conditions are used for facets (to show all types)
  // Full conditions (with type filter) are used for results
  const baseConditions: string[] = ['(end_date IS NULL OR end_date > CURRENT_DATE)'];
  const baseParams: unknown[] = [];
  let paramIndex = 1;

  // Text search condition
  if (hasTextQuery) {
    if (isCnkQuery) {
      baseConditions.push(`cnk_code = $${paramIndex++}`);
      baseParams.push(query.trim());
    } else if (isAtcQuery) {
      baseConditions.push(`(code ILIKE $${paramIndex++} AND entity_type = 'atc')`);
      baseParams.push(prefixPattern);
    } else {
      baseConditions.push(`(search_text ILIKE $${paramIndex} OR code ILIKE $${paramIndex + 1})`);
      baseParams.push(searchPattern, prefixPattern);
      paramIndex += 2;
    }
  }

  // Relationship filters
  if (filters?.vtmCode) {
    baseConditions.push(`vtm_code = $${paramIndex++}`);
    baseParams.push(filters.vtmCode);
  }
  if (filters?.vmpCode) {
    baseConditions.push(`vmp_code = $${paramIndex++}`);
    baseParams.push(filters.vmpCode);
  }
  if (filters?.ampCode) {
    baseConditions.push(`amp_code = $${paramIndex++}`);
    baseParams.push(filters.ampCode);
  }
  if (filters?.atcCode) {
    baseConditions.push(`atc_code = $${paramIndex++}`);
    baseParams.push(filters.atcCode);
  }
  if (filters?.companyCode) {
    baseConditions.push(`company_actor_nr = $${paramIndex++}`);
    baseParams.push(filters.companyCode);
  }
  if (filters?.vmpGroupCode) {
    baseConditions.push(`vmp_group_code = $${paramIndex++}`);
    baseParams.push(filters.vmpGroupCode);
  }

  // Base WHERE clause (without type filter) - for facets
  const baseWhereClause = baseConditions.join(' AND ');

  // Full conditions include entity type filter - for results
  const fullConditions = [...baseConditions];
  const fullParams = [...baseParams];
  if (types && types.length > 0) {
    fullConditions.push(`entity_type = ANY($${paramIndex++})`);
    fullParams.push(types);
  }
  const fullWhereClause = fullConditions.join(' AND ');

  // Calculate how many results we need to fetch for the requested page
  // We need at least offset + limit results to paginate correctly
  // Add a buffer to handle scoring reordering, cap at reasonable maximum
  const maxResultsToFetch = Math.min(offset + limit + 100, MAX_SEARCH_RESULTS);

  // Fetch results and facet counts in parallel
  // Results use fullWhereClause (with type filter)
  // Facets use baseWhereClause (without type filter) so all types are shown
  const [resultsQuery, facetsQuery] = await Promise.all([
    sql.query(`
      SELECT entity_type, code, name, parent_code, parent_name,
             company_name, pack_info, price, reimbursable, cnk_code,
             product_count, black_triangle
      FROM search_index
      WHERE ${fullWhereClause}
      ORDER BY entity_type, code
      LIMIT $${paramIndex}
    `, [...fullParams, maxResultsToFetch]),
    sql.query(`
      SELECT entity_type, COUNT(*)::int as count
      FROM search_index
      WHERE ${baseWhereClause}
      GROUP BY entity_type
    `, baseParams),
  ]);

  // Build facet counts
  const facetCounts: Record<EntityType, number> = {
    vtm: 0, vmp: 0, amp: 0, ampp: 0, company: 0, vmp_group: 0, substance: 0, atc: 0,
  };
  for (const row of facetsQuery.rows) {
    facetCounts[row.entity_type as EntityType] = row.count;
  }

  // Convert to RawSearchResult and score
  const allResults: RawSearchResult[] = resultsQuery.rows.map(r => ({
    entityType: r.entity_type as EntityType,
    code: r.code,
    name: r.name,
    parentName: r.parent_name,
    parentCode: r.parent_code,
    companyName: r.company_name,
    packInfo: r.pack_info,
    price: r.price,
    reimbursable: r.reimbursable,
    cnkCode: r.cnk_code,
    productCount: r.product_count,
    blackTriangle: r.black_triangle,
  }));

  // Score and sort (keep existing scoring logic)
  const scoredResults = allResults.map((result) => {
    const { score, matchedField } = calculateScore(result, query, lang);
    return { ...result, matchScore: score, matchedField };
  });

  scoredResults.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (TYPE_PRIORITY[a.entityType] !== TYPE_PRIORITY[b.entityType]) {
      return TYPE_PRIORITY[a.entityType] - TYPE_PRIORITY[b.entityType];
    }
    const nameA = getLocalizedText(a.name, lang);
    const nameB = getLocalizedText(b.name, lang);
    return nameA.localeCompare(nameB);
  });

  // Paginate
  // Calculate total from facets, but cap at maximum we can serve
  // to prevent showing pagination for pages we can't actually fetch
  const facetTotal = types
    ? types.reduce((sum, type) => sum + (facetCounts[type] || 0), 0)
    : Object.values(facetCounts).reduce((sum, count) => sum + count, 0);

  const totalCount = Math.min(facetTotal, MAX_SEARCH_RESULTS);

  const paginatedResults = scoredResults.slice(offset, offset + limit);

  const results: SearchResultItem[] = paginatedResults.map((r) => ({
    entityType: r.entityType,
    code: r.code,
    name: r.name,
    parentName: r.parentName || undefined,
    parentCode: r.parentCode || undefined,
    companyName: r.companyName || undefined,
    packInfo: r.packInfo || undefined,
    price: r.price ?? undefined,
    reimbursable: r.reimbursable ?? undefined,
    reimbursementCategory: r.reimbursementCategory ?? undefined,
    cnkCode: r.cnkCode || undefined,
    productCount: r.productCount ?? undefined,
    blackTriangle: r.blackTriangle ?? undefined,
    matchedField: r.matchedField,
    matchScore: r.matchScore,
  }));

  return {
    query,
    totalCount,
    results,
    facets: { byType: facetCounts },
    pagination: { limit, offset, hasMore: offset + limit < totalCount },
  };
}
