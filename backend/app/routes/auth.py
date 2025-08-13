from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from app.models.user import UserLogin, UserRegister

from app.utils.auth import create_access_token, verify_password, hash_password, get_current_user
from app.database import get_database

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

    token = create_access_token({"sub": str(result.inserted_id), "role": new_user["role"]})

    return {
        "message": "User registered successfully",
        "access_token": token
    }


@router.post("/login")
def login(user: UserLogin):
    db_user = user_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(db_user["_id"]), "role": db_user["role"]})
    return {"access_token": token}


@router.get("/me")
def get_current_user_endpoint(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    db_user = user_collection.find_one({"_id": ObjectId(user_id)})

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Convert ObjectId to string
    db_user["_id"] = str(db_user["_id"])

    # Remove the password field if it exists
    db_user.pop("hashed_password", None)

    return db_user
