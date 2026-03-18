from datetime import UTC, datetime
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_company_collection
from app.models.company import CompanyProfileUpdate
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company", tags=["Company"])

DEFAULT_CATEGORIES = [
    "Services", "Equipment", "Software",
    "Travel", "Marketing", "Utilities", "Others",
]


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


def _get_company_or_404(company_id: str) -> dict:
    try:
        oid = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")
    doc = get_company_collection().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Company not found")
    return doc


# ── List all companies ────────────────────────────────────────────────────────

@router.get("")
def list_companies(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user.get("firm_id"):
        query["firm_id"] = current_user["firm_id"]
    docs = list(get_company_collection().find(query).sort("created_at", 1))
    return [_serialize(doc) for doc in docs]


# ── Create a new company ──────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_company(
    data: CompanyProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    required = {"company_name", "ice", "address", "city"}
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    missing = required - set(payload.keys())
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required fields: {', '.join(missing)}",
        )
    payload["firm_id"] = current_user.get("firm_id")
    payload["created_at"] = datetime.now(UTC)
    result = get_company_collection().insert_one(payload)
    doc = get_company_collection().find_one({"_id": result.inserted_id})
    logger.info("Company created by user %s: %s", current_user.get("user_id"), payload.get("company_name"))
    return _serialize(doc)


# ── Get active company (from JWT company_id) ─────────────────────────────────

@router.get("/active")
def get_active_company(current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=404, detail="No active company in token")
    return _serialize(_get_company_or_404(company_id))


# ── Get categories for active company ────────────────────────────────────────

@router.get("/categories")
def get_company_categories(current_user: dict = Depends(get_current_user)):
    company_id = current_user.get("company_id")
    if company_id:
        try:
            doc = get_company_collection().find_one({"_id": ObjectId(company_id)}, {"categories": 1})
        except Exception:
            doc = None
    else:
        doc = get_company_collection().find_one({}, {"categories": 1})
    if not doc or not doc.get("categories"):
        return DEFAULT_CATEGORIES
    return doc["categories"]


# ── Get a specific company by ID ──────────────────────────────────────────────

@router.get("/{company_id}")
def get_company(
    company_id: str,
    current_user: dict = Depends(get_current_user),
):
    return _serialize(_get_company_or_404(company_id))


# ── Update a specific company ─────────────────────────────────────────────────

@router.put("/{company_id}")
def update_company(
    company_id: str,
    data: CompanyProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    doc = _get_company_or_404(company_id)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None or isinstance(v, list)}
    update_data["updated_at"] = datetime.now(UTC)
    get_company_collection().update_one({"_id": doc["_id"]}, {"$set": update_data})
    updated = get_company_collection().find_one({"_id": doc["_id"]})
    logger.info("Company %s updated by user %s", company_id, current_user.get("user_id"))
    return _serialize(updated)
