from datetime import date, datetime
from decimal import Decimal

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class InvoiceHistoryEntry(BaseModel):
    """A single audit-trail entry recorded on every status transition."""
    action: str
    status_from: str | None = None
    status_to: str | None = None
    user: str = "système"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})


class InvoiceItem(BaseModel):
    """Invoice item model"""
    name: str | None = Field(default=None, description="Item name")
    description: str = Field(..., description="Item description")
    quantity: int = Field(..., gt=0, description="Item quantity")
    unit_price: Decimal = Field(..., ge=0, description="Price per unit")
    total: Decimal = Field(..., ge=0, description="Total price for this item")

    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v)
        }
    )


class Invoice(BaseModel):
    """Invoice model with Pydantic validation"""

    # MongoDB ObjectId (as string for JSON schema compatibility)
    id: str | None = Field(default=None, alias="_id", description="MongoDB ObjectId as string")

    # Basic invoice information
    invoice_number: str = Field(..., description="Unique invoice number")
    invoice_date: datetime = Field(..., description="Invoice date")
    invoice_due_date: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime | None = None

    # Vendor information
    vendor_name: str = Field(..., description="Vendor name")
    ice: str | None = Field(default=None, description="Vendor ICE — legacy field, prefer vendor_ice")
    vendor_ice: str | None = Field(default=None, description="Vendor ICE (Moroccan tax ID)")
    tva: float | None = Field(default=None, description="TVA rate (e.g. 20 for 20%)")
    amount_tva: float | None = Field(default=None, description="TVA amount (monetary)")

    # Client information (for outgoing invoices)
    client_name: str | None = Field(default=None, description="Client name")
    client_ice: str | None = Field(default=None, description="Client ICE (Moroccan tax ID)")
    contact_id: str | None = Field(default=None, description="Reference to contact _id")

    # Financial information
    subtotal_ht: Decimal | None = Field(default=None, description="Subtotal before tax (HT)")
    total_amount: Decimal = Field(..., gt=0, description="Total invoice amount")
    currency: str = Field(default="MAD", description="Currency code")

    # Invoice items
    items: list[InvoiceItem] = Field(default_factory=list, description="List of invoice items")

    # Categorization
    category: str = Field(..., description="Invoice category")

    # Processing information
    source_type: str = Field(..., description="Source type (pdf/image)")
    status: str = Field(default="extracted", description="Processing status")

    # Boolean flags
    is_exported: bool = Field(default=False, description="Included in at least one export")
    is_paid: bool = Field(default=False, description="Payment confirmed")
    is_archived: bool = Field(default=False, description="Hidden from main list")
    direction: str = Field(default="incoming", description="incoming or outgoing")
    paid_at: datetime | None = None
    exported_at: datetime | None = None

    # Multi-company scoping
    company_id: str | None = Field(default=None, description="Company this invoice belongs to")

    @field_validator("id", mode="before")
    @classmethod
    def validate_object_id(cls, v):
        """Convert ObjectId to string for JSON serialization"""
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")

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
    invoice_date: datetime | None = None
    invoice_due_date: datetime | None = None
    vendor_name: str = Field(..., min_length=1, description="Vendor name")
    ice: str | None = Field(default=None, description="Vendor ICE — legacy field, prefer vendor_ice")
    vendor_ice: str | None = Field(default=None, description="Vendor ICE (Moroccan tax ID)")
    tva: float | None = Field(default=None, description="TVA rate (e.g. 20 for 20%)")
    amount_tva: float | None = Field(default=None, description="TVA amount (monetary)")
    client_name: str | None = Field(default=None, description="Client name (for outgoing invoices)")
    client_ice: str | None = Field(default=None, description="Client ICE")
    contact_id: str | None = Field(default=None, description="Reference to contact _id")
    subtotal_ht: Decimal | None = Field(default=None, description="Subtotal before tax (HT)")
    total_amount: Decimal = Field(..., gt=0, description="Total invoice amount")
    currency: str = Field(default="MAD", description="Currency code")
    items: list[InvoiceItem] = Field(default_factory=list, description="List of invoice items")
    category: str = Field(..., min_length=1, description="Invoice category")
    source_type: str = Field(..., description="Source type (manual/pdf/image)")
    status: str = Field(default="extracted", description="Processing status")

    # Boolean flags
    is_exported: bool = Field(default=False, description="Included in at least one export")
    is_paid: bool = Field(default=False, description="Payment confirmed")
    is_archived: bool = Field(default=False, description="Hidden from main list")
    direction: str = Field(default="incoming", description="incoming or outgoing")

    # Multi-company scoping
    company_id: str | None = Field(default=None, description="Company this invoice belongs to")

    @model_validator(mode="after")
    def sync_vendor_ice(self):
        """Backward compat: if vendor_ice not set but ice is, copy ice → vendor_ice."""
        if self.vendor_ice is None and self.ice is not None:
            self.vendor_ice = self.ice
        return self

    @field_validator("invoice_number")
    @classmethod
    def validate_invoice_number(cls, v):
        """Validate invoice number is not empty"""
        if not v or not v.strip():
            raise ValueError("Invoice number cannot be empty")
        return v.strip()

    @field_validator("vendor_name")
    @classmethod
    def validate_vendor_name(cls, v):
        """Validate vendor name is not empty"""
        if not v or not v.strip():
            raise ValueError("Vendor name cannot be empty")
        return v.strip()

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        """Validate category is not empty"""
        if not v or not v.strip():
            raise ValueError("Category cannot be empty")
        return v.strip()

    @field_validator("invoice_date", mode="before")
    @classmethod
    def validate_invoice_date(cls, v):
        """Convert string dates to datetime objects"""
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                # Parse as date first, then convert to datetime
                date_obj = datetime.strptime(v, "%Y-%m-%d").date()
                return datetime.combine(date_obj, datetime.min.time())
            except ValueError:
                raise ValueError("Invalid date format. Use YYYY-MM-DD")
        elif isinstance(v, date):
            # Convert date to datetime
            return datetime.combine(v, datetime.min.time())
        return v

    @field_validator("invoice_due_date", mode="before")
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
                raise ValueError("Invalid due date format. Use YYYY-MM-DD")
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
    invoice_number: str | None = None
    invoice_date: datetime | None = None
    invoice_due_date: datetime | None = None
    vendor_name: str | None = None
    ice: str | None = None
    vendor_ice: str | None = None
    tva: float | None = None
    amount_tva: float | None = None
    client_name: str | None = None
    client_ice: str | None = None
    contact_id: str | None = None
    subtotal_ht: Decimal | None = None
    total_amount: Decimal | None = None
    currency: str | None = None
    items: list[InvoiceItem] | None = None
    category: str | None = None
    source_type: str | None = None
    status: str | None = None
    is_exported: bool | None = None
    is_paid: bool | None = None
    is_archived: bool | None = None
    direction: str | None = None
    paid_at: datetime | None = None
    exported_at: datetime | None = None


