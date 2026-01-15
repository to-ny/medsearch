/**
 * Medication types for the MedSearch application
 * These represent the normalized/transformed data from SAM v2 SOAP responses
 */

/**
 * Actual Medicinal Product - a branded medication
 */
export interface Medication {
  /** AMP code (e.g., SAM123456-01) */
  ampCode: string;
  /** Primary name */
  name: string;
  /** Actual language of the name (may differ from requested) */
  nameLanguage?: string;
  /** All available language versions of the name */
  allNames?: LocalizedText[];
  /** Abbreviated name */
  abbreviatedName?: string;
  /** Official registered name */
  officialName?: string;
  /** Company actor number */
  companyActorNr?: string;
  /** Company name (populated separately if needed) */
  companyName?: string;
  /** Whether this has a black triangle warning */
  blackTriangle: boolean;
  /** Type of medicine */
  medicineType?: string;
  /** Status (AUTHORIZED, SUSPENDED, etc.) */
  status: string;
  /** Link to VMP (generic) code */
  vmpCode?: string;
  /** Packages available */
  packages: MedicationPackage[];
  /** Components/ingredients */
  components: MedicationComponent[];
}

/**
 * A localized document link (leaflet, SmPC)
 */
export interface DocumentLink {
  /** URL to the document */
  url: string;
  /** Language of the document (ISO code) */
  language: string;
}

/**
 * A medication package (AMPP)
 */
export interface MedicationPackage {
  /** Extended CTI code */
  ctiExtended?: string;
  /** Package name */
  name: string;
  /** Authorization number */
  authorisationNr?: string;
  /** Whether it's an orphan drug */
  orphan: boolean;
  /** Link to leaflet (patient information) */
  leafletUrl?: string;
  /** Link to SmPC (professional information) */
  spcUrl?: string;
  /** Leaflet document with language info (best match for requested language) */
  leaflet?: DocumentLink;
  /** SmPC document with language info (best match for requested language) */
  spc?: DocumentLink;
  /** All available leaflet documents in all languages */
  allLeaflets?: DocumentLink[];
  /** All available SmPC documents in all languages */
  allSpcs?: DocumentLink[];
  /** Display value for pack size */
  packDisplayValue?: string;
  /** Status */
  status?: string;
  /** Ex-factory price */
  exFactoryPrice?: number;
  /** ATC code */
  atcCode?: string;
  /** CNK codes and pricing */
  cnkCodes: CnkCode[];
}

/**
 * CNK code with pricing information
 */
export interface CnkCode {
  /** The CNK code (7 digits) */
  code: string;
  /** Delivery environment (P=Public, H=Hospital) */
  deliveryEnvironment: 'P' | 'H';
  /** Price */
  price?: number;
  /** Whether it's considered cheap */
  cheap: boolean;
  /** Whether it's the cheapest in its group */
  cheapest: boolean;
  /** Whether it's reimbursable */
  reimbursable: boolean;
}

/**
 * A component of a medication (for combination products)
 */
export interface MedicationComponent {
  /** Sequence number */
  sequenceNr: number;
  /** Pharmaceutical form */
  pharmaceuticalForm?: {
    code: string;
    name: string;
  };
  /** Route of administration */
  routeOfAdministration?: {
    code: string;
    name: string;
  };
  /** Ingredients in this component */
  ingredients: Ingredient[];
}

/**
 * An ingredient in a medication
 */
export interface Ingredient {
  /** Rank/order */
  rank: number;
  /** Type (ACTIVE_SUBSTANCE, etc.) */
  type: string;
  /** Substance code */
  substanceCode: string;
  /** Substance name */
  substanceName: string;
  /** Strength description (e.g., "EQUAL 500 mg") */
  strengthDescription?: string;
}

/**
 * Localized text with language info (for tracking language fallbacks)
 */
export interface LocalizedText {
  /** The text content */
  text: string;
  /** ISO language code of the actual content */
  language: string;
}

/**
 * Virtual Medicinal Product - a generic/theoretical product
 */
