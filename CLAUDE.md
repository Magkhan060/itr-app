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
- Register with role selection: **Taxpayer** (`taxpayer`) or **CA** (`ca_admin`)
- CA registration creates a `CAFirm` document (firm name, ICAI number) and links it via `user.caFirmId`
- Login returns JWT with role embedded (avoids per-request DB lookup)
- `auth.middleware.js` reads role from `decoded.role` — no `User.findById()` on every request
- `requireCA.middleware.js` guards all CA-only routes (currently `ca_admin`; will accept `ca_staff`/`ca_readonly` once Phase 2 ships)
- See **Role & Permission Model** below for the full role hierarchy

### ITR-1 Filing — Self Service (`apps/web/src/pages/filing/itr1/`, `apps/api/src/modules/itr/`)
Full 4-step wizard (Personal Info → Income → Deductions → Tax Summary + Submit):

**Personal Info fields collected:**
- Full name, PAN (pre-filled, disabled), DOB, gender, residential status
- Father's name, Aadhaar (12-digit, encrypted at rest), mobile (Aadhaar-linked)
- Address line 1, city, PIN code
- Employer name, employer TAN
- Bank account number (encrypted at rest), IFSC code

**Income fields:**
- Salary breakdown (Form 16 Part B style): basic salary, HRA received, special allowance, bonus — `grossSalary` is computed server-side as their sum, not entered directly
- Professional tax u/s 16(iii), TDS deducted
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
- `/ca/clients` and `/ca/dashboard` both redirect to `/dashboard`, which renders the CA Dashboard (`CADashboard.jsx`) for any `ca_*` role — see "Unified Dashboard Routing" below

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

**CA Dashboard (mounted at `/dashboard` for `ca_*` roles):**
Tabs: Clients (pipeline stats — Total Clients, Action Required, Pending Approval, Client Approved, e-Filed, No Filing Yet; searchable/sortable/filterable client table + Compliance Calendar sidebar), Team (firm roster + invites, `ca_admin`-gated controls), Settings (`ca_admin` only — firm name, ICAI number, ITD credentials).

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
- **Admin Panel** (mounted at `/dashboard` for `platform_admin` role) — Tabs: Overview (platform-management metrics only — no filing content), Users, Feature Flags, Audit Log, and File ITR (embeds the taxpayer `Dashboard.jsx` so admins can self-file)
- **Dashboard** — Filing status, quick actions, recent activity

---

## Key Architectural Decisions

### Unified Dashboard Routing
`/dashboard` is the single landing page for every role — there are no separate `/admin` or `/ca/dashboard` destinations anymore. `App.jsx`'s `DashboardRouter` role-dispatches what renders at that one URL:
- `platform_admin` → `AdminLayout` (Overview / Users / Feature Flags / Audit Log / File ITR tabs)
- `ca_admin` / `ca_staff` / `ca_readonly` → `CADashboard` (Clients / Team / Settings tabs)
- `taxpayer` → `Dashboard.jsx` (quick actions, available ITR forms, my filings)

`/admin`, `/ca/dashboard`, and `/ca/clients` still exist as routes but only as `<Navigate to="/dashboard" replace />` redirects, so old bookmarks/links keep working. `AppLayout`'s sidebar is trimmed to just **Dashboard** + **My Profile** for every role — Tax Calculator, Advance Tax, Refund Tracker, and the ITR-1..7 filing pages are still real routes, just reachable via tiles/links on the Dashboard itself rather than pinned to the sidebar.

The Admin's "File ITR" tab and a CA's self-filing both reuse the same `Dashboard.jsx` component (no forked copy) — `platform_admin` and `ca_admin` are also individuals with their own personal returns to file.

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

## Role & Permission Model

**Role hierarchy** (`apps/api/src/modules/auth/auth.model.js`):

