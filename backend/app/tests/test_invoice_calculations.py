"""
Unit tests for run_amount_checks() — per-item TVA semantics.

item.total is now TTC = qty × unit_price × (1 + tva/100).
Legacy items with tva=0 fall back to invoice-level tva.
"""
from decimal import Decimal

import pytest

from app.services.invoices import run_amount_checks


def _inv(**overrides):
    """Build a minimal invoice dict for run_amount_checks."""
    base = {
        "status": "extracted",
        "total_amount": 1200.0,
        "subtotal_ht": 1000.0,
        "tva": 20.0,
        "amount_tva": 200.0,
        "currency": "MAD",
        "items": [],
    }
    base.update(overrides)
    return base


def _item(qty=1, price=1000.0, tva=20.0):
    """Build an item dict with TTC total."""
    tva_amount = round(qty * price * tva / 100, 2)
    total = round(qty * price * (1 + tva / 100), 2)
    return {
        "name": "Test item",
        "description": "desc",
        "quantity": qty,
        "unit_price": price,
        "tva": tva,
        "tva_amount": tva_amount,
        "total": total,
    }


# ---------------------------------------------------------------------------
# No warnings — correct data
# ---------------------------------------------------------------------------

class TestNoWarnings:
    def test_correct_single_item_20pct(self):
        item = _item(1, 1000, 20)
        inv = _inv(items=[item], total_amount=1200.0)
        assert run_amount_checks(inv) == []

    def test_correct_item_with_tva_0(self):
        item = _item(1, 1000, 0)
        inv = _inv(items=[item], total_amount=1000.0, tva=0.0, amount_tva=0.0)
        assert run_amount_checks(inv) == []

    def test_correct_mixed_rates(self):
        item_20 = _item(1, 1000, 20)  # total = 1200
        item_10 = _item(2, 500, 10)   # total = 1100
        inv = _inv(items=[item_20, item_10], total_amount=2300.0)
        assert run_amount_checks(inv) == []

    def test_non_extracted_invoice_skipped(self):
        # Validated invoices are not checked
        item = {"quantity": 1, "unit_price": 1000, "tva": 20, "total": 99}
        inv = _inv(items=[item], status="validated")
        assert run_amount_checks(inv) == []

    def test_empty_items_no_warning(self):
        inv = _inv(items=[])
        assert run_amount_checks(inv) == []


# ---------------------------------------------------------------------------
# Check 1 — per-item TTC mismatch
# ---------------------------------------------------------------------------

class TestCheck1LineItemMismatch:
    def test_warns_when_item_total_wrong(self):
        item = _item(2, 100, 20)
        item["total"] = 300  # should be 240
        inv = _inv(items=[item], total_amount=300.0)
        warnings = run_amount_checks(inv)
        assert any("expected" in w and "240.00" in w for w in warnings)

    def test_warn_message_contains_found_value(self):
        item = _item(1, 1000, 20)
        item["total"] = 999  # should be 1200
        inv = _inv(items=[item], total_amount=999.0)
        warnings = run_amount_checks(inv)
        assert any("999.00" in w for w in warnings)

    def test_fallback_to_invoice_tva_for_legacy_item(self):
        """Item with tva=0 should fall back to invoice-level tva=20."""
        item = {
            "name": "Legacy",
            "description": "",
            "quantity": 1,
            "unit_price": 1000.0,
            "tva": 0,
            "tva_amount": 0,
            "total": 1200.0,  # TTC at 20% — should pass with fallback
        }
        inv = _inv(items=[item], total_amount=1200.0, tva=20.0)
        assert run_amount_checks(inv) == []

    def test_no_false_positive_within_tolerance(self):
        """Floating-point rounding within 0.01 should not trigger a warning."""
        item = _item(3, 33.33, 20)
        inv = _inv(items=[item], total_amount=item["total"])
        assert run_amount_checks(inv) == []


# ---------------------------------------------------------------------------
# Check 2 — sum of item totals vs total_amount
# ---------------------------------------------------------------------------

class TestCheck2SumVsTotal:
    def test_warns_when_sum_differs_from_total(self):
        item = _item(1, 1000, 20)  # total = 1200
        inv = _inv(items=[item], total_amount=999.0)
        warnings = run_amount_checks(inv)
        assert any("≠" in w for w in warnings)

    def test_no_warning_when_sum_matches(self):
        item = _item(1, 1000, 20)  # total = 1200
        inv = _inv(items=[item], total_amount=1200.0)
        assert run_amount_checks(inv) == []

    def test_currency_in_sum_warning(self):
        item = _item(1, 1000, 20)
        inv = _inv(items=[item], total_amount=999.0, currency="EUR")
        warnings = run_amount_checks(inv)
        assert any("EUR" in w for w in warnings)


# ---------------------------------------------------------------------------
# Works with InvoiceItem model objects (not just dicts)
# ---------------------------------------------------------------------------

class TestWithModelObjects:
    def test_works_with_invoice_item_objects(self):
        from app.models.invoice import InvoiceItem
        item = InvoiceItem(
            name="Service",
            description="desc",
            quantity=1,
            unit_price=Decimal("1000"),
            tva=20.0,
            tva_amount=Decimal("200"),
            total=Decimal("1200"),
        )

        class FakeInvoice:
            status = "extracted"
            total_amount = Decimal("1200")
            currency = "MAD"
            tva = 20.0
            items = [item]

        assert run_amount_checks(FakeInvoice()) == []
