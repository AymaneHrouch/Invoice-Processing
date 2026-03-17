"""Ventes (outgoing invoices) routes — Phase 2."""
from datetime import UTC, datetime
from decimal import Decimal
from io import BytesIO
import logging
from typing import Literal

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, Response
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from pydantic import BaseModel

from app.crud.invoice import InvoiceCRUD
from app.database import get_company_collection
from app.models.invoice import (
    InvoiceCreate,
    InvoiceItem,
    InvoiceResponse,
    InvoiceUpdate,
)
from app.services.invoices import run_amount_checks
from app.services.pdf import generate_invoice_pdf
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ventes", tags=["Ventes"])


class VenteCreate(BaseModel):
    """Payload for creating an outgoing invoice. invoice_number is auto-generated."""
    client_name: str
    client_ice: str | None = None
    contact_id: str | None = None
    invoice_date: str | None = None
    invoice_due_date: str | None = None
    subtotal_ht: float | None = None
    tva: float | None = None
    amount_tva: float | None = None
    total_amount: float
    currency: str = "MAD"
    items: list[InvoiceItem] = []
    category: str
    tags: list[str] = []


def _to_response(invoice) -> InvoiceResponse:
    allowed = set(InvoiceResponse.model_fields)
    data = invoice.model_dump(mode="json", by_alias=False)
    payload = {k: data[k] for k in allowed if k in data}
    payload["amount_warnings"] = run_amount_checks(invoice)
    return InvoiceResponse(**payload)


def _generate_next_number(col) -> str:
    """Atomically get next sequential invoice number from company profile."""
    year = datetime.now(UTC).year
    doc = col.find_one({})
    if not doc:
        raise HTTPException(
            status_code=400,
            detail="Profil entreprise non configuré. Veuillez d'abord configurer votre entreprise.",
        )

    prefix = doc.get("invoice_prefix") or "FAC"

    if doc.get("invoice_year") != year:
        # New year — reset counter
        col.update_one({}, {"$set": {"invoice_year": year, "next_invoice_number": 2}})
        return f"{prefix}-{year}-001"

    # Atomic increment — find_one_and_update returns doc BEFORE update
    before = col.find_one_and_update(
        {},
        {"$inc": {"next_invoice_number": 1}},
        return_document=False,
    )
    seq = before.get("next_invoice_number", 1)
    return f"{prefix}-{year}-{seq:03d}"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/next-number")
def get_next_number(current_user: dict = Depends(get_current_user)):
    """Preview the next invoice number without consuming it."""
    col = get_company_collection()
    doc = col.find_one({})
    if not doc:
        raise HTTPException(status_code=400, detail="Profil entreprise non configuré.")
    prefix = doc.get("invoice_prefix") or "FAC"
    year = datetime.now(UTC).year
    seq = doc.get("next_invoice_number", 1)
    if doc.get("invoice_year") != year:
        seq = 1
    return {"next_number": f"{prefix}-{year}-{seq:03d}"}


