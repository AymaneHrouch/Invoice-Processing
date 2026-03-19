# CLAUDE.md — Voynich Invoice Management Platform

## Project Overview

**Voynich** is an invoice management SaaS for Moroccan PMEs, evolving from a simple AI parsing tool into a full compliance platform aligned with Morocco's mandatory e-invoicing reform (DGI clearance model, UBL 2.1, effective 2026-2027).

## Current State (Phase 2 — partially complete)

### What works today:
- **AI-powered invoice parsing**: Upload PDF/image → Azure Document Intelligence → saved to MongoDB
- **Manual invoice creation**: Form-based for both Achats and Ventes
- **Ventes workflow**: Create → auto-number (FAC-YYYY-NNN) → validate → mark sent → mark paid
- **Achats workflow**: Upload/manual → extract → validate
- **Multi-company support**: Multiple `company_profile` documents per user; active company scoped via `company_id` in JWT. Sidebar company switcher issues a new scoped token (`POST /auth/switch-company/{id}`). Company CRUD: `GET /company` (list), `POST /company` (create), `GET /company/active`, `PUT /company/{id}`. All invoices, contacts, and dashboard data are filtered by `company_id`.
- **Company profile**: Per-company document in `company_profile` collection — name, ICE, IF, RC, CNSS, address, bank, invoice prefix, categories, logo URL, primary color, custom footer
- **Contact directory**: Clients + suppliers with full details (name, ICE, IF, RC, address, city, phone, email, notes, contact_type)
- **Invoice listing**: Filterable, sortable, paginated — separate `/achats` and `/ventes` pages. `vendor_name` filter searches both `vendor_name` and `client_name` fields.
- **PDF generation**: Server-side via weasyprint + Jinja2 (`app/templates/invoice.html`) — both directions. Outgoing PDFs look up contact by `contact_id` to include client address/phone/email in the client block.
- **Excel export**: Per-direction (`POST /ventes/export`, `POST /invoices/achats/export`) with post-download confirmation to mark as exported
- **Dashboard**: PME KPI widgets (including `non_exportees` count), À encaisser / À payer finance widgets (clickable rows open invoice edit modal via location state), TVA balance with period selector, Top 5 clients/fournisseurs, "Dernières actions" activity feed. Additional widgets: CA Évolution (12-month bar chart), Délai moyen de paiement, Prévision de trésorerie (30/60/90 days), Factures en retard (3 overdue buckets), Échéances proches (7 and 15 days), Répartition par catégorie (donut chart with direction toggle)
- **Multi-firm tenancy**: Three-tier role hierarchy — `ADMIN` (Super Admin, manages firms) → `FIRM_ADMIN` (cabinet owner, manages users/companies within firm) → `USER` (accountant). Firms stored in `firms` collection. Self-registration auto-creates a firm + sets user as `FIRM_ADMIN`. Super Admin creates firm+admin in one action via `POST /firms`, returning a temp password.
- **Auth**: JWT-based — token carries `sub` (ObjectId), `role`, `username` (email), `firm_id`, and `company_id`
- **Invoice audit trail**: Every status transition appends an `InvoiceHistoryEntry` to the invoice's `history` array (action, status_from, status_to, user email, timestamp). Legacy ObjectId user values are resolved to email via users collection lookup.
- **History UI**: Collapsible timeline in the EditInvoice modal; inline history in the expanded row of the invoice listing (`InvoiceExpandedRow`)

### What does NOT exist yet:
- UBL 2.1 XML generation (Phase 2.4)
- Electronic signature
- DGI clearance submission (Phase 3)
- 10-year compliant archiving

## Tech Stack

### Backend
- **Python 3.13** with **FastAPI**
- **PyMongo** (sync) with **MongoDB Atlas**
- **weasyprint + Jinja2** for PDF generation (requires system libs: pango, cairo — see Dockerfile)
- **Azure Document Intelligence** for OCR (MD5-based cache in `cache` collection)
- **JWT auth** via python-jose + bcrypt
- **openpyxl** for Excel export
- Package manager: **uv** (pyproject.toml)
- Linter: **ruff** — run `uv run ruff check` before committing
- API prefix: `/api`

### Frontend
- **React 18** with **Vite**
- **Tailwind CSS** + **shadcn/ui** components
- **Lucide React** for icons
- **React Router v6** for routing
- Deployed on **Vercel** (frontend), **Railway** (backend)

