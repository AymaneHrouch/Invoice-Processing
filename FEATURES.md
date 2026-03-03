# FEATURES.md — Invoice Processing App
> Dev-oriented feature backlog. Implement in priority order.
> 
> Core positioning: **"We feed your accounting software."**  
> Voynich's job ends at export. What happens after (recording in Sage, paying suppliers) is out of scope.

---

## Data Model Overview

One `status` field (workflow only) + four independent boolean flags:

| Field | Type | Values | Set By |
|-------|------|--------|--------|
| `status` | string | `extracted` \| `validated` | System / User |
| `is_exported` | bool | true/false | System (auto on export) |
| `is_paid` | bool | true/false | User (checkbox) |
| `is_archived` | bool | true/false | User (button) |
| `direction` | string | `incoming` \| `outgoing` | User at upload |

**Why flags instead of more statuses:** An invoice can be exported multiple times — a status would break on the second export. Paid and exported describe *actions taken*, not *what the invoice is*. Flags are orthogonal: an invoice can be validated + exported + paid + archived simultaneously, each independently.

---

## PRIORITY 1 — Status Redesign (Foundation for Everything Else)

> Do this first. Every other feature depends on correct statuses.

### FEAT-01: Simplify Statuses + Add Boolean Flags

**Current:** `pending`, `processed`, `paid` — conflates workflow state with actions.

**Status** — workflow only, exactly 2 values:

| Status | DB Value | Set By | Trigger |
|--------|----------|--------|---------|
| Extrait | `extracted` | System | Automatically on successful AI upload |
| Validé | `validated` | User | Manual click after reviewing extracted data |

**Boolean flags** — independent of each other and of status:

| Flag | DB Field | Set By | Meaning |
|------|----------|--------|---------|
| Exporté | `is_exported` | System (auto) | Included in at least one export |
| Payé | `is_paid` | User (checkbox) | Payment confirmed in bank/ERP |
| Archivé | `is_archived` | User (button) | Hidden from main list, recoverable |
| Direction | `direction` | User at upload | `incoming` (supplier) or `outgoing` (client) |

**Rules:**
- User takes ONE workflow action only: **Valider** (extracted → validated)
- `is_exported` set automatically by system on export — user never touches it
- `is_paid`, `is_archived`, `direction` are independent toggles, orthogonal to workflow

**Backend — add to Invoice model and InvoiceCreate:**
```python
# Status: 2 values only
status: str = Field(default="extracted")  # "extracted" | "validated"

# Boolean flags
is_exported: bool = Field(default=False)
is_paid: bool = Field(default=False)
is_archived: bool = Field(default=False)
direction: str = Field(default="incoming")  # "incoming" | "outgoing"
paid_at: datetime | None = None  # auto-set when is_paid → True
```

Grep and replace ALL hardcoded `"pending"`, `"processed"`, `"paid"` strings before editing models.

**Frontend:**
- Status badge: 2 states only
  - `extracted` → blue pill — "Extrait"
  - `validated` → green pill — "Validé"
- Status filter dropdown: All / Extrait / Validé
- Direction tag: `incoming` = "📥 Fournisseur", `outgoing` = "📤 Client"
- Boolean flag columns handled separately in FEAT-05, FEAT-06, FEAT-07

---

### FEAT-02: Add Validate Action to Invoice

**Current:** No way to change status — invoices stuck as "Extrait" forever.

**Fix:** Add a **"Valider"** button on the invoice detail/edit view.

```
[ Edit fields ]   [ ✓ Valider ]
```

- Button only visible when `status === "extracted"`
- On click: `PATCH /invoices/{id}/validate`
- After: button disappears, badge updates to green "Validé"

**Backend:**
```python
@router.patch("/invoices/{id}/validate")
async def validate_invoice(id: str):
    return InvoiceCRUD.update_invoice(id, {"status": "validated"})
```

---

## PRIORITY 2 — Bug Fixes

### FIX-01: Dashboard Total Invoices Count
**Problem:** "Total Invoices" widget shows 0 while invoices exist.  
**Root cause:** Aggregation filters by old status values, excluding new ones.  
**Fix:** Count query must include ALL statuses, no status filter.

