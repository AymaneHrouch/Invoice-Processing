import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_database
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


@router.post("/register")
async def register(user: UserRegister):
    existing_user = user_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user.password)

    new_user = {
        "full_name": user.full_name,
        "email": user.email,
        "hashed_password": hashed_password,
        "role": "USER"
    }

    result = user_collection.insert_one(new_user)
    logger.info("User registered: %s", user.email)

    token = create_access_token({"sub": str(result.inserted_id), "role": new_user["role"]})

    return {
        "message": "User registered successfully",
        "access_token": token
    }


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db_user = user_collection.find_one({"email": form_data.username})
    if not db_user or not verify_password(form_data.password, db_user["hashed_password"]):
        logger.warning("Failed login attempt for: %s", form_data.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(db_user["_id"]), "role": db_user["role"]})
    logger.info("User logged in: %s", form_data.username)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def get_current_user_endpoint(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    db_user = user_collection.find_one({"_id": ObjectId(user_id)})

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user["_id"] = str(db_user["_id"])
    db_user.pop("hashed_password", None)

    return db_user
