# ITR App — Claude Project Instructions

## Project Overview
A full-stack Indian Income Tax Return (ITR) filing application.
Supports all ITR form types (ITR-1 through ITR-7) gated behind feature flags.
Primary users: individual taxpayers (self-service) and Chartered Accountants (filing on behalf of clients).

## Monorepo Structure
```
itr-app/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Node.js backend
├── packages/
│   ├── shared-types/ # Shared JS types & tax constants
│   └── feature-flags/# Central feature flag definitions
└── CLAUDE.md
```

## Tech Stack

### Frontend (apps/web)
- React 18 (Vite)
- Ant Design (ANTD) — primary UI component library
- Tailwind CSS — utility styling (configured to not conflict with ANTD)
- Zustand — global state management
- React Router v6 — routing
- Axios — API calls (global response interceptor unwraps `res.data`; see Axios Gotcha below)

### Backend (apps/api)
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication (role embedded in token — no DB lookup per request)
- Zod for request validation

### Shared (packages/)
- feature-flags/flags.js — single source of truth for all feature flags
- shared-types/ — ITR form schemas, tax constants, enums

## Feature Flag Rules
- ALL feature-gated routes on the backend must use `requireFeature()` middleware
- ALL feature-gated UI must use the `useFeature()` hook before rendering
- Never hardcode feature availability — always reference flags.js
- Flag keys follow SCREAMING_SNAKE_CASE: ITR_1, FORM_16_PARSER, CA_PORTAL, EFILING_DIRECT, etc.

## ITR Module Conventions
Each ITR type (itr1 through itr7) follows this structure:

### Frontend module (apps/web/src/modules/itrN/)
```
itrN/
├── index.jsx          # Entry point, checks feature flag
├── components/        # Form sections (PersonalInfo, IncomeDetails, etc.)
├── hooks/             # Module-specific hooks
├── utils/             # Validation, formatters
└── itrN.schema.js     # Zod schema matching backend
```

### Backend module (apps/api/src/modules/itr/types/)
```
itrN.model.js          # Mongoose model
itrN.validator.js      # Zod validation schema
```

## Code Style
- Use ES Modules (import/export) throughout — no CommonJS require()
- Async/await only — no raw Promise chains
- All API responses follow this envelope:
```json
{
  "success": true,
  "data": {},
  "message": "string"
}
```
- Error responses:
```json
{
  "success": false,
  "error": "string",
  "code": "ERROR_CODE"
}
```
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
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/itr-app
JWT_SECRET=
JWT_EXPIRES_IN=7d
NODE_ENV=development
ENCRYPTION_KEY=                  # AES-256-CBC key for PII encryption (bank account, Aadhaar)
ITD_API_BASE_URL=                # Optional — ITD e-Filing API endpoint. Leave blank for mock mode.
ITD_API_KEY=                     # Optional — ITD ASP/ERI API key. Leave blank for mock mode.
GMAIL_USER=                      # Optional — Gmail address for approval emails
GMAIL_APP_PASSWORD=              # Optional — Gmail App Password (requires 2FA enabled)
TWILIO_ACCOUNT_SID=              # Optional — Twilio for SMS notifications
TWILIO_AUTH_TOKEN=               # Optional — Twilio auth token
TWILIO_FROM_NUMBER=              # Optional — Twilio sender number (+91...)
APP_URL=http://localhost:5173    # Base URL used in approval email links sent to clients
```

### apps/web/.env
```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Domain Rules (Critical — Read Before Writing Tax Logic)
- Always support BOTH old and new tax regimes
- Tax slabs are versioned by financial year — never hardcode, always import from
  packages/shared-types/slabs/fyYYYY-YY.js
- **AY 2026-27 / FY 2025-26 new regime rules (Budget 2025):**
  - Standard deduction: ₹75,000 (increased from ₹50,000 under old regime)
  - HRA exemption u/s 10(13A): NOT available under new regime
  - Home loan interest u/s 24(b): NOT available under new regime
  - Chapter VI-A deductions (80C, 80D, 80CCD1B, 80TTA, 80G etc.): NOT available under new regime
  - Old regime: standard deduction ₹50,000, all above deductions available
- PAN format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
- Aadhaar: 12-digit numeric — currently validated by regex; full Verhoeff algorithm is TODO
- All monetary values stored in INR (Number) in DB — the codebase uses INR end-to-end; do not silently mix units
- Assessment Year = Financial Year + 1 (FY 2025-26 → AY 2026-27)
- TDS entries must always carry: TAN, deductor name, amount, quarter
- Tax is always **recomputed server-side** on final submission — never trust client-submitted tax values