| Role | Who | Notes |
|---|---|---|
| `platform_admin` | Platform staff | Full access — feature flags, all users, all CA firms. Provisioned manually via `make-admin.js`, not self-registrable |
| `platform_support` | Platform staff (Phase 5) | Reserved enum value — view-only ops/support role, not yet implemented |
| `taxpayer` | Individual filer | Self-service ITR filing, default role on registration |
| `ca_admin` | Registered CA (firm owner) | Self-registrable. Owns a `CAFirm` document. Full access to firm settings, team management, and the filing pipeline (draft → submit → approval → e-file). Can also self-file as a taxpayer |
| `ca_staff` | CA firm employee, invite-only | Can manage clients and prepare/edit ITR drafts. **Cannot** finalize submission, send for client approval, or e-file — those are `ca_admin`-only finalization steps |
| `ca_readonly` | CA firm employee, invite-only | View-only — can see the client roster and filing statuses, no create/edit/submit actions anywhere |

**CAFirm model** (`apps/api/src/modules/ca/ca-firm.model.js`): created automatically when a user registers as `ca_admin`. Holds `firmName`, `icaiMemberNo`, and the CA's own ITD ERI/ASP credentials (`itdApiBaseUrl`, `itdApiKeyEncrypted` — AES-256-CBC, same pattern as PII encryption). The `User` document only stores `caFirmId`, a reference to this firm.

- `ca-firm.service.js` exposes `createFirmForAdmin()`, `getFirmByAdminId()`, `getFirmById()`, `getCAFirmIdForUser()`, and `resolveOwnerUserId(userId, role)`.
- **`resolveOwnerUserId`** is the key to multi-user firms without a schema migration: `CAClient` and `Filing` still key off the CA Admin's individual `userId` (not `caFirmId`) exactly as in Phase 1. When a `ca_staff`/`ca_readonly` user calls a CA Portal endpoint, the controller resolves their `caFirmId` → firm → `adminUserId`, and uses *that* as the effective owner ID for every CAClient/Filing query. `ca_admin` resolves to themselves trivially. This means every CA User in a firm transparently shares the same client roster and filings, with zero changes to the CAClient/Filing schemas or their unique indexes.
- `preparedByCa` on `Filing` is set to the **acting** user (whoever actually saved the draft/submitted), not the resolved owner — so audit trail (and `efiling.service.js`'s per-CA ITD credential lookup, which reads `preparedByCa`'s `caFirmId`) reflects who really did the work.
- Three permission middlewares, applied per-route in `ca.routes.js` / `approval.routes.js`:
  - `requireCA.middleware.js` — any of `ca_admin`/`ca_staff`/`ca_readonly` (view access to the CA Portal)
  - `requireCAWrite.middleware.js` — `ca_admin`/`ca_staff` (client CRUD, draft save) — blocks `ca_readonly`
  - `requireCAAdmin.middleware.js` — `ca_admin` only (submit ITR1, send for approval, e-file, firm settings, team management)
- Self-registration only accepts `taxpayer` or `ca_admin` (`auth.validator.js`). `ca_staff`/`ca_readonly` are invite-only (see below). `platform_admin` is provisioned via `node apps/api/src/scripts/make-admin.js <PAN>`.

**CA User invites** (`apps/api/src/modules/ca/ca-invite.*`, public routes at `/api/invites`):
- `ca_admin` invites by email + role (`ca_staff` or `ca_readonly`) from the CA Dashboard → Team tab. Generates a UUID token, 7-day expiry, emails a link via `caInviteEmail()` template.
- Public `GET /api/invites/:token` returns invite info (email, role, firm name) for the invite-acceptance page; `POST /api/invites/:token/accept` registers the new user with the invited role + `caFirmId`, auto-logs them in (same response shape as `registerUser`).
- Frontend: `apps/web/src/pages/auth/JoinFirm.jsx` at `/join-firm/:token` (public route, no auth) — mirrors `ApprovePage`'s public-token pattern but is a registration form instead of an approval form.
- CA Dashboard → Team tab (`CATeamPanel` in `CADashboard.jsx`) lists firm members + pending invites; `ca_admin` can change a member's role between `ca_staff`/`ca_readonly`, deactivate/reactivate members, and revoke pending invites. Visible (read-only) to all CA roles; write controls only render for `ca_admin`.

