/**
 * Summary types for lists and search results
 * These are lightweight versions of the full entities
 */

import type { EntityType, MultilingualText } from './domain';

/** Base summary with common fields for search results */
export interface EntitySummary {
  entityType: EntityType;
  code: string;
  name: MultilingualText;
  status?: string;
}

export interface VTMSummary extends EntitySummary {
  entityType: 'vtm';
}

export interface VMPSummary extends EntitySummary {
  entityType: 'vmp';
  vtmCode: string | null;
  vmpGroupCode: string | null;
}

export interface AMPSummary extends EntitySummary {
  entityType: 'amp';
  vmpCode: string | null;
  companyActorNr: string | null;
  companyName: string | null;
  blackTriangle: boolean;
}

export interface AMPPSummary extends EntitySummary {
  entityType: 'ampp';
  ampCode: string;
  ampName: MultilingualText;
  packDisplayValue: string | null;
  exFactoryPrice: number | null;
  cnkCode: string | null;
  reimbursable: boolean;
}

export interface CompanySummary {
  entityType: 'company';
  actorNr: string;
  denomination: string;
  city: string | null;
  countryCode: string | null;
}

export interface VMPGroupSummary extends EntitySummary {
  entityType: 'vmp_group';
  patientFrailtyIndicator: boolean;
}

export interface SubstanceSummary extends EntitySummary {
  entityType: 'substance';
}

export interface ATCSummary {
  entityType: 'atc';
  code: string;
  description: string;
}

export interface ChapterIVParagraphSummary {
  chapterName: string;
  paragraphName: string;
  keyString: MultilingualText | null;
}

export interface DMPPSummary {
  code: string;
  deliveryEnvironment: 'P' | 'H';
  price: number | null;
  reimbursable: boolean;
  amppCtiExtended: string | null;
  name: MultilingualText | null;
}

export interface StandardDosageSummary {
  code: string;
  targetGroup: string;
  textualDosage: MultilingualText | null;
  indicationName: MultilingualText | null;
}

/** Union type of all entity summaries */
export type AnyEntitySummary =
  | VTMSummary
  | VMPSummary
  | AMPSummary
  | AMPPSummary
  | CompanySummary
  | VMPGroupSummary
  | SubstanceSummary
  | ATCSummary;
