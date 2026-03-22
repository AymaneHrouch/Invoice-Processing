"""
Integration tests for batch invoice operations.

Tests use mongomock (via conftest.py `patch_db`) so actual MongoDB query
logic is exercised — not just mocked return values.

Bug regressions covered:
  Bug 2: batch unmark-paid used query["status"] = "paid" — missed invoices
          with is_paid=True but status != "paid" (inconsistent state)
  Bug 3: batch Valider/Invalider did not reset is_paid=False → inconsistent docs
  Bug 6: missing batch Marquer envoyé / Non envoyé for Ventes
  Bug 7: batch mark-paid only queries status IN [validated, sent]
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
        inv_id, oid = insert(invoices_col, status="validated", is_paid=False)

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_paid=True)

        assert count == 1
        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_paid"] is True
        assert doc["status"] == "paid"
        assert doc["paid_at"] is not None

    def test_marks_sent_invoice_paid(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="sent", is_paid=False, direction="outgoing")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_paid=True)

        assert count == 1
        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_paid"] is True
        assert doc["status"] == "paid"

    def test_does_not_mark_draft_invoice_paid(self, invoices_col, patch_db):
        """Bug 7: draft status must be excluded from mark-paid query guard."""
        inv_id, oid = insert(invoices_col, status="draft", is_paid=False)

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_paid=True)

        assert count == 0
        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_paid"] is False

    def test_does_not_re_mark_already_paid_invoice(self, invoices_col, patch_db):
        """Bug 7: already-paid invoice must not be counted again."""
        inv_id, oid = insert(invoices_col, status="paid", is_paid=True)

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_paid=True)

        assert count == 0

    def test_only_valid_invoices_modified_in_mixed_batch(self, invoices_col, patch_db):
        """Bug 7: verified mixed batch — only validated/sent are modified."""
        validated_id, validated_oid = insert(invoices_col, status="validated", is_paid=False)
        draft_id, draft_oid = insert(invoices_col, status="draft", is_paid=False)
        paid_id, paid_oid = insert(invoices_col, status="paid", is_paid=True)

        count = InvoiceCRUD.batch_update_invoices(
            invoice_ids=[validated_id, draft_id, paid_id], is_paid=True
        )

        assert count == 1
        assert invoices_col.find_one({"_id": validated_oid})["is_paid"] is True
        assert invoices_col.find_one({"_id": draft_oid})["is_paid"] is False
        assert invoices_col.find_one({"_id": paid_oid})["status"] == "paid"  # unchanged


# ── Unmark Paid ───────────────────────────────────────────────────────────────


class TestBatchUnmarkPaid:
    def test_unmarks_paid_invoice(self, invoices_col, patch_db):
        from datetime import datetime
        inv_id, oid = insert(invoices_col, status="paid", is_paid=True, paid_at=datetime.utcnow())

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_paid=False)

        assert count == 1
        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_paid"] is False
        assert doc.get("paid_at") is None

    def test_recovers_inconsistent_doc_is_paid_true_status_validated(self, invoices_col, patch_db):
        """
        Bug 2 regression: an invoice with is_paid=True but status='validated'
        (inconsistent state from old batch bug) must be recoverable via unmark-paid.
        The old code used query["status"] = "paid" which would miss this document.
        The fix uses query["is_paid"] = True instead.
        """
        inv_id, oid = insert(invoices_col, status="validated", is_paid=True)

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_paid=False)

        assert count == 1, "Inconsistent doc (is_paid=True, status=validated) must be recoverable"
        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_paid"] is False

    def test_does_not_affect_unpaid_invoice(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="validated", is_paid=False)

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_paid=False)

        assert count == 0


# ── Valider / Invalider ───────────────────────────────────────────────────────


class TestBatchValidate:
    def test_validate_sets_status_validated(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="extracted", is_paid=False)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="validated")

        assert invoices_col.find_one({"_id": oid})["status"] == "validated"

    def test_validate_resets_is_paid_on_inconsistent_doc(self, invoices_col, patch_db):
        """
        Bug 3 regression: batch status='validated' must reset is_paid=False
        so documents cannot be left in {status=validated, is_paid=True} state.
        """
        inv_id, oid = insert(invoices_col, status="paid", is_paid=True)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="validated")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "validated"
        assert doc["is_paid"] is False
        assert doc.get("paid_at") is None

    def test_validate_does_not_affect_payment_on_normal_doc(self, invoices_col, patch_db):
        """Validating an already-unpaid extracted invoice must not disturb is_paid."""
        inv_id, oid = insert(invoices_col, status="extracted", is_paid=False)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="validated")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_paid"] is False  # was already False, stays False


class TestBatchInvalidate:
    def test_invalidate_achats_sets_status_extracted(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="validated", direction="incoming")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="extracted")

        assert invoices_col.find_one({"_id": oid})["status"] == "extracted"

    def test_invalidate_achats_resets_is_paid_flag(self, invoices_col, patch_db):
        """Bug 3 regression: status='extracted' must reset is_paid=False."""
        inv_id, oid = insert(invoices_col, status="paid", is_paid=True)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="extracted")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_paid"] is False
        assert doc.get("paid_at") is None

    def test_invalidate_ventes_sets_status_draft(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, status="validated", direction="outgoing")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="draft")

        assert invoices_col.find_one({"_id": oid})["status"] == "draft"

    def test_invalidate_ventes_resets_is_paid_flag(self, invoices_col, patch_db):
        """Bug 3 regression: status='draft' must reset is_paid=False."""
        inv_id, oid = insert(invoices_col, status="paid", is_paid=True, direction="outgoing")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="draft")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_paid"] is False


# ── Mark / Unmark Sent (Ventes) ───────────────────────────────────────────────


class TestBatchMarkSent:
    def test_mark_sent_sets_status(self, invoices_col, patch_db):
        """Bug 6 regression: backend must handle status='sent' batch correctly."""
        id1, oid1 = insert(invoices_col, status="validated", direction="outgoing")
        id2, oid2 = insert(invoices_col, status="validated", direction="outgoing")

        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[id1, id2], status="sent")

        assert count == 2
        for oid in [oid1, oid2]:
            doc = invoices_col.find_one({"_id": oid})
            assert doc["status"] == "sent"
            assert doc["is_paid"] is False  # sent does not affect payment

    def test_unmark_sent_reverts_to_validated(self, invoices_col, patch_db):
        """Bug 6 regression: status='validated' from sent state."""
        inv_id, oid = insert(invoices_col, status="sent", direction="outgoing")

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], status="validated")

        doc = invoices_col.find_one({"_id": oid})
        assert doc["status"] == "validated"
        assert doc["is_paid"] is False


# ── Archive / Restore ─────────────────────────────────────────────────────────


class TestBatchArchive:
    def test_archive_sets_flag(self, invoices_col, patch_db):
        inv_id, oid = insert(invoices_col, is_archived=False)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_archived=True)

        assert invoices_col.find_one({"_id": oid})["is_archived"] is True

    def test_archive_does_not_touch_payment_state(self, invoices_col, patch_db):
        """Archiving a paid invoice must not disturb is_paid or status."""
        inv_id, oid = insert(invoices_col, status="paid", is_paid=True, is_archived=False)

        InvoiceCRUD.batch_update_invoices(invoice_ids=[inv_id], is_archived=True)

        doc = invoices_col.find_one({"_id": oid})
        assert doc["is_archived"] is True
        assert doc["is_paid"] is True
        assert doc["status"] == "paid"

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
        count = InvoiceCRUD.batch_update_invoices(invoice_ids=[], is_paid=True)
        assert count == 0

    def test_invalid_objectids_are_skipped(self, invoices_col, patch_db):
        count = InvoiceCRUD.batch_update_invoices(
            invoice_ids=["not-an-id", "also-bad"], is_paid=True
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
