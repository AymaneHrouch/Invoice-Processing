# ROADMAP.md — Phased Implementation Plan

Each phase is independently shippable and adds value. Complete one phase fully before starting the next.

---

## Phase 1 — Foundation & Achats Hardening (NOW → GITEX April 2026)

**Goal**: Make the current parsing app rock-solid, add company profile, rebrand navigation.

### 1.1 Company Profile
- [x] **Backend**: Create `CompanyProfile` model in `models/company.py`
- [x] **Backend**: Create `company_profile` collection in `database.py`
- [x] **Backend**: CRUD routes in `routes/company.py`: `GET /company`, `PUT /company` (upsert)
- [x] **Frontend**: `CompanyProfilePage.jsx` — form with all fields (company name, ICE, IF, RC, address, bank, logo, invoice prefix)
- [x] **Frontend**: Add "Mon Entreprise" to sidebar
- [x] **Frontend**: Onboarding check — if no profile exists, redirect to profile page with a prompt
- [x] **Frontend**: *(added)* Persistent incomplete-profile indicator — orange dot + "Setup" label on "Mon Entreprise" sidebar item, visible on every page until profile is saved

### 1.2 Contact Directory
- [x] **Backend**: Create `Contact` model in `models/contact.py`
- [x] **Backend**: CRUD routes in `routes/contacts.py`: `GET /contacts`, `POST /contacts`, `PUT /contacts/{id}`, `DELETE /contacts/{id}`
- [x] **Backend**: Query param `?type=client` or `?type=supplier` for filtering
- [x] **Frontend**: `ContactsPage.jsx` — table with search, add/edit modal
- [x] **Frontend**: Add "Contacts" to sidebar (will split into Clients/Fournisseurs in 1.3 nav restructure)
- [x] **Frontend**: *(added)* Contact count badge on sidebar "Contacts" item — updates on every navigation
- [x] **Frontend**: *(added)* "Save as supplier" quick-add button on the invoice edit form — pre-fills contact modal with vendor name + ICE

### 1.3 Navigation Restructure ✅
- [x] **Frontend**: Update `constants/index.jsx` sidebar items to Ventes/Achats structure — Achats (Liste, Importer, Fournisseurs) + Ventes (Liste, Nouvelle, Clients)
- [x] **Frontend**: Update `App.jsx` routes to new paths (`/ventes`, `/achats`, `/achats/import`, `/ventes/new`)
- [x] **Frontend**: Keep old `/invoices/*` routes as redirects
- [x] **Frontend**: `SideBar.jsx` — replace single `invoicesExpanded` with `expandedSections` map (independent expand per section)
- [x] **Frontend**: `ContactsPage.jsx` — reads initial `?type=` from URL so sidebar Fournisseurs/Clients links auto-filter the page
- [x] **Frontend**: *(added)* Active section highlighting — parent sidebar item (Achats/Ventes) gets a blue accent when any of its children is the current route, even when collapsed

### 1.4 Achats Improvements ✅
- [x] **Backend**: Add `direction` filter to `GET /invoices/` — Achats/Ventes list pages each query their own direction
- [x] **Backend**: Add `direction` query param to `POST /invoices/upload` — AI-processed invoices saved with correct direction
- [x] **Frontend**: `InvoiceListPage` accepts `direction` prop — `/achats` locks to incoming, `/ventes` locks to outgoing
- [x] **Frontend**: *(added)* Context-aware page header — Achats shows shopping cart + "Achats", Ventes shows trending-up + "Ventes"
- [x] **Frontend**: *(added)* Context-aware empty state — shows localized message with a direct link to import (Achats) or create (Ventes)
- [x] **Frontend**: *(added)* Direction column hidden on Achats/Ventes lists — redundant when page is already direction-locked; still visible on generic invoice view
- [x] **Frontend**: `InvoiceAddPage` + `ManualInvoice` + `AutoInvoice` + `UploadCard` accept `direction` prop — invoices created with correct direction from both manual and AI flows
- [~] **Frontend**: Improve AI parsing reliability — skipped, needs research into Azure DI preprocessing options
- [~] **Frontend**: Add confidence indicators on extracted fields — skipped, depends on whether Azure DI returns per-field confidence scores (unverified)

