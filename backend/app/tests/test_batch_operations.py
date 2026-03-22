"""
Integration tests for batch invoice operations.

Tests use mongomock (via conftest.py `patch_db`) so actual MongoDB query
logic is exercised — not just mocked return values.

Since is_paid was removed, payment state is now fully encoded in `status`.
Key invariants:
  - status="paid"       → paid_at is set
  - status != "paid"    → paid_at is unset
  - mark-paid guard     → only applies to status IN [validated, sent]
"""

import pytest
from bson import ObjectId

from app.crud.invoice import InvoiceCRUD
from app.tests.conftest import make_invoice


# ── helpers ──────────────────────────────────────────────────────────────────


def insert(col, **kwargs):
    """Insert a make_invoice document and return its string ID."""
    doc = make_invoice(**kwargs)
    col.insert_one(doc)
    return str(doc["_id"]), doc["_id"]


# ── Mark Paid ─────────────────────────────────────────────────────────────────


class TestBatchMarkPaid:
    def test_marks_validated_invoice_paid(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="validated")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="paid")

        assert count == 1
        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "paid"
        assert doc["paid_at"] is not None

    def test_marks_sent_invoice_paid(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="sent", direction="outgoing")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="paid")

        assert count == 1
        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "paid"
        assert doc["paid_at"] is not None

    def test_does_not_mark_draft_invoice_paid(self, invoices_col, patch_db):
        """Draft status must be excluded from mark-paid query guard."""
        inv_id, oid = insert(invoices_col, status="draft")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="paid")

        assert count == 0
        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "draft"

    def test_does_not_re_mark_already_paid_invoice(self, invoices_col, patch_db):
        """Already-paid invoice must not be counted again."""
        inv_id, oid = insert(invoices_col, status="paid")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="paid")

        assert count == 0

    def test_only_valid_invoices_modified_in_mixed_batch(self, invoices_col, patch_db):
        """Mixed batch — only validated/sent are modified."""
        validated_id, validated_oid = insert(invoices_col, status="validated")
        draft_id, draft_oid = insert(invoices_col, status="draft")
        paid_id, paid_oid = insert(invoices_col, status="paid")

        count = InvoiceCRUD.batch_update_invoices(
            invoice_ids=[validated_id, draft_id, paid_id], status="paid"
        )

        assert count == 1
        assert invoices_col.find_one({"_id": validated_oid})["status"] == "paid"
        assert invoices_col.find_one({"_id": draft_oid})["status"] == "draft"
        assert invoices_col.find_one({"_id": paid_oid})["status"] == "paid"  # unchanged


# ── Unmark Paid ───────────────────────────────────────────────────────────────


class TestBatchUnmarkPaid:
    def test_unmarks_paid_achats_invoice_to_validated(self, invoices_col, patch_db):
        from datetime import datetime
        inv_id, oid = insert(invoices_col, status="paid", paid_at=datetime.utcnow(), direction="incoming")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="validated")

        assert count == 1
        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "validated"
        assert doc.get("paid_at") is None

    def test_unmarks_paid_ventes_invoice_to_sent(self, invoices_col, patch_db):
        from datetime import datetime
        inv_id, oid = insert(invoices_col, status="paid", paid_at=datetime.utcnow(), direction="outgoing")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="sent")

        assert count == 1
        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "sent"
        assert doc.get("paid_at") is None


# ── Valider / Invalider ───────────────────────────────────────────────────────


class TestBatchValidate:
    def test_validate_sets_status_validated(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="extracted")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="validated")

        assert invoices_col.find_one({"_id": oid})["status"] == "validated"

    def test_validate_clears_paid_at_when_reverting_from_paid(self, invoices_col, patch_db):
        """
        When transitioning a paid invoice to validated, paid_at must be cleared
        so the invoice is not left in an inconsistent state.
        """
        from datetime import datetime
        inv_id, oid = insert(invoices_col, status="paid", paid_at=datetime.utcnow())

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="validated")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "validated"
        assert doc.get("paid_at") is None


