"""
Tests for the UBL export
Route under test: GET /ventes/{id}/ubl
The generated XML is validated against the official UBL 2.1 XSD. 

"""

from bson import ObjectId

from app.services.ubl import validate_ubl
from app.tests.conftest import FAKE_COMPANY_ID, make_invoice

_ITEMS = [
    {"name": "Architecture réseau", "description": "Installation incluse",
     "quantity": 1, "unit_price": 14500.0, "total": 17400.0, "tva": 20.0, "tva_amount": 2900.0},
    {"name": "Infrastructure cloud", "description": "SLA 99.9%",
     "quantity": 1, "unit_price": 11000.0, "total": 13200.0, "tva": 20.0, "tva_amount": 2200.0},
]

_COMPANY = {
    "_id": ObjectId(FAKE_COMPANY_ID),
    "company_id": FAKE_COMPANY_ID,
    "company_name": "Voynich Tech SARL",
    "ice": "001234567000089",
    "identifiant_fiscal": "12345678",
    "rc": "123456",
    "address": "123 Bd Zerktouni",
    "city": "Casablanca",
    "postal_code": "20000",
}


def insert_vente(col, **kwargs):
    doc = make_invoice(direction="outgoing", status="validated", **kwargs)
    col.insert_one(doc)
    return str(doc["_id"]), doc


class TestVenteUbl:
    def test_ubl_endpoint_returns_valid_xml(
        self, invoices_col, company_col, patch_db, api_client
    ):
        company_col.insert_one(dict(_COMPANY))
        inv_id, _ = insert_vente(
            invoices_col, client_name="Client SA", client_ice="002800000000003",
            subtotal_ht=25500.0, amount_tva=5100.0, total_amount=30600.0, items=_ITEMS,
        )

        response = api_client.get(f"/ventes/{inv_id}/ubl")

        assert response.status_code == 200
        assert "xml" in response.headers.get("content-type", "")
        assert validate_ubl(response.text) == []

    def test_ubl_nonexistent_invoice_returns_404(self, invoices_col, patch_db, api_client):
        response = api_client.get(f"/ventes/{ObjectId()}/ubl")
        assert response.status_code == 404


def test_validate_ubl_flags_malformed_xml():
    invalid = (
        '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">'
        "<Foo/></Invoice>"
    )
    assert validate_ubl(invalid)