## Security Rules
- Never log PAN, Aadhaar, or bank account numbers
- PII encrypted at rest: bank account (`bankAccountEncrypted`) and Aadhaar (`aadhaarEncrypted`) use AES-256-CBC via `encryptPII()` / `decryptPII()` in filing.service.js
- The CA client model stores Aadhaar plain — it is encrypted at the filing level when ITR is submitted
- JWT must be verified on every protected route via auth.middleware.js
- Role is embedded in the JWT at login (`generateToken(userId, role)`) — role changes require re-login
- File uploads (Form 16, 26AS) max 5MB, PDF/XML only

## Axios Gotcha (Frontend)
The global Axios interceptor in `apps/web/src/services/api.js` does `(res) => res.data`, which means every `api.*` call returns the **HTTP response body** (`{ success, data, message }`) — not an Axios response object. Callers access `.data` to get the payload.

**Critical exception for blob downloads:** When using `{ responseType: "blob" }`, `res.data` in the interceptor IS the Blob. The call returns the Blob directly. Do NOT call `.data` on the result again:
```js
// CORRECT
const blob = await downloadFilingXML(filingId);
URL.createObjectURL(new Blob([blob], { type: "application/xml" }));

// WRONG — produces "undefined" file
const res = await downloadFilingXML(filingId);
URL.createObjectURL(new Blob([res.data], { type: "application/xml" }));
```

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
- Don't use `Card bordered={false}` — use `Card variant="borderless"` (ANTD v5)
- Don't access `.data` on blob API responses (see Axios Gotcha above)

---

## Completed Modules

### Authentication (`apps/api/src/modules/auth/`, `apps/web/src/pages/auth/`)
- Register with role selection: **Taxpayer** (`user`) or **CA** (`ca`)
- CA registration captures firm name and ICAI membership number
- Login returns JWT with role embedded (avoids per-request DB lookup)
- `auth.middleware.js` reads role from `decoded.role` — no `User.findById()` on every request
- `requireCA.middleware.js` guards all CA-only routes (returns 403 for non-CA)

### ITR-1 Filing — Self Service (`apps/web/src/pages/filing/itr1/`, `apps/api/src/modules/itr/`)
Full 4-step wizard (Personal Info → Income → Deductions → Tax Summary + Submit):

**Personal Info fields collected:**
- Full name, PAN (pre-filled, disabled), DOB, gender, residential status
- Father's name, Aadhaar (12-digit, encrypted at rest), mobile (Aadhaar-linked)
- Address line 1, city, PIN code
- Employer name, employer TAN
- Bank account number (encrypted at rest), IFSC code

**Income fields:**
- Gross salary, HRA received, professional tax u/s 16(iii), TDS deducted
- Interest income (FD/savings), other income

**Deductions (Chapter VI-A):**
- 80C, 80CCD(1B), 80D (self + parents), home loan interest, HRA exempt, LTA, 80TTA/TTB, 80G

**On submission:**
- Tax recomputed server-side via `compareRegimes()` — client tax values ignored
- Bank account and Aadhaar encrypted via `encryptPII()` before storing
- App-level acknowledgement number generated (format: `ITR1<timestamp><hex>`)
- Draft auto-saved on each step's "Next" click

**Dayjs gotcha:** `dateOfBirth` from DatePicker is a dayjs object — must call `.format("YYYY-MM-DD")` before spreading into the draft/submit payload to avoid circular reference warning.

### Tax Engine (`apps/api/src/modules/tax-engine/`)
- Computes old and new regime tax in parallel (`compareRegimes()`)
- Applies correct standard deduction (₹75K new / ₹50K old for AY 2026-27)
- Handles senior citizen (60+) and super senior citizen (80+) slab variants
- Computes HRA exemption (metro 50% / non-metro 40% of basic, min of three conditions)
- Surcharge, health & education cess, rebate u/s 87A
- Returns `betterRegime`, `savingsAmount`, and full breakdown for both regimes

### XML Generator (`apps/api/src/modules/efiling/xml-generator.js`)
Generates ITD-schema ITR-1 XML for manual upload or API submission. Sections:
`CreationInfo`, `PersonalInfo`, `Address`, `FilingStatus`, `ScheduleS`, `ScheduleHP`, `ScheduleOS`, `ScheduleVIA`, `ITR1_IncomeDeductions`, `ITR1_TaxComputation`, `TaxPaid`, `Refund`, `Verification`

