# FEATURES.md — Invoice Processing App
> Dev-oriented feature backlog. Implement in priority order.
> 
> Core positioning: **"We feed your accounting software."**  
> Voynich's job ends at export. What happens after (recording in Sage, paying suppliers) is out of scope.

---

## PRIORITY 1 — Status Redesign (Foundation for Everything Else)

> Do this first. Every other feature depends on correct statuses.  
> Without this the app workflow is broken and demos will fail.

### FEAT-01: Simplify and Redefine Invoice Statuses

**Current:** `pending`, `processed`, `paid` — meaningless to accountants, no automatic transitions  
**Replace with 3 statuses only:**

| Status | DB Value | Set By | Trigger |
|--------|----------|--------|---------|
| Extrait | `extracted` | System | Automatically on successful AI upload |
| Validé | `validated` | User | Manual click after reviewing extracted data |
| Exporté | `exported` | System | Automatically when invoice is included in a batch export |

**Rules:**
- User only ever takes ONE manual action: clicking **Valider**
- System sets `extracted` on upload and `exported` on export — no other manual status changes needed
- There is no "Payé" or "Comptabilisé" — those happen outside Voynich

**Migration script (run once):**
```python
db.invoices.update_many({"status": "pending"},    {"$set": {"status": "extracted"}})
db.invoices.update_many({"status": "processed"},  {"$set": {"status": "validated"}})
db.invoices.update_many({"status": "paid"},       {"$set": {"status": "exported"}})
```

**Backend:** Update `InvoiceStatus` enum:
```python
class InvoiceStatus(str, Enum):
    extracted = "extracted"
    validated = "validated"
    exported  = "exported"
```
Remove all hardcoded references to `pending`, `processed`, `paid`.

**Frontend:**
- Update all status badge labels and colors:
  - `extracted` → blue — "Extrait"
  - `validated` → green — "Validé"
  - `exported` → gray — "Exporté"
- Update all filter dropdown options
- Remove any "Paid" / "Pending" labels throughout the UI

---

### FEAT-02: Add Validate Action to Invoice

**Current:** User can edit invoice fields but cannot change status — invoices are stuck as "Extrait" forever.

**Fix:** Add a **"Valider"** button on the invoice detail/edit view.

```
[ Edit fields ]   [ ✓ Valider ]
```

- Button only visible when status is `extracted`
- On click: `PATCH /invoices/{id}/validate`
- After validation: button disappears, status badge updates to green "Validé"

**Backend:**
```python
@router.patch("/invoices/{id}/validate")
async def validate_invoice(id: str):
    return InvoiceCRUD.update_invoice(id, {"status": "validated"})
```

---

## PRIORITY 2 — Bug Fixes

### FIX-01: Dashboard Total Invoices Count
**Problem:** "Total Invoices" widget shows 0 while Pending = 1.  
**Root cause:** Aggregation query filters by specific statuses, excluding others.  
**Fix:**
```python
# Wrong — likely current behavior
{"$match": {"status": {"$in": ["processed", "paid"]}}}

# Correct — no status filter for total count
{"$match": {}}
```
Also fix: Total Amount widget must sum across all statuses.

---

### FIX-02: Fix Monthly Trends to Include All Statuses
**Problem:** Newly uploaded invoice (status: extracted) doesn't appear in Monthly Trends chart.  
**Fix:** Remove status filter from the trends aggregation query. Group by month with no status condition.

---

## PRIORITY 3 — Dashboard Redesign

### FEAT-03: Replace Analytics Dashboard with Work Queue Dashboard

**Current dashboard problem:** Business intelligence widgets (trends, category distribution, business insights, weekly pattern) belong in their accounting software, not here. Empty widgets look broken. Analytics are out of scope.

**New concept:** A work queue showing what needs attention right now.

**Remove entirely:**
- Monthly Trends chart
- Category Distribution chart
- Business Insights panel
- Weekly Pattern widget
- Total Amount widget

**Replace with 4 actionable widgets:**

```
┌──────────────────────┐  ┌──────────────────────┐
│  À Valider    [blue] │  │  Prêts à exporter    │
│       23             │  │  [green]  12         │
│  Factures extraites  │  │  Factures validées   │
│  en attente          │  │  non exportées       │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│  Exportés ce mois    │  │  Échecs extraction   │
│  [gray]  47          │  │  [red]   3           │
│  Factures traitées   │  │  Nécessitent         │
│                      │  │  attention           │
└──────────────────────┘  └──────────────────────┘
```

