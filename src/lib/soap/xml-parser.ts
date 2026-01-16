/**
 * XML parser for SAM v2 SOAP responses
 */

import 'server-only';

import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  isArray: (name) => {
    // Elements that should always be arrays
    // Note: VmpGroup is NOT in this list because it appears as both:
    // - A single nested element inside Vmp (should stay object)
    // - Multiple root elements in FindVmpGroupResponse (handled with Array.isArray)
    const arrayElements = [
      'Amp',
      'Ampp',
      'Dmpp',
      'Vmp',
      'Vtm',
      'Company',
      'AmpComponent',
      'AmppComponent',
      'VmpComponent',
      'RealActualIngredient',
      'VirtualIngredient',
      'ReimbursementContexts',
      'Copayment',
      'Text',
      'Atc',
      'CommentedClassification',
      'Paragraph',
      'Verse',
      'Exclusion',
      'StandardDosage',
      'ParameterBounds',
      'RouteOfAdministration',
      'AdditionalFields',
      'LegalBasis',
      'LegalReference',
      'LegalText',
      'FormalInterpretation',
    ];
    return arrayElements.includes(name);
  },
});

export interface ParsedSoapResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  searchDate?: string;
  samId?: string;
}

/**
 * Extracts the response body from a SOAP envelope
 */
function extractSoapBody(xml: string): Record<string, unknown> | null {
  const parsed = parser.parse(xml);

  // Navigate through SOAP envelope
  const envelope = parsed['soap:Envelope'] || parsed['SOAP-ENV:Envelope'] || parsed.Envelope;
  if (!envelope) return null;

  const body = envelope['soap:Body'] || envelope['SOAP-ENV:Body'] || envelope.Body;
  if (!body) return null;

  return body;
}

/**
 * Known SAM API business error codes that indicate "no results" (not actual errors)
 * - 1003: No AMP found for given criteria
 * - 1004: No company found for given criteria
 * - 1008: No results found for given criteria
 * - 1012: No classification found
 */
const NO_RESULTS_ERROR_CODES = [1003, 1004, 1007, 1008, 1012, 1016, 1017];

/**
 * Result of checking for SOAP fault
 */
interface SoapFaultResult {
  isFault: boolean;
  isNoResultsFault: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Checks if the SOAP body contains a fault and extracts business error info.
 * This helper standardizes fault handling across all parsers.
 *
 * Known business error codes:
 * - 1004: No company found for given criteria
 * - 1008: No results found for given criteria
 * - 1012: No classification found
 */
function checkSoapFault(body: Record<string, unknown>): SoapFaultResult {
  const faultKey = Object.keys(body).find((k) => k.includes('Fault'));
  if (!faultKey) {
    return { isFault: false, isNoResultsFault: false };
  }

  const fault = body[faultKey] as Record<string, unknown>;
  const detail = fault.detail as Record<string, unknown> | undefined;
  const businessError = detail?.['ns2:BusinessError'] as Record<string, unknown> | undefined;
  const errorCode = businessError?.Code;
  const errorMessage = businessError?.Message as string | undefined;

  // Check if this is a "no results" type error
  const isNoResults = NO_RESULTS_ERROR_CODES.some(
    (code) => errorCode === code || errorCode === String(code)
  );

  return {
    isFault: true,
    isNoResultsFault: isNoResults,
    errorCode: errorCode ? String(errorCode) : undefined,
    errorMessage: errorMessage || String(fault.faultstring || 'Unknown SOAP fault'),
  };
}

/**
 * Extracts text content with language preference
 * Handles both xml:lang and lang attributes
 */
/**
 * Result of extracting localized text with language info
 */
export interface LocalizedTextResult {
  text: string;
  language: string;
}

export function extractText(
  textElements: Array<{ '@_xml:lang'?: string; '@_lang'?: string; '#text'?: string }> | string | undefined,
  preferredLang = 'en'
): string {
  return extractTextWithLang(textElements, preferredLang).text;
}

/**
 * Extracts text with language information for localized content
 * Returns both the text and which language it's actually in
 */
export function extractTextWithLang(
  textElements: Array<{ '@_xml:lang'?: string; '@_lang'?: string; '#text'?: string }> | string | undefined,
  preferredLang = 'en'
): LocalizedTextResult {
  // Handle direct string value (assume preferred language)
  if (typeof textElements === 'string') {
    return { text: textElements, language: preferredLang };
  }

  if (!textElements || !Array.isArray(textElements)) {
    return { text: '', language: preferredLang };
  }

  // Try preferred language first (check both xml:lang and lang)
  const preferred = textElements.find(
    (t) => t['@_xml:lang'] === preferredLang || t['@_lang'] === preferredLang
  );
  if (preferred?.['#text']) {
    return { text: String(preferred['#text']), language: preferredLang };
  }

  // Fall back to English if different from preferred
  if (preferredLang !== 'en') {
    const english = textElements.find(
      (t) => t['@_xml:lang'] === 'en' || t['@_lang'] === 'en'
    );
    if (english?.['#text']) {
      return { text: String(english['#text']), language: 'en' };
    }
  }

  // Fall back to first available with text
  const first = textElements.find((t) => t['#text']);
  if (first?.['#text']) {
    const lang = first['@_xml:lang'] || first['@_lang'] || 'unknown';
    return { text: String(first['#text']), language: lang };
  }

  return { text: '', language: preferredLang };
}

/**
 * Extracts ALL text entries with their languages from a localized text array
 * Used for document links where we want to show all available languages
 */
export function extractAllTextsWithLang(
  textElements: Array<{ '@_xml:lang'?: string; '@_lang'?: string; '#text'?: string }> | string | undefined
): LocalizedTextResult[] {
  if (typeof textElements === 'string') {
    return [{ text: textElements, language: 'unknown' }];
  }

  if (!textElements || !Array.isArray(textElements)) {
    return [];
  }

  return textElements
    .filter((t) => t['#text'])
    .map((t) => ({
      text: String(t['#text']),
      language: t['@_xml:lang'] || t['@_lang'] || 'unknown',
    }));
}

/**
 * Parses a FindAmp SOAP response
 */
export function parseFindAmpResponse(xml: string): ParsedSoapResponse<RawAmpData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const fault = checkSoapFault(body);
    if (fault.isFault) {
      if (fault.isNoResultsFault) {
        return { success: true, data: [] };
      }
      return {
        success: false,
        error: { code: 'SOAP_FAULT', message: fault.errorMessage || 'Unknown SOAP fault' },
      };
    }

