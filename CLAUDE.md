# CLAUDE.md

Next.js App Router + PostgreSQL application for Belgium's SAM v2 medication database.

## Commands

```bash
bun lint && bun typecheck && bun run test   # Run after code changes
```

## Code Organization

- Server-only code goes in `src/server/` (use `import 'server-only'`)
- Read `src/server/db/schema.sql` when working with database or needing data structure context

## Scripts

- `scripts/sync-sam-database.ts` - Syncs SAM XML exports to PostgreSQL (upsert pattern, filters expired records)
- `scripts/sync-excipient-database.ts` - Extracts excipients from SmPC PDFs to PostgreSQL (run after SAM sync)

## Domain

- **Hierarchy:** VTM → VMP → AMP → AMPP (substance → generic → brand → package)
- **CNK:** 7-digit Belgian pharmacy code on packaging
- **Reimbursement:** A (100%), B (75%), C (50%), Cs/Cx (special), Fa/Fb (lump-sum)
- **Chapter IV:** Restricted drugs requiring prior authorization
- **Excipients:** From SmPC PDFs, not SAM exports (`amp_excipient` table)
