"""
Tests for the contacts endpoints:
  GET    /contacts
  POST   /contacts
  PUT    /contacts/{id}
  DELETE /contacts/{id}

Auth mocked via dependency_overrides. MongoDB patched — no real DB needed.
"""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import app
from app.utils.auth import get_current_user

# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

FAKE_USER = {"user_id": "507f1f77bcf86cd799439011", "role": "USER"}

CONTACT_DOC = {
    "_id": ObjectId("507f1f77bcf86cd799439033"),
    "name": "ACME Maroc SARL",
    "ice": "123456789012345",
    "identifiant_fiscal": "11111111",
    "rc": "12345",
    "address": "10 Rue Hassan II",
    "city": "Casablanca",
    "phone": "+212600000001",
    "email": "acme@example.ma",
    "contact_type": ["client"],
    "notes": "",
    "created_at": datetime(2026, 3, 17, 9, 0, 0),
    "updated_at": None,
}

VALID_PAYLOAD = {
    "name": "ACME Maroc SARL",
    "ice": "123456789012345",
    "city": "Casablanca",
    "contact_type": ["client"],
}


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# GET /contacts
# ---------------------------------------------------------------------------


class TestListContacts:
    def test_returns_empty_list_when_no_contacts(self, client):
        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            mock_col.return_value.find.return_value.sort.return_value = []
            response = client.get("/contacts")

        assert response.status_code == 200
        assert response.json() == []

    def test_returns_contacts_list(self, client):
        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            mock_col.return_value.find.return_value.sort.return_value = [CONTACT_DOC.copy()]
            response = client.get("/contacts")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "ACME Maroc SARL"
        assert isinstance(data[0]["_id"], str)

    def test_filters_by_type_client(self, client):
        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.find.return_value.sort.return_value = [CONTACT_DOC.copy()]

            client.get("/contacts?type=client")

        call_args = col.find.call_args[0][0]
        assert call_args.get("contact_type") == "client"

    def test_filters_by_search_query(self, client):
        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.find.return_value.sort.return_value = []

            client.get("/contacts?q=ACME")

        call_args = col.find.call_args[0][0]
        assert "$or" in call_args

    def test_returns_401_without_auth(self):
        app.dependency_overrides.clear()
        unauth = TestClient(app, raise_server_exceptions=False)
        response = unauth.get("/contacts")
        assert response.status_code == 401
        app.dependency_overrides[get_current_user] = lambda: FAKE_USER


# ---------------------------------------------------------------------------
# POST /contacts
# ---------------------------------------------------------------------------


class TestCreateContact:
    def test_creates_contact_successfully(self, client):
        inserted = {**CONTACT_DOC.copy(), "_id": ObjectId()}

        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.insert_one.return_value = MagicMock(inserted_id=inserted["_id"])
            col.find_one.return_value = inserted

            response = client.post("/contacts", json=VALID_PAYLOAD)

        assert response.status_code == 201
        assert response.json()["name"] == "ACME Maroc SARL"

    def test_returns_422_when_name_missing(self, client):
        response = client.post("/contacts", json={"city": "Rabat"})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# PUT /contacts/{id}
# ---------------------------------------------------------------------------


class TestUpdateContact:
    def test_updates_contact_successfully(self, client):
        oid = CONTACT_DOC["_id"]
        updated = {**CONTACT_DOC.copy(), "city": "Rabat"}

        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.find_one.side_effect = [CONTACT_DOC.copy(), updated]

            response = client.put(f"/contacts/{oid}", json={"city": "Rabat"})

        assert response.status_code == 200
        assert response.json()["city"] == "Rabat"

    def test_returns_404_for_unknown_id(self, client):
        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            mock_col.return_value.find_one.return_value = None
            response = client.put(f"/contacts/{ObjectId()}", json={"city": "Rabat"})

        assert response.status_code == 404

    def test_returns_400_for_invalid_id(self, client):
        response = client.put("/contacts/not-an-id", json={"city": "Rabat"})
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# DELETE /contacts/{id}
# ---------------------------------------------------------------------------


class TestDeleteContact:
    def test_deletes_contact_successfully(self, client):
        oid = CONTACT_DOC["_id"]

        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.delete_one.return_value = MagicMock(deleted_count=1)

            response = client.delete(f"/contacts/{oid}")

        assert response.status_code == 204

    def test_returns_404_when_contact_not_found(self, client):
        with patch("app.routes.contacts.get_contacts_collection") as mock_col:
            col = MagicMock()
            mock_col.return_value = col
            col.delete_one.return_value = MagicMock(deleted_count=0)

            response = client.delete(f"/contacts/{ObjectId()}")

        assert response.status_code == 404

    def test_returns_400_for_invalid_id(self, client):
        response = client.delete("/contacts/bad-id")
        assert response.status_code == 400
