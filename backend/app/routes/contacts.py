import logging
from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_contacts_collection
from app.models.contact import ContactCreate, ContactUpdate
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contacts", tags=["Contacts"])


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("")
def list_contacts(
    type: str | None = Query(default=None, description="Filter by 'client' or 'supplier'"),
    q: str | None = Query(default=None, description="Search by name, ICE, or city"),
    current_user: dict = Depends(get_current_user),
):
    collection = get_contacts_collection()
    query: dict = {}

    if type in ("client", "supplier"):
        query["contact_type"] = type

    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"ice": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
        ]

    docs = list(collection.find(query).sort("name", 1))
    return [_serialize(doc) for doc in docs]


@router.post("", status_code=201)
def create_contact(
    data: ContactCreate,
    current_user: dict = Depends(get_current_user),
):
    collection = get_contacts_collection()
    doc = data.model_dump()
    doc["created_at"] = datetime.now(UTC)
    result = collection.insert_one(doc)
    created = collection.find_one({"_id": result.inserted_id})
    logger.info("Contact created: %s by user %s", data.name, current_user.get("user_id"))
    return _serialize(created)


@router.put("/{contact_id}")
def update_contact(
    contact_id: str,
    data: ContactUpdate,
    current_user: dict = Depends(get_current_user),
):
    collection = get_contacts_collection()

    try:
        oid = ObjectId(contact_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid contact ID")

    existing = collection.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")

    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    update_fields["updated_at"] = datetime.now(UTC)

    collection.update_one({"_id": oid}, {"$set": update_fields})
    updated = collection.find_one({"_id": oid})
    logger.info("Contact updated: %s by user %s", contact_id, current_user.get("user_id"))
    return _serialize(updated)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user),
):
    collection = get_contacts_collection()

    try:
        oid = ObjectId(contact_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid contact ID")

    result = collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")

    logger.info("Contact deleted: %s by user %s", contact_id, current_user.get("user_id"))