```python
# Wrong
{"$match": {"status": {"$in": ["processed", "paid"]}}}

# Correct
{"$match": {"is_archived": {"$ne": True}}}  # only exclude archived
```

---

### FIX-02: Monthly Trends Includes All Statuses
**Problem:** Newly uploaded invoice doesn't appear in Monthly Trends chart.  
**Fix:** Remove status filter from trends aggregation. Group by month with no status condition.

---

## PRIORITY 3 — Dashboard Redesign

### FEAT-03: Replace Analytics Dashboard with Work Queue Dashboard

**Remove entirely:** Monthly Trends, Category Distribution, Business Insights, Weekly Pattern, Total Amount.  
These belong in their accounting software, not here.

**Replace with 4 actionable widgets:**

```
┌──────────────────────┐  ┌──────────────────────┐
│  To validate    [blue] │  │  Ready to export    │
│       23             │  │  [green]  12         │
│  Extracted invoices  │  │  Validated, not yet exported│
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐
│  Exported this month │
│  [gray]  47          │
│  is_exported = true  │
└──────────────────────┘
```

**Widget behaviors:**
- **To validate** → click → Invoice List filtered by `status=extracted`
- **Ready to export** → click → Invoice List filtered by `status=validated AND is_exported=false`
- **Exported this month** → informational, counts `is_exported=true` this calendar month

All widgets exclude archived invoices (`is_archived != true`).

**Recent Activity feed** (replaces Recent Invoices):
```
✅ facture_maroc_telecom.pdf — Validé — 2 min ago
📤 facture_google.pdf — Exporté — 1 hr ago
⚠️  facture_scan_floue.pdf — Échec extraction — 3 hr ago
```

**Backend:** `GET /invoices/stats`:
```python
{
  "to_validate": 23,        # status=extracted, is_archived=false
  "ready_to_export": 12,    # status=validated, is_exported=false, is_archived=false
  "exported_this_month": 47,# is_exported=true, exported_at >= start of month
  "failed": 3,
  "recent_activity": [...]
}
```

---

## PRIORITY 4 — Batch Upload with Progress Queue

### FEAT-04: Batch File Upload (AI Processing)
**Current:** Single file upload only.  
**Target:** 1–50 files, processed sequentially, 2-second delay between Azure requests.

#### Frontend
Multi-file dropzone:
```
- Accept: PDF, PNG, JPG, JPEG
- Max files: 50 | Max size per file: 4MB (Azure F0 limit)
- "Traiter tout" button starts the queue
```

Progress panel:
```
Traitement en cours... (12 / 50)
[████████░░░░░░░░░░░░] 24%

✅ facture_001.pdf — Maroc Telecom — MAD 890.50
⏳ facture_002.pdf — En cours...
⬜ facture_003.pdf — En attente
[Annuler]
```

Completed rows show: filename, extracted vendor, extracted amount.  
Errors in red with a **Réessayer** button per file.

#### Backend: `POST /invoices/batch-upload`
```python
@router.post("/invoices/batch-upload")
async def batch_upload(files: List[UploadFile], background_tasks: BackgroundTasks):
    batch_id = str(uuid4())
    background_tasks.add_task(process_batch, batch_id, files)
    return {"batch_id": batch_id, "total": len(files)}
```

Sequential processing with rate limit handling:
```python
async def process_batch(batch_id: str, files: list):
    for i, file in enumerate(files):
        await update_batch_item(batch_id, file.filename, "processing")
        try:
            result = await extract_with_azure(file)
            invoice = await save_invoice(result, status="extracted")
            await update_batch_item(batch_id, file.filename, "done", invoice)
        except Exception as e:
            await update_batch_item(batch_id, file.filename, "error", str(e))
        if i < len(files) - 1:
            await asyncio.sleep(2)  # respect Azure F0 rate limits

async def extract_with_azure(file, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await azure_client.analyze(file)
        except HttpResponseError as e:
            if e.status_code in (429, 403) or "quota" in str(e).lower():
                await asyncio.sleep(30)  # burst throttling — wait before retry
            else:
                raise
    raise Exception("Max retries exceeded — Azure quota likely exhausted")
```

