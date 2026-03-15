# ARCHITECTURE.md — New Architecture for Voynich Invoice Management

## 1. Core Concept: Ventes vs Achats

The app splits into two primary domains that map to accounting reality:

| Domain | French | User Action | Invoice Direction |
|--------|--------|-------------|-------------------|
| **Sales** | Ventes | User SENDS invoices to clients | outgoing |
| **Purchases** | Achats | User RECEIVES invoices from suppliers | incoming |

These share the same underlying `invoices` collection but have **different workflows, statuses, and UI**.

---

## 2. New MongoDB Collections

### 2.1 `company_profile` (single document per user/org)
The user's own business identity. Populated during onboarding.

```python
class CompanyProfile(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    company_name: str                    # "Mon Entreprise SARL"
    legal_form: str | None = None        # "SARL", "SA", "SAS", "Auto-entrepreneur"
    capital: str | None = None           # "100 000 DHS"
    ice: str                             # 15-digit ICE number
    identifiant_fiscal: str | None = None  # IF number
    rc: str | None = None                # Registre de Commerce
    patente: str | None = None           # Patente number
    cnss: str | None = None              # CNSS number
    address: str
    city: str
    postal_code: str | None = None
    phone: str | None = None
    email: str | None = None
    bank_name: str | None = None
    bank_account: str | None = None      # RIB
    logo_url: str | None = None
    default_tva_rate: float = 20.0       # Default TVA rate
    default_currency: str = "MAD"
    invoice_prefix: str = "FAC"          # Prefix for auto-numbering: FAC-2026-001
    next_invoice_number: int = 1         # Auto-increment counter
    created_at: datetime
    updated_at: datetime | None = None
```

### 2.2 `contacts` (clients + suppliers)
Unified contact directory. A contact can be both a client and a supplier.

```python
class Contact(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    name: str                            # Company or person name
    ice: str | None = None               # Their ICE
    identifiant_fiscal: str | None = None
    rc: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    email: str | None = None
    contact_type: list[str] = ["client"]  # ["client"], ["supplier"], or ["client", "supplier"]
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
```

### 2.3 `invoices` (evolved — single collection, direction-aware)

The existing `invoices` collection evolves. Key changes:
- **`direction`** becomes the primary discriminator: `"outgoing"` (ventes) or `"incoming"` (achats)
- **`status`** values differ per direction
- **New fields** for company identity, contact reference, UBL, DGI

```python
class Invoice(BaseModel):
    id: str | None = Field(default=None, alias="_id")

    # === Direction & Type ===
    direction: str = "incoming"            # "incoming" (achat) | "outgoing" (vente)

    # === Numbering ===
    invoice_number: str                    # For outgoing: auto-generated (FAC-2026-001)
                                           # For incoming: as parsed/entered from supplier
    # === Dates ===
    invoice_date: datetime
    invoice_due_date: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    # === Parties ===
    # For OUTGOING: vendor = my company (auto-filled from profile), client = contact
    # For INCOMING: vendor = supplier contact, client = my company (implicit)
    vendor_name: str                       # Who issued the invoice
    vendor_ice: str | None = None
    client_name: str | None = None         # Who receives the invoice
    client_ice: str | None = None
    contact_id: str | None = None          # Reference to contacts collection

    # === Financial ===
    subtotal_ht: Decimal | None = None     # Total HT (before TVA)
    tva_rate: float | None = None          # TVA rate (20, 14, 10, 7, 0)
    tva_amount: Decimal | None = None      # TVA monetary amount
    total_amount: Decimal                  # Total TTC
    currency: str = "MAD"

    # === Line Items ===
    items: list[InvoiceItem] = []

    # === Categorization ===
    category: str
    tags: list[str] = []

    # === Processing ===
    source_type: str                       # "manual" | "pdf" | "image" | "ubl"
    status: str                            # See status definitions below

    # === Flags ===
    is_exported: bool = False
    is_paid: bool = False
    is_archived: bool = False
    paid_at: datetime | None = None
    exported_at: datetime | None = None

    # === DGI / UBL (Phase 3+) ===
    ubl_xml: str | None = None             # Generated UBL 2.1 XML content
    dgi_uuid: str | None = None            # UUID assigned by DGI after clearance
    dgi_status: str | None = None          # "pending" | "submitted" | "validated" | "rejected"
    dgi_submitted_at: datetime | None = None
    dgi_validated_at: datetime | None = None
    dgi_rejection_reason: str | None = None
    signature_hash: str | None = None      # Electronic signature hash
```

### 2.4 Status Definitions

