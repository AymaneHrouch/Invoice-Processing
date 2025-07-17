from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, field_validator




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
    invoice_due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: Optional[datetime] = None

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
    invoice_number: str = Field(..., min_length=1, description="Unique invoice number")
    invoice_date: Optional[datetime] = None
    invoice_due_date: Optional[datetime] = None
    vendor_name: str = Field(..., min_length=1, description="Vendor name")
    total_amount: Decimal = Field(..., gt=0, description="Total invoice amount")
    currency: str = Field(default="MAD", description="Currency code")
    items: List[InvoiceItem] = Field(default_factory=list, description="List of invoice items")
    category: str = Field(..., min_length=1, description="Invoice category")
    tags: List[str] = Field(default_factory=list, description="Invoice tags")
    source_type: str = Field(..., description="Source type (manual/pdf/image)")
    status: str = Field(default="pending", description="Processing status")

    @field_validator('invoice_number')
    @classmethod
    def validate_invoice_number(cls, v):
        """Validate invoice number is not empty"""
        if not v or not v.strip():
            raise ValueError('Invoice number cannot be empty')
        return v.strip()

    @field_validator('vendor_name')
    @classmethod
    def validate_vendor_name(cls, v):
        """Validate vendor name is not empty"""
        if not v or not v.strip():
            raise ValueError('Vendor name cannot be empty')
        return v.strip()

    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        """Validate category is not empty"""
        if not v or not v.strip():
            raise ValueError('Category cannot be empty')
        return v.strip()

    @field_validator('invoice_date', mode='before')
    @classmethod
    def validate_invoice_date(cls, v):
        """Convert string dates to datetime objects"""
        if v is None or v == "":
            return None
        if isinstance(v, str):
            from datetime import datetime
            try:
                # Parse as date first, then convert to datetime
                date_obj = datetime.strptime(v, "%Y-%m-%d").date()
                return datetime.combine(date_obj, datetime.min.time())
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        elif isinstance(v, date):
            # Convert date to datetime
            return datetime.combine(v, datetime.min.time())
        return v

    @field_validator('invoice_due_date', mode='before')
    @classmethod
    def validate_invoice_due_date(cls, v):
        """Convert string dates to datetime objects or return None"""
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                date_obj = datetime.strptime(v, "%Y-%m-%d").date()
                return datetime.combine(date_obj, datetime.min.time())
            except ValueError:
                raise ValueError('Invalid due date format. Use YYYY-MM-DD')
        elif isinstance(v, date):
            return datetime.combine(v, datetime.min.time())
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
    invoice_due_date: Optional[datetime] = None
    vendor_name: Optional[str] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    source_type: Optional[str] = None
    status: Optional[str] = None


class InvoiceResponse(BaseModel):
    """Response schema for invoices"""
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    invoice_due_date: Optional[datetime] = None
    vendor_name: Optional[str] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    source_type: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None