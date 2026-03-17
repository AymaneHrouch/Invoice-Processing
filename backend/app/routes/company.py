import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_company_collection
from app.models.company import CompanyProfile, CompanyProfileUpdate
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company", tags=["Company"])


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("")
def get_company_profile(current_user: dict = Depends(get_current_user)):
    collection = get_company_collection()
    doc = collection.find_one({})
    if not doc:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return _serialize(doc)


@router.put("")
def upsert_company_profile(
    data: CompanyProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    collection = get_company_collection()
    existing = collection.find_one({})

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(UTC)

    if existing:
        collection.update_one({"_id": existing["_id"]}, {"$set": update_data})
        doc = collection.find_one({"_id": existing["_id"]})
    else:
        # First time — require the mandatory fields
        required = {"company_name", "ice", "address", "city"}
        missing = required - set(update_data.keys())
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Missing required fields for initial setup: {', '.join(missing)}",
            )
        update_data["created_at"] = datetime.now(UTC)
        update_data.pop("updated_at", None)
        result = collection.insert_one(update_data)
        doc = collection.find_one({"_id": result.inserted_id})

    logger.info("Company profile upserted by user %s", current_user.get("user_id"))
    return _serialize(doc)
