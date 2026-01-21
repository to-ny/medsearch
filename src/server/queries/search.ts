import 'server-only';

import { sql } from '@/server/db/client';
import type { EntityType, Language, MultilingualText } from '@/server/types/domain';
import type { SearchResultItem, SearchResponse, AppliedFilter, AvailableFilters } from '@/server/types/api';
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
  reimbursable?: boolean; // Filter AMPPs by reimbursable status
  blackTriangle?: boolean; // Filter AMPs by black triangle status
  // Phase B extended filters
  formCodes?: string[];   // Filter AMPs/AMPPs by pharmaceutical form codes (OR logic)
  routeCodes?: string[];  // Filter AMPs/AMPPs by route of administration codes (OR logic)
  reimbursementCategories?: string[]; // Filter AMPPs by reimbursement category (A, B, C, etc.)
  priceMin?: number;      // Filter AMPPs by minimum price
  priceMax?: number;      // Filter AMPPs by maximum price
  // Phase C extended filters
  chapterIV?: boolean;    // Filter by Chapter IV requirement
  deliveryEnvironment?: 'P' | 'H'; // Filter by delivery environment (P=Public, H=Hospital)
  medicineType?: string;  // Filter AMPs by medicine type (ALLOPATHIC, HOMEOPATHIC, etc.)
  atcLevel?: number;      // Filter ATC classifications by level (1-5)
}

/**
 * Fetch names for applied filters to display human-readable labels
 */
async function getAppliedFilterNames(
  filters: SearchFilters | undefined,
  lang: Language
): Promise<AppliedFilter[]> {
  if (!filters) return [];

  const appliedFilters: AppliedFilter[] = [];
  const queries: Promise<void>[] = [];

  if (filters.vtmCode) {
    queries.push(
      sql.query('SELECT name FROM vtm WHERE code = $1', [filters.vtmCode]).then((result) => {
        if (result.rows[0]) {
          appliedFilters.push({
            type: 'vtm',
            code: filters.vtmCode!,
            name: getLocalizedText(result.rows[0].name, lang),
          });
        }
      })
    );
  }

  if (filters.vmpCode) {
    queries.push(
      sql.query('SELECT name FROM vmp WHERE code = $1', [filters.vmpCode]).then((result) => {
        if (result.rows[0]) {
          appliedFilters.push({
            type: 'vmp',
            code: filters.vmpCode!,
            name: getLocalizedText(result.rows[0].name, lang),
          });
        }
      })
    );
  }

  if (filters.ampCode) {
    queries.push(
      sql.query('SELECT name FROM amp WHERE code = $1', [filters.ampCode]).then((result) => {
        if (result.rows[0]) {
          appliedFilters.push({
            type: 'amp',
            code: filters.ampCode!,
            name: getLocalizedText(result.rows[0].name, lang),
          });
        }
      })
    );
  }

  if (filters.atcCode) {
    queries.push(
      sql.query('SELECT description FROM atc_classification WHERE code = $1', [filters.atcCode]).then((result) => {
        if (result.rows[0]) {
          appliedFilters.push({
            type: 'atc',
            code: filters.atcCode!,
            name: result.rows[0].description,
          });
        }
      })
    );
  }

  if (filters.companyCode) {
    queries.push(
      sql.query('SELECT denomination FROM company WHERE actor_nr = $1', [filters.companyCode]).then((result) => {
        if (result.rows[0]) {
          appliedFilters.push({
            type: 'company',
            code: filters.companyCode!,
            name: result.rows[0].denomination,
          });
        }
      })
    );
  }

  if (filters.vmpGroupCode) {
    queries.push(
      sql.query('SELECT name FROM vmp_group WHERE code = $1', [filters.vmpGroupCode]).then((result) => {
        if (result.rows[0]) {
          appliedFilters.push({
            type: 'vmpGroup',
            code: filters.vmpGroupCode!,
            name: getLocalizedText(result.rows[0].name, lang),
          });
        }
      })
    );
  }

  if (filters.substanceCode) {
    queries.push(
      sql.query('SELECT name FROM substance WHERE code = $1', [filters.substanceCode]).then((result) => {
        if (result.rows[0]) {
          appliedFilters.push({
            type: 'substance',
            code: filters.substanceCode!,
            name: getLocalizedText(result.rows[0].name, lang),
          });
        }
      })
    );
  }

  await Promise.all(queries);
  return appliedFilters;
}