### 1.5 UI Language Consistency ✅
- [x] **Frontend**: Audit all user-facing text (labels, buttons, placeholders, empty states, error messages, toasts) and unify to French
- [x] **Frontend**: Pages covered: InvoiceListPage, InvoiceAddPage, ManualInvoice, AutoInvoice, EditInvoice, LoginPage, SideBar, NavBar, InvoiceFilters, InvoiceTableHeader, InvoiceHeader, InvoiceRow, InvoicePagination, UploadCard
- [x] **Note**: Developer-facing text (code comments, console logs, git commits) stays in English
- [ ] **Future**: i18n multi-language support (fr/ar/en) — deferred until platform is stable

### 1.6 Invoice Model Evolution ✅

### 1.7 Per-Account Category Management ✅
- [x] **Backend**: Add `categories` field to `CompanyProfile` and `CompanyProfileUpdate` models (`list[str]` with default factory)
- [x] **Backend**: `GET /company/categories` endpoint — returns account's categories or built-in defaults if no profile yet (registered before `GET /company` to avoid routing conflict)
- [x] **Backend**: Fixed upsert to allow saving empty categories list (`v is not None or isinstance(v, list)`)
- [x] **Frontend**: `api/company.js` — added `getCategories()` function
- [x] **Frontend**: `hooks/useCategories.js` — new hook fetching categories from API with fallback to hardcoded defaults
- [x] **Frontend**: `ManualInvoice`, `EditInvoice`, `InvoiceFilters` — replaced hardcoded `categories` constant with `useCategories()` hook
- [x] **Frontend**: `CompanyProfilePage` — tag-style categories management card (add via input+Enter or button, remove via X), saved as part of profile
- [x] **Backend**: Add new fields to all Invoice models: `vendor_ice`, `client_name`, `client_ice`, `contact_id`, `subtotal_ht`
- [x] **Backend**: `migrations/001_vendor_ice.py` — copies `ice` → `vendor_ice`, backfills `direction="incoming"` on old docs
- [x] **Backend**: Backward compatibility — `ice` still accepted in API; model validator auto-copies to `vendor_ice`; CRUD defaults `vendor_ice` from `ice` when reading old docs

**Deliverable**: Demo at GITEX showing Achats (AI parsing + manual), company profile, contact directory, clean Ventes/Achats navigation.

---

## Phase 2 — Ventes (Emission) & UBL Generation (April → July 2026)

**Goal**: Users can create, number, and export outgoing invoices with UBL 2.1 output.

### 2.1 Outgoing Invoice Creation ✅
- [x] **Backend**: `POST /ventes` — creates outgoing invoice with auto-generated sequential number
- [x] **Backend**: Atomic numbering with `find_one_and_update` on `company_profile.next_invoice_number`
- [x] **Backend**: Auto-fill `vendor_name`, `vendor_ice` from company profile
- [x] **Backend**: Year-reset logic for invoice numbering (detect year change, reset counter to 1)
- [x] **Backend**: `GET /ventes/next-number` — preview next number without consuming it
- [x] **Backend**: Full CRUD — `GET /ventes`, `GET /ventes/{id}`, `PUT /ventes/{id}` (draft only), `DELETE /ventes/{id}`
- [x] **Frontend**: `VenteCreatePage.jsx` — form with:
  - Auto-filled "From" section (my company, read-only)
  - Client combobox (searches contacts type=client, auto-fills ICE, saves new clients on the fly)
  - Line items editor with labeled Quantité / Prix unitaire fields and required-name validation
  - Auto-calculated subtotal HT, TVA amount, total TTC
  - Due date picker, category, currency selectors
  - Save as draft / Validate buttons
- [x] **Frontend**: `api/ventes.js` — full API client

### 2.2 Outgoing Invoice Statuses ✅
- [x] **Backend**: `POST /ventes/{id}/validate` — `draft` → `validated`, locks editing
- [x] **Backend**: `POST /ventes/{id}/mark-sent` — `validated` → `sent`
- [x] **Backend**: `POST /ventes/{id}/mark-paid` — `validated`/`sent` → `paid`, sets `is_paid=true`
- [x] **Frontend**: Status badges: Brouillon (gray), Validé (green), Envoyé (indigo), Payé (emerald)
- [x] **Frontend**: Per-row action buttons on Ventes list — Valider (✓), Marquer envoyé (→), Marquer payé (💵) — shown based on current status
- [x] **Frontend**: `SupplierCombobox` extended with `contactType` prop to reuse for clients

