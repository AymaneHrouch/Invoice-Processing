from datetime import datetime
import logging
from typing import Literal

from fastapi import APIRouter, Query

from app.services import dashboard

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(currency: Literal["MAD", "USD", "EUR"] = Query("MAD")):
    invoice_growth = dashboard.get_invoice_growth()
    amount_growth = dashboard.get_amount_growth(currency)
    overdue_invoices = dashboard.get_overdue_invoices()
    extracted_invoices = dashboard.get_extracted_invoices()
    return {
        "invoice_growth": invoice_growth,
        "amount_growth": amount_growth,
        "overdue_invoices": overdue_invoices,
        "extracted_invoices": extracted_invoices,
    }

@router.get("/pme-kpis")
def pme_kpis():
    return dashboard.get_pme_kpis()


@router.get("/top_vendors")
def top_vendors(limit: int = Query(5, ge=1, le=10),
                currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
                direction: str | None = Query(None, description="incoming or outgoing")):
    return dashboard.get_top_vendors(limit, currency, direction)

@router.get("/latest_invoices")
def latest_invoices(limit: int = Query(5, ge=1, le=10)):
    try:
        return dashboard.get_latest_invoices(limit)
    except Exception as e:
        logger.exception("Error in latest_invoices endpoint: %s", e)
        return []

@router.get("/top_categories")
def top_categories(limit: int = Query(5, ge=1, le=10),
                   currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
                   period: Literal["3months", "6months", "1year", "2years", "all"] = Query("1year"),
                   start_date: datetime | None = Query(None, description="Start date (YYYY-MM-DD format)"),
                   end_date: datetime | None = Query(None, description="End date (YYYY-MM-DD format)")):
    return dashboard.get_top_categories(limit, currency, period, start_date, end_date)

@router.get("/monthly_chart")
def monthly_chart(currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
                  period: Literal["3months", "6months", "1year", "2years"] = Query("1year"),
                  start_date: datetime | None = Query(None, description="Start date (YYYY-MM-DD format)"),
                  end_date: datetime | None = Query(None, description="End date (YYYY-MM-DD format)")):
    return dashboard.get_monthly_chart_data(currency, period, start_date, end_date)

@router.get("/weekly_pattern")
def weekly_pattern(currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
                   period: Literal["4weeks", "8weeks", "3months", "6months"] = Query("8weeks"),
                   start_date: datetime | None = Query(None, description="Start date (YYYY-MM-DD format)"),
                   end_date: datetime | None = Query(None, description="End date (YYYY-MM-DD format)")):
    return dashboard.get_weekly_pattern(currency, period, start_date, end_date)


@router.get("/a-encaisser")
def a_encaisser(limit: int = Query(10, ge=1, le=50)):
    return dashboard.get_a_encaisser(limit)


@router.get("/a-payer")
def a_payer(limit: int = Query(10, ge=1, le=50)):
    return dashboard.get_a_payer(limit)


@router.get("/tva-balance")
def tva_balance(
    year: int | None = Query(None, description="Year (default: current year)"),
    quarter: int | None = Query(None, ge=0, le=3, description="Quarter 0-3 (0=Q1); omit for full year"),
):
    return dashboard.get_tva_balance(year=year, quarter=quarter)
