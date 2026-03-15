# CLAUDE.md — Voynich Invoice Management Platform

## Project Overview

This is **Voynich**, an invoice management SaaS for Moroccan PMEs (SMEs), built to help businesses manage both outgoing (sales) and incoming (purchase) invoices. The app is being evolved from a simple invoice parsing tool into a full compliance platform aligned with Morocco's mandatory e-invoicing reform (DGI clearance model, UBL 2.1, effective 2026-2027).

## Current State (v1 — Invoice Processing)

The app currently supports:
- **AI-powered invoice parsing**: Upload PDF/image → Azure Document Intelligence extracts fields → saved to MongoDB
- **Manual invoice creation**: Fill a form to create an invoice manually
- **Invoice listing**: Filterable, sortable, paginated table with bulk actions
- **Excel export**: Export filtered invoices to .xlsx
- **Dashboard**: Stats, charts, work queue overview
- **Auth**: JWT-based auth with admin/user roles

### What does NOT exist yet:
- Separate Ventes (sales) / Achats (purchases) workflows
- Company profile (the user's own business identity)
- Client/supplier directory
- UBL 2.1 XML generation
- Electronic signature integration
- DGI clearance submission
- Invoice PDF generation (human-readable output)
- Sequential invoice numbering enforcement
- 10-year compliant archiving

## Tech Stack

### Backend
- **Python 3.13** with **FastAPI**
- **PyMongo** (sync) with **MongoDB Atlas**
- **Azure Document Intelligence** for OCR (with MD5-based cache in MongoDB)
- **JWT auth** via python-jose + bcrypt
- **openpyxl** for Excel export
- Package manager: **uv** (pyproject.toml)
- Linter: **ruff**
- API prefix: `/api`

### Frontend
- **React 18** with **Vite**
- **Tailwind CSS** + **shadcn/ui** components
- **Lucide React** for icons
- **React Router v6** for routing
- **js-cookie** for sidebar state persistence
- Deployed on **Vercel** (frontend), **Railway** (backend)

### Database
- **MongoDB** — single `invoices` collection currently
- Collections: `invoices`, `cache`, `users`
- Indexes: `invoice_number` (unique), `vendor_name`, `invoice_date`, `status`, `category`, `created_at`, `tags`

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, lifespan, CORS, routers
│   ├── database.py          # MongoDB connection, collection getters
│   ├── models/
│   │   ├── invoice.py       # Invoice, InvoiceCreate, InvoiceUpdate, InvoiceResponse
│   │   └── user.py          # User model
│   ├── crud/
│   │   └── invoice.py       # InvoiceCRUD class (all MongoDB operations)
│   ├── routes/
│   │   ├── invoices.py      # Invoice REST endpoints (CRUD, upload, export, search)
│   │   ├── dashboard.py     # Dashboard stats endpoints
│   │   ├── auth.py          # Login/register
│   │   ├── users.py         # User management (admin)
│   │   └── health.py        # Health check
│   ├── services/
│   │   ├── invoices.py      # OCR extraction, regex for TVA/ICE, amount checks
│   │   ├── dashboard.py     # Dashboard aggregation queries
│   │   └── ocr/             # OCR provider abstraction
│   │       ├── factory.py               # get_invoice_parser() factory
│   │       ├── invoice_parser.py        # Abstract base class
│   │       ├── azure_document_intellignece_service.py
│   │       ├── aws_textract_service.py
│   │       └── google_cloud_documentai_service.py
│   └── utils/
│       └── auth.py          # JWT helpers, admin user creation
├── pyproject.toml
└── ruff.toml

frontend/
├── src/
│   ├── App.jsx              # Routes, ProtectedRoute wrapper
│   ├── main.jsx             # React entry point
│   ├── api/                 # Axios API clients
│   │   ├── baseApi.js       # Axios instance with /api prefix
│   │   ├── invoice.js       # Invoice CRUD API calls
│   │   ├── fileUpload.js    # File upload API
│   │   ├── dashboard.js     # Dashboard API
│   │   └── auth.js          # Auth API
│   ├── components/
│   │   ├── shared/          # NavBar, SideBar
│   │   ├── invoice/
│   │   │   ├── invoice-add/     # UploadCard, AutoInvoice, ManualInvoice, ExtractedDataForm
│   │   │   └── invoice-listing/ # InvoiceRow, EditInvoice, Filters, Pagination, etc.
│   │   ├── dashboard/       # Dashboard widgets
│   │   └── ui/              # shadcn/ui primitives (Badge, Button, Card, etc.)
│   ├── pages/               # DashboardPage, InvoiceListPage, InvoiceAddPage, LoginPage
│   ├── hooks/               # useInvoiceData, useInvoiceForm, useFileUpload, etc.
│   ├── contexts/            # AuthContext, ThemeContext
│   ├── constants/           # sidebarItems, categories, currencies, status config
│   └── utils/               # formatters, validators
├── package.json
└── vite.config.js
```

## Key Architecture Decisions

1. **`direction` field** exists on Invoice model ("incoming" / "outgoing") but workflows are identical — the new architecture separates these into distinct Ventes/Achats flows with different statuses and actions.

2. **OCR caching** uses MD5 hash of file bytes as cache key in a `cache` collection — prevents duplicate Azure DI API calls for the same document.

3. **Amount warnings** are computed server-side on every response for "extracted" status invoices (sum of line items vs total, etc.).

4. **No company profile** — the current model only has `vendor_name` (the supplier). The new architecture needs "my company" as a first-class entity separate from counterparts.

## Development Guidelines

- **Minimal, incremental changes only.** Read existing code before modifying.
- **Backend convention**: routes → services → crud → database. Keep business logic in services, MongoDB queries in crud.
- **Frontend convention**: pages use hooks, hooks call API functions, components are presentational.
- **All monetary values** use `Decimal` in Python models, stored as `float` in MongoDB.
- **Date handling**: stored as `datetime` in MongoDB, validated from string `YYYY-MM-DD` in Pydantic.
- **Error pattern**: routes catch exceptions, log them, return appropriate HTTP status codes.
- Run `ruff check` before committing backend code.
- The frontend uses `@/` path alias mapping to `src/`.

## Roadmap Reference

See these companion docs:
- `docs/ARCHITECTURE.md` — New architecture for Ventes/Achats split, new models, new collections
- `docs/ROADMAP.md` — Phased feature roadmap with implementation details per phase
- `docs/UBL.md` — UBL 2.1 technical spec and generation guide

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
```