export interface GenericProduct {
  /** VMP code */
  vmpCode: string;
  /** Name */
  name: string;
  /** Actual language of the name (may differ from requested) */
  nameLanguage?: string;
  /** All available language versions of the name */
  allNames?: LocalizedText[];
  /** Abbreviated name */
  abbreviatedName?: string;
  /** Status */
  status: string;
  /** VTM code (active substance) */
  vtmCode?: string;
  /** VMP Group */
  vmpGroup?: {
    code: string;
    name: string;
    /** Actual language of the group name */
    nameLanguage?: string;
    /** All available language versions of the group name */
    allNames?: LocalizedText[];
  };
  /** Components */
  components: GenericComponent[];
}

/**
 * A component of a generic product
 */
export interface GenericComponent {
  /** Sequence number */
  sequenceNr: number;
  /** Name */
  name?: string;
  /** Virtual ingredients */
  ingredients: Ingredient[];
}

/**
 * Reimbursement information for a medication
 */
export interface Reimbursement {
  /** CNK code */
  cnk: string;
  /** Delivery environment */
  deliveryEnvironment: 'P' | 'H';
  /** Legal reference path (e.g., "RD20180201-IV-8870000") - contains "IV" for Chapter IV */
  legalReferencePath?: string;
  /** Reimbursement criterion */
  criterion?: {
    category: string;
    code: string;
  };
  /** Co-payments by regimen */
  copayments: Copayment[];
  /** Reference base price */
  referenceBasePrice?: number;
  /** Reimbursement base price */
  reimbursementBasePrice?: number;
  /** Reference price */
  referencePrice?: number;
}

/**
 * Co-payment information
 */
export interface Copayment {
  /** Regimen type (e.g., 'AMBULATORY', 'HOSPITAL') */
  regimen: string;
  /** Fee amount (what patient pays) */
  feeAmount?: number;
  /** Reimbursement amount (what insurance pays) */
  reimbursementAmount?: number;
}

/**
 * VMP Group - groups therapeutically equivalent VMPs
 */
export interface VmpGroup {
  /** Group code (integer as string) */
  code: string;
  /** Localized group name */
  name: string;
  /** Actual language of the name */
  nameLanguage?: string;
  /** All available language versions */
  allNames?: LocalizedText[];
  /** Why generic prescription isn't allowed (e.g., "biological") */
  noGenericPrescriptionReason?: string;
  /** Why switching isn't allowed (e.g., "narrow therapeutic margin") */
  noSwitchReason?: string;
  /** Whether dosage should be adjusted for frail patients */
  patientFrailtyIndicator?: boolean;
}

/**
 * VMP Group member - a VMP within a group for equivalents display
 */
export interface VmpGroupMember {
  /** VMP code */
  vmpCode: string;
  /** VMP name */
  name: string;
  /** Actual language of the name */
  nameLanguage?: string;
  /** All available language versions */
  allNames?: LocalizedText[];
  /** Abbreviated name */
  abbreviatedName?: string;
}

/**
 * Response for equivalent medications lookup
 */
export interface EquivalentMedications {
  /** The VMP Group these belong to */
  group: VmpGroup;
  /** The current medication's VMP code */
  currentVmpCode: string;
  /** All equivalent VMPs in this group (including current) */
  equivalents: VmpGroupMember[];
}

/**
 * Company/pharmaceutical manufacturer
 */
export interface Company {
  /** Actor number (5 digits) */
  actorNr: string;
  /** Company name */
  name: string;
  /** Legal form */
  legalForm?: string;
  /** VAT number */
  vatNr?: { countryCode: string; number: string };
  /** Address */
  address?: {
    street?: string;
    number?: string;
    postbox?: string;
    postcode?: string;
    city?: string;
    countryCode?: string;
  };
  /** Phone */
  phone?: string;
  /** Language */
  language?: string;
}

/**
 * Search result item (lightweight for list views)
 */
