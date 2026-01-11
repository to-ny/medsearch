# MedSearch

A web application for searching Belgium's medication database (SAM v2). Search for medications, compare prices, check reimbursement status, and find generic equivalents.

## Features

- **Medication Search**: Search by name, CNK code, or active ingredient
- **Price Comparison**: Compare prices between generic equivalents
- **Reimbursement Info**: View Belgian health insurance reimbursement details
- **Ingredient Check**: View active ingredients and allergen warnings
- **Company Browser**: Browse pharmaceutical companies
- **Multi-language**: Support for EN, NL, FR, DE

## Quick Start

### Prerequisites

- Node.js 18+ or Bun 1.0+
- Bun (recommended) or npm 9+

### Setup (< 15 minutes)

```bash
# Clone the repository
git clone <repository-url>
cd medsearch

# Install dependencies
bun install

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun run build` | Build for production |
| `bun start` | Start production server |
| `bun lint` | Run ESLint |
| `bun typecheck` | Run TypeScript type checking |
| `bun run test` | Run unit/integration tests with coverage |
| `bun test:watch` | Run tests in watch mode |
| `bun test:e2e` | Run Playwright E2E tests |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│  Pages                          │  API Routes               │
│  ────────────────────────       │  ─────────────────────    │
│  /                  (search)    │  /api/medications/search  │
│  /medication/[cnk]  (detail)    │  /api/medications/[cnk]   │
│  /compare           (compare)   │  /api/reimbursement       │
│  /companies         (browse)    │  /api/companies           │
├─────────────────────────────────────────────────────────────┤
│                    SOAP Service Layer                        │
│  ─────────────────────────────────────────────────────────  │
│  Server-side only: XML construction, SOAP calls, parsing    │
│  Frontend receives JSON only                                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Directories

```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/            # REST API endpoints (SOAP proxy)
│   ├── medication/     # Medication detail page
│   ├── compare/        # Price comparison page
│   └── companies/      # Company browser
├── components/          # React components
│   ├── ui/             # Base UI components
│   ├── search/         # Search-related components
│   └── medication/     # Medication display components
├── lib/                 # Core libraries
│   ├── soap/           # SOAP client, XML builder/parser
│   ├── services/       # Business logic services
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   └── storage/        # Local storage abstraction
└── hooks/               # React hooks for data fetching
```

## Data Source

All medication data comes from Belgium's official [SAM v2 database](https://www.vas.ehealth.fgov.be/samv2/) (Authentic Source of Medicines), maintained by the FAMHP.

### API Endpoints Used

| Feature | SOAP Operation | Endpoint |
|---------|---------------|----------|
| Search by name | findAmp | DICS v5 |
| Search by CNK | findAmp (FindByDmpp) | DICS v5 |
| Generic equivalents | findVmp → findAmp | DICS v5 |
| Reimbursement | findReimbursement | RMB |
| Companies | findCompany | Company |

### Caching Strategy

| Data Type | Cache Duration |
|-----------|---------------|
| Medication search | 1 hour |
| Medication detail | 1 hour |
| Reimbursement | 24 hours |
| Company data | 24 hours |

## Testing

### Unit Tests

```bash
bun run test              # Run once with coverage
bun run test:watch        # Watch mode
```

Coverage target: >80%

### E2E Tests

```bash
bun test:e2e              # Run all browsers
bun test:e2e:ui           # Interactive UI mode
```

## Quality Gates

All checks run on every commit via GitHub Actions:

- ESLint: Zero errors
- TypeScript: Zero errors
- Build: Completes successfully
- Unit tests: >80% coverage
- E2E tests: All pass
- Lighthouse accessibility: >90
- Lighthouse performance: >90

## Tech Stack

| Concern | Technology |
|---------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Data Fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Playwright |
| SOAP Handling | fast-xml-parser |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun lint && bun typecheck && bun run test`
5. Submit a pull request

## License

MIT

## Disclaimer

This application is for informational purposes only. Always consult a healthcare professional for medical advice. Data is provided by the Belgian SAM database and may not reflect real-time availability or pricing.
