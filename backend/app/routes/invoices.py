"""
Invoice REST API routes using PyMongo
"""
import logging
from typing import List, Optional, Literal
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Path, Body, Response

from app.models.invoice import Invoice, InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.crud.invoice import InvoiceCRUD

# Set up logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invoices", tags=["invoices"])


# ============= CREATE ENDPOINTS =============

@router.post("/", response_model=InvoiceResponse, summary="Create a new invoice")
def create_invoice(invoice_data: InvoiceCreate):
    """Create a new invoice with all required fields"""
    try:
        logger.info(f"Received invoice data: {invoice_data}")
        invoice = InvoiceCRUD.create_invoice(invoice_data)
        if not invoice:
            logger.error("Invoice creation returned None")
            raise HTTPException(status_code=500, detail="Failed to create invoice")
        logger.info(f"Invoice created successfully: {invoice}")
        return invoice
    except ValueError as e:
        logger.error(f"ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Exception: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


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
    - **status**: Filter by invoice status (e.g., 'pending', 'processed', 'paid')
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
        logger.error(f"Error in get_invoices: {e}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
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


@router.get("/vendor/{vendor_name}", response_model=List[InvoiceResponse], summary="Get invoices by vendor name")
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


@router.post("/search/tags", response_model=List[InvoiceResponse], summary="Get invoices by tags")
def get_invoices_by_tags(
    tags: List[str] = Body(..., description="List of tags to search for")
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


@router.get("/tags/{tag}", response_model=List[InvoiceResponse], summary="Get invoices by single tag")
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
        logger.debug(f"Updating invoice with ID: {invoice_id}")
        logger.debug(f"Update data: {update_data}")
        
        invoice = InvoiceCRUD.update_invoice(invoice_id, update_data)
        if not invoice:
            logger.debug(f"Invoice not found for ID: {invoice_id}")
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")
        
        logger.debug(f"Invoice updated successfully: {invoice}")
        return invoice
    except ValueError as e:
        logger.debug(f"ValueError: {e}")
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        logger.debug(f"Exception: {e}")
        logger.debug(f"Exception type: {type(e)}")
        logger.debug(f"Traceback: {traceback.format_exc()}")
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
        # First get the invoice by number to get its ID
        existing_invoice = InvoiceCRUD.get_invoice_by_number(invoice_number)
        if not existing_invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found")
        
        # Update using the ID
        invoice = InvoiceCRUD.update_invoice(str(existing_invoice.id), update_data)
        return invoice
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{invoice_id}/status", summary="Update invoice status by ID")
def update_invoice_status_by_id(
    invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice"),
    status: str = Body(..., description="New status value", embed=True)
):
    """
    Update only the status of an invoice by its ID
    
    - **invoice_id**: The MongoDB ObjectId of the invoice
    - **status**: The new status (e.g., 'pending', 'processed', 'paid', 'cancelled')
    """
    try:
        invoice = InvoiceCRUD.update_invoice_status(invoice_id, status)
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")
        return {
            "message": "Status updated successfully",
            "invoice_id": invoice_id,
            "old_status": "N/A",  # Could be enhanced to track old status
            "new_status": status
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= DELETE ENDPOINTS =============

@router.delete("/{invoice_id}", summary="Delete invoice by ID")
def delete_invoice_by_id(
    invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice")
):
    """
    Delete an invoice by its MongoDB ObjectId
    
    - **invoice_id**: The MongoDB ObjectId of the invoice to delete
    """
    try:
        success = InvoiceCRUD.delete_invoice(invoice_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")
        return {
            "message": "Invoice deleted successfully",
            "invoice_id": invoice_id
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= SEARCH AND ANALYTICS ENDPOINTS =============

@router.post("/search/date-range", response_model=List[InvoiceResponse], summary="Search invoices by date range")
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


@router.get("/search/text/{search_term}", response_model=List[InvoiceResponse], summary="Full-text search")
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
            "currency": "MAD"  # Default currency
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
