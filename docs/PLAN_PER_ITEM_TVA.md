# Plan: Per-item TVA Refactor

## Goal

Support per-item TVA rates (0%, 7%, 10%, 14%, 20%) aligned with Morocco's multi-rate TVA system.
`total_amount`, `subtotal_ht`, and `amount_tva` become fully derived from item-level calculations.

## Key decisions made

- `InvoiceItem.total` changes meaning: **HT → TTC** (`qty × unit_price × (1 + tva/100)`)
- Invoice-level `tva` becomes a **default rate** that pre-fills new items (kept for backward compat and OCR fallback)
- `total_amount`, `subtotal_ht`, `amount_tva` stay **stored** (denormalized, recomputed from items on every write) — needed for dashboard aggregations and MongoDB filtering
- `tva` on `InvoiceItem` is **required** on write (not optional)
- No migration script needed — only seeded demo data in use; reset with `--seed` after deploy
- OCR-extracted items have no `tva` — backward compat: fall back to invoice-level `tva` on read/edit; recompute `item.total` as TTC in extraction service on save

## Affects

Both **Achats** (ManualInvoice + OCR upload) and **Ventes** (VenteCreatePage) — `InvoiceItems.jsx` is shared.

---

## Execution order

### Phase 1 — Backend model (`models/invoice.py`)
- Add `tva: float = 0.0` and `tva_amount: Decimal = Decimal("0")` to `InvoiceItem`
- Backward compat: `tva` defaults to 0 so existing items without it don't break on read

### Phase 2 — Backend services (`services/invoices.py`)
- Update `run_amount_checks`:
  - Check 1: per-item `qty × price × (1 + tva/100) == item.total`; fall back to invoice-level `tva` for items with `tva=0` and no override
  - Check 2: `sum(item.total) == total_amount` (no HT→TTC compensation — remove old fallback)
- Add `test_invoice_calculations.py` (see Tests section)

### Phase 3 — Backend routes
- `routes/invoices.py`: add `items` sub-fields `tva` and `tva_amount` to LOCKED_FIELDS for validated Achats (financial fields — lock as part of the `items` array lock)
- `routes/invoices.py`: `PUT /invoices/{id}` — when items are sent, recompute `subtotal_ht`, `amount_tva`, `total_amount` from items before saving
- `routes/ventes.py`: same recomputation on `PUT /ventes/{id}` and `POST /ventes` (create)

### Phase 4 — OCR extraction service (`services/invoices.py` extraction path)
- After Azure DI extracts items, set per-item `tva` from invoice-level `tva` (or 0):
  ```python
  item["tva"] = item.get("tva") or invoice_tva or 0
  item["tva_amount"] = round(item["unit_price"] * item["quantity"] * item["tva"] / 100, 2)
  item["total"] = round(item["unit_price"] * item["quantity"] * (1 + item["tva"] / 100), 2)
  ```
- Recompute invoice-level `subtotal_ht`, `amount_tva`, `total_amount` from updated items

### Phase 5 — PDF service (`services/pdf.py`)
- Build `tva_groups` dict: `{rate: amount}` aggregated from items
- Backward compat: items missing `tva` fall back to invoice-level `tva`
- Pass `tva_groups` to template context

### Phase 6 — PDF template (`templates/invoice.html`)
- Add TVA% column to items table
- Replace single TVA row in summary with grouped rows (one per rate, e.g. "TVA 20%: X MAD" + "TVA 10%: Y MAD")

### Phase 7 — Seed script (`scripts/reset.py`)
- Add `tva` and `tva_amount` per item in `_make_items()`
- Recompute `item.total` as TTC (`qty × price × (1 + tva/100)`)

### Phase 8 — Frontend calculation utilities
- `utils/invoiceCalculations.js`:
  - `calculateItemTotal(qty, price, tvaRate)` → returns TTC
  - `calculateInvoiceTotals(items)` → returns `{ subtotalHT, amountTva, totalTTC }`
  - `runAmountChecks` updated to use per-item tva
- `constants/index.jsx`: import `calculateItemTotal` from `invoiceCalculations.js` instead of duplicating (eliminates the two-copy problem)

### Phase 9 — `InvoiceItems.jsx`
- Add `defaultTvaRate` prop (passed from parent)
- Add TVA rate selector per item (0 / 7 / 10 / 14 / 20%) — pre-fills from `defaultTvaRate`
- New items seed `tva` from `defaultTvaRate`
- `addItem` / `confirmEdit` compute `tva_amount` and `total` (TTC) from per-item rate
- Display: add TVA% badge on each item row; add TVA selector in inline edit form

