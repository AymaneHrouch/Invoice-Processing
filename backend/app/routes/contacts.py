from datetime import UTC, datetime
import logging
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_contacts_collection, get_invoices_collection
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

    company_id = current_user.get("company_id")
    if company_id:
        query["company_id"] = company_id

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
    company_id = current_user.get("company_id")
    if company_id:
        doc["company_id"] = company_id
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


@router.get("/invoice-summaries")
def get_invoice_summaries(current_user: dict = Depends(get_current_user)):
    """Return invoice count and total_amount for every contact (matched by contact_id or name)."""
    contacts_col = get_contacts_collection()
    invoices_col = get_invoices_collection()

    company_id = current_user.get("company_id")
    contact_query = {"company_id": company_id} if company_id else {}
    invoice_query = {"is_archived": {"$ne": True}}
    if company_id:
        invoice_query["company_id"] = company_id

    contacts = list(contacts_col.find(contact_query, {"_id": 1, "name": 1}))
    all_invoices = list(invoices_col.find(
        invoice_query,
        {"contact_id": 1, "vendor_name": 1, "client_name": 1, "total_amount": 1},
    ))

    summaries: dict = {str(c["_id"]): {"count": 0, "total_amount": 0.0} for c in contacts}
    name_to_id = {(c.get("name") or "").lower(): str(c["_id"]) for c in contacts if c.get("name")}

    for inv in all_invoices:
        amount = float(inv.get("total_amount") or 0)
        matched: set = set()
        cid = inv.get("contact_id")
        if cid and cid in summaries:
            matched.add(cid)
        for field in ("vendor_name", "client_name"):
            name_lower = (inv.get(field) or "").lower()
            if name_lower and name_lower in name_to_id:
                matched.add(name_to_id[name_lower])
        for cid in matched:
            summaries[cid]["count"] += 1
            summaries[cid]["total_amount"] += amount

    for cid in summaries:
        summaries[cid]["total_amount"] = round(summaries[cid]["total_amount"], 2)

    return summaries


@router.get("/{contact_id}/invoices")
def get_contact_invoices(
    contact_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return all invoices linked to a contact (by contact_id or matching vendor/client name)."""
    contacts_col = get_contacts_collection()
    invoices_col = get_invoices_collection()

    try:
        oid = ObjectId(contact_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid contact ID")

    contact = contacts_col.find_one({"_id": oid})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact_name = contact.get("name", "")
    name_pattern = re.compile(f"^{re.escape(contact_name)}$", re.IGNORECASE)

    company_id = current_user.get("company_id")
    base: dict = {}
    if company_id:
        base["company_id"] = company_id
    query = {**base, "$or": [
        {"contact_id": contact_id},
        {"vendor_name": name_pattern},
        {"client_name": name_pattern},
    ]}

    docs = list(invoices_col.find(query).sort("invoice_date", -1))

    total_amount = sum(float(d.get("total_amount") or 0) for d in docs)

    invoices = []
    for doc in docs:
        invoices.append({
            "id": str(doc["_id"]),
            "invoice_number": doc.get("invoice_number"),
            "invoice_date": doc.get("invoice_date"),
            "direction": doc.get("direction"),
            "total_amount": float(doc.get("total_amount") or 0),
            "currency": doc.get("currency", "MAD"),
            "status": doc.get("status"),
            "vendor_name": doc.get("vendor_name"),
            "client_name": doc.get("client_name"),
        })

    return {
        "invoices": invoices,
        "summary": {
            "count": len(invoices),
            "total_amount": round(total_amount, 2),
        },
    }