export interface MedicationSearchResult {
  /** AMP code */
  ampCode: string;
  /** Name */
  name: string;
  /** Actual language of the name (may differ from requested) */
  nameLanguage?: string;
  /** All available language versions of the name */
  allNames?: LocalizedText[];
  /** Company actor number */
  companyActorNr?: string;
  /** Company name (if resolved) */
  companyName?: string;
  /** Primary CNK code */
  cnk?: string;
  /** Price */
  price?: number;
  /** Whether it's reimbursed */
  isReimbursed: boolean;
  /** Status */
  status: string;
  /** Pack display value */
  packDisplayValue?: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    searchDate?: string;
    samId?: string;
    totalResults?: number;
  };
}

/**
 * Chapter IV paragraph details for restricted medications
 */
export interface ChapterIVParagraph {
  /** Chapter name (e.g., "IV") */
  chapterName: string;
  /** Paragraph identifier (e.g., "10680000") */
  paragraphName: string;
  /** Unique legal reference path */
  legalReferencePath: string;
  /** Summary of the indication/condition */
  keyString?: LocalizedText[];
  /** Authorization model type */
  agreementType?: string;
  /** Date first published */
  publicationDate?: string;
  /** Date last modified */
  modificationDate?: string;
  /** Version number */
  paragraphVersion?: number;
  /** Start date of validity */
  startDate?: string;
  /** End date of validity (if no longer active) */
  endDate?: string;
  /** Structured legislation text */
  verses: ChapterIVVerse[];
}

/**
 * A verse (section) of Chapter IV legislation text
 */
export interface ChapterIVVerse {
  /** Sequence number within paragraph */
  verseSeq: number;
  /** Unique verse number */
  verseNum: number;
  /** Parent verse sequence (0 = top level) */
  verseSeqParent: number;
  /** Depth in hierarchy (1 = top level) */
  verseLevel: number;
  /** The legislation text */
  text: LocalizedText[];
  /** Request type: N=New, P=Prolongation, null=both */
  requestType?: string;
  /** Validity period quantity */
  agreementTermQuantity?: number;
  /** Validity period unit: D=Days, W=Weeks, M=Months, Y=Years */
  agreementTermUnit?: string;
  /** Start date of validity */
  startDate?: string;
}

/**
 * Standard dosage recommendation for a medication
 */
export interface StandardDosage {
  /** Unique dosage identifier */
  code: string;
  /** Target patient group */
  targetGroup: 'NEONATE' | 'PAEDIATRICS' | 'ADOLESCENT' | 'ADULT';
  /** Kidney failure class (0=normal, 1-3=impairment levels) */
  kidneyFailureClass?: number;
  /** Liver failure class (0=normal, 1-3=Child-Pugh grades) */
  liverFailureClass?: number;
  /** Treatment duration type */
  treatmentDurationType: 'ONE_OFF' | 'TEMPORARY' | 'CHRONIC' | 'IF_NECESSARY';
  /** Specific duration for TEMPORARY treatments */
  temporalityDuration?: DosageQuantity;
  /** If true, prescriber should specify duration */
  temporalityUserProvided?: boolean;
  /** Free text duration notes */
  temporalityNote?: LocalizedText[];
  /** Dosage quantity per administration */
  quantity?: number;
  /** Denominator for fractional doses */
  quantityDenominator?: number;
  /** Lower bound of quantity range */
  quantityRangeLower?: number;
  /** Upper bound of quantity range */
  quantityRangeUpper?: number;
  /** Number of administrations per timeframe */
  administrationFrequencyQuantity?: number;
  /** If true, frequency is a maximum limit */
  administrationFrequencyIsMax?: boolean;
  /** Timeframe for frequency (e.g., 1 day) */
  administrationFrequencyTimeframe?: DosageQuantity;
  /** Maximum quantity per single administration */
  maximumAdministrationQuantity?: number;
  /** Maximum daily quantity */
  maximumDailyQuantity?: ParameterizedQuantity;
  /** Free text dosage description */
  textualDosage?: LocalizedText[];
  /** Additional clinical notes */
  supplementaryInfo?: LocalizedText[];
  /** Additional route specification */
  routeSpecification?: LocalizedText[];
  /** Clinical indication */
  indication?: DosageIndication;
  /** Patient parameter constraints (weight, age) */
  parameterBounds?: DosageParameterBounds[];
  /** Route of administration */
  routeOfAdministration?: DosageRoute;
  /** Pre-formatted display strings */
  additionalFields?: DosageAdditionalFields;
}