    // Find the response element
    const responseKey = Object.keys(body).find((k) => k.includes('FindAmpResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindAmpResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const amps = (response.Amp || []) as RawAmpData[];

    return {
      success: true,
      data: Array.isArray(amps) ? amps : [amps],
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Parses a FindVmp SOAP response
 */
export function parseFindVmpResponse(xml: string): ParsedSoapResponse<RawVmpData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const fault = checkSoapFault(body);
    if (fault.isFault) {
      if (fault.isNoResultsFault) {
        return { success: true, data: [] };
      }
      return {
        success: false,
        error: { code: 'SOAP_FAULT', message: fault.errorMessage || 'Unknown SOAP fault' },
      };
    }

    const responseKey = Object.keys(body).find((k) => k.includes('FindVmpResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindVmpResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const vmps = (response.Vmp || []) as RawVmpData[];

    return {
      success: true,
      data: Array.isArray(vmps) ? vmps : [vmps],
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Parses a FindReimbursement SOAP response
 * Note: The SAM API returns a SOAP Fault with code 1008 when no reimbursements are found.
 * We treat this as an empty result set rather than an error.
 */
export function parseFindReimbursementResponse(xml: string): ParsedSoapResponse<RawReimbursementData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const fault = checkSoapFault(body);
    if (fault.isFault) {
      if (fault.isNoResultsFault) {
        return { success: true, data: [] };
      }
      return {
        success: false,
        error: { code: 'SOAP_FAULT', message: fault.errorMessage || 'Unknown SOAP fault' },
      };
    }

    const responseKey = Object.keys(body).find((k) => k.includes('FindReimbursementResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindReimbursementResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const contexts = (response.ReimbursementContexts || []) as RawReimbursementData[];

    return {
      success: true,
      data: Array.isArray(contexts) ? contexts : [contexts],
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Parses a FindCompany SOAP response
 */
export function parseFindCompanyResponse(xml: string): ParsedSoapResponse<RawCompanyData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const fault = checkSoapFault(body);
    if (fault.isFault) {
      if (fault.isNoResultsFault) {
        return { success: true, data: [] };
      }
      return {
        success: false,
        error: { code: 'SOAP_FAULT', message: fault.errorMessage || 'Unknown SOAP fault' },
      };
    }

    const responseKey = Object.keys(body).find((k) => k.includes('FindCompanyResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindCompanyResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const companies = (response.Company || []) as RawCompanyData[];

    return {
      success: true,
      data: Array.isArray(companies) ? companies : [companies],
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// Raw data types matching actual SAM v2 API response structure
// Note: Properties are direct children (no Data wrapper)

export interface RawTextElement {
  '@_xml:lang'?: string;
  '@_lang'?: string;
  '#text'?: string;
}

export interface RawLocalizedText {
  Text?: RawTextElement[];
}

/**
 * Helper to get text array from either a localized wrapper or direct array
 */
export function getTextArray(
  value: RawLocalizedText | RawTextElement[] | string | undefined
): RawTextElement[] | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return undefined;
  if (Array.isArray(value)) return value;
  if ('Text' in value && Array.isArray(value.Text)) return value.Text;
  return undefined;
}

/**
 * Extracts all language versions of a text field
 * Returns an array of {text, language} objects for all available languages
 */
export function extractAllTextVersions(
  textElements: Array<{ '@_xml:lang'?: string; '@_lang'?: string; '#text'?: string }> | string | undefined
): LocalizedTextResult[] {
  if (!textElements) return [];

  if (typeof textElements === 'string') {
    return [{ text: textElements, language: 'en' }];
  }

  if (!Array.isArray(textElements)) return [];

  return textElements
    .filter((t) => t['#text'])
    .map((t) => ({
      text: t['#text']!,
      language: t['@_xml:lang'] || t['@_lang'] || 'en',
    }));
}

export interface RawAmpData {
  '@_Code'?: string;
  '@_VmpCode'?: string;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  Name?: RawTextElement[];
  OfficialName?: string;
  AbbreviatedName?: RawTextElement[];
  PrescriptionName?: RawTextElement[];
  CompanyActorNr?: string;
  BlackTriangle?: boolean;
  MedicineType?: string;
  AmpComponent?: RawAmpComponentData[];
  Ampp?: RawAmppData[];
}

export interface RawAmppData {
  '@_CtiExtended'?: string;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  Orphan?: boolean;
  LeafletUrl?: RawTextElement[];
  SpcUrl?: RawTextElement[];
  ParallelCircuit?: number;
  PackDisplayValue?: string;
  Status?: string;
  AuthorisationNr?: string;
  PrescriptionName?: RawTextElement[];
  ExFactoryPrice?: number;
  Atc?: Array<{ '@_Code'?: string; Description?: string }>;
  DeliveryModus?: { '@_Code'?: string; Description?: RawTextElement[] };
  AmppComponent?: RawAmppComponentData[];
  Dmpp?: RawDmppData[];
}

export interface RawDmppData {
  '@_DeliveryEnvironment'?: string;
  '@_Code'?: string;
  '@_CodeType'?: string;
  '@_ProductId'?: string;
  '@_StartDate'?: string;
  Reimbursable?: boolean;
  Price?: number;
  Cheap?: boolean;
  Cheapest?: boolean;
}

export interface RawAmpComponentData {
  '@_SequenceNr'?: number;
  '@_VmpComponentCode'?: string;
  '@_StartDate'?: string;
  PharmaceuticalForm?: {
    '@_Code'?: string;
    Name?: RawTextElement[];
  };
  RouteOfAdministration?: {
    '@_Code'?: string;
    Name?: RawTextElement[];
  };
  RealActualIngredient?: RawIngredientData[];
}

export interface RawAmppComponentData {
  '@_SequenceNr'?: number;
  '@_StartDate'?: string;
  AmpcSequenceNr?: number;
  ContentType?: string;
  ContentMultiplier?: number;
  PackagingType?: {
    '@_Code'?: string;
    Name?: RawTextElement[];
  };
}

export interface RawIngredientData {
  '@_Rank'?: number;
  '@_StartDate'?: string;
  Type?: string;
  StrengthDescription?: string;
  Substance?: {
    '@_Code'?: string;
    Name?: RawTextElement[];
  };
}

export interface RawVmpData {
  '@_Code'?: string;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  Name?: RawTextElement[];
  AbbreviatedName?: RawTextElement[];
  VmpComponent?: RawVmpComponentData[];
  VmpGroup?: {
    '@_Code'?: string;
    Name?: RawTextElement[];
  };
  Vtm?: {
    '@_Code'?: string;
    Name?: RawTextElement[];
  };
}

export interface RawVmpComponentData {
  '@_SequenceNr'?: number;
  '@_PharmaceuticalFormCode'?: string;
  '@_StartDate'?: string;
  Name?: RawTextElement[];
  VirtualIngredient?: RawVirtualIngredientData[];
}

export interface RawVirtualIngredientData {
  '@_Rank'?: number;
  '@_StartDate'?: string;
  Type?: string;
  StrengthRange?: string;
  Substance?: {
    '@_Code'?: string;
    Name?: RawTextElement[];
  };
}

export interface RawReimbursementData {
  '@_DeliveryEnvironment'?: string;
  '@_Code'?: string;
  '@_CodeType'?: string;
  '@_StartDate'?: string;
  '@_LegalReferencePath'?: string;
  ReimbursementCriterion?: {
    '@_Category'?: string;
    '@_Code'?: string;
  };
  Copayment?: Array<{
    '@_RegimeType'?: string;
    FeeAmount?: number;
    ReimbursementAmount?: number;
  }>;
  ReferenceBasePrice?: number;
  ReimbursementBasePrice?: number;
  ReferencePrice?: number;
}

export interface RawCompanyData {
  '@_ActorNr'?: string;
  '@_StartDate'?: string;
  VatNr?: {
    '@_CountryCode'?: string;
    '#text'?: string;
  };
  Denomination?: string;
  LegalForm?: string;
  StreetName?: string;
  StreetNum?: string;
  Postbox?: string;
  Postcode?: string;
  City?: string;
  CountryCode?: string;
  Phone?: string;
  Language?: string;
}

export interface RawAtcClassificationData {
  // Code is an attribute in the actual API response
  '@_Code'?: string;
  '@_StartDate'?: string;
  // Legacy support for element-based code (used in some test fixtures)
  CommentedClassificationCode?: string;
  Title?: RawTextElement[];
  Content?: RawTextElement[];
  PosologyNote?: RawTextElement[];
  Url?: RawTextElement[];
  // Nested child classifications
  CommentedClassification?: RawAtcClassificationData[];
}

export interface RawVmpGroupData {
  '@_Code'?: string | number;
  '@_ProductId'?: string;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  Name?: RawTextElement[];
  NoGenericPrescriptionReason?: string;
  NoSwitchReason?: string;
  PatientFrailtyIndicator?: boolean;
}

/**
 * Recursively flattens nested CommentedClassification elements into a flat array
 */
function flattenClassifications(classifications: RawAtcClassificationData[]): RawAtcClassificationData[] {
  const result: RawAtcClassificationData[] = [];

  for (const classification of classifications) {
    // Add the current classification (without nested children in output)
    const { CommentedClassification: children, ...rest } = classification;
    result.push(rest);

    // Recursively flatten children
    if (children && Array.isArray(children) && children.length > 0) {
      result.push(...flattenClassifications(children));
    }
  }

  return result;
}

/**
 * Parses a FindCommentedClassification (ATC/BCFI) SOAP response
 *
 * The SAM API returns classifications in a nested hierarchy. This parser
 * flattens them into a single array for easier processing.
 *
 * Note: The API uses Code as an attribute (@_Code), but some test fixtures
 * may use CommentedClassificationCode as an element for compatibility.
 */
export function parseFindAtcResponse(xml: string): ParsedSoapResponse<RawAtcClassificationData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const fault = checkSoapFault(body);
    if (fault.isFault) {
      if (fault.isNoResultsFault) {
        return { success: true, data: [] };
      }
      return {
        success: false,
        error: { code: 'SOAP_FAULT', message: fault.errorMessage || 'Unknown SOAP fault' },
      };
    }

    const responseKey = Object.keys(body).find((k) => k.includes('FindCommentedClassificationResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindCommentedClassificationResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const classifications = (response.CommentedClassification || []) as RawAtcClassificationData[];
    const classificationsArray = Array.isArray(classifications) ? classifications : [classifications];

    // Flatten nested classifications into a single array
    const flattened = flattenClassifications(classificationsArray);

    return {
      success: true,
      data: flattened,
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// Chapter IV Types

export interface RawChapterIVVerseData {
  '@_VerseSeq'?: number;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  VerseNum?: number;
  VerseSeqParent?: number;
  VerseLevel?: number;
  CheckBoxInd?: boolean;
  MinCheckNum?: number;
  Text?: { Text?: RawTextElement[] };
  RequestType?: string;
  AgreementTerm?: {
    Quantity?: number;
    Unit?: string;
  };
  ModificationStatus?: string;
}

export interface RawChapterIVParagraphData {
  '@_ChapterName'?: string;
  '@_ParagraphName'?: string;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  LegalReferencePath?: string;
  CreatedTimestamp?: string;
  CreatedUserId?: string;
  KeyString?: { Text?: RawTextElement[] };
  AgreementType?: string;
  ProcessType?: number;
  LegalReference?: string;
  PublicationDate?: string;
  ModificationDate?: string;
  ParagraphVersion?: number;
  ModificationStatus?: string;
  Exclusion?: Array<{
    '@_ExclusionType'?: string;
    '@_IdentifierNum'?: string;
    '@_StartDate'?: string;
  }>;
  Verse?: RawChapterIVVerseData[];
}

/**
 * Parses a FindChapterIVParagraph SOAP response
 * Returns Chapter IV paragraph details for restricted medications.
 * Note: The SAM API returns a SOAP Fault with code 1016 when no paragraphs are found.
 * We treat this as an empty result set rather than an error.
 */
export function parseFindChapterIVResponse(xml: string): ParsedSoapResponse<RawChapterIVParagraphData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const faultKey = Object.keys(body).find((k) => k.includes('Fault'));
    if (faultKey) {
      const fault = body[faultKey] as Record<string, unknown>;
      const detail = fault.detail as Record<string, unknown> | undefined;

      // Check if this is a "no results found" fault (code 1016)
      const businessError = detail?.['ns2:BusinessError'] as Record<string, unknown> | undefined;
      const errorCode = businessError?.Code;

      if (errorCode === 1016 || errorCode === '1016') {
        // Not an error - just no Chapter IV data exists for this medication
        return {
          success: true,
          data: [],
        };
      }

      return {
        success: false,
        error: {
          code: 'SOAP_FAULT',
          message: String(fault.faultstring || fault.detail || 'Unknown SOAP fault'),
        },
      };
    }

    const responseKey = Object.keys(body).find((k) => k.includes('FindChapterIVParagraphResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindChapterIVParagraphResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const paragraphs = (response.Paragraph || []) as RawChapterIVParagraphData[];

    return {
      success: true,
      data: Array.isArray(paragraphs) ? paragraphs : [paragraphs],
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Parses a FindVmpGroup SOAP response
 */
export function parseFindVmpGroupResponse(xml: string): ParsedSoapResponse<RawVmpGroupData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const fault = checkSoapFault(body);
    if (fault.isFault) {
      if (fault.isNoResultsFault) {
        return { success: true, data: [] };
      }
      return {
        success: false,
        error: { code: 'SOAP_FAULT', message: fault.errorMessage || 'Unknown SOAP fault' },
      };
    }

    const responseKey = Object.keys(body).find((k) => k.includes('FindVmpGroupResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindVmpGroupResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const vmpGroups = (response.VmpGroup || []) as RawVmpGroupData[];

    return {
      success: true,
      data: Array.isArray(vmpGroups) ? vmpGroups : [vmpGroups],
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// Standard Dosage Types

export interface RawStandardDosageData {
  '@_Code'?: string;
  TargetGroup?: string;
  KidneyFailureClass?: number;
  LiverFailureClass?: number;
  TreatmentDurationType?: string;
  TemporalityDuration?: RawQuantityData;
  TemporalityUserProvided?: boolean;
  TemporalityNote?: RawLocalizedText;
  Quantity?: number;
  QuantityDenominator?: number;
  QuantityRangeLower?: number;
  QuantityRangeLowerDenominator?: number;
  QuantityRangeUpper?: number;
  QuantityRangeUpperDenominator?: number;
  QuantityMultiplicator?: RawDosageParameterV2Data;
  AdministrationFrequencyQuantity?: number;
  AdministrationFrequencyIsMax?: boolean;
  AdministrationFrequencyTimeframe?: RawQuantityData;
  MaximumAdministrationQuantity?: number;
  MaximumDailyQuantity?: RawParameterizedQuantityData;
  TextualDosage?: RawLocalizedText;
  SupplementaryInfo?: RawLocalizedText;
  RouteSpecification?: RawLocalizedText;
  Indication?: RawIndicationData;
  ParameterBounds?: RawParameterBoundsData[];
  RouteOfAdministration?: RawRouteOfAdministrationData[];
  AdditionalFields?: RawAdditionalFieldData[];
}

export interface RawQuantityData {
  '@_Unit'?: string;
  '#text'?: number;
}

export interface RawParameterizedQuantityData {
  Quantity?: RawQuantityData;
  Multiplier?: number;
  Parameter?: RawDosageParameterData;
}

export interface RawDosageParameterData {
  '@_code'?: string;
  Name?: RawLocalizedText;
  Definition?: RawLocalizedText;
  StandardUnit?: string;
}

export interface RawDosageParameterV2Data {
  '@_code'?: string;
  Name?: RawLocalizedText;
  Definition?: RawLocalizedText;
  StandardUnit?: string;
  SnomedCT?: string;
}

export interface RawIndicationData {
  '@_code'?: string;
  Name?: RawLocalizedText;
}

export interface RawParameterBoundsData {
  DosageParameter?: RawDosageParameterData;
  LowerBound?: RawQuantityData;
  UpperBound?: RawQuantityData;
}

export interface RawRouteOfAdministrationData {
  '@_Code'?: string;
  Name?: RawLocalizedText;
  StandardRoute?: {
    '@_Standard'?: string;
    '@_Code'?: string;
  };
}

export interface RawAdditionalFieldData {
  Key?: string;
  Value?: string;
}

/**
 * Parses a FindStandardDosage SOAP response
 * Returns standard dosage recommendations for a medication group.
 * Note: The SAM API returns a SOAP Fault with code 1017 when no dosages are found.
 * We treat this as an empty result set rather than an error.
 */
export function parseFindStandardDosageResponse(xml: string): ParsedSoapResponse<RawStandardDosageData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const fault = checkSoapFault(body);
    if (fault.isFault) {
      if (fault.isNoResultsFault) {
        return { success: true, data: [] };
      }
      return {
        success: false,
        error: { code: 'SOAP_FAULT', message: fault.errorMessage || 'Unknown SOAP fault' },
      };
    }

    const responseKey = Object.keys(body).find((k) => k.includes('FindStandardDosageResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindStandardDosageResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const dosages = (response.StandardDosage || []) as RawStandardDosageData[];

    return {
      success: true,
      data: Array.isArray(dosages) ? dosages : [dosages],
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// Legislation Types

export interface RawLegalTextData {
  '@_Key'?: string;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  Content?: { Text?: RawTextElement[] };
  Type?: string;
  SequenceNr?: number;
  LastModifiedOn?: string;
  LegalText?: RawLegalTextData[];
}

export interface RawLegalReferenceData {
  '@_Key'?: string;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  Title?: { Text?: RawTextElement[] };
  Type?: string;
  FirstPublishedOn?: string;
  LastModifiedOn?: string;
  LegalReferenceTrace?: Array<{ '@_Key'?: string }>;
  // Can have either nested LegalReference OR LegalText/FormalInterpretation
  LegalReference?: RawLegalReferenceData[];
  LegalText?: RawLegalTextData[];
  FormalInterpretation?: Array<Record<string, unknown>>;
}

export interface RawLegalBasisData {
  '@_Key'?: string;
  '@_StartDate'?: string;
  '@_EndDate'?: string;
  Title?: { Text?: RawTextElement[] };
  Type?: string;
  EffectiveOn?: string;
  LegalReference?: RawLegalReferenceData[];
}

/**
 * Parses a FindLegislationText SOAP response
 * Returns legal basis documents with hierarchical legal references and text.
 * Note: The SAM API returns a SOAP Fault with code 1007 when no legislation is found.
 * We treat this as an empty result set rather than an error.
 */
export function parseFindLegislationTextResponse(xml: string): ParsedSoapResponse<RawLegalBasisData[]> {
  try {
    const body = extractSoapBody(xml);
    if (!body) {
      return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid SOAP response' } };
    }

    // Check for SOAP fault
    const fault = checkSoapFault(body);
    if (fault.isFault) {
      if (fault.isNoResultsFault) {
        return { success: true, data: [] };
      }
      return {
        success: false,
        error: { code: 'SOAP_FAULT', message: fault.errorMessage || 'Unknown SOAP fault' },
      };
    }

    const responseKey = Object.keys(body).find((k) => k.includes('FindLegislationTextResponse'));
    if (!responseKey) {
      return { success: false, error: { code: 'NO_RESPONSE', message: 'No FindLegislationTextResponse found' } };
    }

    const response = body[responseKey] as Record<string, unknown>;
    const legalBases = (response.LegalBasis || []) as RawLegalBasisData[];

    return {
      success: true,
      data: Array.isArray(legalBases) ? legalBases : [legalBases],
      searchDate: response['@_SearchDate'] as string,
      samId: response['@_SamId'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}
