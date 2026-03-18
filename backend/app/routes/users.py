import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_database, get_firm_collection
from app.models.user import UserCreate, UserUpdate
from app.utils.auth import get_current_user, hash_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users")
db = get_database()
user_collection = db["users"]

FIRM_ASSIGNABLE_ROLES = {"USER", "FIRM_ADMIN"}


def _require_user_manager(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("ADMIN", "FIRM_ADMIN"):
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user


@router.get("/")
def get_users(current_user=Depends(_require_user_manager)):
    query = {}
    if current_user["role"] == "FIRM_ADMIN":
        query["firm_id"] = current_user.get("firm_id")
    users = list(user_collection.find(query))

    # Build firm_id → name lookup
    firm_ids = {u["firm_id"] for u in users if u.get("firm_id")}
    firm_names = {}
    if firm_ids:
        for firm in get_firm_collection().find({"_id": {"$in": [ObjectId(fid) for fid in firm_ids]}}):
            firm_names[str(firm["_id"])] = firm.get("name")

    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("hashed_password", None)
        user["firm_name"] = firm_names.get(user.get("firm_id"))
    return {"users": users}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, current_user=Depends(_require_user_manager)):
    if current_user["role"] == "FIRM_ADMIN":
        if user.role not in FIRM_ASSIGNABLE_ROLES:
            raise HTTPException(status_code=403, detail="Cannot assign this role")
        firm_id = current_user.get("firm_id")
    else:
        firm_id = user.firm_id

    if user_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists.")

    user_doc = {
        "full_name": user.full_name,
        "email": user.email,
        "hashed_password": hash_password(user.password),
        "role": user.role,
        "firm_id": firm_id,
        "must_change_password": True,
    }
    inserted_id = user_collection.insert_one(user_doc).inserted_id
    logger.info("User created: %s (ID: %s)", user.email, inserted_id)
    return {"message": "User created successfully", "user_id": str(inserted_id)}


@router.delete("/{user_id}")
def delete_user(user_id: str, current_user=Depends(_require_user_manager)):
    user = user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if current_user["role"] == "FIRM_ADMIN" and user.get("firm_id") != current_user.get("firm_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    user_collection.delete_one({"_id": ObjectId(user_id)})
    logger.info("User deleted: %s", user_id)
    return {"message": "User deleted successfully"}


@router.put("/{user_id}")
def update_user(user_id: str, user: UserUpdate, current_user=Depends(_require_user_manager)):
    user_doc = user_collection.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if current_user["role"] == "FIRM_ADMIN":
        if user_doc.get("firm_id") != current_user.get("firm_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        if user.role not in FIRM_ASSIGNABLE_ROLES:
            raise HTTPException(status_code=403, detail="Cannot assign this role")

    if user.password and user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="Utilisez le formulaire 'Changer le mot de passe' pour modifier votre propre mot de passe.",
        )

    update_data = {"full_name": user.full_name, "role": user.role}
    if user.password:
        update_data["hashed_password"] = hash_password(user.password)
        update_data["must_change_password"] = False

    user_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    logger.info("User updated: %s", user_id)
    return {"message": "User updated successfully"}