/**
 * Quantity with unit (for durations, frequencies)
 */
export interface DosageQuantity {
  /** The numeric value */
  value: number;
  /** The unit (e.g., 'd' for days, 'w' for weeks) */
  unit: string;
}

/**
 * Quantity that may be parameterized (e.g., mg/kg)
 */
export interface ParameterizedQuantity {
  /** The quantity */
  quantity: DosageQuantity;
  /** Multiplier */
  multiplier?: number;
  /** Reference parameter (e.g., weight) */
  parameter?: DosageParameter;
}

/**
 * Clinical indication for a dosage
 */
export interface DosageIndication {
  /** Indication code */
  code: string;
  /** Indication name */
  name: LocalizedText[];
}

/**
 * Parameter definition (weight, age, etc.)
 */
export interface DosageParameter {
  /** Parameter code */
  code: string;
  /** Parameter name */
  name?: LocalizedText[];
  /** Parameter definition */
  definition?: LocalizedText[];
  /** Standard unit */
  standardUnit?: string;
}

/**
 * Bounds for a dosage parameter (e.g., weight range)
 */
export interface DosageParameterBounds {
  /** The parameter */
  parameter: DosageParameter;
  /** Lower bound */
  lowerBound?: DosageQuantity;
  /** Upper bound */
  upperBound?: DosageQuantity;
}

/**
 * Route of administration
 */
export interface DosageRoute {
  /** Route code */
  code: string;
  /** Route name */
  name: LocalizedText[];
  /** Standard route reference (e.g., SNOMED CT) */
  standardRoute?: {
    standard: string;
    code: string;
  };
}

/**
 * Pre-formatted display strings from API
 */
export interface DosageAdditionalFields {
  /** Human-readable posology */
  posology?: LocalizedText[];
  /** Dosage amount description */
  dosageString?: LocalizedText[];
  /** Full selection criteria description */
  selectionString?: LocalizedText[];
}

/**
 * Legal basis document (Royal Decree)
 */
export interface LegalBasis {
  /** Unique key (e.g., "RD20180201") */
  key: string;
  /** Document title (e.g., "A.R. 01.02.2018") */
  title: LocalizedText[];
  /** Document type (usually "ROYAL_DECREE") */
  type: string;
  /** Date the law became effective */
  effectiveOn?: string;
  /** Start date of validity period */
  startDate?: string;
  /** End date of validity period */
  endDate?: string;
  /** Legal references within this document */
  legalReferences: LegalReference[];
}

/**
 * A reference within legislation (chapter, paragraph, article, section)
 */
export interface LegalReference {
  /** Unique key within legal basis (e.g., "IV", "10680000") */
  key: string;
  /** Title (e.g., chapter number, paragraph name) */
  title: LocalizedText[];
  /** Type: CHAPTER, PARAGRAPH, ARTICLE, or SECTION */
  type: 'CHAPTER' | 'PARAGRAPH' | 'ARTICLE' | 'SECTION' | string;
  /** Date first published */
  firstPublishedOn?: string;
  /** Date last modified */
  lastModifiedOn?: string;
  /** Start date of validity period */
  startDate?: string;
  /** End date of validity period */
  endDate?: string;
  /** Child legal references (hierarchical structure) */
  legalReferences?: LegalReference[];
  /** Legal text content (leaf nodes only) */
  legalTexts?: LegalText[];
}

/**
 * Actual legal text content
 */
export interface LegalText {
  /** Unique text key */
  key: string;
  /** The text content */
  content: LocalizedText[];
  /** Type: ALINEA (paragraph) or POINT (numbered point) */
  type: 'ALINEA' | 'POINT' | string;
  /** Sequence number within parent */
  sequenceNr: number;
  /** Date last modified */
  lastModifiedOn?: string;
  /** Start date of validity period */
  startDate?: string;
  /** End date of validity period */
  endDate?: string;
  /** Nested legal text (hierarchical) */
  children?: LegalText[];
}