**Migration:** `apps/api/src/scripts/migrate-roles-phase1.js` — one-time, idempotent script that renames `user→taxpayer`, `admin→platform_admin`, `ca→ca_admin` (+ creates a `CAFirm` per existing CA and moves `caFirmName`/`caMemberNo`/`caItdApiBaseUrl`/`caItdApiKeyEncrypted` off the `User` document onto it). Must be run once against any pre-Phase-1 database. No further migration is needed for Phase 2 — `ca_staff`/`ca_readonly` users are created directly with `caFirmId` set via the invite flow.

---

## In Progress / Next Steps

### Immediate (blocking go-live)
1. ~~Aadhaar Verhoeff validation~~ — Done. `packages/shared-types/validators/aadhaar.js` exports `isValidAadhaarChecksum()` + `AADHAAR_REGEX`. Wired into the backend Zod schema (`filing.validator.js`, via `.refine()`) and both frontend forms that collect Aadhaar (`ITR1Filing.jsx`, `AddEditClient.jsx`, via a custom AntD form rule). Unit tests in `apps/api/src/modules/itr/aadhaar.validator.test.js` cover the known-valid vector, altered check digit, every single-digit mutation, and adjacent transposition.
2. ~~Feature flag seed script~~ — Already solved by `reset-flags.js`, which uses `$set` unconditionally (verified). Two distinct, both-correct mechanisms exist: `seedFlags()` (`features.service.js`, runs on every server boot) uses `$setOnInsert` so it never clobbers an admin's manual toggles on restart; `reset-flags.js` (run manually, on purpose) uses `$set` to force every flag back to its `flags.js` default — including `CA_PORTAL`/`EFILING_DIRECT`. Run with `node apps/api/src/scripts/reset-flags.js`.
3. ~~Gmail credentials~~ — Done, real SMTP confirmed working. **Twilio SMS credentials** still outstanding — set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in `apps/api/.env` for real SMS (currently mock-mode logs to console).

### Near Term
4. **ITD ERI/ASP registration** — Apply on incometax.gov.in as an e-Return Intermediary. Once approved, set `ITD_API_BASE_URL` and `ITD_API_KEY` in `.env` to enable Phase 3 direct API filing.
5. **Multiple TDS entries** — Currently one employer per filing. Need to support multiple Form 16s (job change mid-year). The `tdsEntries` array schema exists in the model but the form only captures a single employer.
6. ~~Allowance breakdown in form~~ — Done. `itr1Data` now stores `basicSalary`/`specialAllowance`/`bonus` alongside the existing `hra_received`; `grossSalary` is computed server-side from the sum (`computeGrossSalary()` in `filing.service.js`) rather than entered directly, so every existing consumer (XML generator, approval summary, dashboards) keeps reading `itr1Data.grossSalary` unchanged. Both `ITR1Filing.jsx` and `CAITRFiling.jsx` show a live-computed "Total Gross Salary" subtotal as the breakdown fields are filled in. While implementing this, fixed two related issues: (1) the Form 16 upload widget had been removed from `Profile.jsx` with no replacement entry point — moved into `ITR1Filing.jsx`'s Form 16 drawer, which now supports upload + a "Use These Values" pre-fill button (the parser already extracted `basicSalary`/`specialAllowance`/`bonus`/`hraReceived` — it was just never wired to anything); (2) `filing.validator.test.js`'s 7 long-standing failures were this exact feature already test-driven but never implemented — all pass now.
7. **26AS XML import** — Parse 26AS to pre-fill TDS entries, interest income, and capital gains. Endpoint and parser scaffolding to be added.
8. ~~CA Profile page~~ — Done. CA Dashboard → Settings tab; firm name/ICAI number/ITD credentials now live on `CAFirm` (see Role & Permission Model above).

