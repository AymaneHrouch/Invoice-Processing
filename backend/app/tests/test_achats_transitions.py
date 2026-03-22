"""
Integration tests for Achats (incoming) status transitions.

State machine: extracted → validated → paid
                              ↑           ↓
                         invalidate   unmark-paid

Routes under test (all under /invoices prefix):
  PATCH /{id}/status   (validate: extracted→validated, invalidate: validated→extracted)
  POST  /{id}/mark-paid
  POST  /{id}/unmark-paid
  PUT   /{id}          (partial lock: financial fields locked on validated/paid)
  GET   /{id}/pdf      (smoke test)
"""

from unittest.mock import patch

import pytest
from bson import ObjectId

from app.tests.conftest import make_invoice


def insert_achat(col, status="extracted", **kwargs):
    doc = make_invoice(direction="incoming", status=status, **kwargs)
    col.insert_one(doc)
    return str(doc["_id"]), doc


# ── Happy-path state machine ──────────────────────────────────────────────────


class TestAchatsStateMachine:
    def test_extracted_to_validated(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_achat(invoices_col, status="extracted")

        response = api_client.patch(
            f"/invoices/{inv_id}/status", json={"status": "validated"}
        )

        assert response.status_code == 200
        assert response.json()["status"] == "validated"

    def test_validated_to_extracted_via_invalidate(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_achat(invoices_col, status="validated")

        response = api_client.patch(
            f"/invoices/{inv_id}/status", json={"status": "extracted"}
        )

        assert response.status_code == 200
        assert response.json()["status"] == "extracted"

    def test_validated_to_paid_via_mark_paid(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_achat(invoices_col, status="validated")

        response = api_client.post(f"/invoices/{inv_id}/mark-paid")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paid"

    def test_paid_to_validated_via_unmark_paid(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_achat(invoices_col, status="paid")

        response = api_client.post(f"/invoices/{inv_id}/unmark-paid")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "validated"


# ── Invalid transitions ───────────────────────────────────────────────────────


class TestAchatsInvalidTransitions:
    def test_mark_paid_on_extracted_invoice_rejected(self, invoices_col, patch_db, api_client):
        """Must be validated before marking paid."""
        inv_id, _ = insert_achat(invoices_col, status="extracted")

        response = api_client.post(f"/invoices/{inv_id}/mark-paid")

        assert response.status_code == 400

    def test_unmark_paid_on_validated_invoice_rejected(self, invoices_col, patch_db, api_client):
        """Can only unmark-paid when status is 'paid'."""
        inv_id, _ = insert_achat(invoices_col, status="validated")

        response = api_client.post(f"/invoices/{inv_id}/unmark-paid")

        assert response.status_code == 400

    def test_outgoing_invoice_not_found_via_achats_mark_paid(
        self, invoices_col, patch_db, api_client
    ):
        """Achats mark-paid must reject outgoing invoices."""
        doc = make_invoice(direction="outgoing", status="validated")
        invoices_col.insert_one(doc)

        response = api_client.post(f"/invoices/{doc['_id']}/mark-paid")

        assert response.status_code == 404

    def test_nonexistent_invoice_returns_404(self, invoices_col, patch_db, api_client):
        unknown_id = str(ObjectId())

        response = api_client.post(f"/invoices/{unknown_id}/mark-paid")

        assert response.status_code == 404


# ── Partial lock ──────────────────────────────────────────────────────────────


class TestAchatsPartialLock:
    def test_put_validated_rejects_total_amount_change(
        self, invoices_col, patch_db, api_client
    ):
        """Financial fields must be locked once validated."""
        inv_id, _ = insert_achat(invoices_col, status="validated")

        response = api_client.put(
            f"/invoices/{inv_id}", json={"total_amount": 9999.0}
        )

        assert response.status_code == 400

    def test_put_validated_rejects_vendor_name_change(
        self, invoices_col, patch_db, api_client
    ):
        inv_id, _ = insert_achat(invoices_col, status="validated")

        response = api_client.put(
            f"/invoices/{inv_id}", json={"vendor_name": "Hacker SARL"}
        )

        assert response.status_code == 400

    def test_put_validated_rejects_invoice_number_change(
        self, invoices_col, patch_db, api_client
    ):
        inv_id, _ = insert_achat(invoices_col, status="validated")

        response = api_client.put(
            f"/invoices/{inv_id}", json={"invoice_number": "FAKE-9999"}
        )

        assert response.status_code == 400

    def test_put_validated_allows_category_change(
        self, invoices_col, patch_db, api_client
    ):
        """Category is the one metadata field allowed on validated invoices."""
        inv_id, _ = insert_achat(invoices_col, status="validated")

        response = api_client.put(
            f"/invoices/{inv_id}", json={"category": "Logiciels"}
        )

        assert response.status_code == 200
        assert response.json()["category"] == "Logiciels"

    def test_put_paid_invoice_also_locked(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_achat(invoices_col, status="paid")

        response = api_client.put(
            f"/invoices/{inv_id}", json={"total_amount": 5000.0}
        )

        assert response.status_code == 400

    def test_put_extracted_invoice_allows_all_fields(
        self, invoices_col, patch_db, api_client
    ):
        inv_id, _ = insert_achat(invoices_col, status="extracted")

        response = api_client.put(
            f"/invoices/{inv_id}", json={"vendor_name": "Updated Vendor", "total_amount": 500.0}
        )

        assert response.status_code == 200


# ── History appended ──────────────────────────────────────────────────────────


class TestAchatsHistoryAppended:
    def test_validate_appends_history(self, invoices_col, patch_db, api_client):
        inv_id, doc = insert_achat(invoices_col, status="extracted")

        api_client.patch(f"/invoices/{inv_id}/status", json={"status": "validated"})

        updated = invoices_col.find_one({"_id": doc["_id"]})
        assert len(updated["history"]) == 1
        entry = updated["history"][0]
        assert entry["action"] == "validated"
        assert entry["status_from"] == "extracted"
        assert entry["status_to"] == "validated"
        assert entry["user"] == "test@voynich.ma"

    def test_mark_paid_appends_history(self, invoices_col, patch_db, api_client):
        inv_id, doc = insert_achat(invoices_col, status="validated")

        api_client.post(f"/invoices/{inv_id}/mark-paid")

        updated = invoices_col.find_one({"_id": doc["_id"]})
        assert len(updated["history"]) == 1
        entry = updated["history"][0]
        assert entry["action"] == "paid"
        assert entry["status_from"] == "validated"
        assert entry["status_to"] == "paid"

    def test_unmark_paid_appends_history(self, invoices_col, patch_db, api_client):
        inv_id, doc = insert_achat(invoices_col, status="paid")

        api_client.post(f"/invoices/{inv_id}/unmark-paid")

        updated = invoices_col.find_one({"_id": doc["_id"]})
        assert len(updated["history"]) == 1
        assert updated["history"][0]["action"] == "unmark_paid"


# ── PDF smoke test ────────────────────────────────────────────────────────────


class TestAchatsPdfSmoke:
    def test_pdf_endpoint_returns_pdf_response(
        self, invoices_col, company_col, patch_db, api_client
    ):
        """
        Smoke test for GET /invoices/{id}/pdf.
        weasyprint is patched so no system libs required in test env.
        """
        inv_id, _ = insert_achat(invoices_col, status="validated")

        with patch(
            "app.routes.invoices.generate_invoice_pdf", return_value=b"%PDF-1.4 test"
        ):
            response = api_client.get(f"/invoices/{inv_id}/pdf")

        assert response.status_code == 200
        assert "pdf" in response.headers.get("content-type", "")
