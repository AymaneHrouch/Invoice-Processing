from datetime import UTC, datetime
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_company_collection, get_database, get_firm_collection
from app.models.firm import FirmAdminCreate
from app.utils.auth import (
    generate_random_password,
    get_current_user,
    hash_password,
    require_admin,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/firms", tags=["Firms"])


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/me")
def get_my_firm(current_user: dict = Depends(get_current_user)):
    firm_id = current_user.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=404, detail="No firm associated with this account")
    try:
        oid = ObjectId(firm_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid firm ID")
    firm = get_firm_collection().find_one({"_id": oid})
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    return {"_id": str(firm["_id"]), "name": firm.get("name")}


@router.get("")
def list_firms(current_user: dict = Depends(require_admin)):
    firms = list(get_firm_collection().find().sort("created_at", 1))
    users_col = get_database()["users"]
    company_col = get_company_collection()
    result = []
    for f in firms:
        fid = str(f["_id"])
        admin = users_col.find_one({"firm_id": fid, "role": "FIRM_ADMIN"}, {"email": 1, "full_name": 1})
        company_count = company_col.count_documents({"firm_id": fid})
        result.append({
            "_id": fid,
            "name": f.get("name"),
            "created_at": f.get("created_at"),
            "admin_email": admin["email"] if admin else None,
            "admin_name": admin["full_name"] if admin else None,
            "company_count": company_count,
        })
    return result


@router.post("", status_code=201)
def create_firm(data: FirmAdminCreate, current_user: dict = Depends(require_admin)):
    users_col = get_database()["users"]

    if users_col.find_one({"email": data.admin_email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create the firm
    firm_result = get_firm_collection().insert_one({
        "name": data.firm_name,
        "created_at": datetime.now(UTC),
        "created_by": current_user["user_id"],
    })
    firm_id = str(firm_result.inserted_id)

    # Create the firm admin account with a temporary password
    temp_password = generate_random_password()
    users_col.insert_one({
        "full_name": data.admin_full_name,
        "email": data.admin_email,
        "hashed_password": hash_password(temp_password),
        "role": "FIRM_ADMIN",
        "firm_id": firm_id,
        "must_change_password": True,
    })

    logger.info("Firm '%s' created by %s, admin: %s", data.firm_name, current_user["username"], data.admin_email)
    return {
        "firm_id": firm_id,
        "firm_name": data.firm_name,
        "admin_email": data.admin_email,
        "temp_password": temp_password,
    }


@router.get("/{firm_id}/inventory")
def get_firm_inventory(firm_id: str, current_user: dict = Depends(require_admin)):
    try:
        oid = ObjectId(firm_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid firm ID")
    if not get_firm_collection().find_one({"_id": oid}):
        raise HTTPException(status_code=404, detail="Firm not found")
    db = get_database()
    company_ids = [
        str(c["_id"])
        for c in db["company_profile"].find({"firm_id": firm_id}, {"_id": 1})
    ]
    return {
        "users": db["users"].count_documents({"firm_id": firm_id}),
        "companies": len(company_ids),
        "invoices": db["invoices"].count_documents({"company_id": {"$in": company_ids}}) if company_ids else 0,
        "contacts": db["contacts"].count_documents({"company_id": {"$in": company_ids}}) if company_ids else 0,
    }


@router.delete("/{firm_id}", status_code=204)
def delete_firm(firm_id: str, current_user: dict = Depends(require_admin)):
    try:
        oid = ObjectId(firm_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid firm ID")
    if not get_firm_collection().find_one({"_id": oid}):
        raise HTTPException(status_code=404, detail="Firm not found")
    db = get_database()
    company_ids = [
        str(c["_id"])
        for c in db["company_profile"].find({"firm_id": firm_id}, {"_id": 1})
    ]
    if company_ids:
        db["invoices"].delete_many({"company_id": {"$in": company_ids}})
        db["contacts"].delete_many({"company_id": {"$in": company_ids}})
        db["company_profile"].delete_many({"firm_id": firm_id})
    db["users"].delete_many({"firm_id": firm_id})
    get_firm_collection().delete_one({"_id": oid})
    logger.info("Firm %s and all its data deleted by %s", firm_id, current_user["username"])
