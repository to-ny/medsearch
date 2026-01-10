# SOAP Explorer Agent Prompt

## Objective

Explore and document the Belgian SAM v2 SOAP API for use by a developer agent building a medication search application.

## API Entry Point

Service list: https://www.vas.ehealth.fgov.be/samv2/

Primary consultation endpoint (DICS v5): https://apps.samdb.ehealth.fgov.be/samv2/dics/v5
WSDL: https://apps.samdb.ehealth.fgov.be/samv2/dics/v5?wsdl

Additional consultation endpoints to explore:
- https://apps.samdb.ehealth.fgov.be/samv2/consult/amp
- https://apps.samdb.ehealth.fgov.be/samv2/consult/vmp
- https://apps.samdb.ehealth.fgov.be/samv2/consult/company
- https://apps.samdb.ehealth.fgov.be/samv2/consult/compounding
- https://apps.samdb.ehealth.fgov.be/samv2/consult/rmb
- https://apps.samdb.ehealth.fgov.be/samv2/consult/ref
- https://apps.samdb.ehealth.fgov.be/samv2/consult/nonmedicinal
- https://apps.samdb.ehealth.fgov.be/samv2/dics/legacy (CIVICS - Chapter IV)

## Tasks

### 1. WSDL Analysis
For each consultation endpoint:
- Fetch and parse the WSDL
- List all available operations
- Document input parameters (name, type, required/optional)
- Document response structure

### 2. Data Model Mapping
Document the medication hierarchy:
- VTM (Virtual Therapeutic Moiety) — active substances
- VMP (Virtual Medicinal Product) — generic products
- AMP (Actual Medicinal Product) — branded products
- AMPP (Actual Medicinal Product Package) — packages with CNK codes

For each entity, document:
- Key fields and their meaning
- Relationships to other entities
- Identifiers used (CNK, VMP codes, etc.)

### 3. Working Examples
For each relevant operation, provide:
- A working SOAP request (XML)
- An actual response from the API (XML)
- Explanation of key fields in the response

Priority operations to document:
- findAmp / findAmpp — search branded products
- findVmp / findVtm — search generic products
- findReimbursement — get reimbursement info
- findChapterIV — get Chapter IV restrictions
- findIngredient — get ingredients
- findCompany — search companies
- findFormula — magistral preparations
- findCommentedClassification — BCFI categories (not WHO ATC)

### 4. Error Handling
- Document common error responses
- Note any rate limiting behavior
- Document what happens with invalid inputs

### 5. Practical Notes
- Note any quirks or inconsistencies discovered
- Document which fields support which languages
- Note any pagination patterns
- Document date/time formats used

## Output Format

Produce a single markdown file `soap-reference.md` with the following structure:

```
# SAM v2 SOAP API Reference

## Data Model
[Entity descriptions and relationships]

## Endpoints

### [Endpoint Name]
- URL
- Operations

#### [Operation Name]
- Description
- Input parameters (table)
- Response structure
- Example request (XML)
- Example response (XML)

## Error Handling
[Common errors and their meaning]

## Notes
[Quirks, pagination, language support, etc.]
```

## Verification

- Every example request must be actually executed against the API
- Every example response must be a real response (not fabricated)
- If an endpoint is unavailable or returns errors, document that fact
- Test at least one search with results and one with no results for each operation