Progress polling: `GET /invoices/batch-upload/{batch_id}/status`
```python
{
  "batch_id": "abc123",
  "total": 50, "completed": 12, "failed": 1,
  "items": [
    {"filename": "facture_001.pdf", "status": "done", "vendor": "Google", "amount": 1250.00},
    {"filename": "facture_002.pdf", "status": "error", "error": "File exceeds 4MB"},
    {"filename": "facture_003.pdf", "status": "processing"},
    {"filename": "facture_004.pdf", "status": "waiting"}
  ]
}
```
Frontend polls every 2 seconds.

---

## PRIORITY 5 — Bulk Export

### FEAT-05: Filter-then-Export + Auto-set is_exported

**Current:** No bulk export.  
**Target:** Export filtered invoices to Excel. System auto-sets `is_exported=true` on all exported invoices.

#### Frontend
Export button in Invoice List header: `⬇ Exporter (23 factures)`  
Count reflects current active filter. After export, those invoices show gray "Exporté" indicator.

Also add `exported_at: datetime | None = None` to invoice schema — set automatically on export.

#### Backend: `POST /invoices/export`
```python
from openpyxl import Workbook
from io import BytesIO

@router.post("/invoices/export")
async def export_invoices(filters: InvoiceFilterParams):
    invoices = InvoiceCRUD.get_invoices(filters, limit=None)

    wb = Workbook()
    ws = wb.active
    ws.title = "Factures"

    # Column order matches Moroccan journal d'achats
    headers = ["N° Facture", "Fournisseur", "Date", "Direction", "ICE", "IF",
               "Montant HT", "TVA", "Montant TTC", "Échéance",
               "Statut", "Exporté", "Payé", "Catégorie"]
    ws.append(headers)

    exported_ids = []
    for inv in invoices:
        ws.append([
            inv.invoice_number, inv.vendor_name,
            inv.invoice_date.strftime("%d/%m/%Y") if inv.invoice_date else "",
            inv.direction,
            inv.ice or "", inv.if_number or "",
            inv.amount_ht or "", inv.tva_amount or "", inv.total_amount,
            inv.invoice_due_date.strftime("%d/%m/%Y") if inv.invoice_due_date else "",
            inv.status,
            "Oui" if inv.is_exported else "Non",
            "Oui" if inv.is_paid else "Non",
            inv.category or ""
        ])
        exported_ids.append(str(inv.id))

    # Auto-mark all as exported
    InvoiceCRUD.bulk_update(exported_ids, {
        "is_exported": True,
        "exported_at": datetime.utcnow()
    })

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    filename = f"factures_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"})
```

**Add to requirements.txt:** `openpyxl`

---

## PRIORITY 6 — Additional Features

### FEAT-06: Archive Invoices

`is_archived` boolean flag — hidden from all views by default, always recoverable.

**Backend:**
```python
@router.patch("/invoices/{id}/archive")
async def archive_invoice(id: str):
    return InvoiceCRUD.update_invoice(id, {"is_archived": True})

@router.patch("/invoices/{id}/restore")
async def restore_invoice(id: str):
    return InvoiceCRUD.update_invoice(id, {"is_archived": False})
```

All list/stats queries add `{"is_archived": {"$ne": True}}` by default.  
Add "Afficher les archives" toggle to Invoice List. Archived rows show muted/faded style.  
Archiving does not prevent exporting.

---

### FEAT-07: Paid Checkbox Column

`is_paid` boolean — user ticks when payment confirmed in bank/ERP. Not a status.

**Backend:**
```python
@router.patch("/invoices/{id}/paid")
async def toggle_paid(id: str, is_paid: bool):
    update = {"is_paid": is_paid, "paid_at": datetime.utcnow() if is_paid else None}
    return InvoiceCRUD.update_invoice(id, update)
```

**Frontend — Invoice List:** Add "Payé ☑" column with instant-toggle checkbox (no confirmation needed).  
Add "Payé / Non payé" filter option.  
Include `is_paid` as "Payé (O/N)" in Excel export.

---