**Widget behaviors:**
- **À Valider** → clickable, navigates to Invoice List filtered by `extracted`
- **Prêts à exporter** → clickable, navigates to Invoice List filtered by `validated`
- **Exportés ce mois** → informational only, resets each calendar month
- **Échecs extraction** → clickable, navigates to Invoice List filtered by `failed`

**Replace "Recent Invoices" with a Recent Activity feed:**
```
✅ facture_maroc_telecom.pdf — Validé — 2 min ago
✅ facture_google.pdf — Exporté — 1 hr ago
⚠️  facture_scan_floue.pdf — Échec extraction — 3 hr ago
```

**Backend:** New stats endpoint `GET /invoices/stats`:
```python
{
  "to_validate": 23,
  "ready_to_export": 12,
  "exported_this_month": 47,
  "failed": 3,
  "recent_activity": [...]
}
```

---

## PRIORITY 4 — Batch Upload with Progress Queue

### FEAT-04: Batch File Upload (AI Processing)
**Current:** Single file upload only.  
**Target:** Upload 1–50 files at once, processed sequentially with 2-second delay between Azure requests.

#### Frontend
Replace single file input with multi-file dropzone:
```
- Accept: PDF, PNG, JPG, JPEG
- Max files per batch: 50
- Max file size per file: 4MB (Azure F0 limit)
- Show file list with name + size after selection
- "Traiter tout" button starts the queue
```

Progress panel during processing:
```
Traitement en cours... (12 / 50)
[████████░░░░░░░░░░░░] 24%

✅ facture_001.pdf — Maroc Telecom — MAD 890.50
✅ facture_002.pdf — Google — MAD 1,250.00
⏳ facture_003.pdf — En cours...
⬜ facture_004.pdf — En attente

[Annuler]
```

Each completed row: filename, extracted vendor, extracted amount, status badge.  
Errors in red with a **Réessayer** button per file.

#### Backend: `POST /invoices/batch-upload`
```python
@router.post("/invoices/batch-upload")
async def batch_upload(files: List[UploadFile], background_tasks: BackgroundTasks):
    batch_id = str(uuid4())
    # Save batch job to MongoDB batch_jobs collection
    # status per file: waiting | processing | done | error
    background_tasks.add_task(process_batch, batch_id, files)
    return {"batch_id": batch_id, "total": len(files)}
```

#### Backend: Sequential Processing
```python
import asyncio

async def process_batch(batch_id: str, files: list):
    for i, file in enumerate(files):
        await update_batch_item(batch_id, file.filename, "processing")
        try:
            result = await extract_with_azure(file)
            invoice = await save_invoice(result, status="extracted")
            await update_batch_item(batch_id, file.filename, "done", invoice)
        except Exception as e:
            await update_batch_item(batch_id, file.filename, "error", str(e))

        # 2-second delay between requests — respects Azure F0 rate limits
        if i < len(files) - 1:
            await asyncio.sleep(2)

async def extract_with_azure(file, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await azure_client.analyze(file)
        except HttpResponseError as e:
            if e.status_code in (429, 403) or "quota" in str(e).lower():
                # Burst throttling hit — wait 30s before retry
                await asyncio.sleep(30)
            else:
                raise
    raise Exception("Max retries exceeded — Azure quota likely exhausted")
```

#### Backend: Progress Polling `GET /invoices/batch-upload/{batch_id}/status`
```python
{
  "batch_id": "abc123",
  "total": 50,
  "completed": 12,
  "failed": 1,
  "items": [
    {"filename": "facture_001.pdf", "status": "done", "invoice_id": "...", "vendor": "Google", "amount": 1250.00},
    {"filename": "facture_002.pdf", "status": "error", "error": "File exceeds 4MB"},
    {"filename": "facture_003.pdf", "status": "processing"},
    {"filename": "facture_004.pdf", "status": "waiting"}
  ]
}
```

Frontend polls this endpoint every 2 seconds to update the progress panel.

---

## PRIORITY 5 — Bulk Export

### FEAT-05: Filter-then-Export to Excel

**Current:** No bulk export.  
**Target:** Export all currently filtered invoices to Excel in one click.  
**Auto-behavior:** Exporting automatically marks all included invoices as `exported` — no manual status update needed by the user.

