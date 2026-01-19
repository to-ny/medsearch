/**
 * API types for request and response handling
 */

import type { EntityType, Language, MultilingualText } from './domain';

/** Unified search result item */
export interface SearchResultItem {
  entityType: EntityType;
  code: string;
  name: MultilingualText;

  // Context-specific fields (vary by type)
  parentName?: MultilingualText;
  parentCode?: string;
  companyName?: string;
  packInfo?: string;
  price?: number;
  reimbursable?: boolean;
  reimbursementCategory?: string;  // A, B, C, Cs, Cx, Fa, Fb
  cnkCode?: string;
  productCount?: number;
  blackTriangle?: boolean;

  // Relevance metadata
  matchedField: 'name' | 'code' | 'cnk' | 'company' | 'substance';
  matchScore: number;
}

/** Search request parameters */
export interface SearchRequest {
  q: string;
  lang?: Language;
  types?: EntityType[];
  limit?: number;
  offset?: number;
}

/** Search response */
export interface SearchResponse {
  query: string;
  totalCount: number;
  results: SearchResultItem[];
  facets: {
    byType: Record<EntityType, number>;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/** Entity detail request (URL params) */
export interface EntityDetailParams {
  type: EntityType;
  id: string;
}

/** Entity detail query params */
export interface EntityDetailQuery {
  lang?: Language;
  include?: string[];
}

/** Generic API error response */
export interface APIError {
  error: {
    code: APIErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** API error codes */
export type APIErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_PARAMS'
  | 'INVALID_TYPE'
  | 'QUERY_TOO_SHORT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

/** Create an API error response */
export function createAPIError(
  code: APIErrorCode,
  message: string,
  details?: Record<string, unknown>
): APIError {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/** Common pagination parameters */
export interface PaginationParams {
  limit: number;
  offset: number;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
