from pydantic import BaseModel, EmailStr


class FirmAdminCreate(BaseModel):
    """Payload Super Admin sends to create a new firm + its admin account."""
    firm_name: str
    admin_full_name: str
    admin_email: EmailStr
