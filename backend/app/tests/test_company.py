"""
Integration tests for the multi-doc company CRUD API:
  GET    /company              — list companies (firm-scoped)
  POST   /company              — create company
  GET    /company/active       — get company from JWT company_id
  GET    /company/categories   — get categories for active company
  GET    /company/{id}         — get by ID
  PUT    /company/{id}         — update
  DELETE /company/{id}         — delete (FIRM_ADMIN only, firm-scoped)

Uses mongomock via the api_client + patch_db fixtures from conftest.py.
"""

from datetime import datetime, UTC

import pytest
from bson import ObjectId

from app.tests.conftest import FAKE_COMPANY_ID, FAKE_FIRM_ID, FAKE_USER_ID
from app.main import app
from app.utils.auth import get_current_user

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_PAYLOAD = {
    "company_name": "Voynich Digital SARL",
    "ice": "123456789012345",
    "address": "123 Rue Mohammed V",
    "city": "Casablanca",
    "legal_form": "SARL",
    "default_tva_rate": 20.0,
    "invoice_prefix": "FAC",
}


def make_company(**overrides) -> dict:
    return {
        "_id": ObjectId(),
        "company_name": "Voynich Digital SARL",
        "ice": "123456789012345",
        "address": "123 Rue Mohammed V",
        "city": "Casablanca",
        "legal_form": "SARL",
        "default_tva_rate": 20.0,
        "invoice_prefix": "FAC",
        "firm_id": FAKE_FIRM_ID,
        "created_at": datetime.now(UTC),
        "updated_at": None,
        **overrides,
    }


# ---------------------------------------------------------------------------
# GET /company — list
# ---------------------------------------------------------------------------


class TestListCompanies:
    def test_returns_empty_list_when_no_companies(self, api_client, patch_db):
        response = api_client.get("/company")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_own_firm_companies(self, api_client, patch_db):
        patch_db["company_profile"].insert_one(make_company())
        response = api_client.get("/company")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["company_name"] == "Voynich Digital SARL"
        assert isinstance(data[0]["_id"], str)

    def test_does_not_return_other_firms_companies(self, api_client, patch_db):
        other_firm_id = str(ObjectId())
        patch_db["company_profile"].insert_many([
            make_company(firm_id=FAKE_FIRM_ID),
            make_company(company_name="Other Corp", firm_id=other_firm_id),
        ])
        response = api_client.get("/company")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["company_name"] == "Voynich Digital SARL"

    def test_returns_401_without_auth(self):
        from fastapi.testclient import TestClient
        app.dependency_overrides.clear()
        unauth = TestClient(app, raise_server_exceptions=False)
        response = unauth.get("/company")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /company — create
# ---------------------------------------------------------------------------


class TestCreateCompany:
    def test_creates_company_with_valid_payload(self, api_client, patch_db):
        response = api_client.post("/company", json=VALID_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert data["company_name"] == "Voynich Digital SARL"
        assert data["ice"] == "123456789012345"
        assert isinstance(data["_id"], str)

    def test_sets_firm_id_from_jwt(self, api_client, patch_db):
        response = api_client.post("/company", json=VALID_PAYLOAD)
        assert response.status_code == 201
        doc = patch_db["company_profile"].find_one({})
        assert str(doc["firm_id"]) == FAKE_FIRM_ID

    def test_returns_422_when_company_name_missing(self, api_client, patch_db):
        payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "company_name"}
        response = api_client.post("/company", json=payload)
        assert response.status_code == 422

    def test_returns_422_when_ice_missing(self, api_client, patch_db):
        payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "ice"}
        response = api_client.post("/company", json=payload)
        assert response.status_code == 422

    def test_returns_422_when_address_missing(self, api_client, patch_db):
        payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "address"}
        response = api_client.post("/company", json=payload)
        assert response.status_code == 422

    def test_returns_422_when_city_missing(self, api_client, patch_db):
        payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "city"}
        response = api_client.post("/company", json=payload)
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /company/active
# ---------------------------------------------------------------------------


class TestGetActiveCompany:
    def test_returns_active_company_from_jwt(self, api_client, patch_db):
        oid = ObjectId(FAKE_COMPANY_ID)
        patch_db["company_profile"].insert_one(make_company(_id=oid))
        response = api_client.get("/company/active")
        assert response.status_code == 200
        assert response.json()["_id"] == FAKE_COMPANY_ID

    def test_returns_404_when_company_id_not_in_token(self, patch_db):
        from fastapi.testclient import TestClient
        user_no_company = {
            "user_id": FAKE_USER_ID,
            "role": "FIRM_ADMIN",
            "username": "test@voynich.ma",
            "firm_id": FAKE_FIRM_ID,
            "company_id": None,
        }
        app.dependency_overrides[get_current_user] = lambda: user_no_company
        with TestClient(app) as client:
            response = client.get("/company/active")
        app.dependency_overrides.clear()
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET /company/categories
# ---------------------------------------------------------------------------


