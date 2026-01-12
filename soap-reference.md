# SAM v2 SOAP API Reference

Reference documentation for the Belgian SAM v2 medication database SOAP API, as implemented in this application.

**Last updated:** January 2026
**API version:** DICS Protocol v5
**Maintained by:** FAMHP (Federal Agency for Medicines and Health Products) via eHealth Belgium

---

## Getting Started

The SAM v2 API is a public SOAP service with no authentication required. There are no known rate limits, but reasonable use is expected.

- **Service catalog:** https://www.vas.ehealth.fgov.be/samv2/
- **Primary endpoint:** https://apps.samdb.ehealth.fgov.be/samv2/dics/v5
- **WSDL:** https://apps.samdb.ehealth.fgov.be/samv2/dics/v5?wsdl

For issues with the API itself, contact eHealth Belgium: https://www.ehealth.fgov.be/

**Note on examples:** XML samples in this document are representative structures based on actual API responses. Optional fields may be omitted for brevity.

---

## Glossary

- **ATC** - Anatomical Therapeutic Chemical classification (WHO standard)
- **BCFI** - Belgian Center for Pharmacotherapeutic Information (Belgian classification system used by SAM)
- **BlackTriangle** - Indicates a medication under additional monitoring for safety (new or limited data)
- **Cheap/Cheapest** - Flags indicating whether a medication qualifies for preferential pricing rules
- **Chapter IV** - Restricted medications requiring prior authorization from health insurers
- **CNK** - Belgian national pharmacy code (Code National/Kode Nationaal), printed on packaging
- **DMPP** - Delivery Mode Pricing and Packaging (links CNK codes to packages)
- **FAMHP** - Federal Agency for Medicines and Health Products (Belgian regulator)
- **Magistral** - Compounded/prepared medications made by pharmacists
- **Orphan** - Medication for rare diseases with special regulatory status
- **Regimen** - Patient status for reimbursement: REGULAR (standard) or PREFERENTIAL (reduced copay for qualifying patients)
- **SmPC** - Summary of Product Characteristics (official product documentation)

---

## Data Model

### Medication Hierarchy

From abstract to concrete:

- **VTM** (Virtual Therapeutic Moiety) - Active substance (e.g., "Paracetamol")
  - **VMP** (Virtual Medicinal Product) - Generic definition: VTM + strength + form (e.g., "Paracetamol 500mg tablet")
    - **AMP** (Actual Medicinal Product) - Branded product from a company (e.g., "Dafalgan 500mg tablet")
      - **AMPP** (Actual Medicinal Product Package) - Package presentation with CNK code (e.g., "Dafalgan 500mg x30 tablets")

### Key Identifiers

