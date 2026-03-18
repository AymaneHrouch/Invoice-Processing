from datetime import datetime
import logging
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.services import dashboard
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(
    currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
    current_user: dict = Depends(get_current_user),
):
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
def pme_kpis(current_user: dict = Depends(get_current_user)):
    return dashboard.get_pme_kpis(company_id=current_user.get("company_id"))


@router.get("/top_vendors")
def top_vendors(
    limit: int = Query(5, ge=1, le=10),
    currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
    direction: str | None = Query(None, description="incoming or outgoing"),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_top_vendors(limit, currency, direction, company_id=current_user.get("company_id"))


@router.get("/latest_invoices")
def latest_invoices(
    limit: int = Query(5, ge=1, le=10),
    current_user: dict = Depends(get_current_user),
):
    try:
        return dashboard.get_latest_invoices(limit)
    except Exception as e:
        logger.exception("Error in latest_invoices endpoint: %s", e)
        return []


@router.get("/top_categories")
def top_categories(
    limit: int = Query(5, ge=1, le=10),
    currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
    period: Literal["3months", "6months", "1year", "2years", "all"] = Query("1year"),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_top_categories(limit, currency, period, start_date, end_date)


@router.get("/monthly_chart")
def monthly_chart(
    currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
    period: Literal["3months", "6months", "1year", "2years"] = Query("1year"),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_monthly_chart_data(currency, period, start_date, end_date)


@router.get("/weekly_pattern")
def weekly_pattern(
    currency: Literal["MAD", "USD", "EUR"] = Query("MAD"),
    period: Literal["4weeks", "8weeks", "3months", "6months"] = Query("8weeks"),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_weekly_pattern(currency, period, start_date, end_date)


@router.get("/a-encaisser")
def a_encaisser(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_a_encaisser(limit, company_id=current_user.get("company_id"))


@router.get("/a-payer")
def a_payer(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_a_payer(limit, company_id=current_user.get("company_id"))


@router.get("/recent-activity")
def recent_activity(
    limit: int = Query(15, ge=1, le=30),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_recent_activity(limit, company_id=current_user.get("company_id"))


@router.get("/tva-balance")
def tva_balance(
    year: int | None = Query(None),
    quarter: int | None = Query(None, ge=0, le=3),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_tva_balance(year=year, quarter=quarter, company_id=current_user.get("company_id"))


@router.get("/ca-evolution")
def ca_evolution(current_user: dict = Depends(get_current_user)):
    return dashboard.get_ca_evolution(company_id=current_user.get("company_id"))


@router.get("/delai-paiement")
def delai_paiement(current_user: dict = Depends(get_current_user)):
    return dashboard.get_delai_paiement(company_id=current_user.get("company_id"))


@router.get("/tresorerie-prevision")
def tresorerie_prevision(current_user: dict = Depends(get_current_user)):
    return dashboard.get_tresorerie_prevision(company_id=current_user.get("company_id"))


@router.get("/factures-retard")
def factures_retard(current_user: dict = Depends(get_current_user)):
    return dashboard.get_factures_retard(company_id=current_user.get("company_id"))


@router.get("/echeances-proches")
def echeances_proches(current_user: dict = Depends(get_current_user)):
    return dashboard.get_echeances_proches(company_id=current_user.get("company_id"))


@router.get("/category-breakdown")
def category_breakdown(
    direction: str | None = Query(None, description="incoming or outgoing"),
    current_user: dict = Depends(get_current_user),
):
    return dashboard.get_category_breakdown(
        company_id=current_user.get("company_id"),
        direction=direction,
    )
