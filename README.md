# MedSearch

Belgium SAM v2 medication database search application.

## Database Sync

Three scripts populate the PostgreSQL database. All require `DATABASE_URL` environment variable.

### SAM Data Sync

Downloads and imports SAM XML exports (medications, pricing, reimbursement).

```bash
# Full sync (downloads ~300MB XML export)
bun run scripts/sync-sam-database.ts --verbose

# Using existing XML files in data/sam-export/
bun run scripts/sync-sam-database.ts --skip-download --verbose

# Dry run (validate without writing)
bun run scripts/sync-sam-database.ts --dry-run
```

### Excipient Sync

Extracts excipient data from SmPC PDFs. Run after SAM sync.

Requires `pdftotext` (poppler-utils):
```bash
# Ubuntu/Debian
sudo apt install poppler-utils

# macOS
brew install poppler
```

```bash
# Full sync (takes hours - thousands of PDFs)
bun run scripts/sync-excipient-database.ts --verbose

# Test with limited set
bun run scripts/sync-excipient-database.ts --limit=100 --verbose

# Resume interrupted sync
bun run scripts/sync-excipient-database.ts --resume --verbose
```

### Search Index Extended

Populates `search_index_extended` table for advanced filters (Chapter IV, delivery environment, medicine type). Use this for space-constrained databases where the full SAM sync exceeds storage limits.

```bash
bun run scripts/populate-search-index-extended.ts
```