class TestGetCompanyCategories:
    def test_returns_default_categories_when_no_company(self, api_client, patch_db):
        response = api_client.get("/company/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "Services" in data

    def test_returns_custom_categories_when_set(self, api_client, patch_db):
        oid = ObjectId(FAKE_COMPANY_ID)
        patch_db["company_profile"].insert_one(
            make_company(_id=oid, categories=["Loyer", "Transport", "Fournitures"])
        )
        response = api_client.get("/company/categories")
        assert response.status_code == 200
        assert response.json() == ["Loyer", "Transport", "Fournitures"]


# ---------------------------------------------------------------------------
# GET /company/{id}
# ---------------------------------------------------------------------------


class TestGetCompanyById:
    def test_returns_company_by_id(self, api_client, patch_db):
        doc = make_company()
        patch_db["company_profile"].insert_one(doc)
        cid = str(doc["_id"])
        response = api_client.get(f"/company/{cid}")
        assert response.status_code == 200
        assert response.json()["_id"] == cid

    def test_returns_404_for_unknown_id(self, api_client, patch_db):
        response = api_client.get(f"/company/{ObjectId()}")
        assert response.status_code == 404

    def test_returns_400_for_invalid_id(self, api_client, patch_db):
        response = api_client.get("/company/not-an-objectid")
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# PUT /company/{id} — update
# ---------------------------------------------------------------------------


class TestUpdateCompany:
    def test_updates_provided_fields(self, api_client, patch_db):
        doc = make_company()
        patch_db["company_profile"].insert_one(doc)
        cid = str(doc["_id"])

        response = api_client.put(f"/company/{cid}", json={"city": "Rabat"})

        assert response.status_code == 200
        assert response.json()["city"] == "Rabat"

    def test_sets_updated_at_on_update(self, api_client, patch_db):
        doc = make_company()
        patch_db["company_profile"].insert_one(doc)
        cid = str(doc["_id"])

        api_client.put(f"/company/{cid}", json={"city": "Rabat"})

        updated = patch_db["company_profile"].find_one({"_id": doc["_id"]})
        assert updated["updated_at"] is not None

    def test_does_not_overwrite_untouched_fields(self, api_client, patch_db):
        doc = make_company()
        patch_db["company_profile"].insert_one(doc)
        cid = str(doc["_id"])

        api_client.put(f"/company/{cid}", json={"city": "Rabat"})

        updated = patch_db["company_profile"].find_one({"_id": doc["_id"]})
        assert updated["ice"] == "123456789012345"

    def test_returns_404_for_unknown_id(self, api_client, patch_db):
        response = api_client.put(f"/company/{ObjectId()}", json={"city": "Rabat"})
        assert response.status_code == 404

    def test_returns_400_for_invalid_id(self, api_client, patch_db):
        response = api_client.put("/company/bad-id", json={"city": "Rabat"})
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# DELETE /company/{id}
# ---------------------------------------------------------------------------


class TestDeleteCompany:
    def test_firm_admin_can_delete_own_company(self, api_client, patch_db):
        doc = make_company(firm_id=FAKE_FIRM_ID)
        patch_db["company_profile"].insert_one(doc)
        cid = str(doc["_id"])

        response = api_client.delete(f"/company/{cid}")

        assert response.status_code == 200
        assert patch_db["company_profile"].find_one({"_id": doc["_id"]}) is None

    def test_regular_user_cannot_delete(self, patch_db):
        from fastapi.testclient import TestClient
        regular_user = {
            "user_id": FAKE_USER_ID,
            "role": "USER",
            "username": "user@voynich.ma",
            "firm_id": FAKE_FIRM_ID,
            "company_id": FAKE_COMPANY_ID,
        }
        doc = make_company(firm_id=FAKE_FIRM_ID)
        patch_db["company_profile"].insert_one(doc)
        cid = str(doc["_id"])

        app.dependency_overrides[get_current_user] = lambda: regular_user
        with TestClient(app) as client:
            response = client.delete(f"/company/{cid}")
        app.dependency_overrides.clear()

        assert response.status_code == 403

    def test_firm_admin_cannot_delete_other_firms_company(self, api_client, patch_db):
        other_firm_id = str(ObjectId())
        doc = make_company(firm_id=other_firm_id)
        patch_db["company_profile"].insert_one(doc)
        cid = str(doc["_id"])

        response = api_client.delete(f"/company/{cid}")

        assert response.status_code == 403

    def test_returns_404_for_unknown_id(self, api_client, patch_db):
        response = api_client.delete(f"/company/{ObjectId()}")
        assert response.status_code == 404

    def test_returns_400_for_invalid_id(self, api_client, patch_db):
        response = api_client.delete("/company/bad-id")
        assert response.status_code == 400
