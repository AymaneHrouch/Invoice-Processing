"""
Integration tests for Ventes (outgoing) status transitions.

State machine: draft → validated → sent → paid
                              ↑           ↓
                         invalidate   unmark-paid
                                          ↓
                                        sent
                                          ↑
                                      unmark-sent → validated

Routes under test (all under /ventes prefix):
  POST /{id}/validate
  POST /{id}/invalidate
  POST /{id}/mark-sent
  POST /{id}/unmark-sent
  POST /{id}/mark-paid
  POST /{id}/unmark-paid
  PUT  /{id}             (draft-only lock)
  GET  /{id}/pdf         (smoke test — weasyprint patched)
"""

from unittest.mock import patch

import pytest
from bson import ObjectId

from app.tests.conftest import make_invoice


def insert_vente(col, status="draft", **kwargs):
    doc = make_invoice(direction="outgoing", status=status, **kwargs)
    col.insert_one(doc)
    return str(doc["_id"]), doc


# ── Happy-path state machine ──────────────────────────────────────────────────


class TestVenteStateMachine:
    def test_draft_to_validated(self, invoices_col, company_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="draft")

        response = api_client.post(f"/ventes/{inv_id}/validate")

        assert response.status_code == 200
        assert response.json()["status"] == "validated"

    def test_validated_to_draft_via_invalidate(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="validated")

        response = api_client.post(f"/ventes/{inv_id}/invalidate")

        assert response.status_code == 200
        assert response.json()["status"] == "draft"

    def test_validated_to_sent(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="validated")

        response = api_client.post(f"/ventes/{inv_id}/mark-sent")

        assert response.status_code == 200
        assert response.json()["status"] == "sent"

    def test_sent_to_validated_via_unmark_sent(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="sent")

        response = api_client.post(f"/ventes/{inv_id}/unmark-sent")

        assert response.status_code == 200
        assert response.json()["status"] == "validated"

    def test_sent_to_paid(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="sent")

        response = api_client.post(f"/ventes/{inv_id}/mark-paid")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paid"

    def test_validated_to_paid_directly(self, invoices_col, patch_db, api_client):
        """Validated invoice can be marked paid without going through sent."""
        inv_id, _ = insert_vente(invoices_col, status="validated")

        response = api_client.post(f"/ventes/{inv_id}/mark-paid")

        assert response.status_code == 200
        assert response.json()["status"] == "paid"

    def test_paid_to_sent_via_unmark_paid(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="paid")

        response = api_client.post(f"/ventes/{inv_id}/unmark-paid")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "sent"


# ── Invalid transitions ───────────────────────────────────────────────────────


class TestVenteInvalidTransitions:
    def test_draft_to_sent_rejected(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="draft")

        response = api_client.post(f"/ventes/{inv_id}/mark-sent")

        assert response.status_code == 400

    def test_draft_to_paid_rejected(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="draft")

        response = api_client.post(f"/ventes/{inv_id}/mark-paid")

        assert response.status_code == 400

    def test_sent_to_invalidate_rejected(self, invoices_col, patch_db, api_client):
        """Can only invalidate from 'validated', not 'sent'."""
        inv_id, _ = insert_vente(invoices_col, status="sent")

        response = api_client.post(f"/ventes/{inv_id}/invalidate")

        assert response.status_code == 400

    def test_draft_to_validate_already_validated_rejected(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="validated")

        response = api_client.post(f"/ventes/{inv_id}/validate")

        assert response.status_code == 400

    def test_nonexistent_invoice_returns_404(self, invoices_col, patch_db, api_client):
        unknown_id = str(ObjectId())

        response = api_client.post(f"/ventes/{unknown_id}/validate")

        assert response.status_code == 404


# ── History appended ──────────────────────────────────────────────────────────


class TestVenteHistoryAppended:
    def test_validate_appends_history_entry(self, invoices_col, patch_db, api_client):
        inv_id, doc = insert_vente(invoices_col, status="draft")

        api_client.post(f"/ventes/{inv_id}/validate")

        updated = invoices_col.find_one({"_id": doc["_id"]})
        assert len(updated["history"]) == 1
        entry = updated["history"][0]
        assert entry["action"] == "validated"
        assert entry["status_from"] == "draft"
        assert entry["status_to"] == "validated"
        assert entry["user"] == "test@voynich.ma"

    def test_mark_sent_appends_history(self, invoices_col, patch_db, api_client):
        inv_id, doc = insert_vente(invoices_col, status="validated")

        api_client.post(f"/ventes/{inv_id}/mark-sent")

        updated = invoices_col.find_one({"_id": doc["_id"]})
        assert len(updated["history"]) == 1
        assert updated["history"][0]["action"] == "sent"

    def test_mark_paid_appends_history_with_correct_status_from(
        self, invoices_col, patch_db, api_client
    ):
        inv_id, doc = insert_vente(invoices_col, status="sent")

        api_client.post(f"/ventes/{inv_id}/mark-paid")

        updated = invoices_col.find_one({"_id": doc["_id"]})
        entry = updated["history"][0]
        assert entry["action"] == "paid"
        assert entry["status_from"] == "sent"
        assert entry["status_to"] == "paid"

    def test_multiple_transitions_append_multiple_entries(
        self, invoices_col, patch_db, api_client
    ):
        inv_id, doc = insert_vente(invoices_col, status="draft")

        api_client.post(f"/ventes/{inv_id}/validate")
        api_client.post(f"/ventes/{inv_id}/mark-sent")

        updated = invoices_col.find_one({"_id": doc["_id"]})
        assert len(updated["history"]) == 2


# ── Locking ───────────────────────────────────────────────────────────────────


class TestVenteLocking:
    def test_put_on_validated_vente_rejected(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="validated")

        response = api_client.put(
            f"/ventes/{inv_id}", json={"client_name": "New Client"}
        )

        assert response.status_code == 400

    def test_put_on_draft_vente_allowed(self, invoices_col, patch_db, api_client):
        inv_id, _ = insert_vente(invoices_col, status="draft")

        response = api_client.put(
            f"/ventes/{inv_id}", json={"category": "Logiciels"}
        )

        assert response.status_code == 200

    def test_incoming_invoice_not_found_via_ventes_router(
        self, invoices_col, patch_db, api_client
    ):
        """Ventes router must reject invoices with direction='incoming'."""
        doc = make_invoice(direction="incoming", status="validated")
        invoices_col.insert_one(doc)

        response = api_client.post(f"/ventes/{doc['_id']}/invalidate")

        assert response.status_code == 404


# ── PDF smoke test ────────────────────────────────────────────────────────────


class TestVentePdfSmoke:
    def test_pdf_endpoint_returns_pdf_response(
        self, invoices_col, company_col, patch_db, api_client
    ):
        """
        Smoke test: GET /ventes/{id}/pdf returns 200 with application/pdf.
        weasyprint is patched so this runs without system libs (pango/cairo).
        """
        inv_id, _ = insert_vente(invoices_col, status="validated")

        with patch("app.routes.ventes.generate_invoice_pdf", return_value=b"%PDF-1.4 test"):
            response = api_client.get(f"/ventes/{inv_id}/pdf")

        assert response.status_code == 200
        assert "pdf" in response.headers.get("content-type", "")
