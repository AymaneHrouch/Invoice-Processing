from datetime import datetime

from pydantic import BaseModel, Field


class Contact(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    name: str
    ice: str | None = None
    identifiant_fiscal: str | None = None
    rc: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    email: str | None = None
    contact_type: list[str] = ["client"]  # "client", "supplier", or both
    notes: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None

    class Config:
        populate_by_name = True


class ContactCreate(BaseModel):
    name: str
    ice: str | None = None
    identifiant_fiscal: str | None = None
    rc: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    email: str | None = None
    contact_type: list[str] = ["client"]
    notes: str | None = None


class ContactUpdate(BaseModel):
    name: str | None = None
    ice: str | None = None
    identifiant_fiscal: str | None = None
    rc: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    email: str | None = None
    contact_type: list[str] | None = None
    notes: str | None = None
