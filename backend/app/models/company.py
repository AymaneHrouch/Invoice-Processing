from datetime import datetime

from pydantic import BaseModel, Field


class CompanyProfile(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    company_name: str
    legal_form: str | None = None          # SARL, SA, SAS, Auto-entrepreneur
    capital: str | None = None             # e.g. "100 000 DHS"
    ice: str                               # 15-digit ICE number
    identifiant_fiscal: str | None = None  # IF number
    rc: str | None = None                  # Registre de Commerce
    patente: str | None = None
    cnss: str | None = None
    address: str
    city: str
    postal_code: str | None = None
    phone: str | None = None
    email: str | None = None
    bank_name: str | None = None
    bank_account: str | None = None        # RIB
    logo_url: str | None = None
    primary_color: str = "#2563EB"
    custom_footer: str | None = None
    default_tva_rate: float = 20.0
    default_currency: str = "MAD"
    invoice_prefix: str = "FAC"
    next_invoice_number: int = 1
    categories: list[str] = Field(
        default_factory=lambda: [
            "Services", "Equipment", "Software",
            "Travel", "Marketing", "Utilities", "Others",
        ]
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None

    class Config:
        populate_by_name = True


class CompanyProfileUpdate(BaseModel):
    firm_id: str | None = None
    company_name: str | None = None
    legal_form: str | None = None
    capital: str | None = None
    ice: str | None = None
    identifiant_fiscal: str | None = None
    rc: str | None = None
    patente: str | None = None
    cnss: str | None = None
    address: str | None = None
    city: str | None = None
    postal_code: str | None = None
    phone: str | None = None
    email: str | None = None
    bank_name: str | None = None
    bank_account: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    custom_footer: str | None = None
    default_tva_rate: float | None = None
    default_currency: str | None = None
    invoice_prefix: str | None = None
    categories: list[str] | None = None
