"""
Shared pytest fixtures for integration tests using mongomock.

Design:
- Fixtures are NOT autouse — integration tests opt in explicitly by requesting
  `patch_db` and `api_client`. This ensures existing unit tests (test_company.py,
  test_contacts.py) which patch collection getters at the route level continue to
  work unchanged.
- Patching `app.database.get_database` is sufficient to cover all five collection
  getters, since they all call `get_database()["collection_name"]` internally.
  This also covers InvoiceCRUD static methods which call the getters directly.
"""

from datetime import datetime
from unittest.mock import patch

import mongomock
import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import app
from app.utils.auth import get_current_user

FAKE_COMPANY_ID = "507f1f77bcf86cd799439099"
FAKE_USER_ID = "507f1f77bcf86cd799439011"
FAKE_FIRM_ID = "507f1f77bcf86cd799439077"


@pytest.fixture()
def mongo_db():
    """Fresh in-memory MongoDB per test — isolated, no network required."""
    return mongomock.MongoClient()["test_db"]


@pytest.fixture()
def invoices_col(mongo_db):
    return mongo_db["invoices"]


@pytest.fixture()
def contacts_col(mongo_db):
    return mongo_db["contacts"]


@pytest.fixture()
def company_col(mongo_db):
    return mongo_db["company_profile"]


@pytest.fixture()
def patch_db(mongo_db):
    """
    Patch app.database.get_database to return the mongomock db.

    All collection getters (get_invoices_collection, get_contacts_collection,
    get_company_collection, get_firm_collection, get_cache_collection) call
    get_database() internally — one patch covers the entire stack including
    InvoiceCRUD static methods.
    """
    with patch("app.database.get_database", return_value=mongo_db):
        yield mongo_db


@pytest.fixture()
def fake_user():
    return {
        "user_id": FAKE_USER_ID,
        "role": "FIRM_ADMIN",
        "username": "test@voynich.ma",
        "firm_id": FAKE_FIRM_ID,
        "company_id": FAKE_COMPANY_ID,
    }


@pytest.fixture()
def api_client(fake_user, patch_db):
    """
    TestClient with auth dependency overridden and all DB calls going to mongomock.
    Use this for all route-level integration tests.
    """
    app.dependency_overrides[get_current_user] = lambda: fake_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def make_invoice(**overrides) -> dict:
    """
    Build a minimal valid invoice document for insertion into invoices_col.

    All fields that route handlers and CRUD methods expect are included with
    safe defaults. Pass keyword overrides to customise per test.

    Usage:
        doc = make_invoice(status="validated", is_paid=False)
        invoices_col.insert_one(doc)
        inv_id = str(doc["_id"])
    """
    return {
        "_id": ObjectId(),
        "invoice_number": f"TEST-{ObjectId()}",
        "invoice_date": datetime(2026, 1, 15),
        "invoice_due_date": None,
        "vendor_name": "Fournisseur Test SARL",
        "vendor_ice": None,
        "client_name": "Client Test",
        "client_ice": None,
        "contact_id": None,
        "total_amount": 1200.0,
        "subtotal_ht": 1000.0,
        "tva": 20.0,
        "amount_tva": 200.0,
        "currency": "MAD",
        "items": [],
        "category": "Services",
        "source_type": "manual",
        "status": "extracted",
        "is_paid": False,
        "paid_at": None,
        "is_exported": False,
        "is_archived": False,
        "direction": "incoming",
        "company_id": FAKE_COMPANY_ID,
        "created_at": datetime.utcnow(),
        "updated_at": None,
        "history": [],
        "tags": [],
        **overrides,
    }
