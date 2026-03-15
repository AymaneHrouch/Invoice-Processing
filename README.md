# Voynich — Invoice Management Platform for Moroccan SMEs

Voynich helps Moroccan businesses manage their invoices — both the ones they send (Ventes) and the ones they receive (Achats). It uses AI to extract data from scanned supplier invoices and provides a complete emission workflow for creating DGI-compliant outgoing invoices.

Built to prepare Moroccan PMEs for the mandatory e-invoicing reform (DGI clearance model, UBL 2.1) rolling out in 2026-2027.

## What It Does

**Achats (Purchases) — Incoming Invoices**
- Upload supplier invoices (PDF, scanned images, photos)
- AI-powered extraction via Azure Document Intelligence
- Moroccan-specific field detection: ICE, TVA rate, TVA amount, vendor name (with Arabic text handling)
- Review, correct, validate, and organize extracted data
- Export to Excel

**Ventes (Sales) — Outgoing Invoices** *(in development)*
- Create invoices with auto-generated sequential numbering
- Company profile with ICE, IF, RC, Patente, bank details
- Client directory with ICE validation
- Auto-calculated TVA (20%, 14%, 10%, 7%)
- PDF generation (French/Arabic)
- UBL 2.1 XML export for DGI compliance

**Dashboard**
- Overview of sales and purchase invoices
- Revenue and expense tracking
- Payment status monitoring
- Work queue stats (to validate, to export, etc.)

## Tech Stack

### Backend
- **Python 3.13** + **FastAPI**
- **PyMongo** (sync) + **MongoDB Atlas**
- **Azure Document Intelligence** for OCR (with MD5-based caching)
- **JWT auth** (python-jose + bcrypt)
- **openpyxl** for Excel export
- **ruff** for linting
- Package manager: **uv**

### Frontend
- **React 18** + **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **Lucide React** icons
- **React Router v6**
- **Axios** for API calls
- **Recharts** for dashboard charts

### Database
- **MongoDB** — collections: `invoices`, `company_profile`, `contacts`, `cache`, `users`

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, routers
│   ├── database.py             # MongoDB connection
│   ├── models/
│   │   ├── invoice.py          # Invoice models (Pydantic)
│   │   ├── company.py          # Company profile model
│   │   ├── contact.py          # Client/supplier contact model
│   │   └── user.py             # User model
│   ├── crud/
│   │   └── invoice.py          # Invoice CRUD operations
│   ├── routes/
│   │   ├── invoices.py         # Legacy invoice endpoints
│   │   ├── ventes.py           # Outgoing invoice endpoints
│   │   ├── achats.py           # Incoming invoice endpoints
│   │   ├── company.py          # Company profile endpoints
│   │   ├── contacts.py         # Contact directory endpoints
│   │   ├── dashboard.py        # Dashboard stats
│   │   └── auth.py             # Authentication
│   ├── services/
│   │   ├── invoices.py         # OCR extraction, field parsing
│   │   ├── ubl.py              # UBL 2.1 XML generation
│   │   ├── dashboard.py        # Dashboard aggregation
│   │   └── ocr/                # OCR provider abstraction
│   │       ├── factory.py
│   │       ├── azure_document_intelligence_service.py
│   │       ├── aws_textract_service.py
│   │       └── google_cloud_documentai_service.py
│   └── utils/
│       └── auth.py             # JWT helpers
├── pyproject.toml
└── ruff.toml

frontend/
├── src/
│   ├── App.jsx                 # Routes
│   ├── api/                    # API clients
│   ├── components/
│   │   ├── shared/             # NavBar, SideBar
│   │   ├── invoice/            # Invoice components
│   │   ├── dashboard/          # Dashboard widgets
│   │   └── ui/                 # shadcn/ui primitives
│   ├── pages/                  # Route pages
│   ├── hooks/                  # Custom React hooks
│   ├── contexts/               # Auth, Theme
│   └── constants/              # Config, sidebar items
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 18+
- MongoDB (local or Atlas)
- Azure Document Intelligence account (for AI parsing)

### Backend Setup

```bash
cd backend

# Install dependencies with uv
uv sync

# Create .env file
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Run the server
uv run python -m app.main
```

The API runs at `http://localhost:8888/api` with Swagger docs at `/api/docs`.

### Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

### Environment Variables

Create `backend/.env`:

```env
# MongoDB
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net
DB_NAME=invoice_processing

# Azure Document Intelligence (for AI invoice parsing)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key

# Auth
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password
```

## OCR Providers

The app supports multiple OCR providers through a factory pattern. Currently active: **Azure Document Intelligence**. Also implemented but optional: AWS Textract, Google Cloud Document AI.

The OCR pipeline includes Moroccan-specific post-processing:
- ICE extraction (15-digit regex)
- TVA rate detection from invoice text
- TVA amount extraction (handles multiple Moroccan formats)
- Arabic text cleaning from vendor names
- Currency detection (defaults to MAD)

Extraction results are cached by file MD5 hash to avoid redundant API calls.

## Architecture Docs

Detailed architecture and roadmap documents are in the `docs/` folder:

- `docs/ARCHITECTURE.md` — Data models, Ventes/Achats workflows, route structure
- `docs/ROADMAP.md` — Phased implementation plan (4 phases)
- `docs/UBL.md` — UBL 2.1 technical spec and generation guide
- `docs/MIGRATION.md` — Migration guide from v1 to v2
- `docs/COMPETITORS.md` — Competitive landscape analysis
- `CLAUDE.md` — Context file for AI-assisted development

## Deployment

- **Backend**: Railway (or any Docker-compatible host)
- **Frontend**: Vercel
- **Database**: MongoDB Atlas

## License

Private — Voynich Digital Solutions
