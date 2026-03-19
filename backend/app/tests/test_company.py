"""
Tests for GET /company and PUT /company endpoints.

Auth is mocked via app.dependency_overrides so no real JWT is needed.
MongoDB calls are patched so no real database is needed.
"""

from datetime import datetime
from unittest.mock import MagicMock, patch

from bson import ObjectId
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.utils.auth import get_current_user

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FAKE_USER = {"user_id": "507f1f77bcf86cd799439011", "role": "USER"}

# A realistic company document as it would come out of MongoDB
COMPANY_DOC = {
    "_id": ObjectId("507f1f77bcf86cd799439022"),
    "company_name": "Voynich Digital SARL",
    "legal_form": "SARL",
    "capital": "100 000 DHS",
    "ice": "123456789012345",
    "identifiant_fiscal": "12345678",
    "rc": "99999",
    "patente": None,
    "cnss": None,
    "address": "123 Rue Mohammed V",
    "city": "Casablanca",
    "postal_code": "20000",
    "phone": "+212600000000",
    "email": "contact@voynich.ma",
    "bank_name": "CIH Bank",
    "bank_account": "123456789012345678901",
    "logo_url": None,
    "default_tva_rate": 20.0,
    "default_currency": "MAD",
    "invoice_prefix": "FAC",
    "next_invoice_number": 1,
    "created_at": datetime(2026, 3, 16, 10, 0, 0),
    "updated_at": None,
}

VALID_PAYLOAD = {
    "company_name": "Voynich Digital SARL",
    "ice": "123456789012345",
    "address": "123 Rue Mohammed V",
    "city": "Casablanca",
    "legal_form": "SARL",
    "default_tva_rate": 20.0,
    "invoice_prefix": "FAC",
}


@pytest.fixture(autouse=True)
def override_auth():
    """Replace get_current_user with a fake that always succeeds."""
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# GET /company
# ---------------------------------------------------------------------------


class TestGetCompany:
    def test_returns_404_when_no_profile_exists(self, client):
        with patch("app.routes.company.get_company_collection") as mock_col:
            mock_col.return_value.find_one.return_value = None

            response = client.get("/company")

        assert response.status_code == 404
        assert response.json()["detail"] == "Company profile not found"

    def test_returns_profile_when_it_exists(self, client):
        with patch("app.routes.company.get_company_collection") as mock_col:
            mock_col.return_value.find_one.return_value = COMPANY_DOC.copy()

            response = client.get("/company")

        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Voynich Digital SARL"
        assert data["ice"] == "123456789012345"
        assert data["city"] == "Casablanca"
        # _id must be serialised to a string
        assert isinstance(data["_id"], str)

    def test_returns_401_without_auth_token(self):
        """Without the override, the endpoint should reject unauthenticated requests."""
        app.dependency_overrides.clear()          # remove the autouse override
        unauthenticated = TestClient(app, raise_server_exceptions=False)

        response = unauthenticated.get("/company")

        assert response.status_code == 401
        # restore for the rest of the session (autouse fixture clears after the test anyway)
        app.dependency_overrides[get_current_user] = lambda: FAKE_USER


# ---------------------------------------------------------------------------
# PUT /company
# ---------------------------------------------------------------------------


class TestUpsertCompany:
    def test_creates_profile_when_none_exists(self, client):
        inserted_doc = {**COMPANY_DOC.copy(), "_id": ObjectId()}

        with patch("app.routes.company.get_company_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.find_one.side_effect = [None, inserted_doc]   # first=no existing, second=after insert
            col.insert_one.return_value = MagicMock(inserted_id=inserted_doc["_id"])

            response = client.put("/company", json=VALID_PAYLOAD)

        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Voynich Digital SARL"
        assert isinstance(data["_id"], str)

    def test_updates_profile_when_it_already_exists(self, client):
        existing = COMPANY_DOC.copy()
        updated = {**existing, "city": "Rabat"}

        with patch("app.routes.company.get_company_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.find_one.side_effect = [existing, updated]   # first=existing found, second=after update

            response = client.put("/company", json={"city": "Rabat"})

        assert response.status_code == 200
        assert response.json()["city"] == "Rabat"
        col.update_one.assert_called_once()

    def test_create_fails_when_required_fields_are_missing(self, client):
        """First-time creation requires company_name, ice, address, city."""
        with patch("app.routes.company.get_company_collection") as mock_col:
            mock_col.return_value.find_one.return_value = None  # no existing profile

            response = client.put("/company", json={"legal_form": "SARL"})

        assert response.status_code == 422

    def test_partial_update_only_sets_provided_fields(self, client):
        existing = COMPANY_DOC.copy()
        after_update = {**existing, "phone": "+212611223344"}

        with patch("app.routes.company.get_company_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.find_one.side_effect = [existing, after_update]

            response = client.put("/company", json={"phone": "+212611223344"})

        assert response.status_code == 200
        # Only phone was passed, update_one must have been called (not insert_one)
        col.update_one.assert_called_once()
        col.insert_one.assert_not_called()

    def test_updated_at_is_always_set_on_update(self, client):
        existing = COMPANY_DOC.copy()
        after_update = {**existing, "updated_at": datetime.utcnow()}

        with patch("app.routes.company.get_company_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.find_one.side_effect = [existing, after_update]

            client.put("/company", json={"city": "Marrakech"})

        call_kwargs = col.update_one.call_args
        # The $set dict passed to update_one must include updated_at
        set_dict = call_kwargs[0][1]["$set"]
        assert "updated_at" in set_dict