class InvoiceBatchUpdate(BaseModel):
    """Schema for batch updating invoices"""
    invoice_ids: list[str]
    is_paid: bool | None = None
    direction: str | None = None
    status: str | None = None
    is_archived: bool | None = None
    is_exported: bool | None = None


class InvoiceResponse(BaseModel):
    """Response schema for invoices"""
    id: str | None = Field(default=None, description="MongoDB ObjectId as string")
    invoice_number: str | None = None
    invoice_date: datetime | None = None
    invoice_due_date: datetime | None = None
    vendor_name: str | None = None
    ice: str | None = None
    vendor_ice: str | None = None
    tva: float | None = None
    amount_tva: float | None = None
    client_name: str | None = None
    client_ice: str | None = None
    contact_id: str | None = None
    subtotal_ht: Decimal | None = None
    total_amount: Decimal | None = None
    currency: str | None = None
    items: list[InvoiceItem] | None = None
    category: str | None = None
    source_type: str | None = None
    status: str | None = None
    is_exported: bool | None = None
    is_paid: bool | None = None
    is_archived: bool | None = None
    direction: str | None = None
    paid_at: datetime | None = None
    exported_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    # Computed by backend when status is 'extracted' (amount verification warnings)
    amount_warnings: list[str] | None = None
    # Computed: true when invoice_due_date < today AND is_paid is false
    is_overdue: bool | None = None
    # Audit trail — only populated by the /history endpoint
    history: list[dict] | None = None
    # Multi-company scoping
    company_id: str | None = None