const MAX_FILTER_OPTIONS = 20; // Maximum options per filter
const MIN_FILTER_VALUES = 2;   // Minimum distinct values to show filter

/**
 * Compute available filter options from search results
 * Always computes from extended table when relevant entity types exist
 */
async function computeAvailableFilters(
  baseConditions: string[],
  params: unknown[],
  facetCounts: Record<EntityType, number>
): Promise<AvailableFilters | undefined> {
  const hasAmpOrAmpp = facetCounts.amp > 0 || facetCounts.ampp > 0;
  const hasAmpp = facetCounts.ampp > 0;

  if (!hasAmpOrAmpp) {
    return undefined;
  }

  // Build WHERE clause from conditions - always query extended table for filter options
  const whereClause = baseConditions.join(' AND ');

  const availableFilters: AvailableFilters = {};
  const queries: Promise<void>[] = [];

  // Pharmaceutical forms (AMP and AMPP)
  if (hasAmpOrAmpp) {
    queries.push(
      sql.query<{ code: string; name: MultilingualText; count: number }>(`
        SELECT pharmaceutical_form_code as code, pharmaceutical_form_name as name, COUNT(*)::int as count
        FROM search_index_extended
        WHERE ${whereClause}
          AND entity_type IN ('amp', 'ampp')
          AND pharmaceutical_form_code IS NOT NULL
        GROUP BY pharmaceutical_form_code, pharmaceutical_form_name
        ORDER BY count DESC
        LIMIT ${MAX_FILTER_OPTIONS}
      `, params).then((result) => {
        if (result.rows.length >= MIN_FILTER_VALUES) {
          availableFilters.forms = result.rows.map(r => ({
            code: r.code,
            name: r.name,
            count: r.count,
          }));
        }
      })
    );
  }

  // Routes of administration (AMP and AMPP)
  if (hasAmpOrAmpp) {
    queries.push(
      sql.query<{ code: string; name: MultilingualText; count: number }>(`
        SELECT route_of_administration_code as code, route_of_administration_name as name, COUNT(*)::int as count
        FROM search_index_extended
        WHERE ${whereClause}
          AND entity_type IN ('amp', 'ampp')
          AND route_of_administration_code IS NOT NULL
        GROUP BY route_of_administration_code, route_of_administration_name
        ORDER BY count DESC
        LIMIT ${MAX_FILTER_OPTIONS}
      `, params).then((result) => {
        if (result.rows.length >= MIN_FILTER_VALUES) {
          availableFilters.routes = result.rows.map(r => ({
            code: r.code,
            name: r.name,
            count: r.count,
          }));
        }
      })
    );
  }

  // Reimbursement categories (AMPP only)
  if (hasAmpp) {
    queries.push(
      sql.query<{ code: string; count: number }>(`
        SELECT reimbursement_category as code, COUNT(*)::int as count
        FROM search_index_extended
        WHERE ${whereClause}
          AND entity_type = 'ampp'
          AND reimbursement_category IS NOT NULL
        GROUP BY reimbursement_category
        ORDER BY count DESC
        LIMIT ${MAX_FILTER_OPTIONS}
      `, params).then((result) => {
        if (result.rows.length >= MIN_FILTER_VALUES) {
          availableFilters.reimbCategories = result.rows.map(r => ({
            code: r.code,
            count: r.count,
          }));
        }
      })
    );
  }

  // Medicine types (AMP only)
  if (facetCounts.amp > 0) {
    queries.push(
      sql.query<{ type: string; count: number }>(`
        SELECT medicine_type as type, COUNT(*)::int as count
        FROM search_index_extended
        WHERE ${whereClause}
          AND entity_type = 'amp'
          AND medicine_type IS NOT NULL
        GROUP BY medicine_type
        ORDER BY count DESC
        LIMIT ${MAX_FILTER_OPTIONS}
      `, params).then((result) => {
        if (result.rows.length >= MIN_FILTER_VALUES) {
          availableFilters.medicineTypes = result.rows.map(r => ({
            code: r.type,
            count: r.count,
          }));
        }
      })
    );
  }

  // Price range (AMPP only)
  if (hasAmpp) {
    queries.push(
      sql.query<{ min: number; max: number }>(`
        SELECT MIN(price)::numeric as min, MAX(price)::numeric as max
        FROM search_index_extended
        WHERE ${whereClause}
          AND entity_type = 'ampp'
          AND price IS NOT NULL
      `, params).then((result) => {
        if (result.rows[0] && result.rows[0].min !== null && result.rows[0].max !== null) {
          const min = parseFloat(result.rows[0].min.toString());
          const max = parseFloat(result.rows[0].max.toString());
          if (min !== max) {
            availableFilters.priceRange = { min, max };
          }
        }
      })
    );
  }

  await Promise.all(queries);

  // Only return if we have at least one filter
  const hasFilters = availableFilters.forms || availableFilters.routes ||
    availableFilters.reimbCategories || availableFilters.medicineTypes ||
    availableFilters.priceRange;

  return hasFilters ? availableFilters : undefined;
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
  const hasBasicFilters = filters && (
    filters.vtmCode || filters.vmpCode || filters.ampCode ||
    filters.atcCode || filters.companyCode || filters.vmpGroupCode ||
    filters.substanceCode ||
    filters.reimbursable !== undefined || filters.blackTriangle !== undefined
  );
  // Phase B & C extended filters require search_index_extended table
  const hasExtendedFilters = filters && (
    (filters.formCodes && filters.formCodes.length > 0) ||
    (filters.routeCodes && filters.routeCodes.length > 0) ||
    (filters.reimbursementCategories && filters.reimbursementCategories.length > 0) ||
    filters.priceMin !== undefined || filters.priceMax !== undefined ||
    filters.chapterIV === true || filters.deliveryEnvironment !== undefined ||
    filters.medicineType !== undefined
  );
  const hasFilters = hasBasicFilters || hasExtendedFilters;

  // Use extended table when extended filters are present
  const searchTable = hasExtendedFilters ? 'search_index_extended' : 'search_index';

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
    // For AMP: direct match on company_actor_nr
    // For AMPP: match via parent AMP's company_actor_nr
    baseConditions.push(`(company_actor_nr = $${paramIndex} OR (entity_type = 'ampp' AND amp_code IN (SELECT code FROM amp WHERE company_actor_nr = $${paramIndex})))`);
    baseParams.push(filters.companyCode);
    paramIndex++;
  }
  if (filters?.vmpGroupCode) {
    baseConditions.push(`vmp_group_code = $${paramIndex++}`);
    baseParams.push(filters.vmpGroupCode);
  }
  if (filters?.substanceCode) {
    // Filter AMPs by substance code via amp_ingredient join
    // Substances are linked to AMPs through the amp_ingredient table
    baseConditions.push(`(entity_type != 'amp' OR code IN (SELECT DISTINCT amp_code FROM amp_ingredient WHERE substance_code = $${paramIndex++}))`);
    baseParams.push(filters.substanceCode);
  }

  // Boolean filters (these apply to specific entity types)
  if (filters?.reimbursable === true) {
    // Only applies to AMPP entities
    baseConditions.push(`(entity_type != 'ampp' OR reimbursable = true)`);
  }
  if (filters?.blackTriangle === true) {
    // Only applies to AMP entities
    baseConditions.push(`(entity_type != 'amp' OR black_triangle = true)`);
  }

  // Phase B extended filters (only apply when using search_index_extended)
  if (filters?.formCodes && filters.formCodes.length > 0) {
    // Filter by pharmaceutical form - applies to AMP and AMPP entities
    baseConditions.push(`(entity_type NOT IN ('amp', 'ampp') OR pharmaceutical_form_code = ANY($${paramIndex++}))`);
    baseParams.push(filters.formCodes);
  }
  if (filters?.routeCodes && filters.routeCodes.length > 0) {
    // Filter by route of administration - applies to AMP and AMPP entities
    baseConditions.push(`(entity_type NOT IN ('amp', 'ampp') OR route_of_administration_code = ANY($${paramIndex++}))`);
    baseParams.push(filters.routeCodes);
  }
  if (filters?.reimbursementCategories && filters.reimbursementCategories.length > 0) {
    // Filter by reimbursement category - applies to AMPP entities
    baseConditions.push(`(entity_type != 'ampp' OR reimbursement_category = ANY($${paramIndex++}))`);
    baseParams.push(filters.reimbursementCategories);
  }
  if (filters?.priceMin !== undefined) {
    // Filter by minimum price - applies to AMPP entities
    baseConditions.push(`(entity_type != 'ampp' OR price >= $${paramIndex++})`);
    baseParams.push(filters.priceMin);
  }
  if (filters?.priceMax !== undefined) {
    // Filter by maximum price - applies to AMPP entities
    baseConditions.push(`(entity_type != 'ampp' OR price <= $${paramIndex++})`);
    baseParams.push(filters.priceMax);
  }

  // Phase C extended filters (only apply when using search_index_extended)
  if (filters?.chapterIV === true) {
    // Filter by Chapter IV requirement - applies to AMPP entities
    baseConditions.push(`(entity_type != 'ampp' OR chapter_iv_exists = true)`);
  }
  if (filters?.deliveryEnvironment === 'P') {
    // Filter by public delivery environment - applies to AMPP entities
    baseConditions.push(`(entity_type != 'ampp' OR has_public_env = true)`);
  } else if (filters?.deliveryEnvironment === 'H') {
    // Filter by hospital delivery environment - applies to AMPP entities
    baseConditions.push(`(entity_type != 'ampp' OR has_hospital_env = true)`);
  }
  if (filters?.medicineType) {
    // Filter by medicine type - applies to AMP entities
    baseConditions.push(`(entity_type != 'amp' OR medicine_type = $${paramIndex++})`);
    baseParams.push(filters.medicineType);
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

  // Fetch results, facet counts, and filter names in parallel
  // Results use fullWhereClause (with type filter)
  // Facets use baseWhereClause (without type filter) so all types are shown
  const [resultsQuery, facetsQuery, appliedFilters] = await Promise.all([
    sql.query(`
      SELECT entity_type, code, name, parent_code, parent_name,
             company_name, pack_info, price, reimbursable, cnk_code,
             product_count, black_triangle
      FROM ${searchTable}
      WHERE ${fullWhereClause}
      ORDER BY entity_type, code
      LIMIT $${paramIndex}
    `, [...fullParams, maxResultsToFetch]),
    sql.query<{ entity_type: EntityType; count: number }>(`
      SELECT entity_type, COUNT(*)::int as count
      FROM ${searchTable}
      WHERE ${baseWhereClause}
      GROUP BY entity_type
    `, baseParams),
    getAppliedFilterNames(filters, lang),
  ]);

  // Build facet counts
  const facetCounts: Record<EntityType, number> = {
    vtm: 0, vmp: 0, amp: 0, ampp: 0, company: 0, vmp_group: 0, substance: 0, atc: 0,
  };
  for (const row of facetsQuery.rows) {
    facetCounts[row.entity_type] = row.count;
  }

  // Compute available filters - always use extended table when AMP/AMPP results exist
  const availableFilters = await computeAvailableFilters(
    baseConditions,
    baseParams,
    facetCounts
  );

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
    appliedFilters: appliedFilters.length > 0 ? appliedFilters : undefined,
    availableFilters,
  };
}
