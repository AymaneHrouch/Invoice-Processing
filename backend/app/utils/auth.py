from datetime import UTC, datetime, timedelta
import logging
import os
import secrets
import string

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.database import get_database

logger = logging.getLogger(__name__)

db = get_database()
user_collection = db["users"]

load_dotenv()

SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
EXPIRATION_MINUTES = 60 * 24
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(minutes=EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_random_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%^&*()"
    return "".join(secrets.choice(chars) for _ in range(length))

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id or not role:
            raise credentials_exception
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise credentials_exception

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def create_admin_user():
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_full_name = os.getenv("ADMIN_FULL_NAME")

    if not all([admin_email, admin_password, admin_full_name]):
        logger.info("ADMIN_* env vars not set — skipping admin user creation.")
        return

    existing_admin = user_collection.find_one({"email": admin_email})
    if existing_admin:
        logger.info("Admin user already exists (%s).", admin_email)
        return

    hashed_password = hash_password(admin_password)

    admin_user = {
        "full_name": admin_full_name,
        "email": admin_email,
        "hashed_password": hashed_password,
        "role": "ADMIN",
    }

    result = user_collection.insert_one(admin_user)
    logger.info("Admin user created with ID: %s", result.inserted_id)