#### Frontend
Add **"Exporter"** button to Invoice List page header.  
Button dynamically shows count: `⬇ Exporter (23 factures)`  
Count reflects current active filter, not all invoices.

On click:
1. POST current active filters to export endpoint
2. Receive `.xlsx` file download
3. UI refreshes — exported invoices now show gray "Exporté" badge

#### Backend: `POST /invoices/export`
```python
from openpyxl import Workbook
from io import BytesIO

@router.post("/invoices/export")
async def export_invoices(filters: InvoiceFilterParams):
    invoices = InvoiceCRUD.get_invoices(filters, limit=None)  # no pagination

    wb = Workbook()
    ws = wb.active
    ws.title = "Factures"

    # Column order matches Moroccan journal d'achats
    headers = ["N° Facture", "Fournisseur", "Date", "ICE", "IF",
               "Montant HT", "TVA", "Montant TTC", "Échéance", "Statut", "Catégorie"]
    ws.append(headers)

    exported_ids = []
    for inv in invoices:
        ws.append([
            inv.invoice_number,
            inv.vendor_name,
            inv.invoice_date.strftime("%d/%m/%Y") if inv.invoice_date else "",
            inv.ice or "",
            inv.if_number or "",
            inv.amount_ht or "",
            inv.tva_amount or "",
            inv.total_amount,
            inv.due_date.strftime("%d/%m/%Y") if inv.due_date else "",
            inv.status,
            inv.category or ""
        ])
        exported_ids.append(str(inv.id))

    # Auto-mark all exported invoices — user never needs to do this manually
    InvoiceCRUD.bulk_update_status(exported_ids, "exported")

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"factures_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
```

**Add to requirements.txt:** `openpyxl`

#### Export Column Order
Ordered to match the Moroccan **journal d'achats** — accountants paste directly into Sage/Odoo/Excel without reformatting:
```
N° Facture | Fournisseur | Date | ICE | IF | Montant HT | TVA | Montant TTC | Échéance | Statut | Catégorie
```

---

## Moroccan-Specific Fields

Verify these fields are in the invoice schema and mapped from Azure extraction output:

| Field | DB Column | Format |
|-------|-----------|--------|
| ICE | `ice` | 15 digits |
| IF | `if_number` | Variable |
| RC | `rc_number` | Variable |
| Montant HT | `amount_ht` | Decimal |
| TVA | `tva_amount` | Decimal |
| Montant TTC | `total_amount` | Decimal (already in schema) |

If Azure doesn't extract ICE/IF automatically, add a regex post-processing step after Azure returns raw text:
```python
import re

def extract_moroccan_fields(raw_text: str) -> dict:
    patterns = {
        "ice":       r'\bICE\s*[:\-]?\s*(\d{15})\b',
        "if_number": r'\bI\.?F\.?\s*[:\-]?\s*(\d+)\b',
        "rc_number": r'\bRC\s*[:\-]?\s*(\w[\w\s\-]+)',
    }
    return {
        key: (m.group(1).strip() if (m := re.search(pat, raw_text, re.IGNORECASE)) else None)
        for key, pat in patterns.items()
    }
```
Merge results into the invoice document before saving to MongoDB.

---

## FUTURE — Post-Pilot (do not implement now)

| Feature | Trigger to implement |
|---------|---------------------|
| Extraction confidence scores per field | First pilot client feedback |
| Custom export column selection | After 2+ pilots with different column needs |
| Fine-tune on Moroccan invoice data | After 500+ labeled real invoices collected during pilots |
| Accounting software connectors (Sage, Odoo) | After pilots confirm manual export is a bottleneck |

---

## Summary Table

| ID | Feature | Priority | Effort |
|----|---------|----------|--------|
| FEAT-01 | Simplify statuses: extracted / validated / exported | 🔴 P1 | 2–3h back+front |
| FEAT-02 | Add Valider button on invoice detail | 🔴 P1 | 1–2h back+front |
| FIX-01 | Dashboard total invoices count bug | 🔴 P1 | 30 min back |
| FIX-02 | Monthly trends includes all statuses | 🟠 P2 | 30 min back |
| FEAT-03 | Redesign dashboard as work queue | 🟠 P2 | 4–6h back+front |
| FEAT-04 | Batch upload + progress queue + Azure retry logic | 🟠 P2 | 1–2 days back+front |
| FEAT-05 | Filter-then-export to Excel (auto-marks exported) | 🟠 P2 | 4–6h back+front |
