"""
Integration tests for contact ICE enrichment.

Verifies that _apply_contact() is called and vendor_ice / client_ice are
always live-enriched from the linked contact — never stale from the invoice doc.

Bug regressions covered:
  Bug 4: PUT /invoices/{id} response did not call _apply_contact → stale ICE returned
  Bug 5: EditInvoice form read invoice.ice (legacy) not invoice.vendor_ice (enriched)
         — confirmed correct by checking vendor_ice in API responses
"""

import pytest
from bson import ObjectId

from app.tests.conftest import make_invoice, FAKE_COMPANY_ID


def make_contact(ice=None, name="Supplier Test", contact_type=None):
    return {
        "_id": ObjectId(),
        "name": name,
        "ice": ice,
        "contact_type": contact_type or ["supplier"],
        "address": "10 Rue Hassan II",
        "city": "Casablanca",
        "phone": "+212600000001",
        "email": "test@supplier.ma",
    }


# ── GET /invoices/{id} ────────────────────────────────────────────────────────


class TestEnrichmentOnGetById:
    def test_get_by_id_returns_enriched_vendor_ice(
        self, invoices_col, contacts_col, patch_db, api_client
    ):
        """Core enrichment: GET by ID must overlay vendor_ice from contact."""
        contact = make_contact(ice="999999999999999")
        contacts_col.insert_one(contact)

        doc = make_invoice(
            contact_id=str(contact["_id"]),
            vendor_ice="OLD-ICE",  # stale value on the invoice doc
            direction="incoming",
        )
        invoices_col.insert_one(doc)

        response = api_client.get(f"/invoices/{doc['_id']}")

        assert response.status_code == 200
        assert response.json()["vendor_ice"] == "999999999999999"

    def test_get_by_id_reflects_ice_added_to_contact_after_invoice_creation(
        self, invoices_col, contacts_col, patch_db, api_client
    ):
        """
        Scenario: create invoice with contact that has no ICE, then add ICE to contact.
        GET must return the new ICE without re-saving the invoice.
        """
        contact = make_contact(ice=None)
        contacts_col.insert_one(contact)

        doc = make_invoice(
            contact_id=str(contact["_id"]),
            vendor_ice=None,
            direction="incoming",
        )
        invoices_col.insert_one(doc)

        # Simulate user adding ICE to the contact later
        contacts_col.update_one(
            {"_id": contact["_id"]}, {"$set": {"ice": "123456789012345"}}
        )

        response = api_client.get(f"/invoices/{doc['_id']}")

        assert response.status_code == 200
        assert response.json()["vendor_ice"] == "123456789012345"

    def test_get_by_id_outgoing_enriches_client_ice(
        self, invoices_col, contacts_col, patch_db, api_client
    ):
        """Enrichment for outgoing invoices: client_ice must come from contact."""
        contact = make_contact(ice="CLIENT-ICE-999", contact_type=["client"])
        contacts_col.insert_one(contact)

        doc = make_invoice(
            contact_id=str(contact["_id"]),
            client_ice=None,
            direction="outgoing",
            status="draft",
        )
        invoices_col.insert_one(doc)

        response = api_client.get(f"/invoices/{doc['_id']}")

        assert response.status_code == 200
        assert response.json()["client_ice"] == "CLIENT-ICE-999"

    def test_get_by_id_no_contact_returns_stored_fields(
        self, invoices_col, patch_db, api_client
    ):
        """Invoice without contact_id: stored fields returned as-is."""
        doc = make_invoice(
            contact_id=None,
            vendor_ice="STORED-ICE",
            direction="incoming",
        )
        invoices_col.insert_one(doc)

        response = api_client.get(f"/invoices/{doc['_id']}")

        assert response.status_code == 200
        assert response.json()["vendor_ice"] == "STORED-ICE"


# ── GET /invoices/ (list) ─────────────────────────────────────────────────────


class TestEnrichmentOnList:
    def test_list_overlays_vendor_ice_from_contact(
        self, invoices_col, contacts_col, patch_db, api_client
    ):
        contact = make_contact(ice="LIST-ICE-123")
        contacts_col.insert_one(contact)

        doc = make_invoice(
            contact_id=str(contact["_id"]),
            vendor_ice="OLD",
            direction="incoming",
        )
        invoices_col.insert_one(doc)

        response = api_client.get("/invoices/")

        assert response.status_code == 200
        invoices = response.json()
        assert len(invoices) >= 1
        found = next(
            (i for i in invoices if i["id"] == str(doc["_id"]) or i.get("_id") == str(doc["_id"])),
            invoices[0],
        )
        assert found["vendor_ice"] == "LIST-ICE-123"

    def test_list_invoice_without_contact_returns_stored_ice(
        self, invoices_col, patch_db, api_client
    ):
        doc = make_invoice(contact_id=None, vendor_ice="STORED", direction="incoming")
        invoices_col.insert_one(doc)

        response = api_client.get("/invoices/")

        assert response.status_code == 200
        invoices = response.json()
        assert len(invoices) >= 1
        assert invoices[0]["vendor_ice"] == "STORED"


# ── PUT /invoices/{id} ────────────────────────────────────────────────────────


class TestEnrichmentOnPut:
    def test_put_response_includes_enriched_vendor_ice(
        self, invoices_col, contacts_col, patch_db, api_client
    ):
        """
        Bug 4 regression: PUT /invoices/{id} must call _apply_contact before
        returning the response. If not, the Edit modal shows stale ICE after
        changing the supplier.
        """
        contact = make_contact(ice="NEW-ICE-999")
        contacts_col.insert_one(contact)

        doc = make_invoice(
            contact_id=str(contact["_id"]),
            vendor_ice="OLD-ICE-111",  # stale
            direction="incoming",
            status="extracted",
        )
        invoices_col.insert_one(doc)

        # A category change (allowed field) triggers the PUT
        response = api_client.put(
            f"/invoices/{doc['_id']}",
            json={"category": "Equipment"},
        )

        assert response.status_code == 200
        # Must return the contact's current ICE, not the stale stored value
        assert response.json()["vendor_ice"] == "NEW-ICE-999"

    def test_put_after_reassigning_contact_reflects_new_contact_ice(
        self, invoices_col, contacts_col, patch_db, api_client
    ):
        """
        Changing contact_id on a PUT must return the new contact's ICE.
        """
        contact_a = make_contact(ice="ICE-A-111")
        contact_b = make_contact(ice="ICE-B-999")
        contacts_col.insert_many([contact_a, contact_b])

        doc = make_invoice(
            contact_id=str(contact_a["_id"]),
            vendor_ice="ICE-A-111",
            direction="incoming",
            status="extracted",
        )
        invoices_col.insert_one(doc)

        response = api_client.put(
            f"/invoices/{doc['_id']}",
            json={"contact_id": str(contact_b["_id"])},
        )

        assert response.status_code == 200
        assert response.json()["vendor_ice"] == "ICE-B-999"

    def test_put_with_no_contact_returns_stored_ice(
        self, invoices_col, patch_db, api_client
    ):
        """PUT on invoice with no contact_id returns the stored vendor_ice."""
        doc = make_invoice(
            contact_id=None,
            vendor_ice="STORED-ICE",
            direction="incoming",
            status="extracted",
        )
        invoices_col.insert_one(doc)

        response = api_client.put(
            f"/invoices/{doc['_id']}",
            json={"category": "Logiciels"},
        )

        assert response.status_code == 200
        assert response.json()["vendor_ice"] == "STORED-ICE"
