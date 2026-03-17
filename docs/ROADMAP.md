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
- [ ] **Backend**: Create `Contact` model in `models/contact.py`
- [ ] **Backend**: CRUD routes in `routes/contacts.py`: `GET /contacts`, `POST /contacts`, `PUT /contacts/{id}`, `DELETE /contacts/{id}`
- [ ] **Backend**: Query param `?type=client` or `?type=supplier` for filtering
- [ ] **Frontend**: `ContactsPage.jsx` — table with search, add/edit modal
- [ ] **Frontend**: Add "Clients" and "Fournisseurs" to sidebar under Ventes/Achats

### 1.3 Navigation Restructure
- [ ] **Frontend**: Update `constants/index.jsx` sidebar items to Ventes/Achats structure
- [ ] **Frontend**: Update `App.jsx` routes to new paths (`/ventes`, `/achats`, `/company`, `/contacts`)
- [ ] **Frontend**: Keep old `/invoices/*` routes as redirects temporarily

### 1.4 Achats Improvements
- [ ] **Backend**: New routes `GET /achats`, `POST /achats/upload`, `GET /achats/{id}` (wrappers that filter `direction=incoming`)
- [ ] **Frontend**: `AchatsListPage.jsx` — adapted from current `InvoiceListPage.jsx`, filtered to incoming only
- [ ] **Frontend**: `AchatImportPage.jsx` — adapted from current `InvoiceAddPage.jsx` (upload + manual)
- [ ] **Frontend**: Improve AI parsing reliability — add image preprocessing hints in upload UI
- [ ] **Frontend**: Add confidence indicators on extracted fields (if Azure DI returns confidence scores)

### 1.5 Invoice Model Evolution
- [ ] **Backend**: Add new fields to Invoice model: `vendor_ice`, `client_name`, `client_ice`, `contact_id`, `subtotal_ht`
- [ ] **Backend**: Migration script — set `direction="incoming"` on all existing invoices, rename `ice` → `vendor_ice`
- [ ] **Backend**: Keep backward compatibility — old fields still accepted in API

**Deliverable**: Demo at GITEX showing Achats (AI parsing + manual), company profile, contact directory, clean Ventes/Achats navigation.

---

## Phase 2 — Ventes (Emission) & UBL Generation (April → July 2026)

**Goal**: Users can create, number, and export outgoing invoices with UBL 2.1 output.

### 2.1 Outgoing Invoice Creation
- [ ] **Backend**: `POST /ventes` — creates outgoing invoice with auto-generated sequential number
- [ ] **Backend**: Atomic numbering with `findOneAndUpdate` on `company_profile.next_invoice_number`
- [ ] **Backend**: Auto-fill `vendor_name`, `vendor_ice` from company profile
- [ ] **Backend**: Year-reset logic for invoice numbering (detect year change)
- [ ] **Frontend**: `VenteCreatePage.jsx` — form with:
  - Auto-filled "From" section (my company, read-only)
  - "To" section: pick from contacts or type new client (with ICE)
  - Line items editor (description, quantity, unit price, TVA rate per line)
  - Auto-calculated subtotal HT, TVA amount, total TTC
  - Due date picker
  - Save as draft / Validate buttons

### 2.2 Outgoing Invoice Statuses
- [ ] **Backend**: `POST /ventes/{id}/validate` — transitions from `draft` → `validated`, locks editing
- [ ] **Backend**: Validation rules: all required fields must be present (client ICE for B2B, items, amounts)
- [ ] **Frontend**: Status badges: Draft (gray), Validated (green), Sent (blue), Paid (emerald)
- [ ] **Frontend**: `VentesListPage.jsx` — outgoing invoice list with status filters

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
