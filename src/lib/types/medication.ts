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
