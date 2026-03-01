import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_database
from app.models.user import UserCreate, UserUpdate
from app.utils.auth import hash_password, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users")
db = get_database()
user_collection = db["users"]


@router.get("/")
def get_users(current_user=Depends(require_admin)):
    users = list(user_collection.find())

    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("hashed_password", None)

    return {"users": users}

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, current_user=Depends(require_admin)):
    existing_user = user_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists."
        )

    hashed_password = hash_password(user.password)

    user_doc = {
        "full_name": user.full_name,
        "email": user.email,
        "hashed_password": hashed_password,
        "role": user.role
    }
    inserted_id = user_collection.insert_one(user_doc).inserted_id
    logger.info("User created: %s (ID: %s)", user.email, inserted_id)

    return {
        "message": "User created successfully",
        "user_id": str(inserted_id)
    }

@router.delete("/{user_id}")
def delete_user(user_id: str, current_user=Depends(require_admin)):
    user = user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user_collection.delete_one({"_id": ObjectId(user_id)})
    logger.info("User deleted: %s", user_id)
    return {"message": "User deleted successfully"}

@router.put("/{user_id}")
def update_user(user_id: str, user: UserUpdate, current_user=Depends(require_admin)):
    user_doc = user_collection.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    update_data = {
        "full_name": user.full_name,
        "role": user.role
    }

    if user.password:
        update_data["hashed_password"] = hash_password(user.password)

    user_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    logger.info("User updated: %s", user_id)

    return {"message": "User updated successfully"}
