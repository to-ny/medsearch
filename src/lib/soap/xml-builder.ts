/**
 * XML builder for SAM v2 SOAP requests
 */

const SOAP_ENVELOPE = 'http://schemas.xmlsoap.org/soap/envelope/';
const DICS_NS = 'urn:be:fgov:ehealth:dics:protocol:v5';

export interface SoapRequestOptions {
  operation: string;
  namespace?: string;
  searchDate?: string;
  body: string; // Pre-built XML body content
}

/**
 * Escapes special XML characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Gets current ISO timestamp for IssueInstant attribute
 */
function getIssueInstant(): string {
  return new Date().toISOString();
}

/**
 * Builds a SOAP envelope for SAM v2 API requests
 */
export function buildSoapRequest(options: SoapRequestOptions): string {
  const {
    operation,
    namespace = DICS_NS,
    searchDate,
    body,
  } = options;

  const searchDateAttr = searchDate ? ` SearchDate="${searchDate}"` : '';
  const issueInstant = getIssueInstant();

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${SOAP_ENVELOPE}" xmlns:ns="${namespace}">
  <soap:Header/>
  <soap:Body>
    <ns:${operation}Request IssueInstant="${issueInstant}"${searchDateAttr}>
${body}
    </ns:${operation}Request>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Builds a FindAmp SOAP request
 *
 * FindByCompany can be combined with certain search methods (must appear LAST per XSD):
 * - Supported: FindByProduct (AnyNamePart, AmpCode), FindByDmpp (CNK)
 * - Not supported: FindByIngredient, FindByVirtualProduct (causes server errors)
 */
export function buildFindAmpRequest(params: {
  anyNamePart?: string;
  cnk?: string;
  ampCode?: string;
  ingredient?: string;
  vmpCode?: string;
  companyActorNr?: string;
  language?: string;
  searchDate?: string;
}): string {
  const bodyParts: string[] = [];
  let canCombineWithCompany = false;

  // Build primary search element
  if (params.anyNamePart) {
    bodyParts.push(`      <FindByProduct>
        <AnyNamePart>${escapeXml(params.anyNamePart)}</AnyNamePart>
      </FindByProduct>`);
    canCombineWithCompany = true;
  } else if (params.cnk) {
    // FindByDmpp: DeliveryEnvironment, Code, CodeType (order matters per XSD)
    bodyParts.push(`      <FindByDmpp>
        <DeliveryEnvironment>P</DeliveryEnvironment>
        <Code>${escapeXml(params.cnk)}</Code>
        <CodeType>CNK</CodeType>
      </FindByDmpp>`);
    canCombineWithCompany = true;
  } else if (params.ampCode) {
    bodyParts.push(`      <FindByProduct>
        <AmpCode>${escapeXml(params.ampCode)}</AmpCode>
      </FindByProduct>`);
    canCombineWithCompany = true;
  } else if (params.ingredient) {
    // FindByIngredient cannot be combined with FindByCompany (causes server error)
    bodyParts.push(`      <FindByIngredient>
        <SubstanceName>${escapeXml(params.ingredient)}</SubstanceName>
      </FindByIngredient>`);
    canCombineWithCompany = false;
  } else if (params.vmpCode) {
    // FindByVirtualProduct cannot be combined with FindByCompany (causes business error)
    bodyParts.push(`      <FindByVirtualProduct>
        <VmpCode>${escapeXml(params.vmpCode)}</VmpCode>
      </FindByVirtualProduct>`);
    canCombineWithCompany = false;
  }

  // Add FindByCompany as additional filter (must be LAST per XSD)
  // Only add if: 1) we have a company filter AND 2) either no primary search OR it's combinable
  if (params.companyActorNr) {
    if (bodyParts.length === 0 || canCombineWithCompany) {
      bodyParts.push(`      <FindByCompany>
        <CompanyActorNr>${escapeXml(params.companyActorNr)}</CompanyActorNr>
      </FindByCompany>`);
    }
    // If not combinable (ingredient/vmpCode), company filter is silently ignored
  }

  return buildSoapRequest({
    operation: 'FindAmp',
    searchDate: params.searchDate,
    body: bodyParts.join('\n'),
  });
}

/**
 * Builds a FindVmp SOAP request
 */
export function buildFindVmpRequest(params: {
  anyNamePart?: string;
  vmpCode?: string;
  ingredient?: string;
  vtmCode?: string;
  vmpGroupCode?: string;
  language?: string;
  searchDate?: string;
}): string {
  let body = '';

  if (params.vmpGroupCode) {
    // FindByGenericPrescriptionGroup uses GenericPrescriptionGroupCode (int)
    body = `      <FindByGenericPrescriptionGroup>
        <GenericPrescriptionGroupCode>${escapeXml(params.vmpGroupCode)}</GenericPrescriptionGroupCode>
      </FindByGenericPrescriptionGroup>`;
  } else if (params.anyNamePart) {
    body = `      <FindByProduct>
        <AnyNamePart>${escapeXml(params.anyNamePart)}</AnyNamePart>
      </FindByProduct>`;
  } else if (params.vmpCode) {
    // VmpCode is an integer in the schema
    body = `      <FindByProduct>
        <VmpCode>${escapeXml(params.vmpCode)}</VmpCode>
      </FindByProduct>`;
  } else if (params.vtmCode) {
    // FindByTherapeuticMoiety uses TherapeuticMoietyCode (int) or TherapeuticMoietyName (string)
    // Assuming vtmCode is a numeric code
    body = `      <FindByTherapeuticMoiety>
        <TherapeuticMoietyCode>${escapeXml(params.vtmCode)}</TherapeuticMoietyCode>
      </FindByTherapeuticMoiety>`;
  } else if (params.ingredient) {
    // FindByIngredient uses SubstanceName
    body = `      <FindByIngredient>
        <SubstanceName>${escapeXml(params.ingredient)}</SubstanceName>
      </FindByIngredient>`;
  }

  return buildSoapRequest({
    operation: 'FindVmp',
    searchDate: params.searchDate,
    body,
  });
}

/**
 * Builds a FindVmpGroup SOAP request
 */
export function buildFindVmpGroupRequest(params: {
  vmpGroupCode?: string;
  anyNamePart?: string;
  language?: string;
  searchDate?: string;
}): string {
  let body = '';

  if (params.vmpGroupCode) {
    // Search by group code
    body = `      <FindByGenericPrescriptionGroup>
        <GenericPrescriptionGroupCode>${escapeXml(params.vmpGroupCode)}</GenericPrescriptionGroupCode>
      </FindByGenericPrescriptionGroup>`;
  } else if (params.anyNamePart) {
    // Search by name
    body = `      <FindByGenericPrescriptionGroup>
        <AnyNamePart>${escapeXml(params.anyNamePart)}</AnyNamePart>
      </FindByGenericPrescriptionGroup>`;
  }

  return buildSoapRequest({
    operation: 'FindVmpGroup',
    searchDate: params.searchDate,
    body,
  });
}

/**
 * Builds a FindReimbursement SOAP request
 */
export function buildFindReimbursementRequest(params: {
  cnk?: string;
  amppCode?: string;
  language?: string;
  searchDate?: string;
}): string {
  let body = '';

  if (params.cnk) {
    // FindByDmpp: DeliveryEnvironment, Code, CodeType (order matters per XSD)
    body = `      <FindByDmpp>
        <DeliveryEnvironment>P</DeliveryEnvironment>
        <Code>${escapeXml(params.cnk)}</Code>
        <CodeType>CNK</CodeType>
      </FindByDmpp>`;
  } else if (params.amppCode) {
    // FindByPackage uses CtiExtendedCode for AMPP
    body = `      <FindByPackage>
        <CtiExtendedCode>${escapeXml(params.amppCode)}</CtiExtendedCode>
      </FindByPackage>`;
  }

  return buildSoapRequest({
    operation: 'FindReimbursement',
    searchDate: params.searchDate,
    body,
  });
}

/**
 * Builds a FindCompany SOAP request
 * Note: FindCompany is part of DICS service, elements are direct children (no wrapper)
 */
export function buildFindCompanyRequest(params: {
  companyActorNr?: string;
  anyNamePart?: string;
  vatNr?: string;
  language?: string;
}): string {
  let body = '';

  // FindCompanyRequestType has direct choice elements (not wrapped in FindBy*)
  if (params.companyActorNr) {
    body = `      <CompanyActorNr>${escapeXml(params.companyActorNr)}</CompanyActorNr>`;
  } else if (params.anyNamePart) {
    body = `      <AnyNamePart>${escapeXml(params.anyNamePart)}</AnyNamePart>`;
  } else if (params.vatNr) {
    // VatNr needs CountryCode attribute (capital C) - extract from format like BE0403053608
    const countryCode = params.vatNr.substring(0, 2);
    const vatNumber = params.vatNr.substring(2);
    body = `      <VatNr CountryCode="${escapeXml(countryCode)}">${escapeXml(vatNumber)}</VatNr>`;
  }

  return buildSoapRequest({
    operation: 'FindCompany',
    body,
  });
}

/**
 * Builds a FindCommentedClassification (ATC/BCFI) SOAP request
 *
 * Note: The SAM API uses the BCFI (Belgian Center for Pharmacotherapeutic Information)
 * classification system, which uses numeric codes (e.g., "18" for Cardiovascular).
 * This is different from the standard WHO ATC codes (e.g., "C" for Cardiovascular).
 *
 * The API requires either a classification code or a name search - you cannot
 * retrieve all top-level categories without criteria.
 */
export function buildFindAtcRequest(params: {
  atcCode?: string;
  anyNamePart?: string;
  language?: string;
}): string {
  let body = '';

  if (params.atcCode) {
    // Search by BCFI classification code (numeric string)
    body = `      <FindByCommentedClassification>
        <CommentedClassificationCode>${escapeXml(params.atcCode)}</CommentedClassificationCode>
      </FindByCommentedClassification>`;
  } else if (params.anyNamePart) {
    // Search by name part (searches in title/content)
    body = `      <FindByCommentedClassification>
        <AnyNamePart>${escapeXml(params.anyNamePart)}</AnyNamePart>
      </FindByCommentedClassification>`;
  } else {
    // API requires at least one search criterion
    // Return empty body which will cause a validation error
    // The service layer should handle this case
    body = '';
  }

  return buildSoapRequest({
    operation: 'FindCommentedClassification',
    body,
  });
}

/**
 * Builds a FindChapterIVParagraph SOAP request
 * For querying Chapter IV (prior authorization) paragraph details
 */
export function buildFindChapterIVRequest(params: {
  cnk?: string;
  chapterName?: string;
  paragraphName?: string;
  legalReferencePath?: string;
  language?: string;
  searchDate?: string;
}): string {
  let body = '';

  if (params.cnk) {
    // FindByDmpp: DeliveryEnvironment, Code, CodeType (order matters per XSD)
    body = `      <FindByDmpp>
        <DeliveryEnvironment>P</DeliveryEnvironment>
        <Code>${escapeXml(params.cnk)}</Code>
        <CodeType>CNK</CodeType>
      </FindByDmpp>`;
  } else if (params.chapterName && params.paragraphName) {
    // FindByParagraphName
    body = `      <FindByParagraphName>
        <ChapterName>${escapeXml(params.chapterName)}</ChapterName>
        <ParagraphName>${escapeXml(params.paragraphName)}</ParagraphName>
      </FindByParagraphName>`;
  } else if (params.legalReferencePath) {
    // FindByLegalReferencePath
    body = `      <FindByLegalReferencePath>${escapeXml(params.legalReferencePath)}</FindByLegalReferencePath>`;
  }

  return buildSoapRequest({
    operation: 'FindChapterIVParagraph',
    searchDate: params.searchDate,
    body,
  });
}

/**
 * Builds a FindStandardDosage SOAP request
 * For querying standard dosage recommendations by VmpGroup
 */
export function buildFindStandardDosageRequest(params: {
  vmpGroupCode?: string;
  anyNamePart?: string;
  searchDate?: string;
}): string {
  let body = '';

  if (params.vmpGroupCode) {
    body = `      <FindByGenericPrescriptionGroup>
        <GenericPrescriptionGroupCode>${escapeXml(params.vmpGroupCode)}</GenericPrescriptionGroupCode>
      </FindByGenericPrescriptionGroup>`;
  } else if (params.anyNamePart) {
    body = `      <FindByGenericPrescriptionGroup>
        <AnyNamePart>${escapeXml(params.anyNamePart)}</AnyNamePart>
      </FindByGenericPrescriptionGroup>`;
  }

  return buildSoapRequest({
    operation: 'FindStandardDosage',
    searchDate: params.searchDate,
    body,
  });
}

/**
 * Builds a FindLegislationText SOAP request
 * For querying legal text (Royal Decrees, chapters, paragraphs) that defines reimbursement rules
 */
export function buildFindLegislationTextRequest(params: {
  cnk?: string;
  legalReferencePath?: string;
  findAllLegalBases?: boolean;
  language?: string;
  searchDate?: string;
}): string {
  let body = '';

  if (params.findAllLegalBases) {
    // FindLegalBases: Returns all legal bases (Royal Decrees) with their chapters
    body = `      <FindLegalBases/>`;
  } else if (params.cnk) {
    // FindByDmpp: Returns all legislation for a medication by CNK code
    body = `      <FindByDmpp>
        <DeliveryEnvironment>P</DeliveryEnvironment>
        <Code>${escapeXml(params.cnk)}</Code>
        <CodeType>CNK</CodeType>
      </FindByDmpp>`;
  } else if (params.legalReferencePath) {
    // FindByLegalReferencePath: Returns children of a legal reference path
    body = `      <FindByLegalReferencePath>${escapeXml(params.legalReferencePath)}</FindByLegalReferencePath>`;
  }

  return buildSoapRequest({
    operation: 'FindLegislationText',
    searchDate: params.searchDate,
    body,
  });
}
