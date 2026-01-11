# MedSearch: Requirements

## Project Overview

"MedSearch" is a web application that makes Belgium's official medication database (SAM v2) accessible to ordinary people. The app consumes public SOAP API endpoints from the Belgian eHealth platform and presents the data in a user-friendly interface.

## Functional Requirements

### Medication Search
- Search medications by brand name, generic name, active ingredient, or CNK code
- Fuzzy matching for common misspellings
- Barcode/CNK scanning from medication packaging
- Search results display relevant product information at a glance

### Generic ↔ Brand Mapping
- Show all brands containing the same active ingredient at the same strength
- Price comparison across equivalent products
- Highlight cheapest option among equivalents

### Reimbursement Information
- Display reimbursement category (A, B, C, Cs, Cx, Fa, Fb) per product
- Calculate estimated patient out-of-pocket cost based on patient status (standard vs enhanced reimbursement)
- For Chapter IV medications: explain restrictions in plain language
- Show required conditions, eligible prescriber types, prior treatment requirements

### Ingredient & Allergen Checking
- Display complete list of active ingredients and excipients
- Flag common allergens: lactose, gluten, colorants, aspartame
- Search for alternatives excluding specific ingredients

### Price Transparency
- Display official public prices
- Compare price-per-unit across pack sizes
- Indicate "cheap molecule" status where applicable

### Magistral Preparations
- Browse official compounding formulas
- Look up ingredients and standard dosing

### Company & Product Browser
- Browse pharmaceutical companies in Belgium
- View company portfolios
- Display authorization status and market availability

## Non-Functional Requirements

### Performance
- Search results within 2 seconds
- Responsive UI during API calls (loading states)
- Caching to reduce redundant API calls

### Accessibility
- WCAG 2.1 AA compliance
- Screen reader compatible
- Keyboard navigation
- High contrast mode

### Browser Support
- Latest Chrome, Firefox, Safari, Edge
- Mobile responsive
- Core functionality works without JavaScript (progressive enhancement)

### Localization
- Interface in English, Dutch, French, German
- Medication data in user's preferred language where available

## Constraints

- No user accounts or authentication
- No persistent user data storage
- No backend database — all data from SAM API
- Read-only operations only
- Must respect API rate limits
