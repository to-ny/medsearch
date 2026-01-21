/**
 * Entity types for the MedSearch application
 * These types represent the full entity data with all fields
 */

import type { MultilingualText, ValidityPeriod } from './domain';
import type {
  VMPSummary,
  AMPSummary,
  AMPPSummary,
  VTMSummary,
  CompanySummary,
  VMPGroupSummary,
  StandardDosageSummary,
  ChapterIVParagraphSummary,
  DMPPSummary,
  ATCSummary,
} from './summaries';

/** VTM - Virtual Therapeutic Moiety (Active Substance) */
export interface VTM extends ValidityPeriod {
  code: string;
  name: MultilingualText;
}

/** VTM with relationships loaded */
export interface VTMWithRelations extends VTM {
  vmps: VMPSummary[];
  amps: AMPSummary[];
  vmpGroups: VMPGroupSummary[];
  packageCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  reimbursablePercentage: number | null;
}

/** VMP - Virtual Medicinal Product (Generic) */
export interface VMP extends ValidityPeriod {
  code: string;
  name: MultilingualText;
  abbreviatedName: MultilingualText | null;
  vtmCode: string | null;
  vmpGroupCode: string | null;
  status: 'AUTHORIZED' | 'REVOKED' | 'SUSPENDED';
}

/** Cheapest package summary */
export interface CheapestPackageSummary {
  ctiExtended: string;
  price: number;
  cnkCode: string;
  name: MultilingualText | null;
}

/** VMP with relationships loaded */
export interface VMPWithRelations extends VMP {
  vtm: VTMSummary | null;
  vmpGroup: VMPGroupSummary | null;
  amps: AMPSummary[];
  dosages: StandardDosageSummary[];
  packageCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  reimbursablePercentage: number | null;
  hasChapterIV: boolean;
  cheapestPackage: CheapestPackageSummary | null;
}

/** AMP - Actual Medicinal Product (Brand) */
export interface AMP extends ValidityPeriod {
  code: string;
  name: MultilingualText;
  abbreviatedName: MultilingualText | null;
  officialName: string | null;
  vmpCode: string | null;
  companyActorNr: string | null;
  blackTriangle: boolean;
  medicineType: string | null;
  status: 'AUTHORIZED' | 'REVOKED' | 'SUSPENDED';
}

/** AMP Component - pharmaceutical form and route */
export interface AMPComponent {
  sequenceNr: number;
  pharmaceuticalFormCode: string | null;
  pharmaceuticalFormName: MultilingualText | null;
  routeOfAdministrationCode: string | null;
  routeOfAdministrationName: MultilingualText | null;
}

/** AMP Ingredient - active substance with strength */
export interface AMPIngredient {
  componentSequenceNr: number;
  rank: number;
  type: 'ACTIVE_SUBSTANCE' | 'EXCIPIENT';
  substanceCode: string | null;
  substanceName: MultilingualText | null;
  strengthDescription: string | null;
}

/** AMP Excipient - inactive ingredients from SmPC */
export interface AMPExcipient {
  ampCode: string;
  text: MultilingualText;
  sourceUrls: MultilingualText | null;
  parsedAt: string;
}

/** AMP with all relationships */
export interface AMPWithRelations extends AMP {
  vmp: VMPSummary | null;
  company: CompanySummary | null;
  components: AMPComponent[];
  ingredients: AMPIngredient[];
  excipients: AMPExcipient | null;
  packages: AMPPSummary[];
  minPrice: number | null;
  maxPrice: number | null;
  hasChapterIV: boolean;
}

/** AMPP - Actual Medicinal Product Package */
export interface AMPP extends ValidityPeriod {
  ctiExtended: string;
  ampCode: string;
  prescriptionName: MultilingualText | null;
  authorisationNr: string | null;
  orphan: boolean;
  leafletUrl: MultilingualText | null;
  spcUrl: MultilingualText | null;
  packDisplayValue: string | null;
  status: string | null;
  exFactoryPrice: number | null;
  atcCode: string | null;
}

/** DMPP - CNK Code with pricing */
export interface DMPP extends ValidityPeriod {
  code: string;
  deliveryEnvironment: 'P' | 'H';
  amppCtiExtended: string;
  price: number | null;
  cheap: boolean;
  cheapest: boolean;
  reimbursable: boolean;
}

/** AMPP with relationships */
export interface AMPPWithRelations extends AMPP {
  amp: AMPSummary;
  atcClassification: ATCClassification | null;
  cnkCodes: DMPP[];
  reimbursementContexts: ReimbursementContext[];
  chapterIVParagraphs: ChapterIVParagraphSummary[];
}

/** Company - Pharmaceutical manufacturer */
export interface Company extends ValidityPeriod {
  actorNr: string;
  denomination: string;
  legalForm: string | null;
  vatCountryCode: string | null;
  vatNumber: string | null;
  streetName: string | null;
  streetNum: string | null;
  postbox: string | null;
  postcode: string | null;
  city: string | null;
  countryCode: string | null;
  phone: string | null;
  language: string | null;
}

/** Company with relationships */
export interface CompanyWithRelations extends Company {
  products: AMPSummary[];
  productCount: number;
  vmpCount: number;
  packageCount: number;
  reimbursableCount: number;
}

/** VMP Group - Therapeutic classification */
export interface VMPGroup extends ValidityPeriod {
  code: string;
  name: MultilingualText;
  noGenericPrescriptionReason: string | null;
  noSwitchReason: string | null;
  patientFrailtyIndicator: boolean;
}