- **CNK** (7 digits) - Belgian pharmacy code on packaging, identifies an AMPP
- **AMP Code** (SAM######-##) - SAM database identifier for branded products
- **VMP Code** (integer) - Generic product identifier
- **VTM Code** (integer) - Active substance identifier
- **CtiExtended** (string) - Package identifier for AMPP
- **Actor Nr** (5 digits, zero-padded) - Pharmaceutical company identifier

---

## Request Format

### SOAP Envelope Structure

All requests use the standard SOAP envelope with the DICS v5 namespace:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
    <ns:{Operation}Request IssueInstant="{ISO-8601-timestamp}">
      <!-- Search criteria -->
    </ns:{Operation}Request>
  </soap:Body>
</soap:Envelope>
```

### XSD Element Ordering

**Critical:** XML elements must appear in the exact order defined by the XSD schema. The API validates element order strictly and will reject requests with incorrectly ordered elements, even if all required data is present.

For example, in `FindByDmpp`:
- ✓ `DeliveryEnvironment` → `Code` → `CodeType`
- ✗ `Code` → `CodeType` → `DeliveryEnvironment` (will fail)

When combining multiple search methods (where supported), the order specified in each operation's documentation must be followed.

---

## Implemented Operations

All operations use the DICS v5 endpoint documented in Getting Started.

---

### FindAmp

Search for branded medications (AMP).

**Search Methods:**

- **FindByProduct**
  - `AnyNamePart` - Search by name substring
  - `AmpCode` - Search by AMP code
- **FindByDmpp** - Search by CNK code (requires `DeliveryEnvironment` + `Code` + `CodeType`)
- **FindByIngredient** - Search by active ingredient using `SubstanceName`
- **FindByVirtualProduct** - Find all brands of a generic using `VmpCode`
- **FindByCompany** - Find products by company using `CompanyActorNr`

**Combining Search Methods:**

`FindByCompany` can be combined with other search methods to filter results by company:

| Primary Method | + FindByCompany | Notes |
|----------------|-----------------|-------|
| FindByProduct (AnyNamePart) | ✓ Supported | |
| FindByProduct (AmpCode) | ✓ Supported | |
| FindByDmpp (CNK) | ✓ Supported | |
| FindByIngredient | ✗ Not supported | Causes server error |
| FindByVirtualProduct | ✗ Not supported | Causes business error 1002 |

When combining, `FindByCompany` must appear AFTER the primary search method.

**Example Request (name + company filter):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
    <ns:FindAmpRequest IssueInstant="2025-01-11T10:00:00.000Z">
      <FindByProduct>
        <AnyNamePart>duloxetine</AnyNamePart>
      </FindByProduct>
      <FindByCompany>
        <CompanyActorNr>01995</CompanyActorNr>
      </FindByCompany>
    </ns:FindAmpRequest>
  </soap:Body>
</soap:Envelope>
```

**Large Company Warning:** Company-only searches (FindByCompany without other filters) can return very large responses (15MB+ for companies with 300+ products), causing timeouts. Consider requiring additional filters or implementing timeout handling with user-friendly messaging.

**Example Request (by name):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
    <ns:FindAmpRequest IssueInstant="2025-01-11T10:00:00.000Z">
      <FindByProduct>
        <AnyNamePart>dafalgan</AnyNamePart>
      </FindByProduct>
    </ns:FindAmpRequest>
  </soap:Body>
</soap:Envelope>
```

**Example Request (by CNK):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
    <ns:FindAmpRequest IssueInstant="2025-01-11T10:00:00.000Z">
      <FindByDmpp>
        <DeliveryEnvironment>P</DeliveryEnvironment>
        <Code>0012345</Code>
        <CodeType>CNK</CodeType>
      </FindByDmpp>
    </ns:FindAmpRequest>
  </soap:Body>
</soap:Envelope>
```

**Response Structure:**

```xml
<FindAmpResponse SearchDate="2025-01-11" SamId="...">
  <Amp Code="SAM000691-00" VmpCode="26231">
    <Name xml:lang="nl">Dafalgan</Name>
    <Name xml:lang="fr">Dafalgan</Name>
    <OfficialName>DAFALGAN</OfficialName>
    <CompanyActorNr>01995</CompanyActorNr>
    <BlackTriangle>false</BlackTriangle>
    <MedicineType>ALLOPATHIC</MedicineType>
    <AmpComponent SequenceNr="1" VmpComponentCode="26231">
      <PharmaceuticalForm Code="10219000">
        <Name xml:lang="nl">Tablet</Name>
      </PharmaceuticalForm>
      <RouteOfAdministration Code="20053000">
        <Name xml:lang="nl">Oraal gebruik</Name>
      </RouteOfAdministration>
      <RealActualIngredient Rank="1">
        <Type>ACTIVE_SUBSTANCE</Type>
        <Substance Code="387517004">
          <Name xml:lang="en">Paracetamol</Name>
        </Substance>
        <StrengthDescription>500 mg</StrengthDescription>
      </RealActualIngredient>
    </AmpComponent>
    <Ampp CtiExtended="000691-01">
      <PrescriptionName xml:lang="nl">Dafalgan 500 mg tabl. 30</PrescriptionName>
      <PackDisplayValue>30 tabletten</PackDisplayValue>
      <Status>AUTHORIZED</Status>
      <ExFactoryPrice>3.50</ExFactoryPrice>
      <LeafletUrl xml:lang="nl">https://...</LeafletUrl>
      <SpcUrl xml:lang="nl">https://...</SpcUrl>
      <Atc Code="N02BE01"/>
      <Dmpp DeliveryEnvironment="P" Code="0012345" CodeType="CNK">
        <Price>4.20</Price>
        <Reimbursable>false</Reimbursable>
        <Cheap>false</Cheap>
        <Cheapest>false</Cheapest>
      </Dmpp>
    </Ampp>
  </Amp>
</FindAmpResponse>
```

---

### FindVmp

Search for generic medications (VMP).

**Search Methods:**

- **FindByProduct**
  - `AnyNamePart` - Search by name substring
  - `VmpCode` - Search by VMP code
- **FindByTherapeuticMoiety** - Search by VTM using `TherapeuticMoietyCode`
- **FindByIngredient** - Search by active ingredient using `SubstanceName`

**Example Request:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
    <ns:FindVmpRequest IssueInstant="2025-01-11T10:00:00.000Z">
      <FindByProduct>
        <AnyNamePart>paracetamol</AnyNamePart>
      </FindByProduct>
    </ns:FindVmpRequest>
  </soap:Body>
</soap:Envelope>
```

**Response Structure:**

```xml
<FindVmpResponse SearchDate="2025-01-11" SamId="...">
  <Vmp Code="26231">
    <Name xml:lang="nl">Paracetamol oral 500 mg</Name>
    <AbbreviatedName xml:lang="nl">Paracetamol 500mg</AbbreviatedName>
    <Vtm Code="387517004">
      <Name xml:lang="en">Paracetamol</Name>
    </Vtm>
    <VmpGroup Code="...">
      <Name xml:lang="nl">...</Name>
    </VmpGroup>
    <VmpComponent SequenceNr="1" PharmaceuticalFormCode="10219000">
      <VirtualIngredient Rank="1">
        <Type>ACTIVE_SUBSTANCE</Type>
        <Substance Code="387517004">
          <Name xml:lang="en">Paracetamol</Name>
        </Substance>
        <StrengthRange>500 mg</StrengthRange>
      </VirtualIngredient>
    </VmpComponent>
  </Vmp>
</FindVmpResponse>
```

---

### FindReimbursement

Get reimbursement information for a medication package.

**Search Methods:**

- **FindByDmpp** - Search by CNK code (requires `DeliveryEnvironment` + `Code` + `CodeType`)
- **FindByPackage** - Search by AMPP using `CtiExtendedCode`

**Special Handling:** When no reimbursement exists, the API returns a SOAP Fault with code `1008`. This should be treated as an empty result, not an error.

**Example Request:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
    <ns:FindReimbursementRequest IssueInstant="2025-01-11T10:00:00.000Z">
      <FindByDmpp>
        <DeliveryEnvironment>P</DeliveryEnvironment>
        <Code>0012345</Code>
        <CodeType>CNK</CodeType>
      </FindByDmpp>
    </ns:FindReimbursementRequest>
  </soap:Body>
</soap:Envelope>
```

**Response Structure:**

```xml
<FindReimbursementResponse SearchDate="2025-01-11" SamId="...">
  <ReimbursementContext DeliveryEnvironment="P" Code="0012345" CodeType="CNK">
    <ReimbursementCriterion>
      <Category>B</Category>
      <Code>0001070</Code>
    </ReimbursementCriterion>
    <Copayment Regimen="REGULAR">
      <FeeAmount>2.50</FeeAmount>
      <ReimbursementAmount>8.00</ReimbursementAmount>
    </Copayment>
    <Copayment Regimen="PREFERENTIAL">
      <FeeAmount>1.00</FeeAmount>
      <ReimbursementAmount>9.50</ReimbursementAmount>
    </Copayment>
    <ReferenceBasePrice>10.50</ReferenceBasePrice>
    <ReimbursementBasePrice>10.50</ReimbursementBasePrice>
  </ReimbursementContext>
</FindReimbursementResponse>
```

---

### FindCompany

Search for pharmaceutical companies.

**Search Methods (direct child elements, not wrapped in FindBy*):**

- `CompanyActorNr` - Search by 5-digit actor number
- `AnyNamePart` - Search by name substring
- `VatNr` - Search by VAT number (requires `CountryCode` attribute)

**Example Request:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
    <ns:FindCompanyRequest IssueInstant="2025-01-11T10:00:00.000Z">
      <AnyNamePart>pfizer</AnyNamePart>
    </ns:FindCompanyRequest>
  </soap:Body>
</soap:Envelope>
```

**Response Structure:**

```xml
<FindCompanyResponse SearchDate="2025-01-11" SamId="...">
  <Company ActorNr="01995">
    <VatNr CountryCode="BE">0403053608</VatNr>
    <Denomination>PFIZER SA</Denomination>
    <LegalForm>SA</LegalForm>
    <StreetName>Boulevard de la Plaine</StreetName>
    <StreetNum>17</StreetNum>
    <Postcode>1050</Postcode>
    <City>BRUXELLES</City>
    <CountryCode>BE</CountryCode>
    <Phone>+32 2 554 62 11</Phone>
    <Language>FR</Language>
  </Company>
</FindCompanyResponse>
```

---

### FindCommentedClassification

Search for BCFI therapeutic classifications.

**Important:** The SAM API uses the BCFI (Belgian Center for Pharmacotherapeutic Information) classification system with numeric codes (e.g., "18" for Cardiovascular), not the WHO ATC codes (e.g., "C" for Cardiovascular).

**Search Methods:**

- `CommentedClassificationCode` - Search by BCFI code
- `AnyNamePart` - Search by name/title

**Response Note:** The API returns nested classifications which should be flattened into a single array for easier processing.

**Example Request:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="urn:be:fgov:ehealth:dics:protocol:v5">
  <soap:Header/>
  <soap:Body>
    <ns:FindCommentedClassificationRequest IssueInstant="2025-01-11T10:00:00.000Z">
      <FindByCommentedClassification>
        <AnyNamePart>cardiovascular</AnyNamePart>
      </FindByCommentedClassification>
    </ns:FindCommentedClassificationRequest>
  </soap:Body>
</soap:Envelope>
```

**Response Structure:**

```xml
<FindCommentedClassificationResponse SearchDate="2025-01-11" SamId="...">
  <CommentedClassification Code="18">
    <Title xml:lang="en">Cardiovascular system</Title>
    <Content xml:lang="en">...</Content>
    <Url xml:lang="en">https://...</Url>
    <CommentedClassification Code="18.1">
      <Title xml:lang="en">Cardiac glycosides</Title>
      <!-- nested children -->
    </CommentedClassification>
  </CommentedClassification>
</FindCommentedClassificationResponse>
```

---

## Unexplored Endpoints

The following endpoints are listed in the SAM service catalog but have not been explored or implemented:

- **consult/compounding** (https://apps.samdb.ehealth.fgov.be/samv2/consult/compounding) - Magistral preparations
- **consult/ref** (https://apps.samdb.ehealth.fgov.be/samv2/consult/ref) - Reference data
- **consult/nonmedicinal** (https://apps.samdb.ehealth.fgov.be/samv2/consult/nonmedicinal) - Non-medicinal products
- **dics/legacy** (https://apps.samdb.ehealth.fgov.be/samv2/dics/legacy) - CIVICS / Chapter IV restrictions

### Unimplemented Operations

- **FindAmpp** - Search packages directly (workaround: use FindAmp)
- **FindVtm** - Search active substances (workaround: use FindVmp, which includes VTM info)
- **FindChapterIV** - Chapter IV restrictions (requires dics/legacy endpoint)
- **FindIngredient** - Search ingredients (workaround: use FindAmp/FindVmp with ingredient parameter)
- **FindFormula** - Magistral preparations (requires compounding endpoint)

---

## Error Handling

### SOAP Fault Structure

```xml
<soap:Fault>
  <faultcode>soap:Server</faultcode>
  <faultstring>Business error</faultstring>
  <detail>
    <ns2:BusinessError>
      <Code>1008</Code>
      <Message>No results found</Message>
    </ns2:BusinessError>
  </detail>
</soap:Fault>
```

### HTTP Status Codes

**Important:** The SAM API returns HTTP 500 for all SOAP faults, including business errors like "no results found". The SOAP client must read the response body even on HTTP 500 to extract the SOAP fault and determine if it's a recoverable business error or a true server error.

### Known Error Codes

- **1002** - No VMP linked with AMP found for criteria. May occur with unsupported filter combinations.
- **1003** - No AMP found for given criteria. Treat as empty result set, not an error.
- **1004** - No company found for given criteria. Treat as empty result set, not an error.
- **1008** - No results found. Treat as empty result set, not an error.
- **1012** - No classification found. Treat as empty result set, not an error.

### Retry Logic

Recommended: automatic retry with exponential backoff (timeout 30s, 3 retries).

---

## Language Support

### Multilingual Fields

Most text fields support four languages: `en`, `nl`, `fr`, `de`

```xml
<Name xml:lang="nl">Nederlandse naam</Name>
<Name xml:lang="fr">Nom français</Name>
<Name xml:lang="en">English name</Name>
<Name xml:lang="de">Deutscher Name</Name>
```

### Language Extraction Priority

1. Requested language
2. English (fallback)
3. First available

---

## Implementation Notes

### Element Order in XSD

The SAM XSD enforces strict element ordering. For `FindByDmpp`, elements must appear in this order:
1. `DeliveryEnvironment`
2. `Code`
3. `CodeType`

### Company Actor Number Format

Actor numbers must be zero-padded to 5 digits (e.g., "1995" becomes "01995").

### Date Formats

- **SearchDate attribute:** YYYY-MM-DD
- **IssueInstant attribute:** ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- **StartDate/EndDate:** YYYY-MM-DD

### DeliveryEnvironment Values

- **P** - Public pharmacy
- **H** - Hospital

---

## Custom Implementations

Features built in this application that extend beyond the SAM SOAP API.

### Excipient Database (Implemented)

The SAM SOAP API does not provide excipient (inactive ingredient) data. This application maintains a custom database built by parsing SmPC (Summary of Product Characteristics) PDF documents from FAMHP, obtained via the SpcUrl field in API responses.

### Allergen Detection (Implemented)

This application includes allergen matching that checks both active ingredients (from SAM API) and excipients (from the SmPC database) against known allergens.

**Detected allergens:**
- lactose, gluten, soy, peanut, tree nuts
- egg, shellfish, fish
- sulfite, tartrazine, aspartame
- benzalkonium, gelatin, paraben

Allergen matching includes aliases in English, French, Dutch, and German.

---

## Additional Resources

### SAM Database Export

A full SAM database export (XML format) is available from the SAM service for offline analysis or bulk processing. See the service catalog for download options.