### Database (MongoDB)
- Collections: `invoices`, `company_profile`, `contacts`, `cache`, `users`, `firms`
- `firms` — one document per cabinet (name, created_at, created_by)
- `users` carry `firm_id`; `company_profile` carries `firm_id` for firm-scoped listing
- `company_profile` supports **multiple documents** — each identified by `_id`; scoped per user via JWT `company_id`
- `invoices` and `contacts` carry a `company_id` field for multi-tenant filtering
- `invoices` handles both Achats and Ventes via `direction` field ("incoming"/"outgoing")

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, lifespan, CORS, routers
│   ├── database.py          # MongoDB connection, collection getters
│   ├── models/
│   │   ├── invoice.py       # Invoice, InvoiceCreate, InvoiceUpdate, InvoiceResponse
│   │   ├── company.py       # CompanyProfile, CompanyProfileUpdate
│   │   ├── contact.py       # Contact model
│   │   └── user.py          # User model
│   ├── crud/
│   │   └── invoice.py       # InvoiceCRUD class (all MongoDB operations)
│   ├── routes/
│   │   ├── invoices.py      # Achats CRUD, upload, export, PDF, search, history
│   │   ├── ventes.py        # Ventes CRUD, status transitions, export, PDF
│   │   ├── company.py       # GET/PUT /company, GET /company/categories
│   │   ├── contacts.py      # Contacts CRUD
│   │   ├── dashboard.py     # Dashboard stats + GET /recent-activity
│   │   ├── auth.py          # Login/register (JWT includes username, firm_id fields)
│   │   ├── firms.py         # Firms CRUD (ADMIN only) + GET /firms/me + GET /firms/{id}/inventory
│   │   ├── users.py         # User management — FIRM_ADMIN scoped to own firm
│   │   └── health.py        # Health check
│   ├── services/
│   │   ├── invoices.py      # OCR extraction, regex for TVA/ICE, amount checks
│   │   ├── pdf.py           # generate_invoice_pdf() — weasyprint + Jinja2
│   │   ├── dashboard.py     # Dashboard aggregation queries + get_recent_activity()
│   │   └── ocr/             # OCR provider abstraction (Azure DI, AWS, GCP)
│   ├── templates/
│   │   └── invoice.html     # Jinja2 HTML/CSS invoice template (A4, both directions)
│   └── utils/
│       └── auth.py          # JWT helpers, get_current_user, require_admin
├── scripts/
│   └── reset.py             # DB reset: --empty (wipe) or --seed (wipe + demo data)
├── dev.sh                   # Local Docker build + run script
├── Dockerfile               # python:3.13-slim + weasyprint apt deps
├── pyproject.toml
└── ruff.toml

