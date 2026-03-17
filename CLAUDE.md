# CLAUDE.md — Voynich Invoice Management Platform

## Project Overview

**Voynich** is an invoice management SaaS for Moroccan PMEs, evolving from a simple AI parsing tool into a full compliance platform aligned with Morocco's mandatory e-invoicing reform (DGI clearance model, UBL 2.1, effective 2026-2027).

## Current State (Phase 2 — partially complete)

### What works today:
- **AI-powered invoice parsing**: Upload PDF/image → Azure Document Intelligence → saved to MongoDB
- **Manual invoice creation**: Form-based for both Achats and Ventes
- **Ventes workflow**: Create → auto-number (FAC-YYYY-NNN) → validate → mark sent → mark paid
- **Achats workflow**: Upload/manual → extract → validate
- **Company profile**: Single-document store (`company_profile` collection) — name, ICE, IF, RC, CNSS, address, bank, invoice prefix, categories
- **Contact directory**: Clients + suppliers with type filtering
- **Invoice listing**: Filterable, sortable, paginated — separate `/achats` and `/ventes` pages
- **PDF generation**: Server-side via weasyprint + Jinja2 (`app/templates/invoice.html`) — both directions
- **Excel export**: Per-direction (`POST /ventes/export`, `POST /invoices/achats/export`) with post-download confirmation to mark as exported
- **Dashboard**: PME KPI widgets, A encaisser / À payer finance widgets, TVA balance with period selector, Top 5 clients/fournisseurs, "Dernières actions" activity feed
- **Auth**: JWT-based, admin/user roles — token carries `sub` (ObjectId), `role`, and `username` (email)
- **Invoice audit trail**: Every status transition appends an `InvoiceHistoryEntry` to the invoice's `history` array (action, status_from, status_to, user email, timestamp). Legacy ObjectId user values are resolved to email via users collection lookup.
- **History UI**: Collapsible timeline in the EditInvoice modal; inline history in the expanded row of the invoice listing (`InvoiceExpandedRow`)

### What does NOT exist yet:
- UBL 2.1 XML generation (Phase 2.4)
- Electronic signature
- DGI clearance submission (Phase 3)
- 10-year compliant archiving
- PDF template personalization (color, logo) — planned as 2.3.1

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
- Collections: `invoices`, `company_profile`, `contacts`, `cache`, `users`
- `company_profile` is a **single document** (upsert pattern)
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
│   │   ├── auth.py          # Login/register (JWT includes username field)
│   │   ├── users.py         # User management (admin)
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
│   │   └── auth.js          # Auth API
│   ├── components/
│   │   ├── shared/          # NavBar, SideBar
│   │   ├── invoice/
│   │   │   ├── invoice-add/     # UploadCard, AutoInvoice, ManualInvoice, InvoiceItems
│   │   │   └── invoice-listing/ # InvoiceRow, EditInvoice (collapsible history timeline), InvoiceExpandedRow (inline history), Filters, ExportConfirmDialog...
│   │   ├── dashboard/       # RecentActivity, FinanceWidgets, TVABalanceWidget, TopVendorsWidget, WorkQueueWidgets, DashboardHeader, DashboardLoading, DashboardError
│   │   └── ui/              # shadcn/ui primitives
│   ├── pages/
│   │   ├── InvoiceListPage.jsx   # Shared list page for Achats + Ventes (direction prop)
│   │   ├── VenteCreatePage.jsx   # Create outgoing invoice
│   │   ├── CompanyProfilePage.jsx
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

3. **Achats status flow**: `extracted → validated`. No locking — can always be edited.

4. **PDF generation**: `services/pdf.py` calls `generate_invoice_pdf(invoice, company)` which renders `app/templates/invoice.html` via Jinja2 + weasyprint. Template is direction-aware. Requires system libs (pango/cairo) — only works in Docker locally on Windows.

5. **Company profile** is a single document (upsert). `next_invoice_number` + `invoice_year` live here for atomic sequential numbering via `find_one_and_update`.

6. **Export marking**: exports do NOT auto-mark invoices. After download, frontend shows a confirmation dialog. Exported IDs returned via `X-Exported-Ids` response header (exposed in CORS config).

7. **OCR caching**: MD5 hash of file bytes → cache key in `cache` collection. Prevents duplicate Azure DI calls.

8. **CORS `expose_headers`**: Custom headers returned by the API (`X-Total-Count`, `X-Exported-Ids`, etc.) must be listed in `expose_headers` in `main.py` — otherwise the browser silently blocks them.

9. **Audit trail (`history` array)**: Each invoice document has a `history: list[dict]` field. `InvoiceCRUD.append_history(invoice_id, entry)` does a MongoDB `$push`. All 8 status-transition endpoints (ventes: validate/invalidate/sent/unsent/paid/unpaid; achats: validate/unvalidate/paid/unpaid) call `append_history` with the acting user's email from the JWT. `GET /invoices/{id}/history` returns the reversed list with ObjectId user values resolved to emails.

10. **Recent activity feed**: `GET /dashboard/recent-activity` uses a MongoDB `$unwind` aggregation on the `history` array, sorted by `history.timestamp` desc, to produce a cross-invoice activity feed. ObjectId user values resolved post-aggregation. Consumed by the dashboard "Dernières actions" widget.

11. **JWT payload**: Contains `sub` (MongoDB user ObjectId as string), `role`, and `username` (user email). `get_current_user` returns `{"user_id", "role", "username"}`. The `username` field is used when recording history entries so display is human-readable from the start.

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
