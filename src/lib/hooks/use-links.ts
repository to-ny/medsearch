'use client';

import { useLanguage } from './use-language';
import { generateEntitySlug, generateCompanySlug, generateATCSlug } from '@/lib/utils/slug';
import type { EntityType, MultilingualText, Language } from '@/server/types/domain';

/**
 * Parameters for generating search page URLs
 */
export interface SearchLinkParams {
  q?: string;
  types?: EntityType | EntityType[];
  vtm?: string;
  vmp?: string;
  amp?: string;
  atc?: string;
  company?: string;
  vmpGroup?: string;
  substance?: string;
  page?: number;
}

/**
 * Return type for the useLinks hook
 */
export interface UseLinksReturn {
  // Entity detail pages
  toSubstance: (name: MultilingualText | null | undefined, code: string) => string;
  toIngredient: (name: MultilingualText | null | undefined, code: string) => string;
  toGeneric: (name: MultilingualText | null | undefined, code: string) => string;
  toMedication: (name: MultilingualText | null | undefined, code: string) => string;
  toPackage: (name: MultilingualText | null | undefined, code: string) => string;
  toCompany: (name: string | null | undefined, code: string) => string;
  toClassification: (code: string, name?: MultilingualText | null) => string;
  toTherapeuticGroup: (name: MultilingualText | null | undefined, code: string) => string;
  toChapterIV: (chapter: string, paragraph: string) => string;

  // Dynamic entity link (for SearchResultItem or when type is variable)
  toEntity: (type: EntityType, name: MultilingualText | null | undefined, code: string) => string;

  // Search with optional filters
  toSearch: (params?: SearchLinkParams) => string;

  // Home
  toHome: () => string;

  // Pagination helper (appends page param to a base path)
  withPage: (basePath: string, page: number) => string;
}

/**
 * Hook providing centralized, language-aware URL generation for the entire application.
 *
 * All URLs are prefixed with the current language from context.
 * Slugs are generated using the selected language when available, falling back to ID-only.
 *
 * @example
 * ```tsx
 * const links = useLinks();
 *
 * // Entity links
 * <Link href={links.toMedication(amp.name, amp.code)}>View medication</Link>
 * <Link href={links.toSearch({ atc: 'N02BE01', types: 'ampp' })}>Search packages</Link>
 *
 * // Pagination
 * router.push(links.withPage(links.toClassification(atc.code, atc.name), page));
 * ```
 */
export function useLinks(): UseLinksReturn {
  const { language } = useLanguage();

  // Helper: generate entity slug with selected language
  const entitySlug = (name: MultilingualText | null | undefined, code: string) =>
    generateEntitySlug(name, code, language);

  // Helper: generate ATC slug with selected language
  const atcSlug = (code: string, name: MultilingualText | null | undefined) =>
    generateATCSlug(code, name, language);

  // Helper: generate company slug
  const companySlug = (name: string | null | undefined, code: string) =>
    generateCompanySlug(name || '', code);

  return {
    // Entity detail pages
    toSubstance: (name, code) =>
      `/${language}/substances/${entitySlug(name, code)}`,

    toIngredient: (name, code) =>
      `/${language}/ingredients/${entitySlug(name, code)}`,

    toGeneric: (name, code) =>
      `/${language}/generics/${entitySlug(name, code)}`,

    toMedication: (name, code) =>
      `/${language}/medications/${entitySlug(name, code)}`,

    toPackage: (name, code) =>
      `/${language}/packages/${entitySlug(name, code)}`,

    toCompany: (name, code) =>
      `/${language}/companies/${companySlug(name, code)}`,

    toClassification: (code, name) =>
      `/${language}/classifications/${atcSlug(code, name)}`,

    toTherapeuticGroup: (name, code) =>
      `/${language}/therapeutic-groups/${entitySlug(name, code)}`,

    toChapterIV: (chapter, paragraph) =>
      `/${language}/chapter-iv/${chapter}/${paragraph}`,

    // Dynamic entity link based on entity type
    toEntity: (type, name, code) => {
      switch (type) {
        case 'vtm':
          return `/${language}/substances/${entitySlug(name, code)}`;
        case 'substance':
          return `/${language}/ingredients/${entitySlug(name, code)}`;
        case 'vmp':
          return `/${language}/generics/${entitySlug(name, code)}`;
        case 'amp':
          return `/${language}/medications/${entitySlug(name, code)}`;
        case 'ampp':
          return `/${language}/packages/${entitySlug(name, code)}`;
        case 'company': {
          // Company name from search results is MultilingualText with 'en' key
          const compName = name?.[language] || name?.en || name?.nl || name?.fr || name?.de || '';
          return `/${language}/companies/${companySlug(compName, code)}`;
        }
        case 'vmp_group':
          return `/${language}/therapeutic-groups/${entitySlug(name, code)}`;
        case 'atc':
          return `/${language}/classifications/${atcSlug(code, name)}`;
        default:
          return `/${language}`;
      }
    },

    // Search page with optional filters
    toSearch: (params) => {
      if (!params) return `/${language}/search`;

      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set('q', params.q);
      if (params.types) {
        const types = Array.isArray(params.types) ? params.types.join(',') : params.types;
        searchParams.set('types', types);
      }
      if (params.vtm) searchParams.set('vtm', params.vtm);
      if (params.vmp) searchParams.set('vmp', params.vmp);
      if (params.amp) searchParams.set('amp', params.amp);
      if (params.atc) searchParams.set('atc', params.atc);
      if (params.company) searchParams.set('company', params.company);
      if (params.vmpGroup) searchParams.set('vmpGroup', params.vmpGroup);
      if (params.substance) searchParams.set('substance', params.substance);
      if (params.page && params.page > 1) searchParams.set('page', params.page.toString());

      const qs = searchParams.toString();
      return `/${language}/search${qs ? `?${qs}` : ''}`;
    },

    // Home page
    toHome: () => `/${language}`,

    // Pagination helper
    withPage: (basePath, page) => {
      return page > 1 ? `${basePath}?page=${page}` : basePath;
    },
  };
}

