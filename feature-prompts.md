# Feature Implementation Prompts

These prompts are ready to feed to an implementation agent. Each is self-contained with context, technical details, and acceptance criteria.

---

## Feature 1: Allergen Warnings Display

### Context
The application has allergen detection logic already implemented in `src/lib/utils/allergens.ts`. This includes:
- `COMMON_ALLERGENS` mapping (lactose, gluten, aspartame, sulfites, etc.)
- `findAllergens()` function that scans ingredients
- `getMedicationWarnings()` that returns warning objects with levels (info/warning/danger)

However, this logic is **not exposed anywhere in the UI**. The medication detail page shows ingredients but doesn't warn users about common allergens.

### Task
Add allergen warning display to the medication detail page (`src/app/medication/[cnk]/page.tsx`).

### Requirements
1. After loading medication data, call `getMedicationWarnings()` with the medication's components
2. Display warnings prominently near the top of the page (after the heading, before other content)
3. Use appropriate visual styling:
   - `info` level: Blue badge/alert for common allergens (informational)
   - `warning` level: Yellow/amber alert
   - `danger` level: Red alert for excluded ingredients
4. Each warning should show the allergen name and which ingredient contains it
5. Make warnings dismissible but visible by default
6. Add translations for warning messages in `src/messages/{en,nl,fr,de}.json`

### Technical Details
- Import from: `@/lib/utils/allergens`
- The `MedicationComponent[]` is available as `medication.components`
- Use existing UI components from `src/components/ui/` for consistent styling
- Consider creating a new `AllergenWarnings` component in `src/components/medication/`

### Acceptance Criteria
- [ ] Allergen warnings appear on medication detail pages
- [ ] Warnings are visually distinct based on severity level
- [ ] All 4 languages have translated warning text
- [ ] Warnings don't break the page layout on mobile
- [ ] Unit tests cover the warning display logic

---

## Feature 2: ATC Classification Browser

### Context
The SAM API supports browsing medications by ATC (Anatomical Therapeutic Chemical) classification. The XML builder already exists at `src/lib/soap/xml-builder.ts` (`buildFindAtcRequest` function, lines 219-240).

ATC codes are hierarchical:
- Level 1: Anatomical main group (e.g., "C" = Cardiovascular)
- Level 2: Therapeutic subgroup (e.g., "C09" = Agents acting on renin-angiotensin)
- Level 3-5: More specific classifications

This feature is mentioned in `requirements.md` but not implemented.

### Task
Create a new ATC browser feature that lets users explore medications by therapeutic category.

### Requirements
1. Create a new page at `/atc` for browsing ATC classifications
2. Add navigation link to the home page (`src/app/page.tsx`)
3. Implement the service layer to call SAM's `FindCommentedClassification` operation
4. Create API route at `/api/atc` with endpoints:
   - `GET /api/atc` - List top-level ATC categories
   - `GET /api/atc?code=C` - Get subcategories and medications for a code
5. Build a hierarchical browser UI:
   - Show clickable categories that expand to show subcategories
   - At leaf level, show medications in that category with links to detail pages
6. Add breadcrumb navigation within the ATC hierarchy

### Technical Details

**New files needed:**
- `src/app/atc/page.tsx` - Main ATC browser page
- `src/app/api/atc/route.ts` - API route
- `src/lib/services/atc.ts` - Service layer
- `src/hooks/useAtcBrowser.ts` - React Query hook

**XML Builder already exists:**
```typescript
buildFindAtcRequest({ atcCode?: string; anyNamePart?: string })
```

**XML Parser needs extension:**
- Add `parseAtcResponse()` function to extract classification data

**Response structure from SAM:**
```xml
<CommentedClassification>
  <CommentedClassificationCode>C</CommentedClassificationCode>
  <Title xml:lang="en">Cardiovascular system</Title>
  <Content xml:lang="en">...</Content>
  <PosologyNote xml:lang="en">...</PosologyNote>
</CommentedClassification>
```

### Acceptance Criteria
- [ ] `/atc` page shows top-level ATC categories
- [ ] Clicking a category shows its subcategories
- [ ] Leaf categories show associated medications
- [ ] Medications link to their detail pages
- [ ] Breadcrumb shows current position in hierarchy
- [ ] Loading and error states are handled
- [ ] Page is accessible (keyboard navigation, screen reader)
- [ ] All 4 languages supported

---

## Feature 3: Price-per-Unit Comparison

### Context
The application shows medication prices and allows comparing equivalent products. However, it doesn't calculate price-per-unit, which is essential for fair comparison. A 30-tablet box at €15 (€0.50/unit) might be cheaper than a 20-tablet box at €12 (€0.60/unit).

Pack size parsing already exists in `src/lib/utils/format.ts` (`parsePackSize` function).

### Task
Add price-per-unit calculation and display throughout the application.

### Requirements
1. Create a utility function `calculatePricePerUnit(price: number, packSize: string): number | null`
2. Display price-per-unit on:
   - Medication detail page (each package)
   - Price comparison component
   - Search results (optional, if space permits)
3. In price comparison, sort by price-per-unit (not total price) as the default
4. Highlight the best value option (lowest price-per-unit)
5. Handle edge cases:
   - Unknown pack sizes (show "N/A")
   - Mixed unit types (tablets vs ml) - only compare same types
   - Free items or zero prices

### Technical Details