### FEAT-08: Amount Verification After Extraction

Run math checks immediately after Azure extraction, before saving. Flag mismatches visually.

**Two checks:**
```python
def run_amount_checks(invoice) -> list[str]:
    warnings = []

    # Check 1 — line item math
    for item in invoice.items:
        expected = round(float(item.quantity) * float(item.unit_price), 2)
        if abs(expected - float(item.total)) > 0.01:
            warnings.append(f"Ligne '{item.description}': {expected} attendu, {item.total} trouvé")

    # Check 2 — global totals
    if invoice.items and invoice.amount_ht:
        sum_items = round(sum(float(i.total) for i in invoice.items), 2)
        if abs(sum_items - float(invoice.amount_ht)) > 0.01:
            warnings.append(f"Somme des lignes ({sum_items}) ≠ Montant HT ({invoice.amount_ht})")

    if invoice.amount_ht and invoice.tva_amount and invoice.total_amount:
        expected_ttc = round(float(invoice.amount_ht) + float(invoice.tva_amount), 2)
        if abs(expected_ttc - float(invoice.total_amount)) > 0.01:
            warnings.append(f"HT + TVA ({expected_ttc}) ≠ Montant TTC ({invoice.total_amount})")

    return warnings
```

**Add to invoice schema:**
```python
amount_warnings: list[str] = Field(default_factory=list)
has_amount_warning: bool = False  # add index on this field
```

Run on upload and on every edit/save. Re-run checks whenever amounts are modified.

**Frontend — Invoice List:** Orange `⚠️` icon next to amount when `has_amount_warning=true`. Tooltip shows warning text.

**Frontend — Invoice Detail:** Warning banner at top:
```
⚠️ Vérification des montants
Somme des lignes (850.00 MAD) ≠ Montant HT (900.00 MAD).
Veuillez vérifier avant de valider.
```

User can still validate despite warnings — it's their call after reviewing.  
Dashboard "À Valider" widget shows: `23 (dont 3 ⚠️)`.

---

## Moroccan-Specific Fields

Verify these fields exist in the schema and are mapped from Azure extraction:

| Field | DB Column | Format |
|-------|-----------|--------|
| ICE | `ice` | 15 digits |
| IF | `if_number` | Variable |
| RC | `rc_number` | Variable |
| Montant HT | `amount_ht` | Decimal |
| TVA | `tva_amount` | Decimal |
| Montant TTC | `total_amount` | Decimal (already in schema) |

Regex fallback if Azure doesn't extract ICE/IF:
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
Run on raw OCR text from Azure and merge into invoice before saving.

---

## FUTURE — Post-Pilot

| Feature | Trigger |
|---------|---------|
| Extraction confidence scores per field | First pilot client feedback |
| Custom export column selection | After 2+ pilots with different column needs |
| Fine-tune model on Moroccan invoice data | After 500+ labeled invoices collected |
| Accounting software connectors (Sage, Odoo) | After pilots confirm manual export is a bottleneck |

---

## Summary Table

| ID | Feature | Priority | Effort |
|----|---------|----------|--------|
| FEAT-01 | Status = 2 values only (extracted/validated) + boolean flags | 🔴 P1 | 2–3h back+front |
| FEAT-02 | Valider button on invoice detail | 🔴 P1 | 1–2h back+front |
| FIX-01 | Dashboard total invoices count bug | 🔴 P1 | 30 min back |
| FIX-02 | Monthly trends includes all statuses | 🟠 P2 | 30 min back |
| FEAT-03 | Work queue dashboard | 🟠 P2 | 4–6h back+front |
| FEAT-04 | Batch upload + progress queue + Azure retry | 🟠 P2 | 1–2 days back+front |
| FEAT-05 | Filter-then-export to Excel + auto is_exported | 🟠 P2 | 4–6h back+front |
| FEAT-06 | Archive (is_archived flag, recoverable) | 🟠 P2 | 3–4h back+front |
| FEAT-07 | Paid checkbox (is_paid boolean) | 🟠 P2 | 2–3h back+front |
| FEAT-08 | Amount verification + warnings after extraction | 🟠 P2 | 3–4h back+front |