**Outgoing (Ventes) statuses:**
```
draft → validated → [sent] → paid
                  ↘ dgi_pending → dgi_validated → sent → paid
                                ↘ dgi_rejected (→ fix → resubmit)
```

| Status | Meaning |
|--------|---------|
| `draft` | Invoice created, still editable |
| `validated` | User confirmed all fields are correct, locked for editing |
| `dgi_pending` | Submitted to DGI, awaiting clearance (Phase 3) |
| `dgi_validated` | DGI approved, UUID assigned (Phase 3) |
| `dgi_rejected` | DGI rejected, needs correction (Phase 3) |
| `sent` | Invoice delivered to client |
| `paid` | Payment received |

**Incoming (Achats) statuses:**
```
extracted → validated → paid
manual    → validated → paid
```

| Status | Meaning |
|--------|---------|
| `extracted` | AI-parsed from upload, needs human review |
| `manual` | Manually entered |
| `validated` | User confirmed data is correct |
| `paid` | Payment sent to supplier |

---

## 3. Backend Route Structure

Current: all under `/invoices`

New structure with versioned prefixes:

```
/api/company          → Company profile CRUD
/api/contacts         → Contact directory CRUD
/api/ventes           → Outgoing invoice operations
/api/ventes/          → POST (create), GET (list with filters/pagination)
/api/ventes/{id}      → GET, PUT, DELETE
/api/ventes/{id}/validate    → POST (lock invoice)
/api/ventes/{id}/ubl         → GET (generate/return UBL XML) — Phase 2
/api/ventes/{id}/send        → POST (mark as sent / submit to DGI) — Phase 3
/api/ventes/next-number      → GET (next sequential invoice number)
/api/achats           → Incoming invoice operations
/api/achats/          → POST (create manual), GET (list)
/api/achats/upload    → POST (AI parse from file)
/api/achats/{id}      → GET, PUT, DELETE
/api/achats/{id}/validate    → POST
/api/achats/export    → POST (Excel export)
/api/dashboard        → Dashboard (stats from both directions)
/api/auth             → Login, register
/api/users            → User management
```

**Migration note**: The existing `/api/invoices` routes should remain functional during migration. New routes are added alongside. Once frontend is migrated, old routes can be deprecated.

---

## 4. Frontend Route & Navigation Structure

### New Sidebar
```
Dashboard           → /dashboard
Ventes (Sales)
  ├── Liste          → /ventes
  ├── Nouvelle       → /ventes/new
  └── Clients        → /contacts?type=client
Achats (Purchases)
  ├── Liste          → /achats
  ├── Importer       → /achats/import    (upload + AI parse)
  └── Fournisseurs   → /contacts?type=supplier
Mon Entreprise       → /company          (company profile)
Paramètres           → /settings         (future: certificates, DGI config)
```

### New Pages
```
frontend/src/pages/
├── DashboardPage.jsx          (evolve existing)
├── VentesListPage.jsx         (outgoing invoice list)
├── VenteCreatePage.jsx        (create new outgoing invoice)
├── VenteDetailPage.jsx        (view/edit single outgoing invoice)
├── AchatsListPage.jsx         (incoming invoice list)
├── AchatImportPage.jsx        (upload & AI parse — evolve existing InvoiceAddPage)
├── AchatDetailPage.jsx        (view/edit single incoming invoice)
├── ContactsPage.jsx           (client & supplier directory)
├── CompanyProfilePage.jsx     (my company settings)
├── LoginPage.jsx              (keep)
└── RegisterPage.jsx           (keep)
```

---

## 5. Sequential Invoice Numbering (Ventes)

Moroccan law requires strictly chronological, uninterrupted invoice numbering.

**Format**: `{prefix}-{year}-{sequence}` → e.g. `FAC-2026-001`

**Implementation**:
- `company_profile.invoice_prefix` + `company_profile.next_invoice_number`
- On `POST /api/ventes`, backend auto-generates the next number
- MongoDB `findOneAndUpdate` with `$inc` for atomic increment
- The user CANNOT manually set the invoice number for outgoing invoices
- Year resets: when the year changes, sequence resets to 1

---

## 6. Key Migration Principles

1. **Don't break existing functionality.** Old `/api/invoices` routes stay alive. New routes are additive.
2. **Single `invoices` collection.** Ventes and Achats are filtered by `direction` field. No need for separate collections.
3. **Company profile is required before creating outgoing invoices.** The app should prompt for onboarding if no profile exists.
4. **Contacts are optional but encouraged.** When creating an outgoing invoice, the user can pick from saved contacts or type freely.
5. **All existing invoices default to `direction: "incoming"`** since the current app is reception-focused.
