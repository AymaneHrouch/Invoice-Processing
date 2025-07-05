from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Annotated
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator


from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Annotated, Any
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import date



class InvoiceItem(BaseModel):
    """Invoice item model"""
    description: str = Field(..., description="Item description")
    quantity: int = Field(..., gt=0, description="Item quantity")
    unit_price: Decimal = Field(..., gt=0, description="Price per unit")
    total: Decimal = Field(..., gt=0, description="Total price for this item")

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class Invoice(BaseModel):
    """Invoice model with Pydantic validation"""
    
    # MongoDB ObjectId (as string for JSON schema compatibility)
    id: Optional[str] = Field(default=None, alias="_id", description="MongoDB ObjectId as string")
    
    # Basic invoice information
    invoice_number: str = Field(..., description="Unique invoice number")
    invoice_date: datetime = Field(..., description="Invoice date")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    
    # Vendor information
    vendor_name: str = Field(..., description="Vendor name")
    
    # Financial information
    total_amount: Decimal = Field(..., gt=0, description="Total invoice amount")
    currency: str = Field(default="MAD", description="Currency code")
    
    # Invoice items
    items: List[InvoiceItem] = Field(default_factory=list, description="List of invoice items")
    
    # Categorization
    category: str = Field(..., description="Invoice category")
    tags: List[str] = Field(default_factory=list, description="Invoice tags")
    
    # Processing information
    source_type: str = Field(..., description="Source type (pdf/image)")
    status: str = Field(default="pending", description="Processing status")

    @field_validator('id', mode='before')
    @classmethod
    def validate_object_id(cls, v):
        """Convert ObjectId to string for JSON serialization"""
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError('Invalid ObjectId')

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str,
            Decimal: lambda v: float(v)
        }
    )

    def to_dict(self):
        """Convert to dictionary for MongoDB insertion"""
        data = self.model_dump(by_alias=True, exclude_unset=True)
        if data.get("_id") is None:
            data.pop("_id", None)
        return data

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.vendor_name} - {self.total_amount} {self.currency}"


class InvoiceCreate(BaseModel):
    """Schema for creating invoices (without id)"""
    invoice_number: str
    invoice_date: Optional[date] = None
    vendor_name: str
    total_amount: Decimal
    currency: str = "MAD"
    items: List[InvoiceItem] = []
    category: str
    tags: List[str] = []
    source_type: str
    status: str = "pending"

    @field_validator('invoice_date', mode='before')
    @classmethod
    def validate_invoice_date(cls, v):
        """Convert string dates to date objects"""
        if v is None or v == "":
            return None
        if isinstance(v, str):
            from datetime import datetime
            try:
                return datetime.strptime(v, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        return v

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class InvoiceUpdate(BaseModel):
    """Schema for updating invoices (all fields optional)"""
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    vendor_name: Optional[str] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    source_type: Optional[str] = None
    status: Optional[str] = None


class InvoiceResponse(Invoice):
    """Response schema for invoices"""
    pass
