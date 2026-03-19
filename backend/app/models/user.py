
from pydantic import BaseModel, EmailStr, Field


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    id: str | None = Field(default=None, alias="_id", description="MongoDB ObjectId as string")
    full_name: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    role: str = "USER"
    firm_id: str | None = None

class UserUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=50)
    password: str = Field(None, min_length=8)
    role: str = "USER"