### Planned (Phase 2 CA Portal — CA Users)
9. ~~`ca_staff` / `ca_readonly` roles~~ — Done. Invite flow, `requireCAWrite`/`requireCAAdmin` middleware, and the CA Dashboard → Team tab are live (see Role & Permission Model above).
10. ~~Re-scope CAClient/Filing ownership~~ — Done via `resolveOwnerUserId()` rather than a schema migration — see Role & Permission Model above for why no CAClient/Filing schema change was needed.
11. **Client-facing portal** — Clients onboarded as `taxpayer` role accounts to view their own filings, download ITR XML, track refund status — without needing CA involvement for read access.
12. **ITR-2 through ITR-7** — Only ITR-1 implemented. Other types gated by feature flags (`ITR_2`…`ITR_7`). Each needs its own model, validator, form wizard, and XML generator.
13. **Real ITD Refund API** — Replace simulated refund timeline with live ITD API call when ERI registration is complete.
14. **Advance tax payment tracking** — Link challan payments to filings; pre-fill from 26AS.

### Planned (Phase 3-5 — Platform Admin & Ops)
15. **Platform Admin: CA firm management** — View/search all CA firms, deactivate a firm (cascades to its users), view firm-level filing stats.
16. **Per-firm feature flag overrides** — CA Admin restricts which platform features their own `ca_staff`/`ca_readonly` can use (separate from the global `FeatureFlag` collection).
17. **Audit log for CA actions** — Extend the existing `AuditLog` model (currently platform-admin-only actions) to record filing-level actions (created/submitted/sent for approval/e-filed) with actor + role.
18. **`platform_support` role** — View-only ops/support role; enum value reserved but no routes/UI implemented yet.

---

## Current State

### Development Commands

```bash
# Backend — auto-restarts on change
cd apps/api && npm run dev        # nodemon src/server.js → http://localhost:5000

# Frontend — Vite dev server
cd apps/web && npm run dev        # http://localhost:5173
```

### Tests (both apps use Vitest, not Jest)
```bash
cd apps/api && npm test                                       # run all tests once
cd apps/api && npm run test:watch                            # watch mode
cd apps/api && npm run test:coverage                         # coverage report

# Run a single test file
cd apps/api && npx vitest run src/modules/tax-engine/engine.service.test.js
```

### Build & Production
```bash
cd apps/web && npm run build      # Vite production build → dist/
cd apps/api && npm start          # production (no nodemon)
```

### One-off Admin Scripts
```bash
# Reset all feature flags in MongoDB to defaults from flags.js (uses $set — overwrites existing values)
node apps/api/src/scripts/reset-flags.js

# Promote a user to admin by PAN
node apps/api/src/scripts/make-admin.js ABCDE1234F
```

### Zustand Stores (`apps/web/src/store/index.js`)
Three stores:
- `useAuthStore` — `user`, `token` (persisted to `localStorage` as `itr_token`), `logout()`
- `useFlagsStore` — flat map of `{ [flagKey]: boolean }` loaded at app boot
- `useFilingStore` — `currentITRType`, `filingData` keyed by section, `resetFiling()`

### Test File Locations
Test files are co-located with source:
- `apps/api/src/modules/tax-engine/engine.service.test.js` — pure computation, no mocks needed
- `apps/api/src/modules/auth/auth.service.test.js` — Mongoose/JWT/bcrypt mocked with `vi.mock()`
- `apps/api/src/modules/itr/filing.validator.test.js`
- `apps/api/src/utils/encryption.test.js`
- `apps/api/src/middleware/featureFlag.middleware.test.js`
- `apps/api/src/modules/documents/form16.parser.test.js`

### ANTD v5 Reminder
Use `Card variant="borderless"` — not `Card bordered={false}` (removed in v5).

### Dayjs Gotcha (DatePicker)
`dateOfBirth` from ANTD `DatePicker` is a dayjs object. Call `.format("YYYY-MM-DD")` before spreading into draft/submit payloads to avoid circular reference errors.