frontend/
├── src/
│   ├── App.jsx              # Routes, ProtectedRoute wrapper
│   ├── api/
│   │   ├── baseApi.js       # Axios instance with /api prefix
│   │   ├── invoice.js       # Achats API (fetchInvoices, exportAchats, downloadInvoicePdf, fetchInvoiceHistory...)
│   │   ├── ventes.js        # Ventes API (createVente, validateVente, exportVentes...)
│   │   ├── company.js       # Company profile API
│   │   ├── contacts.js      # Contacts API
│   │   ├── dashboard.js     # Dashboard API (getPmeKpis, getTopVendors, getAEncaisser, getAPayer, getTvaBalance, getRecentActivity)
│   │   ├── firms.js         # listFirms, createFirm, deleteFirm, getFirmInventory, getMyFirm
│   │   └── auth.js          # Auth API
│   ├── components/
│   │   ├── shared/          # NavBar, SideBar
│   │   ├── invoice/
│   │   │   ├── invoice-add/     # UploadCard, AutoInvoice, ManualInvoice, InvoiceItems
│   │   │   └── invoice-listing/ # InvoiceRow, EditInvoice (collapsible history timeline), InvoiceExpandedRow (inline history), Filters, ExportConfirmDialog...
│   │   ├── dashboard/       # RecentActivity, FinanceWidgets, TVABalanceWidget, TopVendorsWidget, WorkQueueWidgets, DashboardHeader, DashboardLoading, DashboardError, CAEvolutionWidget, AlertsWidget, TresorerieWidget, DelaiPaiementWidget, CategoryBreakdownWidget
│   │   └── ui/              # shadcn/ui primitives
│   ├── pages/
│   │   ├── InvoiceListPage.jsx   # Shared list page for Achats + Ventes (direction prop)
│   │   ├── VenteCreatePage.jsx   # Create outgoing invoice
│   │   ├── CompanyProfilePage.jsx  # createMode prop: POST vs PUT; auto-detects 404
│   │   ├── FirmsPage.jsx         # Super Admin firm management (create + credentials reveal)
│   │   ├── ContactsPage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── LoginPage.jsx
│   ├── hooks/               # useCategories, useInvoiceData, useFileUpload, etc.
│   ├── contexts/            # AuthContext, ThemeContext
│   ├── constants/           # sidebarItems, statusConfig, currencies
│   └── utils/               # formatters, validators, auth helpers
├── package.json
└── vite.config.js
```

## Key Architecture Decisions

1. **Single `invoices` collection** for both Achats and Ventes — separated by `direction` field. Ventes have their own router (`/ventes`) with stricter status transitions; Achats use `/invoices`.

2. **Ventes status flow**: `draft → validated → sent → paid`. Validated invoices are locked (PUT rejected). Status transitions via dedicated POST endpoints.

3. **Achats status flow**: `extracted → validated`. Validated/paid invoices are partially locked — `PUT /invoices/{id}` rejects changes to financial and structural fields (`total_amount`, `subtotal_ht`, `tva`, `amount_tva`, `items`, `vendor_name`, `invoice_number`, `invoice_date`, `invoice_due_date`, `currency`, `contact_id`, `ice`) but allows `category` and other metadata fields through. Frontend mirrors this: all fields disabled except `category`, Save button stays enabled.

4. **PDF generation**: `services/pdf.py` calls `generate_invoice_pdf(invoice, company)` which renders `app/templates/invoice.html` via Jinja2 + weasyprint. Template is direction-aware and supports branding: `primary_color` drives all accent colors, `logo_url` renders in the header, `custom_footer` appears as a centered line above the generation timestamp. Requires system libs (pango/cairo) — only works in Docker locally on Windows.

5. **Company profile** supports multiple documents (one per company). `next_invoice_number` + `invoice_year` live in the company doc for atomic sequential numbering scoped to that company via `find_one_and_update({"_id": ObjectId(company_id)}, ...)`. Active company is resolved from the JWT `company_id` claim.

6. **Export marking**: exports do NOT auto-mark invoices. After download, frontend shows a confirmation dialog. Exported IDs returned via `X-Exported-Ids` response header (exposed in CORS config).

7. **OCR caching**: MD5 hash of file bytes → cache key in `cache` collection. Prevents duplicate Azure DI calls.

8. **CORS `expose_headers`**: Custom headers returned by the API (`X-Total-Count`, `X-Exported-Ids`, etc.) must be listed in `expose_headers` in `main.py` — otherwise the browser silently blocks them.

9. **Audit trail (`history` array)**: Each invoice document has a `history: list[dict]` field. `InvoiceCRUD.append_history(invoice_id, entry)` does a MongoDB `$push`. All 8 status-transition endpoints (ventes: validate/invalidate/sent/unsent/paid/unpaid; achats: validate/unvalidate/paid/unpaid) call `append_history` with the acting user's email from the JWT. `GET /invoices/{id}/history` returns the reversed list with ObjectId user values resolved to emails.

10. **Recent activity feed**: `GET /dashboard/recent-activity` uses a MongoDB `$unwind` aggregation on the `history` array, sorted by `history.timestamp` desc, to produce a cross-invoice activity feed. ObjectId user values resolved post-aggregation. Consumed by the dashboard "Dernières actions" widget.

11. **JWT payload**: Contains `sub` (MongoDB user ObjectId as string), `role`, `username` (user email), `firm_id`, and `company_id` (active company ObjectId as string). `get_current_user` returns `{"user_id", "role", "username", "firm_id", "company_id"}`. `company_id` is `None` for users with no company yet. `firm_id` is `None` for Super Admin. The `username` field is used when recording history entries so display is human-readable from the start.

12. **Dashboard invoice navigation**: Clicking a row in À encaisser / À payer navigates using React Router `location.state` (`{ editId }`) instead of URL params — the listing page reads `location.state?.editId` on mount, opens the edit modal, then clears the state. URL stays clean.

13. **Contact enrichment in PDFs**: `GET /ventes/{id}/pdf` looks up the contact by `contact_id` and injects `client_address`, `client_city`, `client_phone`, `client_email` onto the invoice before rendering. Template renders these in the destinataire block.

14. **Dashboard financial widgets**: Six new service functions in `services/dashboard.py`: `get_ca_evolution` (12-month monthly ventes vs achats), `get_delai_paiement` (avg days using `paid_at - invoice_date`), `get_tresorerie_prevision` (inflows/outflows in 30/60/90 day windows), `get_factures_retard` (overdue grouped 1-30d/31-60d/60+d), `get_echeances_proches` (due within 7 and 15 days), `get_category_breakdown` (current year amounts by category with direction param). `get_pme_kpis` also returns `non_exportees` count.

15. **Seed script**: `scripts/reset.py` uses loop-based generation — `VENTE_PROFILES` (25 weighted client profiles) × 12-month loop + `ACHAT_PROFILES` (17 suppliers with frequency_months 1/3/6/12). `_jitter(base, pct)` adds ±25% variation. Status set by invoice age: current month → draft/validated; older → mostly paid with ~15% overdue.

16. **Axios auth interceptor**: `baseApi.js` has a request interceptor that automatically attaches `Authorization: Bearer <token>` to every request from `localStorage`. Do NOT manually pass `getAuthConfig()` in API call sites — the interceptor handles it globally.

17. **Firm name in sidebar**: `GET /firms/me` returns `{_id, name}` for the current user's firm. Called from `AuthContext.fetchCurrentUser()` when `firm_id` is present in the JWT. Super Admin has no firm_id and skips this call. `firmName` is exposed via `useAuth()`.

18. **Role-scoped access**: Super Admin (`ADMIN`) — `/firms` only, no company data. `FIRM_ADMIN` — user management + company management scoped to own firm. `USER` — regular accountant. `AdminOnly` component guards `/users` for `ADMIN`+`FIRM_ADMIN`. Sidebar filters items by role using `adminOnly`/`superAdminOnly` flags in `sidebarItems`.

19. **Firm cascade delete**: `DELETE /firms/{id}` removes all firm data in order: invoices → contacts → company_profile → users → firm. `GET /firms/{id}/inventory` returns counts (users, companies, invoices, contacts) used by the frontend confirmation modal before deletion.

20. **Last-admin guard**: `DELETE /users/{id}` blocks deletion if the target user is the only `FIRM_ADMIN` in their firm — returns 400 "Ce cabinet doit avoir au moins un administrateur."

21. **Delete confirmations**: All destructive delete actions use shadcn `AlertDialog` (not `window.confirm`). Firm deletion modal fetches and displays live inventory counts. User deletion modal shows the user's name and email.

22. **`button.jsx` cursor**: `cursor-pointer` is in the base `cva` class — applies globally to every `Button` variant across the app.

23. **Sidebar parent navigation**: Achats and Ventes sidebar items have both `hasChildren: true` and a `path`. Clicking them navigates to the list page AND toggles sub-menu expansion.

24. **`FormField` select disabled**: The `select` case in `form-field.jsx` requires `disabled` to be explicitly destructured and passed to the shadcn `<Select>` component — it is NOT picked up via `...props` (which spreads onto the wrapper div). Always pass `disabled` explicitly.

25. **Tags feature removed**: Invoice tags were fully removed (frontend `InvoiceTags.jsx` deleted, all state/handlers/UI stripped; backend model fields, `get_invoices_by_tags` CRUD, `/search/tags` and `/tags/{tag}` endpoints, and MongoDB index all removed). Do not re-add without discussion.

## Local Development

### Backend (Docker — required on Windows for weasyprint)
```bash
cd backend/
bash dev.sh          # build + run on http://localhost:8000
```

### Database reset
```bash
# From backend/ with Docker running:
uv run python scripts/reset.py --seed    # wipe + demo data
uv run python scripts/reset.py --empty   # wipe only (clean demo)