### Phase 10 — `ManualInvoice.jsx`
- Rename TVA header field label to "TVA par défaut (%)"
- Pass `defaultTvaRate={parseFloat(formData.tva) || 0}` to `<InvoiceItems>`
- Computed totals (read-only): derive `subtotalHT` and `amountTva` from items, not from header rate × total
- `handleSubmit`: send `subtotal_ht`, `amount_tva`, `total_amount` computed from items

### Phase 11 — `VenteCreatePage.jsx`
- `subtotalHT` = `sum(qty × unit_price)` — NOT `sum(item.total)` which is now TTC
- `tvaAmount` = `sum(item.tva_amount)`
- `totalTTC` = `subtotalHT + tvaAmount`
- Pass `defaultTvaRate={form.tva_rate}` to `<InvoiceItems>`
- `buildPayload`: send computed totals from items

### Phase 12 — `EditInvoice.jsx`
- When loading invoice: map items including `tva` and `tva_amount`, falling back to invoice-level `tva` for legacy items:
  ```js
  tva: item.tva ?? invoice.tva ?? 0,
  tva_amount: item.tva_amount || 0,
  total: item.total || 0,
  ```
- Fix `subtotalHT` computation: change from `sum(item.total)` to `sum(qty × unit_price)` for HT display
- `updateItems`: preserve per-item `tva` and `tva_amount`
- `handleSubmit`: send computed totals from items
- Pass `defaultTvaRate={parseFloat(formData.tva) || 0}` to `<InvoiceItems>`

### Phase 13 — Tests
See Tests section below.

---

## Tricky points

1. **`item.total` semantics flip** — before = HT, after = TTC. Every place that treats `item.total` as HT must switch to `qty × unit_price`. Affected: `subtotalHT` in `EditInvoice` and `VenteCreatePage`.

2. **Two copies of `calculateItemTotal`** — one in `constants/index.jsx`, one in `utils/invoiceCalculations.js`. Consolidate: move to `invoiceCalculations.js`, re-export from `constants/index.jsx`.

3. **`run_amount_checks` old fallback** — the HT→TTC compensation logic must be removed or it creates false negatives after the semantics flip.

4. **Partial lock on validated Achats** — `items` is locked as a whole unit. `tva` and `tva_amount` per item are financial fields and must stay locked.

5. **`InvoiceUpdate` items** — `tva` is required on write. Any PUT that sends items must include `tva` per item or it writes 0.

6. **OCR items have `item.total` as HT** — must recompute to TTC in extraction service before saving.

---

## Tests

### New: `backend/app/tests/test_invoice_calculations.py`
- `run_amount_checks` no warning when items sum correctly to `total_amount` (TTC)
- `run_amount_checks` warns when a line item's `total` doesn't match `qty × price × (1 + tva/100)`
- `run_amount_checks` handles items with `tva=0` (legacy backward compat)
- Mixed TVA rates: items at 20% and 10% — `amount_tva` equals sum of per-item TVA amounts

### Updated: `frontend/src/utils/__tests__/invoiceCalculations.test.js`
- `calculateItemTotal(2, 100, 20)` → 240.00 (TTC)
- `calculateItemTotal(3, 100, 0)` → 300.00 (backward compat, tva=0)
- `calculateItemTotal(3, 100)` → 300.00 (no rate passed, defaults to 0)
- `runAmountChecks` with mixed-rate items
- `runAmountChecks` warns correctly on line item mismatch

### Updated: `backend/app/tests/conftest.py` (`make_invoice`)
- Items default includes `tva: 20.0`, `tva_amount: 200.0`, `total: 1200.0` (TTC)

### Updated: `backend/app/tests/test_ventes_transitions.py`
- PDF smoke test passes with per-item `tva` (grouped TVA summary block in template)

### Updated: `backend/app/tests/test_achats_transitions.py`
- `PUT` on validated Achat with changed `items[].tva` is rejected (partial lock)

---

## Post-refactor cleanup (follow-up, not this PR)
- Rename invoice-level `tva` → `default_tva` in model to make its role explicit
- Consider removing `amount_tva` and `subtotal_ht` from the model (always compute on read) — only if dashboard aggregations can be moved to aggregation pipelines
- UBL 2.1 (Phase 3): grouped TVA structure maps directly to `TaxTotal/TaxSubtotal` per rate

---

## PR sentence
> Refactor invoice items to support per-item TVA rates (0%, 7%, 10%, 14%, 20%) aligned with Morocco's multi-rate TVA system, making `total_amount`, `subtotal_ht`, and `amount_tva` fully derived from item-level calculations rather than a single header rate.