**Modify these files:**
- `src/lib/utils/price.ts` - Add `calculatePricePerUnit()` function
- `src/lib/utils/format.ts` - May need to extend `parsePackSize()` to return numeric count
- `src/components/medication/PriceComparison.tsx` - Show per-unit prices, sort by them
- `src/app/medication/[cnk]/page.tsx` - Show per-unit in package list

**`parsePackSize` returns:**
```typescript
{ count: number | null; unitKey: string; rawValue: string; displayRaw: boolean }
```

Use `count` and `unitKey` to calculate and display per-unit price.

**Display format examples:**
- "€0.45/tablet"
- "€0.12/ml"
- "€2.50/dose"

### Acceptance Criteria
- [ ] Price-per-unit shown on medication detail page for each package
- [ ] Price comparison sorts by per-unit price by default
- [ ] "Best value" indicator on cheapest per-unit option
- [ ] Handles unknown pack sizes gracefully
- [ ] Unit tests for calculation edge cases
- [ ] Translations for unit labels

---

## Feature 4: Company Portfolio View

### Context
The application has a company browser at `/companies` that shows company details. The SAM API supports `FindAmp (FindByCompany)` which returns all medications from a specific company. The XML builder already supports this via `companyActorNr` parameter.

Currently, company pages only show contact information but not the products they manufacture.

### Task
Add a "View Products" feature to company pages showing all medications from that company.

### Requirements
1. On company detail page (`/companies/[actorNr]`), add a "Products" section
2. Show list of all medications manufactured by the company
3. Each medication links to its detail page
4. Show basic info: name, CNK, price, reimbursement status
5. Add pagination or "load more" if company has many products
6. Add product count to company cards in the list view

### Technical Details

**API already supports this:**
```typescript
// In src/lib/soap/xml-builder.ts
buildFindAmpRequest({ companyActorNr: "123456" })
```

**Modify these files:**
- `src/app/api/companies/[actorNr]/route.ts` - Add `?include=products` query param
- `src/lib/services/company.ts` - Add `getCompanyProducts(actorNr)` function
- `src/app/companies/[actorNr]/page.tsx` - Display products section
- `src/components/company/CompanyCard.tsx` - Show product count (optional)

**New hook needed:**
- `src/hooks/useCompanyProducts.ts` - Fetch products with React Query

### Acceptance Criteria
- [ ] Company detail page shows "Products" section
- [ ] Products displayed as cards/list with key info
- [ ] Each product links to medication detail page
- [ ] Loading state while fetching products
- [ ] Empty state if company has no products in database
- [ ] Pagination or infinite scroll for large portfolios
- [ ] Product count shown on company cards (nice-to-have)

---

## Feature 5: Chapter IV Restrictions Explanation

### Context
Some medications in Belgium require "Chapter IV" prior authorization. This means the prescriber must submit a request explaining why the patient needs this specific medication. The SAM API provides Chapter IV data including:
- Conditions that qualify for reimbursement
- Required prior treatments
- Eligible prescriber types
- Authorization validity period

This is specifically mentioned in `requirements.md`: "For Chapter IV medications: explain restrictions in plain language"

The RMB (reimbursement) endpoint returns Chapter IV paragraph references. The legacy CIVICS endpoint (`dics/legacy`) provides the full restriction text.

### Task
Add Chapter IV restriction explanations to medications that require prior authorization.

### Requirements
1. Detect Chapter IV medications from reimbursement data (look for paragraph references)
2. Fetch Chapter IV details from the CIVICS/legacy endpoint
3. Display restrictions in a clear, user-friendly format on medication detail page:
   - What conditions qualify
   - What treatments must be tried first
   - Who can prescribe (GP, specialist, etc.)
   - How long authorization lasts
4. Use plain language, not legal/medical jargon
5. Add a visual indicator (badge/icon) on search results for Chapter IV meds

### Technical Details

**New SOAP endpoint needed:**
```
https://apps.samdb.ehealth.fgov.be/samv2/dics/legacy
```

**New files:**
- `src/lib/soap/xml-builder.ts` - Add `buildFindChapterIVRequest()`
- `src/lib/soap/xml-parser.ts` - Add `parseChapterIVResponse()`
- `src/lib/services/chapterIV.ts` - Service layer
- `src/app/api/chapter-iv/route.ts` - API route
- `src/components/medication/ChapterIVInfo.tsx` - Display component

**Integration points:**
- `src/app/medication/[cnk]/page.tsx` - Show Chapter IV section if applicable
- `src/components/search/SearchResultCard.tsx` - Add Chapter IV badge

**Data to extract:**
- Paragraph number and version
- Indication text (conditions)
- Prior treatment requirements
- Prescriber restrictions
- Duration of authorization

### Acceptance Criteria
- [ ] Chapter IV section appears on qualifying medications
- [ ] Restrictions explained in plain language (not raw legal text)
- [ ] Chapter IV badge shown in search results
- [ ] All 4 languages supported
- [ ] Graceful handling if Chapter IV data unavailable
- [ ] Links to official documentation (if available)

---

## Implementation Order Recommendation

1. **Feature 1: Allergen Warnings** - Quickest win, code already exists
2. **Feature 3: Price-per-Unit** - High value, relatively simple
3. **Feature 4: Company Portfolio** - API already supports it
4. **Feature 2: ATC Browser** - New page but builder exists
5. **Feature 5: Chapter IV** - Most complex, new endpoint needed

Each feature is independent and can be implemented in parallel by different agents.