/** VMP Group with relationships */
export interface VMPGroupWithRelations extends VMPGroup {
  vmps: VMPSummary[];
  dosages: StandardDosage[];
}

/** Substance - referenced by ingredients */
export interface Substance extends ValidityPeriod {
  code: string;
  name: MultilingualText;
}

/** Substance with relationships */
export interface SubstanceWithRelations extends Substance {
  usedInAmps: AMPSummary[];
  usedInAmpCount: number;
}

/** ATC Classification - WHO drug classification */
export interface ATCClassification {
  code: string;
  description: string;
}

/** ATC with relationships */
export interface ATCWithRelations extends ATCClassification {
  parentCode: string | null;
  children: ATCSummary[];
  packages: AMPPSummary[];
  packageCount: number;
}

/** Reimbursement Context - insurance coverage */
export interface ReimbursementContext extends ValidityPeriod {
  id: number;
  dmppCode: string;
  deliveryEnvironment: 'P' | 'H';
  legalReferencePath: string | null;
  reimbursementCriterionCategory: string | null;
  reimbursementCriterionCode: string | null;
  flatRateSystem: boolean;
  referencePrice: boolean;
  temporary: boolean;
  referenceBasePrice: number | null;
  reimbursementBasePrice: number | null;
  pricingUnitQuantity: number | null;
  pricingUnitLabel: MultilingualText | null;
  copayments: Copayment[];
}

/** Copayment - patient cost by regimen */
export interface Copayment {
  id: number;
  regimenType: '1' | '2';
  feeAmount: number | null;
  reimbursementAmount: number | null;
}

/** Chapter IV Paragraph - prior authorization rules */
export interface ChapterIVParagraph extends ValidityPeriod {
  chapterName: string;
  paragraphName: string;
  keyString: MultilingualText | null;
  processType: string | null;
  processTypeOverrule: string | null;
  paragraphVersion: number | null;
  modificationStatus: string | null;
}

/** Chapter IV with full details */
export interface ChapterIVParagraphWithRelations extends ChapterIVParagraph {
  verses: ChapterIVVerse[];
  linkedProducts: DMPPSummary[];
}

/** Chapter IV Verse - legislation text */
export interface ChapterIVVerse {
  id: number;
  verseSeq: number;
  verseNum: number;
  verseSeqParent: number;
  verseLevel: number;
  text: MultilingualText | null;
  requestType: 'N' | 'P' | null;
  agreementTermQuantity: number | null;
  agreementTermUnit: 'D' | 'W' | 'M' | 'Y' | null;
  startDate: string | null;
}

/** Standard Dosage - dosing recommendations */
export interface StandardDosage extends ValidityPeriod {
  code: string;
  vmpGroupCode: string | null;
  targetGroup: 'NEONATE' | 'PAEDIATRICS' | 'ADOLESCENT' | 'ADULT';
  kidneyFailureClass: number | null;
  liverFailureClass: number | null;
  treatmentDurationType: 'ONE_OFF' | 'TEMPORARY' | 'CHRONIC' | 'IF_NECESSARY';
  temporalityDurationValue: number | null;
  temporalityDurationUnit: string | null;
  temporalityUserProvided: boolean | null;
  temporalityNote: MultilingualText | null;
  quantity: number | null;
  quantityDenominator: number | null;
  quantityRangeLower: number | null;
  quantityRangeUpper: number | null;
  administrationFrequencyQuantity: number | null;
  administrationFrequencyIsMax: boolean | null;
  administrationFrequencyTimeframeValue: number | null;
  administrationFrequencyTimeframeUnit: string | null;
  maximumAdministrationQuantity: number | null;
  maximumDailyQuantityValue: number | null;
  maximumDailyQuantityUnit: string | null;
  maximumDailyQuantityMultiplier: number | null;
  textualDosage: MultilingualText | null;
  supplementaryInfo: MultilingualText | null;
  routeSpecification: MultilingualText | null;
  indicationCode: string | null;
  indicationName: MultilingualText | null;
  routeOfAdministrationCode: string | null;
  parameterBounds: DosageParameterBounds[];
}

/** Dosage Parameter Bounds - weight/age constraints */
export interface DosageParameterBounds {
  parameterCode: string;
  parameterName: MultilingualText | null;
  lowerBoundValue: number | null;
  lowerBoundUnit: string | null;
  upperBoundValue: number | null;
  upperBoundUnit: string | null;
}

/** Legal Basis - Royal Decrees */
export interface LegalBasis extends ValidityPeriod {
  key: string;
  title: MultilingualText;
  type: string;
  effectiveOn: string | null;
}

/** Legal Reference - hierarchical legislation structure */
export interface LegalReference extends ValidityPeriod {
  id: number;
  legalBasisKey: string;
  parentPath: string | null;
  key: string;
  path: string;
  title: MultilingualText | null;
  type: 'CHAPTER' | 'PARAGRAPH' | 'ARTICLE' | 'SECTION';
  firstPublishedOn: string | null;
  lastModifiedOn: string | null;
}

/** Legal Text - actual text content */
export interface LegalText extends ValidityPeriod {
  id: number;
  legalBasisKey: string;
  legalReferencePath: string;
  parentTextKey: string | null;
  key: string;
  content: MultilingualText | null;
  type: 'ALINEA' | 'POINT';
  sequenceNr: number;
  lastModifiedOn: string | null;
}
