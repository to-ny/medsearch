import 'server-only';

import { sql } from '@/server/db/client';
import type { EntityType, Language } from '@/server/types/domain';
import type { SearchResultItem, SearchResponse } from '@/server/types/api';
import { getLocalizedText } from '@/server/utils/localization';

const SEARCH_LIMIT_PER_TABLE = 50;

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
}

/**
 * Execute search across all entity types
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
  const searchPattern = `%${normalizedQuery}%`;
  const prefixPattern = `${normalizedQuery}%`;

  // Check if we have a meaningful text query
  const hasTextQuery = normalizedQuery.length > 0;

  // Detect special query types
  const isCnkQuery = /^\d{7}$/.test(query.trim());
  const isAtcQuery = /^[A-Z]\d{2}[A-Z]{0,2}\d{0,2}$/i.test(query.trim());

  // Determine which entity types are relevant for the current filters
  // When relationship filters are applied without a text query, only certain types make sense
  const getRelevantTypes = (): Set<EntityType> | null => {
    if (hasTextQuery) return null; // All types are relevant when there's a text query

    const relevantTypes = new Set<EntityType>();
    if (filters?.vtmCode) {
      relevantTypes.add('vmp');  // VMPs directly related to VTM
      relevantTypes.add('amp');  // AMPs related to VTM via VMP
    }
    if (filters?.vmpCode) relevantTypes.add('amp');
    if (filters?.ampCode) relevantTypes.add('ampp');
    if (filters?.atcCode) relevantTypes.add('ampp');
    if (filters?.companyCode) relevantTypes.add('amp');
    if (filters?.vmpGroupCode) relevantTypes.add('vmp');

    return relevantTypes.size > 0 ? relevantTypes : null;
  };

  const relevantTypes = getRelevantTypes();
  const isTypeRelevant = (type: EntityType) => !relevantTypes || relevantTypes.has(type);

  // Determine if we should use DB-level pagination for relationship filters
  // Only use DB pagination when a single entity type is selected
  // For multiple types, pagination at DB level doesn't work because each query applies
  // offset independently (e.g., VMP offset 80 = 0, AMP offset 80 = 0 even though total > 80)
  const hasRelationshipFilter = filters && (
    filters.vtmCode || filters.vmpCode || filters.ampCode ||
    filters.atcCode || filters.companyCode || filters.vmpGroupCode
  );
  const useDbPagination = hasRelationshipFilter && types && types.length === 1;
  // When not using DB pagination, fetch up to this many results per type
  const maxResultsPerType = useDbPagination ? limit : Math.max(SEARCH_LIMIT_PER_TABLE, limit + offset);

  const allResults: RawSearchResult[] = [];
  const facetCounts: Record<EntityType, number> = {
    vtm: 0,
    vmp: 0,
    amp: 0,
    ampp: 0,
    company: 0,
    vmp_group: 0,
    substance: 0,
    atc: 0,
  };

  // Run all searches in parallel
  const searchPromises: Promise<void>[] = [];

  // Always run count queries for accurate facets, but only fetch results for requested types
  const shouldFetchResults = (type: EntityType) => !types || types.includes(type);

  // VTM search - skip if not relevant (e.g., when filtering by relationship without text query)
  if (isTypeRelevant('vtm')) {
    searchPromises.push(
      (async () => {
        const result = await sql`
          SELECT DISTINCT ON (code)
            'vtm' as entity_type,
            code,
            name,
            NULL as parent_name,
            NULL as parent_code,
            NULL as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM vtm
          WHERE (
            name->>'en' ILIKE ${searchPattern}
            OR name->>'nl' ILIKE ${searchPattern}
            OR name->>'fr' ILIKE ${searchPattern}
            OR name->>'de' ILIKE ${searchPattern}
            OR code ILIKE ${prefixPattern}
          )
          AND (end_date IS NULL OR end_date > CURRENT_DATE)
          ORDER BY code
          LIMIT ${SEARCH_LIMIT_PER_TABLE}
        `;
        facetCounts.vtm = result.rows.length;
        if (shouldFetchResults('vtm')) {
          result.rows.forEach((r) => {
            allResults.push({
              entityType: 'vtm',
              code: r.code,
              name: r.name,
            });
          });
        }
      })()
    );
  }

  // VMP search - skip if not relevant (unless has its own filter)
  if (isTypeRelevant('vmp')) {
    searchPromises.push(
      (async () => {
        // Support filtering by VTM code or VMP Group code
        const vtmFilter = filters?.vtmCode;
        const vmpGroupFilter = filters?.vmpGroupCode;

        let result;
        let totalCount: number | null = null;

        if (vtmFilter) {
        // Get accurate count first
        const countResult = await sql`
          SELECT COUNT(DISTINCT v.code)::int as count
          FROM vmp v
          WHERE v.vtm_code = ${vtmFilter}
            AND (v.end_date IS NULL OR v.end_date > CURRENT_DATE)
        `;
        totalCount = countResult.rows[0]?.count || 0;

        // Only apply offset when single type is selected (DB-level pagination)
        const queryOffset = useDbPagination ? offset : 0;
        result = await sql`
          SELECT DISTINCT ON (v.code)
            'vmp' as entity_type,
            v.code,
            v.name,
            vtm.name as parent_name,
            v.vtm_code as parent_code,
            NULL as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM vmp v
          LEFT JOIN vtm ON vtm.code = v.vtm_code
          WHERE v.vtm_code = ${vtmFilter}
            AND (v.end_date IS NULL OR v.end_date > CURRENT_DATE)
          ORDER BY v.code
          LIMIT ${maxResultsPerType} OFFSET ${queryOffset}
        `;
      } else if (vmpGroupFilter) {
        // Get accurate count first
        const countResult = await sql`
          SELECT COUNT(DISTINCT v.code)::int as count
          FROM vmp v
          WHERE v.vmp_group_code = ${vmpGroupFilter}
            AND (v.end_date IS NULL OR v.end_date > CURRENT_DATE)
        `;
        totalCount = countResult.rows[0]?.count || 0;

        // Only apply offset when single type is selected (DB-level pagination)
        const queryOffset = useDbPagination ? offset : 0;
        result = await sql`
          SELECT DISTINCT ON (v.code)
            'vmp' as entity_type,
            v.code,
            v.name,
            vtm.name as parent_name,
            v.vtm_code as parent_code,
            NULL as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM vmp v
          LEFT JOIN vtm ON vtm.code = v.vtm_code
          WHERE v.vmp_group_code = ${vmpGroupFilter}
            AND (v.end_date IS NULL OR v.end_date > CURRENT_DATE)
          ORDER BY v.code
          LIMIT ${maxResultsPerType} OFFSET ${queryOffset}
        `;
      } else {
        result = await sql`
          SELECT DISTINCT ON (v.code)
            'vmp' as entity_type,
            v.code,
            v.name,
            vtm.name as parent_name,
            v.vtm_code as parent_code,
            NULL as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM vmp v
          LEFT JOIN vtm ON vtm.code = v.vtm_code
          WHERE (
            v.name->>'en' ILIKE ${searchPattern}
            OR v.name->>'nl' ILIKE ${searchPattern}
            OR v.name->>'fr' ILIKE ${searchPattern}
            OR v.name->>'de' ILIKE ${searchPattern}
            OR v.abbreviated_name->>'en' ILIKE ${searchPattern}
            OR v.abbreviated_name->>'nl' ILIKE ${searchPattern}
            OR v.code ILIKE ${prefixPattern}
          )
          AND (v.end_date IS NULL OR v.end_date > CURRENT_DATE)
          ORDER BY v.code
          LIMIT ${SEARCH_LIMIT_PER_TABLE}
        `;
      }
        // Use accurate count from COUNT query if available, otherwise use rows.length
        facetCounts.vmp = totalCount !== null ? totalCount : result.rows.length;
        if (shouldFetchResults('vmp')) {
          result.rows.forEach((r) => {
            allResults.push({
              entityType: 'vmp',
              code: r.code,
              name: r.name,
              parentName: r.parent_name,
              parentCode: r.parent_code,
            });
          });
        }
      })()
    );
  }

  // AMP search - skip if not relevant (unless has its own filter)
  if (isTypeRelevant('amp')) {
    searchPromises.push(
      (async () => {
        // Support filtering by VMP code, company code, or VTM code (via VMP)
        const vmpFilter = filters?.vmpCode;
        const companyFilter = filters?.companyCode;
        const vtmFilter = filters?.vtmCode;

      let result;
      let totalCount: number | null = null;

      if (vtmFilter) {
        // Get accurate count first
        const countResult = await sql`
          SELECT COUNT(DISTINCT a.code)::int as count
          FROM amp a
          JOIN vmp v ON v.code = a.vmp_code
          WHERE v.vtm_code = ${vtmFilter}
            AND (a.end_date IS NULL OR a.end_date > CURRENT_DATE)
        `;
        totalCount = countResult.rows[0]?.count || 0;

        // Only apply offset when single type is selected (DB-level pagination)
        const queryOffset = useDbPagination ? offset : 0;
        // Filter AMPs by VTM code (through VMP relationship) with pagination
        result = await sql`
          SELECT DISTINCT ON (a.code)
            'amp' as entity_type,
            a.code,
            a.name,
            v.name as parent_name,
            a.vmp_code as parent_code,
            c.denomination as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            a.black_triangle
          FROM amp a
          JOIN vmp v ON v.code = a.vmp_code
          LEFT JOIN company c ON c.actor_nr = a.company_actor_nr
          WHERE v.vtm_code = ${vtmFilter}
            AND (a.end_date IS NULL OR a.end_date > CURRENT_DATE)
          ORDER BY a.code
          LIMIT ${maxResultsPerType} OFFSET ${queryOffset}
        `;
      } else if (vmpFilter) {
        // Get accurate count first
        const countResult = await sql`
          SELECT COUNT(DISTINCT a.code)::int as count
          FROM amp a
          WHERE a.vmp_code = ${vmpFilter}
            AND (a.end_date IS NULL OR a.end_date > CURRENT_DATE)
        `;
        totalCount = countResult.rows[0]?.count || 0;

        // Only apply offset when single type is selected (DB-level pagination)
        const queryOffset = useDbPagination ? offset : 0;
        result = await sql`
          SELECT DISTINCT ON (a.code)
            'amp' as entity_type,
            a.code,
            a.name,
            v.name as parent_name,
            a.vmp_code as parent_code,
            c.denomination as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            a.black_triangle
          FROM amp a
          LEFT JOIN vmp v ON v.code = a.vmp_code
          LEFT JOIN company c ON c.actor_nr = a.company_actor_nr
          WHERE a.vmp_code = ${vmpFilter}
            AND (a.end_date IS NULL OR a.end_date > CURRENT_DATE)
          ORDER BY a.code
          LIMIT ${maxResultsPerType} OFFSET ${queryOffset}
        `;
      } else if (companyFilter) {
        // Get accurate count first
        const countResult = await sql`
          SELECT COUNT(DISTINCT a.code)::int as count
          FROM amp a
          WHERE a.company_actor_nr = ${companyFilter}
            AND (a.end_date IS NULL OR a.end_date > CURRENT_DATE)
        `;
        totalCount = countResult.rows[0]?.count || 0;

        // Only apply offset when single type is selected (DB-level pagination)
        const queryOffset = useDbPagination ? offset : 0;
        result = await sql`
          SELECT DISTINCT ON (a.code)
            'amp' as entity_type,
            a.code,
            a.name,
            v.name as parent_name,
            a.vmp_code as parent_code,
            c.denomination as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            a.black_triangle
          FROM amp a
          LEFT JOIN vmp v ON v.code = a.vmp_code
          LEFT JOIN company c ON c.actor_nr = a.company_actor_nr
          WHERE a.company_actor_nr = ${companyFilter}
            AND (a.end_date IS NULL OR a.end_date > CURRENT_DATE)
          ORDER BY a.code
          LIMIT ${maxResultsPerType} OFFSET ${queryOffset}
        `;
      } else {
        result = await sql`
          SELECT DISTINCT ON (a.code)
            'amp' as entity_type,
            a.code,
            a.name,
            v.name as parent_name,
            a.vmp_code as parent_code,
            c.denomination as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            a.black_triangle
          FROM amp a
          LEFT JOIN vmp v ON v.code = a.vmp_code
          LEFT JOIN company c ON c.actor_nr = a.company_actor_nr
          WHERE (
            a.name->>'en' ILIKE ${searchPattern}
            OR a.name->>'nl' ILIKE ${searchPattern}
            OR a.name->>'fr' ILIKE ${searchPattern}
            OR a.name->>'de' ILIKE ${searchPattern}
            OR a.abbreviated_name->>'en' ILIKE ${searchPattern}
            OR a.official_name ILIKE ${searchPattern}
            OR a.code ILIKE ${prefixPattern}
          )
          AND (a.end_date IS NULL OR a.end_date > CURRENT_DATE)
          ORDER BY a.code
          LIMIT ${SEARCH_LIMIT_PER_TABLE}
        `;
      }
        // Use accurate count from COUNT query if available, otherwise use rows.length
        facetCounts.amp = totalCount !== null ? totalCount : result.rows.length;
        if (shouldFetchResults('amp')) {
          result.rows.forEach((r) => {
            allResults.push({
              entityType: 'amp',
              code: r.code,
              name: r.name,
              parentName: r.parent_name,
              parentCode: r.parent_code,
              companyName: r.company_name,
              blackTriangle: r.black_triangle,
            });
          });
        }
      })()
    );
  }

  // AMPP search (including CNK codes) - skip if not relevant (unless has its own filter)
  if (isTypeRelevant('ampp')) {
    searchPromises.push(
      (async () => {
        // Support filtering by AMP code or ATC code
        const ampFilter = filters?.ampCode;
        const atcFilter = filters?.atcCode;

      let amppQuery;
      let totalCount: number | null = null;

      if (ampFilter) {
        // Get accurate count first
        const countResult = await sql`
          SELECT COUNT(DISTINCT ampp.cti_extended)::int as count
          FROM ampp
          WHERE ampp.amp_code = ${ampFilter}
            AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
        `;
        totalCount = countResult.rows[0]?.count || 0;

        // Only apply offset when single type is selected (DB-level pagination)
        const queryOffset = useDbPagination ? offset : 0;
        // Filter by AMP code with pagination
        amppQuery = sql`
          SELECT DISTINCT ON (ampp.cti_extended)
            'ampp' as entity_type,
            ampp.cti_extended as code,
            COALESCE(ampp.prescription_name, amp.name) as name,
            amp.name as parent_name,
            ampp.amp_code as parent_code,
            NULL as company_name,
            ampp.pack_display_value as pack_info,
            ampp.ex_factory_price as price,
            EXISTS(
              SELECT 1 FROM dmpp d
              WHERE d.ampp_cti_extended = ampp.cti_extended
              AND d.reimbursable = true
              AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
            ) as reimbursable,
            (
              SELECT d.code FROM dmpp d
              WHERE d.ampp_cti_extended = ampp.cti_extended
              AND d.delivery_environment = 'P'
              AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
              LIMIT 1
            ) as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM ampp
          JOIN amp ON amp.code = ampp.amp_code
          WHERE ampp.amp_code = ${ampFilter}
            AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
          ORDER BY ampp.cti_extended
          LIMIT ${maxResultsPerType} OFFSET ${queryOffset}
        `;
      } else if (atcFilter) {
        // Get accurate count first
        const countResult = await sql`
          SELECT COUNT(DISTINCT ampp.cti_extended)::int as count
          FROM ampp
          WHERE ampp.atc_code = ${atcFilter}
            AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
        `;
        totalCount = countResult.rows[0]?.count || 0;

        // Only apply offset when single type is selected (DB-level pagination)
        const queryOffset = useDbPagination ? offset : 0;
        // Filter by ATC code with pagination
        amppQuery = sql`
          SELECT DISTINCT ON (ampp.cti_extended)
            'ampp' as entity_type,
            ampp.cti_extended as code,
            COALESCE(ampp.prescription_name, amp.name) as name,
            amp.name as parent_name,
            ampp.amp_code as parent_code,
            NULL as company_name,
            ampp.pack_display_value as pack_info,
            ampp.ex_factory_price as price,
            EXISTS(
              SELECT 1 FROM dmpp d
              WHERE d.ampp_cti_extended = ampp.cti_extended
              AND d.reimbursable = true
              AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
            ) as reimbursable,
            (
              SELECT d.code FROM dmpp d
              WHERE d.ampp_cti_extended = ampp.cti_extended
              AND d.delivery_environment = 'P'
              AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
              LIMIT 1
            ) as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM ampp
          JOIN amp ON amp.code = ampp.amp_code
          WHERE ampp.atc_code = ${atcFilter}
            AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
          ORDER BY ampp.cti_extended
          LIMIT ${maxResultsPerType} OFFSET ${queryOffset}
        `;
      } else if (isCnkQuery) {
        // CNK exact match
        amppQuery = sql`
          SELECT DISTINCT ON (ampp.cti_extended)
            'ampp' as entity_type,
            ampp.cti_extended as code,
            COALESCE(ampp.prescription_name, amp.name) as name,
            amp.name as parent_name,
            ampp.amp_code as parent_code,
            NULL as company_name,
            ampp.pack_display_value as pack_info,
            ampp.ex_factory_price as price,
            d.reimbursable,
            d.code as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM dmpp d
          JOIN ampp ON ampp.cti_extended = d.ampp_cti_extended
          JOIN amp ON amp.code = ampp.amp_code
          WHERE d.code = ${query.trim()}
            AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
          ORDER BY ampp.cti_extended
          LIMIT ${SEARCH_LIMIT_PER_TABLE}
        `;
      } else {
        amppQuery = sql`
          SELECT DISTINCT ON (ampp.cti_extended)
            'ampp' as entity_type,
            ampp.cti_extended as code,
            COALESCE(ampp.prescription_name, amp.name) as name,
            amp.name as parent_name,
            ampp.amp_code as parent_code,
            NULL as company_name,
            ampp.pack_display_value as pack_info,
            ampp.ex_factory_price as price,
            EXISTS(
              SELECT 1 FROM dmpp d
              WHERE d.ampp_cti_extended = ampp.cti_extended
              AND d.reimbursable = true
              AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
            ) as reimbursable,
            (
              SELECT d.code FROM dmpp d
              WHERE d.ampp_cti_extended = ampp.cti_extended
              AND d.delivery_environment = 'P'
              AND (d.end_date IS NULL OR d.end_date > CURRENT_DATE)
              LIMIT 1
            ) as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM ampp
          JOIN amp ON amp.code = ampp.amp_code
          WHERE (
            ampp.prescription_name->>'en' ILIKE ${searchPattern}
            OR ampp.prescription_name->>'nl' ILIKE ${searchPattern}
            OR ampp.prescription_name->>'fr' ILIKE ${searchPattern}
            OR ampp.cti_extended ILIKE ${prefixPattern}
          )
          AND (ampp.end_date IS NULL OR ampp.end_date > CURRENT_DATE)
          ORDER BY ampp.cti_extended
          LIMIT ${SEARCH_LIMIT_PER_TABLE}
        `;
      }
        const result = await amppQuery;
        // Use accurate count from COUNT query if available, otherwise use rows.length
        facetCounts.ampp = totalCount !== null ? totalCount : result.rows.length;
        if (shouldFetchResults('ampp')) {
          result.rows.forEach((r) => {
            allResults.push({
              entityType: 'ampp',
              code: r.code,
              name: r.name,
              parentName: r.parent_name,
              parentCode: r.parent_code,
              packInfo: r.pack_info,
              price: r.price,
              reimbursable: r.reimbursable,
              cnkCode: r.cnk_code,
            });
          });
        }
      })()
    );
  }

  // Company search - skip if not relevant
  if (isTypeRelevant('company')) {
    searchPromises.push(
      (async () => {
      const result = await sql`
        SELECT DISTINCT ON (c.actor_nr)
          'company' as entity_type,
          c.actor_nr as code,
          jsonb_build_object(${lang}::text, c.denomination) as name,
          NULL as parent_name,
          NULL as parent_code,
          NULL as company_name,
          NULL as pack_info,
          NULL as price,
          NULL as reimbursable,
          NULL as cnk_code,
          (SELECT COUNT(*)::int FROM amp WHERE company_actor_nr = c.actor_nr) as product_count,
          NULL as black_triangle
        FROM company c
        WHERE c.denomination ILIKE ${searchPattern}
        AND (c.end_date IS NULL OR c.end_date > CURRENT_DATE)
        ORDER BY c.actor_nr
        LIMIT ${SEARCH_LIMIT_PER_TABLE}
      `;
        facetCounts.company = result.rows.length;
        if (shouldFetchResults('company')) {
          result.rows.forEach((r) => {
            allResults.push({
              entityType: 'company',
              code: r.code,
              name: r.name,
              productCount: r.product_count,
            });
          });
        }
      })()
    );
  }

  // VMP Group search - skip if not relevant
  if (isTypeRelevant('vmp_group')) {
    searchPromises.push(
      (async () => {
      const result = await sql`
        SELECT DISTINCT ON (code)
          'vmp_group' as entity_type,
          code,
          name,
          NULL as parent_name,
          NULL as parent_code,
          NULL as company_name,
          NULL as pack_info,
          NULL as price,
          NULL as reimbursable,
          NULL as cnk_code,
          NULL as product_count,
          NULL as black_triangle
        FROM vmp_group
        WHERE (
          name->>'en' ILIKE ${searchPattern}
          OR name->>'nl' ILIKE ${searchPattern}
          OR name->>'fr' ILIKE ${searchPattern}
          OR code ILIKE ${prefixPattern}
        )
        AND (end_date IS NULL OR end_date > CURRENT_DATE)
        ORDER BY code
        LIMIT ${SEARCH_LIMIT_PER_TABLE}
      `;
        facetCounts.vmp_group = result.rows.length;
        if (shouldFetchResults('vmp_group')) {
          result.rows.forEach((r) => {
            allResults.push({
              entityType: 'vmp_group',
              code: r.code,
              name: r.name,
            });
          });
        }
      })()
    );
  }

  // Substance search - skip if not relevant
  if (isTypeRelevant('substance')) {
    searchPromises.push(
      (async () => {
      const result = await sql`
        SELECT DISTINCT ON (code)
          'substance' as entity_type,
          code,
          name,
          NULL as parent_name,
          NULL as parent_code,
          NULL as company_name,
          NULL as pack_info,
          NULL as price,
          NULL as reimbursable,
          NULL as cnk_code,
          NULL as product_count,
          NULL as black_triangle
        FROM substance
        WHERE (
          name->>'en' ILIKE ${searchPattern}
          OR name->>'nl' ILIKE ${searchPattern}
          OR name->>'fr' ILIKE ${searchPattern}
          OR code ILIKE ${prefixPattern}
        )
        AND (end_date IS NULL OR end_date > CURRENT_DATE)
        ORDER BY code
        LIMIT ${SEARCH_LIMIT_PER_TABLE}
      `;
        facetCounts.substance = result.rows.length;
        if (shouldFetchResults('substance')) {
          result.rows.forEach((r) => {
            allResults.push({
              entityType: 'substance',
              code: r.code,
              name: r.name,
            });
          });
        }
      })()
    );
  }

  // ATC search - skip if not relevant
  if (isTypeRelevant('atc')) {
    searchPromises.push(
      (async () => {
      let atcQuery;
      if (isAtcQuery) {
        atcQuery = sql`
          SELECT DISTINCT ON (code)
            'atc' as entity_type,
            code,
            jsonb_build_object(${lang}::text, description) as name,
            NULL as parent_name,
            NULL as parent_code,
            NULL as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM atc_classification
          WHERE code ILIKE ${query.trim() + '%'}
          ORDER BY code
          LIMIT ${SEARCH_LIMIT_PER_TABLE}
        `;
      } else {
        atcQuery = sql`
          SELECT DISTINCT ON (code)
            'atc' as entity_type,
            code,
            jsonb_build_object(${lang}::text, description) as name,
            NULL as parent_name,
            NULL as parent_code,
            NULL as company_name,
            NULL as pack_info,
            NULL as price,
            NULL as reimbursable,
            NULL as cnk_code,
            NULL as product_count,
            NULL as black_triangle
          FROM atc_classification
          WHERE (
            code ILIKE ${prefixPattern}
            OR description ILIKE ${searchPattern}
          )
          ORDER BY code
          LIMIT ${SEARCH_LIMIT_PER_TABLE}
        `;
      }
        const result = await atcQuery;
        facetCounts.atc = result.rows.length;
        if (shouldFetchResults('atc')) {
          result.rows.forEach((r) => {
            allResults.push({
              entityType: 'atc',
              code: r.code,
              name: r.name,
            });
          });
        }
      })()
    );
  }

  // Wait for all searches to complete
  await Promise.all(searchPromises);

  // Deduplicate results by entityType + code
  const uniqueResultsMap = new Map<string, RawSearchResult>();
  for (const result of allResults) {
    const key = `${result.entityType}-${result.code}`;
    if (!uniqueResultsMap.has(key)) {
      uniqueResultsMap.set(key, result);
    }
  }
  const uniqueResults = Array.from(uniqueResultsMap.values());

  // Score and sort results
  const scoredResults = uniqueResults.map((result) => {
    const { score, matchedField } = calculateScore(result, query, lang);
    return { ...result, matchScore: score, matchedField };
  });

  // Sort by score (descending), then by type priority, then alphabetically
  scoredResults.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    if (TYPE_PRIORITY[a.entityType] !== TYPE_PRIORITY[b.entityType]) {
      return TYPE_PRIORITY[a.entityType] - TYPE_PRIORITY[b.entityType];
    }
    const nameA = getLocalizedText(a.name, lang);
    const nameB = getLocalizedText(b.name, lang);
    return nameA.localeCompare(nameB);
  });

  // Calculate total count from facet counts (more accurate than result array length
  // when pagination is applied with relationship filters)
  const totalCount = types
    ? types.reduce((sum, type) => sum + (facetCounts[type] || 0), 0)
    : Object.values(facetCounts).reduce((sum, count) => sum + count, 0);

  // Check if we applied DB-level pagination (only for single type with relationship filters)
  // DB-level pagination only works correctly when querying a single entity type.
  // For multiple types, each query applies offset independently which causes page N to be empty
  // when offset exceeds individual type counts (e.g., VMP has 10, AMP has 68, offset 80 = 0 results from both)
  const paginatedResults = useDbPagination
    ? scoredResults  // Already paginated at DB level for single type
    : scoredResults.slice(offset, offset + limit);  // In-memory pagination for text search or multi-type

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
    facets: {
      byType: facetCounts,
    },
    pagination: {
      limit,
      offset,
      hasMore: offset + limit < totalCount,
    },
  };
}
