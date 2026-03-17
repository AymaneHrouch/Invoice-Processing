"""
Invoice REST API routes using PyMongo
"""
from datetime import datetime
from io import BytesIO
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
from fastapi.responses import StreamingResponse

from app.crud.invoice import InvoiceCRUD
from app.database import get_company_collection
from app.models.invoice import (
    Invoice,
    InvoiceBatchUpdate,
    InvoiceCreate,
    InvoiceResponse,
    InvoiceUpdate,
)
from app.services import dashboard
from app.services.invoices import extract_invoice_data, run_amount_checks
from app.services.pdf import generate_invoice_pdf
from app.utils.auth import get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["invoices"])


def invoice_to_response(invoice: Invoice) -> InvoiceResponse:
    """Build API response with computed amount_warnings for extracted invoices."""
    allowed = set(InvoiceResponse.model_fields)
    data = invoice.model_dump(mode="json", by_alias=False)
    payload = {k: data[k] for k in allowed if k in data}
    payload["amount_warnings"] = run_amount_checks(invoice)
    return InvoiceResponse(**payload)


def _source_type_from_filename(filename: str) -> str:
    """Return 'pdf' or 'image' based on file extension. Default 'pdf' if unknown."""
    if not filename:
        return "pdf"
    ext = (filename.rsplit(".", 1)[-1] or "").lower()
    if ext == "pdf":
        return "pdf"
    if ext in ("jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"):
        return "image"
    return "pdf"


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
        return invoice_to_response(invoice)
    except ValueError as e:
        logger.warning("Validation error creating invoice: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Failed to create invoice: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def handle_upload_files(
    files: list[UploadFile] = File(...),
    direction: str = Query("incoming", description="Invoice direction: incoming or outgoing"),
):

    extracted_data = []

    for index, file in enumerate(files):
        file_bytes = await file.read()
        try:
            logger.info("Processing uploaded file: %s", file.filename)
            invoice_data = extract_invoice_data(file_bytes)

            # Derive source_type from uploaded file (pdf vs image)
            source_type = _source_type_from_filename(file.filename or "")

            invoice_create = InvoiceCreate(
                invoice_number=invoice_data.get("invoice_number") or f"AI-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                invoice_date=invoice_data.get("date") or None,
                invoice_due_date=invoice_data.get("due_date") or None,
                vendor_name=invoice_data.get("supplier") or "Unknown",
                ice=invoice_data.get("ice"),
                tva=invoice_data.get("tva"),
                amount_tva=invoice_data.get("amount_tva"),
                total_amount=max(float(invoice_data.get("amount") or 0), 0.01),
                currency=invoice_data.get("currency") or "MAD",
                items=invoice_data.get("items", []),
                category=invoice_data.get("category") or "Others",
                tags=invoice_data.get("tags", []),
                source_type=source_type,
                status="extracted",
                direction=direction,
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


@router.post("/achats/export", summary="Export incoming invoices (Achats) to Excel")
def export_achats(
        status: str | None = Query(None),
        vendor_name: str | None = Query(None),
        category: str | None = Query(None),
        is_exported: bool | None = Query(None),
        include_archived: bool = Query(False),
        current_user: dict = Depends(get_current_user),
):
    """Export incoming invoices to Excel. Locks direction=incoming."""
    return _do_export(
        direction="incoming",
        status=status,
        vendor_name=vendor_name,
        category=category,
        is_exported=is_exported,
        include_archived=include_archived,
        filename_prefix="achats",
    )


@router.post("/export", summary="Export filtered invoices to Excel")
def export_invoices(
        status: str | None = Query(None, description="Filter by status"),
        vendor_name: str | None = Query(None, description="Filter by vendor name"),
        category: str | None = Query(None, description="Filter by category"),
        is_exported: bool | None = Query(None, description="Filter by export status"),
        include_archived: bool = Query(False, description="Include archived invoices"),
):
    """Export filtered invoices to Excel. Auto-sets is_exported=True on all exported invoices."""
    return _do_export(
        direction=None,
        status=status,
        vendor_name=vendor_name,
        category=category,
        is_exported=is_exported,
        include_archived=include_archived,
        filename_prefix="invoices",
    )


def _do_export(
    *,
    direction: str | None,
    status: str | None,
    vendor_name: str | None,
    category: str | None,
    is_exported: bool | None,
    include_archived: bool,
    filename_prefix: str,
):
    try:
        from openpyxl import Workbook

        invoices = InvoiceCRUD.get_invoices_for_export(
            status=status,
            vendor_name=vendor_name,
            category=category,
            is_exported=is_exported,
            include_archived=include_archived,
            direction=direction,
        )

        wb = Workbook()
        ws = wb.active
        ws.title = "Invoices"

        headers = [
            "Invoice Number", "Vendor", "Date", "Direction", "ICE",
            "TVA", "Amount TVA", "Total Amount", "Due Date",
            "Status", "Paid", "Category",
        ]
        ws.append(headers)

        exported_ids = []
        for inv in invoices:
            ws.append([
                inv.invoice_number,
                inv.vendor_name,
                inv.invoice_date.strftime("%d/%m/%Y") if inv.invoice_date else "",
                inv.direction,
                (inv.ice if inv.ice is not None else "") or "",
                (inv.tva if inv.tva is not None else "") or "",
                (inv.amount_tva if inv.amount_tva is not None else "") or "",
                float(inv.total_amount) if inv.total_amount else "",
                inv.invoice_due_date.strftime("%d/%m/%Y") if inv.invoice_due_date else "",
                inv.status,
                "Yes" if inv.is_paid else "No",
                inv.category or "",
            ])
            exported_ids.append(str(inv.id))

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"{filename_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Exported-Ids": ",".join(exported_ids),
                "Access-Control-Expose-Headers": "X-Exported-Ids",
            },
        )
    except Exception as e:
        logger.exception("Export failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", summary="Get work queue stats (FEAT-03)")