class TestBatchInvalidate:
    def test_invalidate_achats_sets_status_extracted(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="validated", direction="incoming")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="extracted")

        assert invoices_col.find_one({"_id": oid})["status"] == "extracted"

    def test_invalidate_achats_clears_paid_at(self, invoices_col, patch_db):
        """Status='extracted' must clear paid_at."""
        from datetime import datetime
        inv_id, oid = insert(invoices_col, status="paid", paid_at=datetime.utcnow())

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="extracted")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "extracted"
        assert doc.get("paid_at") is None

    def test_invalidate_ventes_sets_status_draft(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="validated", direction="outgoing")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="draft")

        assert invoices_col.find_one({"_id": oid})["status"] == "draft"

    def test_invalidate_ventes_clears_paid_at(self, invoices_col, patch_db):
        """Status='draft' must clear paid_at."""
        from datetime import datetime
        inv_id, oid = insert(invoices_col, status="paid", paid_at=datetime.utcnow(), direction="outgoing")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="draft")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "draft"
        assert doc.get("paid_at") is None


# ── Mark / Unmark Sent (Ventes) ───────────────────────────────────────────────


class TestBatchMarkSent:
    def test_mark_sent_sets_status(self, invoices_col, patch_db):
        """Backend must handle status='sent' batch correctly."""
        id1, oid1 = insert(invoices_col, status="validated", direction="outgoing")
        id2, oid2 = insert(invoices_col, status="validated", direction="outgoing")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[id1, id2], status="sent")

        assert count == 2
        for oid in [oid1, oid2]:
            doc = invoices_col.find_one({"_id": oid})
            assert doc["status"] == "sent"
            assert doc.get("paid_at") is None  # sent does not set paid_at

    def test_unmark_sent_reverts_to_validated(self, invoices_col, patch_db):
        """status='validated' from sent state."""
        inv_id, oid = insert(invoices_col, status="sent", direction="outgoing")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="validated")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "validated"
        assert doc.get("paid_at") is None


# ── Archive / Restore ─────────────────────────────────────────────────────────


class TestBatchArchive:
    def test_archive_sets_flag(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, is_archived=False)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_archived=True)

        assert invoices_col.find_one({"_id": oid})["is_archived"] is True

    def test_archive_does_not_touch_payment_state(self, invoices_col, patch_db):
        """Archiving a paid invoice must not disturb status or paid_at."""
        from datetime import datetime
        inv_id, oid = insert(invoices_col, status="paid", paid_at=datetime.utcnow(), is_archived=False)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_archived=True)

        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_archived"] is True
        assert doc["status"] == "paid"
        assert doc["paid_at"] is not None

    def test_restore_clears_flag(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, is_archived=True)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_archived=False)

        assert invoices_col.find_one({"_id": oid})["is_archived"] is False


# ── Export ────────────────────────────────────────────────────────────────────


class TestBatchExport:
    def test_mark_exported_sets_flag(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, is_exported=False)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_exported=True)

        assert invoices_col.find_one({"_id": oid})["is_exported"] is True

    def test_unmark_exported_clears_flag(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, is_exported=True)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_exported=False)

        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_exported"] is False


# ── Edge cases ────────────────────────────────────────────────────────────────


class TestBatchEdgeCases:
    def test_empty_ids_returns_zero(self, invoices_col, patch_db):
        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[], status="paid")
        assert count == 0

    def test_invalid_objectids_are_skipped(self, invoices_col, patch_db):
        count = InvoiceCRUD.batch_update_invoices(
            invoice_ids=["not-an-id", "also-bad"], status="paid"
        )
        assert count == 0

    def test_no_fields_returns_zero(self, invoices_col, patch_db):
        inv_id, _ = insert(invoices_col, status="validated")
        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id])
        assert count == 0

    def test_unknown_valid_objectid_updates_zero(self, invoices_col, patch_db):
        unknown_id = str(ObjectId())
        count = InvoiceCRUD.batch_update_invoices(
            invoice_ids=[unknown_id], status="validated"
        )
        assert count == 0