### 2.3 PDF Generation
- [ ] **Backend**: `GET /ventes/{id}/pdf` — generate human-readable PDF invoice
- [ ] **Backend**: Use `reportlab` or `weasyprint` to create a professional Moroccan-style invoice PDF
- [ ] **Backend**: PDF includes: company logo, all legally required mentions (ICE, IF, RC, TVA, etc.)
- [ ] **Frontend**: "Download PDF" button on invoice detail and list

### 2.4 UBL 2.1 XML Generation
- [ ] **Backend**: New service `services/ubl.py` — generates UBL 2.1 Invoice XML from Invoice model
- [ ] **Backend**: `GET /ventes/{id}/ubl` — returns the XML file
- [ ] **Backend**: UBL fields mapping (see `docs/UBL.md` for full spec)
- [ ] **Backend**: Validate generated XML against UBL 2.1 XSD schema
- [ ] **Frontend**: "Export UBL" button on validated outgoing invoices

### 2.5 Excel Export per Direction
- [ ] **Backend**: `POST /achats/export` — export incoming invoices only
- [ ] **Backend**: `POST /ventes/export` — export outgoing invoices only
- [ ] **Frontend**: Export buttons on both list pages

**Deliverable**: Full emission workflow — create invoice, auto-number, validate, download PDF, export UBL XML. Ready to demonstrate DGI compliance preparation.

---

## Phase 3 — DGI Clearance & Electronic Signature (July → December 2026)

**Goal**: Connect to DGI platform for invoice clearance. This phase depends on DGI API availability.

### 3.1 Electronic Signature
- [ ] **Research**: Identify Moroccan qualified certificate providers
- [ ] **Backend**: `services/signature.py` — sign UBL XML with qualified electronic certificate
- [ ] **Backend**: Store signature hash on invoice document
- [ ] **Frontend**: Certificate upload/configuration in Settings page

### 3.2 DGI Clearance Submission
- [ ] **Backend**: `services/dgi.py` — client for DGI/xHub clearance API
- [ ] **Backend**: `POST /ventes/{id}/submit-dgi` — sign + submit to DGI
- [ ] **Backend**: Handle DGI responses: validated (store UUID), rejected (store reason)
- [ ] **Backend**: Status transitions: `validated` → `dgi_pending` → `dgi_validated` / `dgi_rejected`
- [ ] **Frontend**: DGI status indicators on outgoing invoices
- [ ] **Frontend**: "Submit to DGI" button on validated invoices
- [ ] **Frontend**: Rejection details + "Fix & Resubmit" workflow

### 3.3 DGI Invoice Reception
- [ ] **Backend**: Receive structured UBL invoices from DGI platform (webhook or polling)
- [ ] **Backend**: Auto-import as incoming invoices with `source_type="ubl"`
- [ ] **Frontend**: Show UBL-received invoices alongside parsed ones in Achats

### 3.4 Compliant Archiving
- [ ] **Backend**: SHA-256 integrity chain on all validated invoices
- [ ] **Backend**: 10-year retention policy enforcement
- [ ] **Backend**: Immutability — validated/DGI-approved invoices cannot be modified (only credit notes)

**Deliverable**: End-to-end DGI compliance — create invoice, sign, submit to DGI, receive validation, archive.

---

## Phase 4 — Accounting & Advanced Features (2027+)

**Goal**: Become the full compliance platform for Moroccan PMEs.

### 4.1 TVA Declaration
- [ ] Generate TVA declaration data from invoices (sales TVA collected - purchase TVA deductible)
- [ ] Export in SIMPL-compatible format

### 4.2 Withholding Tax (Retenue à la Source)
- [ ] Calculate 5% RAS on service payments per LF 2026 rules
- [ ] Track withholding obligations per contact

### 4.3 Accounting Export
- [ ] Export journal entries in standard Moroccan plan comptable format
- [ ] Integration with Sage Maroc / Dolibarr import formats

### 4.4 Multi-Organization (Accountant Mode)
- [ ] Dashboard for managing multiple client companies
- [ ] Switch between organizations

### 4.5 Avoir (Credit Notes)
- [ ] Create credit notes linked to original invoices
- [ ] UBL CreditNote generation

---

## Implementation Order Within Each Phase

For each feature, follow this order:
1. **Model** — Define/update Pydantic models
2. **Database** — Create collection helpers, indexes, migration if needed
3. **CRUD** — MongoDB operations
4. **Service** — Business logic (validation, generation, external API calls)
5. **Route** — FastAPI endpoints
6. **API client** — Frontend API functions
7. **Hook** — React custom hook
8. **Page/Component** — UI

This ensures each layer is testable independently before the next builds on it.
