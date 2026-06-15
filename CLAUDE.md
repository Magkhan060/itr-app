# ITR App — Claude Project Instructions

## Project Overview
A full-stack Indian Income Tax Return (ITR) filing application.
Supports all ITR form types (ITR-1 through ITR-7) gated behind feature flags.

## Monorepo Structure
\```
itr-app/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Node.js backend
├── packages/
│   ├── shared-types/ # Shared JS types & tax constants
│   └── feature-flags/# Central feature flag definitions
└── CLAUDE.md
\```

## Tech Stack

### Frontend (apps/web)
- React 18 (Vite)
- Ant Design (ANTD) — primary UI component library
- Tailwind CSS — utility styling (configured to not conflict with ANTD)
- Zustand — global state management
- React Router v6 — routing
- Axios — API calls

### Backend (apps/api)
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- Zod for request validation

### Shared (packages/)
- feature-flags/flags.js — single source of truth for all feature flags
- shared-types/ — ITR form schemas, tax constants, enums

## Feature Flag Rules
- ALL feature-gated routes on the backend must use `requireFeature()` middleware
- ALL feature-gated UI must use the `useFeature()` hook before rendering
- Never hardcode feature availability — always reference flags.js
- Flag keys follow SCREAMING_SNAKE_CASE: ITR_1, FORM_16_PARSER, etc.

## ITR Module Conventions
Each ITR type (itr1 through itr7) follows this structure:

### Frontend module (apps/web/src/modules/itrN/)
\```
itrN/
├── index.jsx          # Entry point, checks feature flag
├── components/        # Form sections (PersonalInfo, IncomeDetails, etc.)
├── hooks/             # Module-specific hooks
├── utils/             # Validation, formatters
└── itrN.schema.js     # Zod schema matching backend
\```

### Backend module (apps/api/src/modules/itr/types/)
\```
itrN.model.js          # Mongoose model
itrN.validator.js      # Zod validation schema
\```

## Code Style
- Use ES Modules (import/export) throughout — no CommonJS require()
- Async/await only — no raw Promise chains
- All API responses follow this envelope:
\```json
{
  "success": true,
  "data": {},
  "message": "string"
}
\```
- Error responses:
\```json
{
  "success": false,
  "error": "string",
  "code": "ERROR_CODE"
}
\```
- Controllers are thin — business logic lives in services
- No inline MongoDB queries in controllers or routes

## Naming Conventions
- Files: kebab-case (tax-engine.service.js)
- React components: PascalCase (IncomeDetails.jsx)
- Variables/functions: camelCase
- Constants/flags: SCREAMING_SNAKE_CASE
- MongoDB collections: lowercase plural (users, itr_submissions)

## Environment Variables

### apps/api/.env
\```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/itr-app
JWT_SECRET=
JWT_EXPIRES_IN=7d
NODE_ENV=development
ITD_API_BASE_URL=
ITD_API_KEY=
ENCRYPTION_KEY=
\```

### apps/web/.env
\```
VITE_API_BASE_URL=[localhost](http://localhost:5000/api)
\```

## Domain Rules (Critical — Read Before Writing Tax Logic)
- Always support BOTH old and new tax regimes
- Tax slabs are versioned by financial year — never hardcode, always import from
  packages/shared-types/slabs/fyYYYY-YY.js
- PAN format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
- Aadhaar: 12-digit numeric, validate with Luhn-like verhoeff check
- All monetary values stored in PAISE (integer) in DB, converted to INR in API responses
- Assessment Year = Financial Year + 1 (FY 2025-26 → AY 2026-27)
- TDS entries must always carry: TAN, deductor name, amount, quarter

## Security Rules
- Never log PAN, Aadhaar, or bank account numbers
- All PII fields in MongoDB must be encrypted at rest (use encryption.js util)
- JWT must be verified on every protected route via auth.middleware.js
- File uploads (Form 16, 26AS) max 5MB, PDF/XML only

## Testing
- Unit tests: Vitest (frontend), Jest (backend)
- Test files co-located: auth.service.test.js alongside auth.service.js
- Always write tests for tax engine computation logic — these are critical

## Git Conventions
- Branch naming: feature/itr1-personal-info, fix/pan-validator, chore/setup-monorepo
- Commit format: feat(itr1): add personal info form
  Types: feat, fix, chore, refactor, test, docs
- Never commit .env files

## What NOT to Do
- Don't install unnecessary packages — check if ANTD or a utility already covers it
- Don't bypass feature flags for "quick testing" — use the flag system
- Don't write raw SQL/Mongo queries outside service files
- Don't store tax computation results without linking to a filing session ID