/**
 * Non-hook version for server components or utilities that have language as a parameter.
 * Provides the same API as useLinks but requires language to be passed explicitly.
 */
export function createLinks(language: Language): UseLinksReturn {
  const entitySlug = (name: MultilingualText | null | undefined, code: string) =>
    generateEntitySlug(name, code, language);

  const atcSlug = (code: string, name: MultilingualText | null | undefined) =>
    generateATCSlug(code, name, language);

  const companySlug = (name: string | null | undefined, code: string) =>
    generateCompanySlug(name || '', code);

  return {
    toSubstance: (name, code) =>
      `/${language}/substances/${entitySlug(name, code)}`,

    toIngredient: (name, code) =>
      `/${language}/ingredients/${entitySlug(name, code)}`,

    toGeneric: (name, code) =>
      `/${language}/generics/${entitySlug(name, code)}`,

    toMedication: (name, code) =>
      `/${language}/medications/${entitySlug(name, code)}`,

    toPackage: (name, code) =>
      `/${language}/packages/${entitySlug(name, code)}`,

    toCompany: (name, code) =>
      `/${language}/companies/${companySlug(name, code)}`,

    toClassification: (code, name) =>
      `/${language}/classifications/${atcSlug(code, name)}`,

    toTherapeuticGroup: (name, code) =>
      `/${language}/therapeutic-groups/${entitySlug(name, code)}`,

    toChapterIV: (chapter, paragraph) =>
      `/${language}/chapter-iv/${chapter}/${paragraph}`,

    toEntity: (type, name, code) => {
      switch (type) {
        case 'vtm':
          return `/${language}/substances/${entitySlug(name, code)}`;
        case 'substance':
          return `/${language}/ingredients/${entitySlug(name, code)}`;
        case 'vmp':
          return `/${language}/generics/${entitySlug(name, code)}`;
        case 'amp':
          return `/${language}/medications/${entitySlug(name, code)}`;
        case 'ampp':
          return `/${language}/packages/${entitySlug(name, code)}`;
        case 'company': {
          const compName = name?.[language] || name?.en || name?.nl || name?.fr || name?.de || '';
          return `/${language}/companies/${companySlug(compName, code)}`;
        }
        case 'vmp_group':
          return `/${language}/therapeutic-groups/${entitySlug(name, code)}`;
        case 'atc':
          return `/${language}/classifications/${atcSlug(code, name)}`;
        default:
          return `/${language}`;
      }
    },

    toSearch: (params) => {
      if (!params) return `/${language}/search`;

      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set('q', params.q);
      if (params.types) {
        const types = Array.isArray(params.types) ? params.types.join(',') : params.types;
        searchParams.set('types', types);
      }
      if (params.vtm) searchParams.set('vtm', params.vtm);
      if (params.vmp) searchParams.set('vmp', params.vmp);
      if (params.amp) searchParams.set('amp', params.amp);
      if (params.atc) searchParams.set('atc', params.atc);
      if (params.company) searchParams.set('company', params.company);
      if (params.vmpGroup) searchParams.set('vmpGroup', params.vmpGroup);
      if (params.substance) searchParams.set('substance', params.substance);
      if (params.page && params.page > 1) searchParams.set('page', params.page.toString());

      const qs = searchParams.toString();
      return `/${language}/search${qs ? `?${qs}` : ''}`;
    },

    toHome: () => `/${language}`,

    withPage: (basePath, page) => {
      return page > 1 ? `${basePath}?page=${page}` : basePath;
    },
  };
}
