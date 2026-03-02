"""
Invoice REST API routes using PyMongo
"""
from datetime import datetime
import logging
from typing import Literal

from fastapi import (
    APIRouter,
    Body,
    File,
    HTTPException,
    Path,
    Query,
    Response,
    UploadFile,
)
from fastapi.params import Depends

from app.crud.invoice import InvoiceCRUD
from app.models.invoice import Invoice, InvoiceBatchUpdate, InvoiceCreate, InvoiceResponse, InvoiceUpdate
from app.services.invoices import extract_invoice_data
from app.utils.auth import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["invoices"])


# ============= CREATE ENDPOINTS =============

@router.post("/", response_model=InvoiceResponse, summary="Create a new invoice")
def create_invoice(invoice_data: InvoiceCreate):
    """Create a new invoice with all required fields"""
    try:
        logger.info("Creating invoice: %s", invoice_data.invoice_number)
        invoice = InvoiceCRUD.create_invoice(invoice_data)
        if not invoice:
            logger.error("Invoice creation returned None")
            raise HTTPException(status_code=500, detail="Failed to create invoice")
        logger.info("Invoice created successfully: %s", invoice.invoice_number)
        return invoice
    except ValueError as e:
        logger.warning("Validation error creating invoice: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Failed to create invoice: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def handle_upload_files(files: list[UploadFile] = File(...)):

    extracted_data = []

    for file in files:
        file_bytes = await file.read()
        try:
            logger.info("Processing uploaded file: %s", file.filename)
            invoice_data = extract_invoice_data(file_bytes)

            invoice_create = InvoiceCreate(
                invoice_number=invoice_data.get("invoice_number") or f"AI-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                invoice_date=invoice_data.get("date") or None,
                invoice_due_date=invoice_data.get("due_date") or None,
                vendor_name=invoice_data.get("supplier") or "Unknown",
                total_amount=max(float(invoice_data.get("amount") or 0), 0.01),
                currency=invoice_data.get("currency") or "MAD",
                items=invoice_data.get("items", []),
                category=invoice_data.get("category") or "Others",
                tags=invoice_data.get("tags", []),
                source_type="pdf",
                status="extracted",
            )
            saved_invoice = InvoiceCRUD.create_invoice(invoice_create)
            logger.info("Saved invoice from %s with ID: %s", file.filename, saved_invoice.id)

            extracted_data.append({
                "fileName": file.filename,
                "invoice_id": str(saved_invoice.id),
                **invoice_data,
            })

        except Exception as e:
            logger.exception("Failed to process %s: %s", file.filename, e)
            extracted_data.append({
                "fileName": file.filename,
                "error": str(e)
            })

    return {
        "message": "Files processed and saved",
        "extracted_data": extracted_data
    }
# ============= READ ENDPOINTS =============

@router.get("/", response_model=list[Invoice],
            summary="Get all invoices with filtering, pagination and sorting")
def get_invoices(
        response: Response,
        page: int = Query(1, ge=1, description="Page number"),
        per_page: int = Query(10, ge=1, le=1000, description="Number of invoices to return"),
        sort_by: str | None = Query("created_at", description="Field to sort by"),
        order: Literal["desc", "asc"] = Query("desc", description="Sort order"),
        status: str | None = Query(None, description="Filter by invoice status"),
        vendor_name: str | None = Query(None, description="Filter by vendor name (partial match)"),
        category: str | None = Query(None, description="Filter by category"),
):
    """
    Get all invoices with optional filtering and pagination

    - **page**: Page number (for pagination)
    - **per_page**: Number of invoices to return
    - **sort_by**: Field to sort by
    - **order**: Sort order
    - **status**: Filter by invoice status (e.g., 'extracted', 'validated')
    - **vendor_name**: Filter by vendor name (supports partial matching)
    - **category**: Filter by exact category match
    """
    try:
        result = InvoiceCRUD.get_all_invoices(
            page=page,
            per_page=per_page,
            status=status,
            sort_by=sort_by,
            order=order,
            vendor_name=vendor_name,
            category=category,
        )
        response.headers["X-Total-Count"] = str(result["total"])
        response.headers["X-Total-Pages"] = str(result["total_pages"])
        response.headers["X-Per-Page"] = str(per_page)
        response.headers["X-Page"] = str(page)
        response.headers["X-Has-Next"] = str(result["has_next"]).lower()
        response.headers["X-Has-Prev"] = str(result["has_prev"]).lower()
        return result["data"]
    except Exception as e:
        logger.exception("Error in get_invoices: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{invoice_id}", response_model=InvoiceResponse, summary="Get invoice by ID")
def get_invoice_by_id(
        invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice")
):
    """
    Get a specific invoice by its MongoDB ObjectId

    - **invoice_id**: The MongoDB ObjectId of the invoice
    """
    try:
        invoice = InvoiceCRUD.get_invoice_by_id(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")
        return invoice
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-number/{invoice_number}", response_model=InvoiceResponse, summary="Get invoice by invoice number")
def get_invoice_by_number(
        invoice_number: str = Path(..., description="Unique invoice number")
):
    """
    Get a specific invoice by its invoice number

    - **invoice_number**: The unique invoice number (e.g., 'INV-2024-001')
    """
    try:
        invoice = InvoiceCRUD.get_invoice_by_number(invoice_number)
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found")
        return invoice
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendor/{vendor_name}", response_model=list[InvoiceResponse], summary="Get invoices by vendor name")
def get_invoices_by_vendor_name(
        vendor_name: str = Path(..., description="Name of the vendor")
):
    """
    Get all invoices from a specific vendor

    - **vendor_name**: The exact name of the vendor
    """
    try:
        invoices = InvoiceCRUD.get_invoices_by_vendor(vendor_name)
        if not invoices:
            raise HTTPException(status_code=404, detail=f"No invoices found for vendor '{vendor_name}'")
        return invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/tags", response_model=list[InvoiceResponse], summary="Get invoices by tags")
def get_invoices_by_tags(
        tags: list[str] = Body(..., description="List of tags to search for")
):
    """
    Get invoices that contain any of the specified tags

    - **tags**: List of tags to search for (e.g., ['development', 'monthly-service'])

    Returns invoices that have at least one of the specified tags.
    """
    try:
        if not tags:
            raise HTTPException(status_code=400, detail="Tags list cannot be empty")

        invoices = InvoiceCRUD.get_invoices_by_tags(tags)
        return invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tags/{tag}", response_model=list[InvoiceResponse], summary="Get invoices by single tag")
def get_invoices_by_single_tag(
        tag: str = Path(..., description="Tag to search for")
):
    """
    Get invoices that contain a specific tag

    - **tag**: The tag to search for (e.g., 'development')
    """
    try:
        invoices = InvoiceCRUD.get_invoices_by_tags([tag])
        return invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= UPDATE ENDPOINTS =============

@router.put("/{invoice_id}", response_model=InvoiceResponse, summary="Update invoice by ID")
def update_invoice_by_id(
        invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice"),
        update_data: InvoiceUpdate = Body(..., description="Fields to update")
):
    try:
        logger.info("Updating invoice %s", invoice_id)

        invoice = InvoiceCRUD.update_invoice(invoice_id, update_data)
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

        logger.info("Invoice updated successfully: %s", invoice_id)
        return invoice
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        logger.exception("Failed to update invoice %s: %s", invoice_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/by-number/{invoice_number}", response_model=InvoiceResponse, summary="Update invoice by invoice number")
def update_invoice_by_number(
        invoice_number: str = Path(..., description="Unique invoice number"),
        update_data: InvoiceUpdate = Body(..., description="Fields to update")
):
    """
    Update an invoice by its invoice number

    - **invoice_number**: The unique invoice number (e.g., 'INV-2024-001')
    - **update_data**: Object containing the fields to update (all fields are optional)
    """
    try:
        existing_invoice = InvoiceCRUD.get_invoice_by_number(invoice_number)
        if not existing_invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found")

        invoice = InvoiceCRUD.update_invoice(str(existing_invoice.id), update_data)
        return invoice
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/batch", summary="Batch update invoices")
def batch_update_invoices(body: InvoiceBatchUpdate = Body(...)):
    """
    Update multiple invoices with the same field values.
    - **invoice_ids**: List of invoice IDs to update
    - **is_paid**: Set paid status (optional)
    - **direction**: Set direction to 'incoming' or 'outgoing' (optional)
    """
    try:
        count = InvoiceCRUD.batch_update_invoices(
            invoice_ids=body.invoice_ids,
            is_paid=body.is_paid,
            direction=body.direction,
        )
        return {"updated_count": count, "message": f"Updated {count} invoice(s)"}
    except Exception as e:
        logger.exception("Batch update failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{invoice_id}/status", summary="Update invoice status by ID")
def update_invoice_status_by_id(
        invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice"),
        status: str = Body(..., description="New status value", embed=True)
):
    """
    Update only the status of an invoice by its ID

    - **invoice_id**: The MongoDB ObjectId of the invoice
    - **status**: The new status (e.g., 'extracted', 'validated')
    """
    try:
        invoice = InvoiceCRUD.update_invoice_status(invoice_id, status)
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")
        return {
            "message": "Status updated successfully",
            "invoice_id": invoice_id,
            "new_status": status
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= DELETE ENDPOINTS =============

@router.delete("/{invoice_id}", summary="Delete invoice by ID")
def delete_invoice_by_id(
        invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice"),
        current_user = Depends(require_admin)
):
    """
    Delete an invoice by its MongoDB ObjectId

    - **invoice_id**: The MongoDB ObjectId of the invoice to delete
    """
    try:
        success = InvoiceCRUD.delete_invoice(invoice_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")
        logger.info("Invoice deleted: %s", invoice_id)
        return {
            "message": "Invoice deleted successfully",
            "invoice_id": invoice_id
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= SEARCH AND ANALYTICS ENDPOINTS =============

@router.post("/search/date-range", response_model=list[InvoiceResponse], summary="Search invoices by date range")
def search_invoices_by_date_range(
        start_date: datetime = Body(..., description="Start date for the search"),
        end_date: datetime = Body(..., description="End date for the search")
):
    """
    Search invoices within a specific date range

    - **start_date**: Start date (inclusive)
    - **end_date**: End date (inclusive)
    """
    try:
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")

        invoices = InvoiceCRUD.get_invoices_by_date_range(start_date, end_date)
        return invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/text/{search_term}", response_model=list[InvoiceResponse], summary="Full-text search")
def search_invoices_by_text(
        search_term: str = Path(..., description="Search term to look for across multiple fields")
):
    """
    Full-text search across invoice fields

    Searches in: invoice_number, vendor_name, category, tags, and item descriptions

    - **search_term**: The text to search for (case-insensitive)
    """
    try:
        invoices = InvoiceCRUD.search_invoices(search_term)
        return invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendor/{vendor_name}/total", summary="Get total amount for vendor")
def get_vendor_total_amount(
        vendor_name: str = Path(..., description="Name of the vendor")
):
    """
    Get the total amount of all invoices for a specific vendor

    - **vendor_name**: The exact name of the vendor
    """
    try:
        total = InvoiceCRUD.get_total_amount_by_vendor(vendor_name)
        return {
            "vendor_name": vendor_name,
            "total_amount": total,
            "currency": "MAD"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary", summary="Get invoice statistics summary")
def get_invoices_statistics():
    """
    Get comprehensive statistics about all invoices

    Returns: total count, total amount, average amount, min/max amounts
    """
    try:
        return InvoiceCRUD.get_invoices_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/by-status", summary="Get invoice count by status")
def get_invoices_count_by_status():
    """
    Get the count of invoices grouped by their status

    Returns a dictionary with status as key and count as value
    """
    try:
        return InvoiceCRUD.get_invoices_by_status_count()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
