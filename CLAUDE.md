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

### Working with SOAP APIs

SAM SOAP responses can be large and freeze the terminal. Always use safeguards:

- Set Bash tool `timeout` parameter (max 15000ms)
- Use `--max-time 10` on curl to abort slow requests
- Limit output with `head -c 5000` (bytes) or `head -n 50` (lines)
- Extract only relevant data with `grep -o 'pattern'`
- Suppress errors with `2>/dev/null`
- Test incrementally: one small query at a time

### Debugging SOAP Issues

When debugging SOAP-related problems:

1. **Test the actual API** - Don't rely only on unit tests. Use `curl` to hit the real endpoint:
   ```bash
   curl -s "http://localhost:3000/api/medications?company=5782" | head -c 500
   ```

2. **Test the SOAP endpoint directly** - To understand what the SAM API returns:
   ```bash
   curl -s "https://apps.samdb.ehealth.fgov.be/samv2/dics/v5" -X POST \
     -H "Content-Type: text/xml" -d '<soap request>' | head -c 1000
   ```

3. **Remember HTTP 500 ≠ failure** - SAM returns HTTP 500 for all SOAP faults, including "no results" business errors. Always check the response body.

4. **Trace the full chain** - Issues can occur at: SOAP client → XML parser → service → API route → frontend. Test each layer.

5. **Check soap-reference.md** - Contains known error codes and their meanings.

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

## Internationalization (i18n)

This app supports 4 languages: English, Dutch (nl), French (fr), German (de).

### Principles

1. **All user-facing text must be translated** - Never hardcode strings in components. Use the translation system for everything users see.

2. **API data uses a fallback pattern** - SAM API text availability varies by data and is not guaranteed for any language. When displaying API text:
   - If available in selected language → show just that text
   - If NOT available → show all available translations with language badges

   This ensures users always see the information, regardless of which languages the API returned.

## Server/Client Boundaries

Server-only code (`src/lib/soap/`, `src/lib/services/`) uses `import 'server-only'` - build fails if imported from client components. Shared code (`src/lib/types/`, `src/lib/utils/`) can be imported anywhere. When adding server code, add `import 'server-only';` as first line.
