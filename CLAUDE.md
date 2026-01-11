# CLAUDE.md

## Project

Next.js 16 App Router application for searching Belgium's SAM v2 medication database. REST API routes proxy SOAP services to the frontend.

## Commands

```bash
bun install          # Install dependencies
bun dev              # Dev server at localhost:3000
bun run build        # Production build
bun lint && bun typecheck && bun run test  # Quality check (run before committing)
```

## Domain

For full documentation, glossary, and SOAP API reference, see **soap-reference.md**.

### Quick Reference

- **Medication hierarchy:** VTM (substance) → VMP (generic) → AMP (branded) → AMPP (package)
- **CNK code:** 7-digit Belgian pharmacy identifier on packaging
- **Reimbursement categories:** A (100%), B (75%), C (50%), Cs/Cx (special), Fa/Fb (lump-sum)
- **Chapter IV:** Restricted drugs requiring prior authorization
- **Excipients/Allergens:** Inactive ingredients parsed from SmPC documents (not available in SOAP API)

## Testing

Run all tests: `bun run test` (required before committing)

### Unit Tests (Vitest)
- Location: `tests/unit/*.test.ts`
- Mock SOAP responses using fixtures from `tests/fixtures/soap/`
- Add tests for: services, utils, XML parsing logic

### E2E Tests (Playwright)
- Location: `tests/e2e/*.spec.ts`
- Tests run against production build
- Add tests for: user flows, UI behavior, accessibility
