/**
 * Core domain types for the MedSearch application
 */

/** Supported UI languages */
export type Language = 'nl' | 'fr' | 'en' | 'de';

/** Multilingual text object - stored as JSONB in database */
export interface MultilingualText {
  nl?: string;
  fr?: string;
  en?: string;
  de?: string;
}

/** Entity type discriminator for unified handling */
export type EntityType =
  | 'vtm'
  | 'vmp'
  | 'amp'
  | 'ampp'
  | 'company'
  | 'vmp_group'
  | 'substance'
  | 'atc';

/** Common validity period */
export interface ValidityPeriod {
  startDate: string | null;
  endDate: string | null;
}

/** All supported languages for iteration */
export const LANGUAGES: Language[] = ['en', 'nl', 'fr', 'de'];

/** Language fallback order */
export const LANGUAGE_FALLBACK_ORDER: Language[] = ['en', 'nl', 'fr', 'de'];

/** Entity type display configuration */
export const ENTITY_TYPE_CONFIG: Record<EntityType, {
  color: string;
  label: string;
  labelKey: string;
}> = {
  vtm: { color: '#7C3AED', label: 'VTM', labelKey: 'entities.vtm' },
  vmp: { color: '#3B82F6', label: 'Generic', labelKey: 'entities.vmp' },
  amp: { color: '#10B981', label: 'Brand', labelKey: 'entities.amp' },
  ampp: { color: '#F97316', label: 'Package', labelKey: 'entities.ampp' },
  company: { color: '#6B7280', label: 'Company', labelKey: 'entities.company' },
  vmp_group: { color: '#14B8A6', label: 'Group', labelKey: 'entities.vmpGroup' },
  substance: { color: '#8B5CF6', label: 'Substance', labelKey: 'entities.substance' },
  atc: { color: '#6366F1', label: 'ATC', labelKey: 'entities.atc' },
};

/** Reimbursement category colors */
export const REIMBURSEMENT_COLORS: Record<string, string> = {
  A: '#22C55E',   // Green - 100%
  B: '#3B82F6',   // Blue - 75%
  C: '#EAB308',   // Yellow - 50%
  Cs: '#F97316',  // Orange - special
  Cx: '#F97316',  // Orange - special
  Fa: '#8B5CF6',  // Purple - lump-sum
  Fb: '#8B5CF6',  // Purple - lump-sum
};

/** Valid entity types for runtime validation */
export const VALID_ENTITY_TYPES: EntityType[] = [
  'vtm',
  'vmp',
  'amp',
  'ampp',
  'company',
  'vmp_group',
  'substance',
  'atc',
];

/** Check if a string is a valid language */
export function isValidLanguage(lang: string | null | undefined): lang is Language {
  return lang !== null && lang !== undefined && LANGUAGES.includes(lang as Language);
}

/** Check if a string is a valid entity type */
export function isValidEntityType(type: string | null | undefined): type is EntityType {
  return type !== null && type !== undefined && VALID_ENTITY_TYPES.includes(type as EntityType);
}