@router.post("", response_model=InvoiceResponse, status_code=201)
def create_vente(
    data: VenteCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new outgoing invoice as draft with auto-generated sequential number."""
    col = get_company_collection()
    company = col.find_one({})
    if not company:
        raise HTTPException(status_code=400, detail="Profil entreprise non configuré.")

    invoice_number = _generate_next_number(col)

    invoice_create = InvoiceCreate(
        invoice_number=invoice_number,
        invoice_date=data.invoice_date,
        invoice_due_date=data.invoice_due_date,
        vendor_name=company.get("company_name", ""),
        vendor_ice=company.get("ice"),
        client_name=data.client_name,
        client_ice=data.client_ice,
        contact_id=data.contact_id,
        subtotal_ht=Decimal(str(data.subtotal_ht)) if data.subtotal_ht is not None else None,
        tva=data.tva,
        amount_tva=data.amount_tva,
        total_amount=Decimal(str(data.total_amount)),
        currency=data.currency,
        items=data.items,
        category=data.category,
        tags=data.tags,
        source_type="manual",
        status="draft",
        direction="outgoing",
    )

    try:
        invoice = InvoiceCRUD.create_invoice(invoice_create)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    logger.info("Vente %s created by %s", invoice_number, current_user.get("user_id"))
    return _to_response(invoice)


@router.get("", response_model=list[InvoiceResponse])
def list_ventes(
    response: Response,
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    order: Literal["desc", "asc"] = Query("desc"),
    status: str | None = Query(None),
    category: str | None = Query(None),
    is_paid: bool | None = Query(None),
    is_exported: bool | None = Query(None),
    include_archived: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    result = InvoiceCRUD.get_all_invoices(
        page=page,
        per_page=per_page,
        status=status,
        sort_by=sort_by,
        order=order,
        category=category,
        is_paid=is_paid,
        is_exported=is_exported,
        include_archived=include_archived,
        direction="outgoing",
    )
    response.headers["X-Total-Count"] = str(result["total"])
    response.headers["X-Total-Pages"] = str(result["total_pages"])
    response.headers["X-Per-Page"] = str(per_page)
    response.headers["X-Page"] = str(page)
    response.headers["X-Has-Next"] = str(result["has_next"]).lower()
    response.headers["X-Has-Prev"] = str(result["has_prev"]).lower()
    return [_to_response(inv) for inv in result["data"]]


@router.get("/{vente_id}", response_model=InvoiceResponse)
def get_vente(
    vente_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        inv = InvoiceCRUD.get_invoice_by_id(vente_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide.") from None
    if not inv or inv.direction != "outgoing":
        raise HTTPException(status_code=404, detail="Facture introuvable.")
    return _to_response(inv)


@router.put("/{vente_id}", response_model=InvoiceResponse)
def update_vente(
    vente_id: str = Path(...),
    data: InvoiceUpdate = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Update an outgoing invoice. Only allowed when status is 'draft'."""
    try:
        inv = InvoiceCRUD.get_invoice_by_id(vente_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide.") from None
    if not inv or inv.direction != "outgoing":
        raise HTTPException(status_code=404, detail="Facture introuvable.")
    if inv.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Seules les factures en brouillon peuvent être modifiées.",
        )
    updated = InvoiceCRUD.update_invoice(vente_id, data)
    return _to_response(updated)


@router.delete("/{vente_id}")
def delete_vente(
    vente_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        inv = InvoiceCRUD.get_invoice_by_id(vente_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide.") from None
    if not inv or inv.direction != "outgoing":
        raise HTTPException(status_code=404, detail="Facture introuvable.")
    InvoiceCRUD.delete_invoice(vente_id)
    logger.info("Vente %s deleted by %s", vente_id, current_user.get("user_id"))
    return {"message": "Facture supprimée."}


@router.post("/{vente_id}/validate", response_model=InvoiceResponse)
def validate_vente(
    vente_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Transition draft → validated. Locks the invoice for editing."""
    try:
        inv = InvoiceCRUD.get_invoice_by_id(vente_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide.") from None
    if not inv or inv.direction != "outgoing":
        raise HTTPException(status_code=404, detail="Facture introuvable.")
    if inv.status != "draft":
        raise HTTPException(
            status_code=400,
            detail="Seules les factures en brouillon peuvent être validées.",
        )
    updated = InvoiceCRUD.update_invoice(vente_id, InvoiceUpdate(status="validated"))
    logger.info("Vente %s validated by %s", vente_id, current_user.get("user_id"))
    return _to_response(updated)


@router.post("/{vente_id}/mark-sent", response_model=InvoiceResponse)
def mark_sent(
    vente_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Transition validated → sent."""
    try:
        inv = InvoiceCRUD.get_invoice_by_id(vente_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide.") from None
    if not inv or inv.direction != "outgoing":
        raise HTTPException(status_code=404, detail="Facture introuvable.")
    if inv.status != "validated":
        raise HTTPException(
            status_code=400,
            detail="Seules les factures validées peuvent être marquées comme envoyées.",
        )
    updated = InvoiceCRUD.update_invoice(vente_id, InvoiceUpdate(status="sent"))
    return _to_response(updated)


@router.post("/{vente_id}/mark-paid", response_model=InvoiceResponse)
def mark_paid(
    vente_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Mark a validated or sent invoice as paid."""
    try:
        inv = InvoiceCRUD.get_invoice_by_id(vente_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide.") from None
    if not inv or inv.direction != "outgoing":
        raise HTTPException(status_code=404, detail="Facture introuvable.")
    if inv.status not in ("validated", "sent"):
        raise HTTPException(
            status_code=400,
            detail="La facture doit être validée ou envoyée pour être marquée payée.",
        )
    updated = InvoiceCRUD.update_invoice(
        vente_id,
        InvoiceUpdate(status="paid", is_paid=True, paid_at=datetime.now(UTC)),
    )
    return _to_response(updated)


@router.get("/{vente_id}/pdf")
def download_vente_pdf(
    vente_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
):
    """Generate and return a PDF for the given outgoing invoice."""
    try:
        inv = InvoiceCRUD.get_invoice_by_id(vente_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalide.") from None
    if not inv or inv.direction != "outgoing":
        raise HTTPException(status_code=404, detail="Facture introuvable.")

    col = get_company_collection()
    company = col.find_one({}) or {}

    try:
        pdf_bytes = generate_invoice_pdf(inv, company)
    except Exception as e:
        logger.exception("PDF generation failed for vente %s: %s", vente_id, e)
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du PDF.") from e

    filename = f"facture_{inv.invoice_number}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export", summary="Export outgoing invoices (Ventes) to Excel")
def export_ventes(
    status: str | None = Query(None),
    vendor_name: str | None = Query(None),
    category: str | None = Query(None),
    is_exported: bool | None = Query(None),
    include_archived: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    """Export outgoing invoices to Excel. Locks direction=outgoing."""
    try:
        invoices = InvoiceCRUD.get_invoices_for_export(
            status=status,
            vendor_name=vendor_name,
            category=category,
            is_exported=is_exported,
            include_archived=include_archived,
            direction="outgoing",
        )

        wb = Workbook()
        ws = wb.active
        ws.title = "Ventes"

        headers = [
            "N° Facture", "Client", "Date", "ICE Client",
            "TVA (%)", "Montant TVA", "Total TTC", "Échéance",
            "Statut", "Payé", "Catégorie",
        ]
        ws.append(headers)

        exported_ids = []
        for inv in invoices:
            ws.append([
                inv.invoice_number or "",
                inv.client_name or inv.vendor_name or "",
                inv.invoice_date.strftime("%d/%m/%Y") if inv.invoice_date else "",
                inv.client_ice or "",
                float(inv.tva) if inv.tva is not None else "",
                float(inv.amount_tva) if inv.amount_tva is not None else "",
                float(inv.total_amount) if inv.total_amount else "",
                inv.invoice_due_date.strftime("%d/%m/%Y") if inv.invoice_due_date else "",
                inv.status or "",
                "Oui" if inv.is_paid else "Non",
                inv.category or "",
            ])
            exported_ids.append(str(inv.id))

        output = BytesIO()
        wb.save(output)
        output.seek(0)
        filename = f"ventes_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.xlsx"
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
        logger.exception("Ventes export failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