**Regime-aware logic:**
- New regime: standard deduction = ₹75,000; HRA = 0; home loan interest = 0; all Chapter VI-A = 0; individual 80C/80D/etc. fields also zeroed
- Old regime: standard deduction = ₹50,000; all deductions apply
- AadhaarCardNo, MobileNo, ResidenceNo, PinCode, FatherName now populated from stored data

### Phase 2 XML Download (self-filing without ITD API)
- Route: `GET /api/filing/:id/xml` — gated by `ITR_1` flag (not `EFILING_DIRECT`)
- Frontend: `downloadFilingXML(id)` in `filing.service.js`
- ITR-1 success screen shows "Download ITR XML" button + 7-step guide to upload on incometax.gov.in
- Enables full filing workflow without ITD ERI/ASP registration

### e-Filing Module (`apps/api/src/modules/efiling/`, `apps/web/src/pages/filing/efiling/`)
3-step flow: Review → EVC → Submit to ITD. Feature-gated: `EFILING_DIRECT`.

**Mock mode** (default when `ITD_API_BASE_URL` / `ITD_API_KEY` absent):
- Any 6-digit OTP accepted for EVC
- Submission generates a mock ITR-V acknowledgement number
- Banner shown to user indicating mock mode

**Live mode** (ITD ERI/ASP credentials in .env):
- Calls ITD API: `generateEVC`, `validateEVC`, `submitReturn`
- Real ITR-V returned from ITD

EVC methods supported: Aadhaar OTP, Bank Account EVC, Net Banking.

### CA Portal (`apps/api/src/modules/ca/`, `apps/web/src/pages/ca/`)
Full CA workflow for filing ITR on behalf of clients. Feature-gated: `CA_PORTAL`.