def get_invoice_stats():
    """Work queue stats: to_validate, ready_to_export, exported_this_month, failed, recent_activity"""
    return dashboard.get_work_queue_stats()


@router.get("/", response_model=list[InvoiceResponse],
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
        is_exported: bool | None = Query(None, description="Filter by export status"),
        is_paid: bool | None = Query(None, description="Filter by paid status"),
        include_archived: bool = Query(False, description="Include archived invoices"),
        direction: str | None = Query(None, description="Filter by direction (incoming/outgoing)"),
):
    """
    Get all invoices with optional filtering and pagination

    - **status**: Filter by invoice status (e.g., 'extracted', 'validated')
    - **is_exported**: Filter by export status (for "ready to export" = false)
    - **include_archived**: Include archived invoices (excluded by default)
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
            is_exported=is_exported,
            is_paid=is_paid,
            include_archived=include_archived,
            direction=direction,
        )
        response.headers["X-Total-Count"] = str(result["total"])
        response.headers["X-Total-Pages"] = str(result["total_pages"])
        response.headers["X-Per-Page"] = str(per_page)
        response.headers["X-Page"] = str(page)
        response.headers["X-Has-Next"] = str(result["has_next"]).lower()
        response.headers["X-Has-Prev"] = str(result["has_prev"]).lower()
        return [invoice_to_response(inv) for inv in result["data"]]
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
        return invoice_to_response(invoice)
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
        return invoice_to_response(invoice)
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
        return [invoice_to_response(inv) for inv in invoices]
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
        return [invoice_to_response(inv) for inv in invoices]
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
        return [invoice_to_response(inv) for inv in invoices]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= UPDATE ENDPOINTS =============


@router.patch("/{invoice_id}/archive", response_model=InvoiceResponse, summary="Archive invoice (FEAT-06)")
def archive_invoice(invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice")):
    """Archive an invoice. Hidden from main list by default, always recoverable."""
    try:
        invoice = InvoiceCRUD.update_invoice(invoice_id, InvoiceUpdate(is_archived=True))
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
        return invoice_to_response(invoice)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        logger.exception("Archive invoice failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{invoice_id}/restore", response_model=InvoiceResponse, summary="Restore archived invoice (FEAT-06)")
def restore_invoice(invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice")):
    """Restore an archived invoice to the main list."""
    try:
        invoice = InvoiceCRUD.update_invoice(invoice_id, InvoiceUpdate(is_archived=False))
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
        return invoice_to_response(invoice)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    except Exception as e:
        logger.exception("Restore invoice failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


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
        return invoice_to_response(invoice)
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
        return invoice_to_response(invoice)
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
            status=body.status,
            is_archived=body.is_archived,
            is_exported=body.is_exported,
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
        return [invoice_to_response(inv) for inv in invoices]
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
        return [invoice_to_response(inv) for inv in invoices]
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


# ============= PDF ENDPOINT =============

@router.get("/{invoice_id}/pdf", summary="Download invoice as PDF")
def download_invoice_pdf(
    invoice_id: str = Path(..., description="MongoDB ObjectId of the invoice"),
    current_user: dict = Depends(get_current_user),
):
    """Generate and return a PDF for the given invoice (incoming or outgoing)."""
    try:
        inv = InvoiceCRUD.get_invoice_by_id(invoice_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide.") from None
    if not inv:
        raise HTTPException(status_code=404, detail="Facture introuvable.")

    col = get_company_collection()
    company = col.find_one({}) or {}

    try:
        pdf_bytes = generate_invoice_pdf(inv, company)
    except Exception as e:
        logger.exception("PDF generation failed for invoice %s: %s", invoice_id, e)
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du PDF.") from e

    filename = f"facture_{inv.invoice_number or invoice_id}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
