from pydantic import BaseModel, EmailStr, Field
from typing import Optional
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id", description="MongoDB ObjectId as string")
    full_name: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    role: str = "USER"

class UserUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=50)
    password: str = Field(None, min_length=8)
    role: str = "USER"