# Via Docker container:
docker exec <container> uv run python scripts/reset.py --seed
```

### Frontend
```bash
cd frontend/
npm run dev    # http://localhost:5173 → proxies to localhost:8000
```

Frontend `.env` already points to `http://localhost:8000/api`.

## Development Guidelines

- **Minimal, incremental changes only.** Read existing code before modifying.
- **Backend convention**: routes → services → crud → database. Business logic in services, MongoDB queries in crud.
- **Frontend convention**: pages use hooks, hooks call API functions, components are presentational.
- **All monetary values**: `Decimal` in Python models, stored as `float` in MongoDB.
- **Date handling**: stored as `datetime` in MongoDB, validated from string `YYYY-MM-DD` in Pydantic.
- **Error pattern**: routes catch exceptions, log them, return appropriate HTTP status codes.
- Run `uv run ruff check` before committing backend code.
- The frontend uses `@/` path alias mapping to `src/`.
- All user-facing text is in **French**. Code comments and commits stay in English.

## Roadmap Reference

- `docs/ROADMAP.md` — Phased roadmap, current progress, backlog ideas
- `docs/ARCHITECTURE.md` — Architecture decisions for Ventes/Achats split
- `docs/UBL.md` — UBL 2.1 spec for Phase 2.4

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb+srv://...
DB_NAME=invoice_processing
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
JWT_SECRET=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
ADMIN_EMAIL=...          # used by reset.py --seed as the history user label
```