**Client management:**
- `CAClient` model: identity (name, PAN, Aadhaar, DOB, gender, father's name), contact (email, mobile), address (line 1, city, PIN), employment (employer name/TAN), banking (account no, IFSC), notes
- CA can Add / Edit / View / soft-delete clients
- `/ca/clients` nav redirects to `/ca/dashboard` which contains the full client roster

**CA filing on behalf of client:**
- `CAITRFiling.jsx` — same ITR-1 form pre-populated from client record
- Stored with `preparedByCa: caId`, `caClientId: clientId`
- Unique filing index: `{ userId, caClientId, assessmentYear, itrType }` — allows one ITR per AY per (CA + client) combination

**Token-based approval workflow (no client login needed):**
1. CA clicks "Send for Approval" in `ClientWorkspace`
2. UUID approval token generated, stored on filing as `approvalToken`
3. Approval link (`/approve/<token>`) sent via email + SMS to client
4. Public `ApprovePage` shows full computation sheet — no auth required
5. Client clicks Approve or Request Changes; CA notified by email + SMS

**Approval page computation sheet shows:**
- Assessee details (name, PAN, AY, regime, employer, TAN)
- Income breakdown table (gross salary → standard deduction → net salary → other income → gross total)
- Chapter VI-A deductions (old regime only)
- Tax & refund summary (4 stats + bank account last 4 digits for refund confirmation)

**Notifications:**
- Email: Gmail nodemailer (`email.util.js`) with HTML templates
- SMS: Twilio (`sms.util.js`) with graceful mock fallback when credentials absent
- WhatsApp: deep-links (`wa.me/91<mobile>?text=...`) pre-filled with approval URL — no API needed
- All notification failures are non-fatal (logged, filing proceeds)

**CA Dashboard (`/ca/dashboard`):**
Pipeline stats: Total Clients, Pending Approval, Client Approved, e-Filed, No Filing Yet.
Searchable client table with filing status and approval status tags. Click-through to Client Workspace.

### Approval System (`apps/api/src/modules/approvals/`)
- `sendApprovalRequest(caId, filingId)` — generates token, emails + SMSes client
- `getApprovalSummary(token)` — public, returns enriched filing summary for the approval page
- `respondToApproval(token, { action, comment })` — public, records decision, notifies CA

### Refund Tracker (`apps/web/src/pages/filing/RefundTracker.jsx`)
End-to-end feature (simulated data). Selects from user's submitted filings, calls `GET /api/filing/:id/refund`.

6 simulated stages based on days since submission: Filed (day 0) → Verified (3) → Processing (15) → Determined (30) → Initiated (45) → Credited (60).

Shows: refund amount, progress %, days since filing, estimated credit date, full timeline.
Note: switches to real ITD API data when `EFILING_DIRECT` is live and ITD credentials are configured.

### Other Features
- **Tax Calculator** (`/calculator`) — Standalone regime comparison with inputs
- **Advance Tax Calculator** (`/advance-tax`) — Quarterly advance tax computation
- **Form 16 / Document Upload** — PDF upload, parsing, pre-fill drawer in ITR-1 form
- **Admin Panel** (`/admin`) — Admin-only area (role: "admin"), lazy-loaded
- **Dashboard** — Filing status, quick actions, recent activity

---

## Key Architectural Decisions

### ASP/ERI Model for ITD Filing
The platform registers as an ASP/ERI (e-Return Intermediary) with ITD — one API key in `.env` covers all filings by all users. Individual taxpayers and CA clients do not need their own ITD credentials. Taxpayers only provide EVC (OTP) to authorize their return.

**Current status:** Mock mode (no real ITD submission). Platform must register with ITD as ERI to go live with API filing. Phase 2 XML download works without registration.

### Three Filing Paths
1. **Phase 2 (current):** User submits form → downloads ITR XML → uploads manually to incometax.gov.in → verifies on ITD portal. No ITD registration needed.
2. **Phase 3 (planned):** Platform submits directly via ITD API. Requires ERI registration.
3. **CA path:** CA files on behalf of client → client approves via email link → CA handles EVC with client over phone.

### CA Phase 1: No Client Login
Clients are NOT onboarded as platform users. CA manages all client records. Client interaction is limited to: (a) receiving an approval email, (b) clicking Approve/Reject on the public token page. EVC OTP is coordinated verbally or via WhatsApp.

### Role in JWT
Role is embedded in the JWT at login (`generateToken(userId, role)`). `auth.middleware.js` reads `decoded.role` — no database lookup per request. **Tradeoff:** a role change (e.g., promoting a user to CA) takes effect only after the user logs in again.

### Server-Side Tax Recomputation
Client-submitted tax values are always discarded. The backend recomputes tax via `compareRegimes()` on every final submission. The stored `taxComputation` in the DB is authoritative.

### PII Encryption Strategy
`encryptPII()` / `decryptPII()` in `filing.service.js` handles both bank account and Aadhaar transparently:
- Before DB write: `bankAccountNo` → `bankAccountEncrypted`, `aadhaar` → `aadhaarEncrypted`
- After DB read: reverse mapping applied
- `efiling.service.js` decrypts both before XML generation
- CA client model stores Aadhaar plain (encrypted only at the filing stage)

---

## In Progress / Next Steps

### Immediate (blocking go-live)
1. **Aadhaar Verhoeff validation** — Currently only 12-digit regex. Full Verhoeff check algorithm required per domain rules. Should live in `packages/shared-types/validators/aadhaar.js` and be imported in both frontend form and backend Zod validator.
2. **Feature flag seed script** — `reset-flags.js` uses `$setOnInsert` and won't update flags already in MongoDB. Need a `force-update-flags.js` that uses `$set` unconditionally to activate `CA_PORTAL` and `EFILING_DIRECT` on existing databases.
3. **Gmail + Twilio credentials** — Set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TWILIO_*` in `apps/api/.env` for real email/SMS. App works without them (mock mode logs to console) but go-live needs real notifications.

### Near Term
4. **ITD ERI/ASP registration** — Apply on incometax.gov.in as an e-Return Intermediary. Once approved, set `ITD_API_BASE_URL` and `ITD_API_KEY` in `.env` to enable Phase 3 direct API filing.
5. **Multiple TDS entries** — Currently one employer per filing. Need to support multiple Form 16s (job change mid-year). The `tdsEntries` array schema exists in the model but the form only captures a single employer.
6. **Allowance breakdown in form** — Form uses single `grossSalary` field. For high-income filers with complex allowances (like the PDF example with separate Salary + HRA + AALLOWANCE), a detailed breakdown matching Form 16 Part B would be more accurate.
7. **26AS XML import** — Parse 26AS to pre-fill TDS entries, interest income, and capital gains. Endpoint and parser scaffolding to be added.
8. **CA Profile page** — CA should be able to update firm name, ICAI number, and optionally add their own ITD ASP credentials (falls back to platform `.env` key).

### Planned (Phase 2 CA Portal)
9. **Client-facing portal** — Clients onboarded as `user` role accounts to view their own filings, download ITR XML, track refund status — without needing CA involvement for read access.
10. **ITR-2 through ITR-7** — Only ITR-1 implemented. Other types gated by feature flags (`ITR_2`…`ITR_7`). Each needs its own model, validator, form wizard, and XML generator.
11. **Real ITD Refund API** — Replace simulated refund timeline with live ITD API call when ERI registration is complete.
12. **Advance tax payment tracking** — Link challan payments to filings; pre-fill from 26AS.
