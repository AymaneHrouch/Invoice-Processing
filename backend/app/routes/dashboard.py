from typing import Literal

from fastapi import APIRouter, Query

from app.services import dashboard
router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(currency: Literal["MAD", "USD", "EUR"] = Query("MAD")):
    invoice_growth = dashboard.get_invoice_growth()
    amount_growth = dashboard.get_amount_growth(currency)
    overdue_invoices = dashboard.get_overdue_invoices()
    pending_invoices = dashboard.get_pending_invoices()
    return {
        "invoice_growth": invoice_growth,
        "amount_growth": amount_growth,
        "overdue_invoices": overdue_invoices,
        "pending_invoices": pending_invoices,
    }

@router.get("/top_vendors")
def top_vendors(limit: int = Query(5, ge=1, le=10),
                currency: Literal["MAD", "USD", "EUR"] = Query("MAD")):
    return dashboard.get_top_vendors(limit, currency)

@router.get("/latest_invoices")
def latest_invoices(limit: int = Query(5, ge=1, le=10)):
    return dashboard.get_latest_invoices(limit)

@router.get("/top_categories")
def top_categories(limit: int = Query(5, ge=1, le=10),
                   currency: Literal["MAD", "USD", "EUR"] = Query("MAD")):
    return dashboard.get_top_categories(limit, currency)

@router.get("/monthly_chart")
def monthly_chart(currency: Literal["MAD", "USD", "EUR"] = Query("MAD")):
    return dashboard.get_monthly_chart_data(currency)