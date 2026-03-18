from datetime import UTC, datetime
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_company_collection, get_database, get_firm_collection
from app.models.user import UserRegister
from app.utils.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

db = get_database()
user_collection = db["users"]

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _first_company_id(firm_id: str | None = None) -> str | None:
    """Return the _id of the first company for a given firm, or None."""
    query = {}
    if firm_id:
        query["firm_id"] = firm_id
    doc = get_company_collection().find_one(query, {"_id": 1})
    return str(doc["_id"]) if doc else None


def _make_token(user_doc: dict, company_id: str | None = None) -> str:
    firm_id = user_doc.get("firm_id")
    resolved_company = company_id or _first_company_id(firm_id)
    return create_access_token({
        "sub": str(user_doc["_id"]),
        "role": user_doc["role"],
        "username": user_doc.get("email", ""),
        "firm_id": firm_id,
        "company_id": resolved_company,
    })


@router.post("/register")
async def register(user: UserRegister):
    if user_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Self-registration auto-creates a firm and makes the user a FIRM_ADMIN
    firm_result = get_firm_collection().insert_one({
        "name": f"Cabinet de {user.full_name}",
        "created_at": datetime.now(UTC),
        "auto_created": True,
    })
    firm_id = str(firm_result.inserted_id)

    new_user = {
        "full_name": user.full_name,
        "email": user.email,
        "hashed_password": hash_password(user.password),
        "role": "FIRM_ADMIN",
        "firm_id": firm_id,
    }
    result = user_collection.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    logger.info("User registered: %s (firm: %s)", user.email, firm_id)

    return {
        "message": "User registered successfully",
        "access_token": _make_token(new_user),
    }


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db_user = user_collection.find_one({"email": form_data.username})
    if not db_user or not verify_password(form_data.password, db_user["hashed_password"]):
        logger.warning("Failed login attempt for: %s", form_data.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _make_token(db_user)
    logger.info("User logged in: %s", form_data.username)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/switch-company/{company_id}")
def switch_company(
    company_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return a new JWT scoped to a different company (must belong to same firm)."""
    try:
        query = {"_id": ObjectId(company_id)}
        if current_user.get("firm_id"):
            query["firm_id"] = current_user["firm_id"]
        doc = get_company_collection().find_one(query, {"_id": 1})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Company not found")
    token = create_access_token({
        "sub": current_user["user_id"],
        "role": current_user["role"],
        "username": current_user["username"],
        "firm_id": current_user.get("firm_id"),
        "company_id": company_id,
    })
    logger.info("User %s switched to company %s", current_user["username"], company_id)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/change-password")
def change_password(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    current_password = body.get("current_password", "")
    new_password = body.get("new_password", "")
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Les deux champs sont requis")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit faire au moins 8 caractères")

    db_user = user_collection.find_one({"_id": ObjectId(current_user["user_id"])})
    if not db_user or not verify_password(current_password, db_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    user_collection.update_one(
        {"_id": ObjectId(current_user["user_id"])},
        {"$set": {"hashed_password": hash_password(new_password), "must_change_password": False}},
    )
    logger.info("Password changed for user %s", current_user["username"])
    return {"message": "Mot de passe mis à jour avec succès"}


@router.get("/me")
def get_current_user_endpoint(current_user: dict = Depends(get_current_user)):
    db_user = user_collection.find_one({"_id": ObjectId(current_user["user_id"])})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db_user["_id"] = str(db_user["_id"])
    db_user.pop("hashed_password", None)
    return db_user
