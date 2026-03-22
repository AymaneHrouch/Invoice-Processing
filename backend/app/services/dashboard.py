from datetime import datetime, timedelta
import logging
from typing import Literal

from app.database import get_invoices_collection
from app.models.invoice import Invoice

logger = logging.getLogger(__name__)

invoice_collection = get_invoices_collection()



EXCHANGE_RATES = {
    "USD": 9.06,
    "EUR": 10.4876,
    "MAD": 1.0
}

def get_period_dates(period: str):
    """
    Calculate start and end dates based on period
    """
    now = datetime.now()

    if period == "3months":
        start_date = now - timedelta(days=90)
    elif period == "6months":
        start_date = now - timedelta(days=180)
    elif period == "1year":
        start_date = now - timedelta(days=365)
    elif period == "2years":
        start_date = now - timedelta(days=730)
    elif period == "4weeks":
        start_date = now - timedelta(weeks=4)
    elif period == "8weeks":
        start_date = now - timedelta(weeks=8)
    elif period == "all":
        # Get the earliest invoice date
        earliest_invoice = invoice_collection.find_one(
            {"invoice_date": {"$exists": True}},
            sort=[("invoice_date", 1)]
        )
        start_date = earliest_invoice["invoice_date"] if earliest_invoice else now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=365)  # Default to 1 year

    return start_date, now

def get_invoice_growth():
    now = datetime.now()
    this_month = datetime(now.year, now.month, 1)
    last_month = datetime(now.year if now.month > 1 else now.year - 1, now.month - 1 or 12, 1)

    last_count = invoice_collection.count_documents({
        "invoice_date": {"$gte": last_month, "$lt": this_month}
    })
    next_month = datetime(now.year + (now.month == 12), (now.month % 12) + 1, 1)
    this_count = invoice_collection.count_documents({
        "invoice_date": {"$gte": this_month, "$lt": next_month}
    })

    growth = ((this_count - last_count) / last_count * 100) if last_count else (100.0 if this_count else 0.0)

    return {"last_month": last_count, "this_month": this_count, "growth_rate_percent": round(growth, 2)}

def get_amount_growth(currency: Literal["MAD", "USD", "EUR"] = "MAD"):
    now = datetime.now()
    this_month = datetime(now.year, now.month, 1)
    last_month = datetime(now.year if now.month > 1 else now.year - 1, now.month - 1 or 12, 1)
    next_month = datetime(now.year + (now.month == 12), (now.month % 12) + 1, 1)

    def get_total_in(currency, start_date, end_date):
        invoices = invoice_collection.find({
            "invoice_date": {"$gte": start_date, "$lt": end_date},
            "total_amount": {"$ne": None},
            "currency": {"$in": list(EXCHANGE_RATES.keys())}
        })

        total = 0
        for invoice in invoices:
            amount = float(invoice["total_amount"])
            invoice_currency = invoice["currency"]
            input_rate = EXCHANGE_RATES[invoice_currency]
            output_rate = EXCHANGE_RATES[currency]
            converted_amount = amount * input_rate / output_rate
            total += converted_amount

        return total

    last_total = get_total_in(currency, last_month, this_month)
    this_total = get_total_in(currency, this_month, next_month)

    growth = ((this_total - last_total) / last_total * 100) if last_total else (100.0 if this_total else 0.0)

    return {
        "last_month_amount": round(last_total, 2),
        "this_month_amount": round(this_total, 2),
        "growth_rate_percent": round(growth, 2),
        "currency": currency
    }
def get_top_vendors(limit=5, currency: Literal["MAD", "USD", "EUR"] = "MAD", direction: str | None = None, company_id: str | None = None):
    if currency not in EXCHANGE_RATES:
        raise ValueError(f"Unsupported currency: {currency}")

    query: dict = {
        "total_amount": {"$ne": None},
        "currency": {"$in": list(EXCHANGE_RATES.keys())}
    }
    if direction:
        query["direction"] = direction
    if company_id:
        query["company_id"] = company_id

    invoices = invoice_collection.find(query)

    vendor_data = {}

    for invoice in invoices:
        # For outgoing invoices (clients), prefer client_name; otherwise use vendor_name
        if direction == "outgoing":
            vendor = invoice.get("client_name") or invoice.get("vendor_name")
        else:
            vendor = invoice.get("vendor_name")
        if not vendor:
            continue
        amount = invoice.get("total_amount")
        invoice_currency = invoice.get("currency")

        amount = float(amount)

        invoice_rate = EXCHANGE_RATES.get(invoice_currency)
        output_rate = EXCHANGE_RATES.get(currency)

        amount_in_output_currency = amount * invoice_rate / output_rate

        if vendor not in vendor_data:
            vendor_data[vendor] = {"total_amount": 0, "total_invoices": 0}

        vendor_data[vendor]["total_amount"] += amount_in_output_currency
        vendor_data[vendor]["total_invoices"] += 1

    sorted_vendors = sorted(
        vendor_data.items(),
        key=lambda x: x[1]["total_amount"],
        reverse=True
    )

    return [
        {
            "vendor": vendor,
            "total_amount": round(data["total_amount"], 2),
            "total_invoices": data["total_invoices"],
            "currency": currency
        }
        for vendor, data in sorted_vendors[:limit]
    ]

def get_top_categories(limit=5, currency: Literal["MAD", "USD", "EUR"] = "MAD", period: str = "1year", start_date: datetime = None, end_date: datetime = None):
    if currency not in EXCHANGE_RATES:
        raise ValueError(f"Unsupported currency: {currency}")

    # Use provided dates or calculate from period
    if start_date and end_date:
        query_start_date, query_end_date = start_date, end_date
    else:
        query_start_date, query_end_date = get_period_dates(period)

    invoices = invoice_collection.find({
        "total_amount": {"$ne": None},
        "currency": {"$in": list(EXCHANGE_RATES.keys())},
        "category": {"$exists": True},
        "invoice_date": {"$gte": query_start_date, "$lt": query_end_date}
    })

    categories_data = {}

    for invoice in invoices:
        category = invoice.get("category")
        amount = invoice.get("total_amount")
        invoice_currency = invoice.get("currency")

        if category is None or amount is None:
            continue

        amount = float(amount)
        invoice_rate = EXCHANGE_RATES.get(invoice_currency)
        output_rate = EXCHANGE_RATES.get(currency)
        amount_in_output_currency = amount * invoice_rate / output_rate

        if category not in categories_data:
            categories_data[category] = {"total_amount": 0, "total_invoices": 0}

        categories_data[category]["total_amount"] += amount_in_output_currency
        categories_data[category]["total_invoices"] += 1

    total_sum = sum(data["total_amount"] for data in categories_data.values())

    sorted_categories = sorted(
        categories_data.items(),
        key=lambda x: x[1]["total_amount"],
        reverse=True
    )

    return [
        {
            "category": category,
            "total_amount": round(data["total_amount"], 2),
            "percentage": round((data["total_amount"] / total_sum) * 100, 2) if total_sum else 0.0,
            "total_invoices": data["total_invoices"],
            "currency": currency
        }
        for category, data in sorted_categories[:limit]
    ]





def get_latest_invoices(limit: int = 5):
    try:
        cursor = invoice_collection.find({}).sort("invoice_date", -1).limit(limit)
        invoices = []
        for doc in cursor:
            try:
                # Convert ObjectId to string for Pydantic compatibility
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                invoice = Invoice(**doc)
                invoices.append(invoice)
            except Exception as e:
                logger.warning("Error converting document to Invoice: %s", e)
                continue
        return invoices
    except Exception as e:
        logger.exception("Error in get_latest_invoices: %s", e)
        return []

def get_overdue_invoices():
    today = datetime.today()

    return invoice_collection.count_documents({
        "invoice_due_date": {"$lt": today},
        "status": {"$ne": "validated"}
    })
def get_extracted_invoices():
    return invoice_collection.count_documents({
        "status": "extracted",
    })


def get_work_queue_stats():
    """
    Work queue stats for accounting firms (FEAT-03).
    All counts exclude archived invoices.
    """
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)
    next_month = datetime(now.year + (now.month == 12), (now.month % 12) + 1, 1)

    base_filter = {"is_archived": {"$ne": True}}

    all_invoices = invoice_collection.count_documents(base_filter)

    to_validate = invoice_collection.count_documents({
        **base_filter,
        "status": "extracted",
    })

    ready_to_export = invoice_collection.count_documents({
        **base_filter,
        "status": "validated",
        "is_exported": False,
    })

    # Count invoices exported this month (exported_at or updated_at for legacy)
    exported_this_month = invoice_collection.count_documents({
        **base_filter,
        "is_exported": True,
        "$or": [
            {"exported_at": {"$gte": month_start, "$lt": next_month}},
            {"exported_at": {"$in": [None]}, "updated_at": {"$gte": month_start, "$lt": next_month}},
            {"exported_at": {"$exists": False}, "updated_at": {"$gte": month_start, "$lt": next_month}},
        ],
    })

    failed = invoice_collection.count_documents({
        **base_filter,
        "status": "failed",
    })

    # Recent activity: last 10 invoices by updated_at, excluding archived
    recent_cursor = invoice_collection.find(base_filter).sort("updated_at", -1).limit(10)
    recent_activity = []
    for doc in recent_cursor:
        status = doc.get("status", "extracted")
        is_exported = doc.get("is_exported", False)
        label = (
            "Extraction failed" if status == "failed"
            else "Exported" if is_exported
            else "Validated" if status == "validated"
            else "Extracted"
        )
        recent_activity.append({
            "id": str(doc["_id"]),
            "invoice_number": doc.get("invoice_number", "—"),
            "vendor_name": doc.get("vendor_name", "—"),
            "status": status,
            "is_exported": is_exported,
            "label": label,
            "updated_at": doc.get("updated_at", doc.get("created_at")),
        })

    return {
        "all_invoices": all_invoices,
        "to_validate": to_validate,
        "ready_to_export": ready_to_export,
        "exported_this_month": exported_this_month,
        "failed": failed,
        "recent_activity": recent_activity,
    }

def get_monthly_chart_data(currency: Literal["MAD", "USD", "EUR"] = "MAD", period: str = "1year", start_date: datetime = None, end_date: datetime = None):
    """
    Get monthly data for chart showing both invoice count and expenses
    Returns data based on the specified period or date range
    """
    from calendar import month_abbr
    from datetime import datetime, timedelta

    # Use provided dates or calculate from period
    if start_date and end_date:
        # Use the provided date range
        query_start_date = start_date
        query_end_date = end_date

        # Calculate number of months between start and end dates
        months_diff = (query_end_date.year - query_start_date.year) * 12 + (query_end_date.month - query_start_date.month)
        num_months = max(1, months_diff + 1)
    else:
        # Use period-based calculation
        now = datetime.now()
        query_end_date = now

        # Determine number of months based on period
        if period == "3months":
            num_months = 3
        elif period == "6months":
            num_months = 6
        elif period == "1year":
            num_months = 12
        elif period == "2years":
            num_months = 24
        else:
            num_months = 12  # Default to 1 year

        # Calculate start date from period
        query_start_date = now - timedelta(days=30 * num_months)

    months_data = []

    # Get data for the specified number of months within the date range
    current_date = query_start_date.replace(day=1)  # Start from beginning of first month

    while current_date < query_end_date:
        # Calculate next month for range
        if current_date.month == 12:
            month_end = current_date.replace(year=current_date.year + 1, month=1)
        else:
            month_end = current_date.replace(month=current_date.month + 1)

        # Don't go beyond the end date
        actual_end = min(month_end, query_end_date)

        # Get invoice count for this month
        invoice_count = invoice_collection.count_documents({
            "invoice_date": {"$gte": current_date, "$lt": actual_end}
        })

        # Get total expenses for this month
        invoices = invoice_collection.find({
            "invoice_date": {"$gte": current_date, "$lt": actual_end},
            "total_amount": {"$ne": None},
            "currency": {"$in": list(EXCHANGE_RATES.keys())}
        })

        total_expenses = 0
        for invoice in invoices:
            amount = float(invoice["total_amount"])
            invoice_currency = invoice["currency"]

            # Convert to target currency
            if invoice_currency != currency:
                # Convert to MAD first, then to target currency
                amount_in_mad = amount / EXCHANGE_RATES[invoice_currency]
                amount = amount_in_mad * EXCHANGE_RATES[currency]

            total_expenses += amount

        months_data.append({
            "month": month_abbr[current_date.month],
            "month_year": f"{current_date.year}-{current_date.month:02d}",  # YYYY-MM format for frontend formatting
            "display_month": f"{month_abbr[current_date.month]} {current_date.year}",  # Human readable format
            "year": current_date.year,
            "invoices": invoice_count,
            "expenses": round(total_expenses, 2),
            "currency": currency
        })

        # Move to next month
        current_date = month_end

    return months_data

def get_a_encaisser(limit: int = 10, company_id: str | None = None):
    """Unpaid outgoing invoices (Ventes) — what clients owe us."""
    today = datetime.now()
    query: dict = {
        "direction": "outgoing",
        "status": {"$nin": ["draft", "paid"]},
        "is_archived": {"$ne": True},
    }
    if company_id:
        query["company_id"] = company_id
    cursor = invoice_collection.find(query).sort("invoice_due_date", 1).limit(limit)

    items = []
    total_amount = 0.0
    overdue_count = 0

    for doc in cursor:
        due_date = doc.get("invoice_due_date")
        days_overdue = None
        if due_date:
            delta = (today - due_date).days
            if delta > 0:
                days_overdue = delta
                overdue_count += 1
        amount = float(doc.get("total_amount") or 0)
        total_amount += amount
        items.append({
            "id": str(doc["_id"]),
            "invoice_number": doc.get("invoice_number", "—"),
            "client_name": doc.get("client_name", "—"),
            "total_amount": amount,
            "currency": doc.get("currency", "MAD"),
            "due_date": due_date,
            "days_overdue": days_overdue,
            "status": doc.get("status"),
        })

    return {
        "items": items,
        "total_amount": round(total_amount, 2),
        "count": len(items),
        "overdue_count": overdue_count,
    }


def get_a_payer(limit: int = 10, company_id: str | None = None):
    """Unpaid incoming invoices (Achats) — what we owe suppliers."""
    today = datetime.now()
    query: dict = {
        "direction": "incoming",
        "status": {"$in": ["validated", "sent", "extracted"]},
        "is_archived": {"$ne": True},
    }
    if company_id:
        query["company_id"] = company_id
    cursor = invoice_collection.find(query).sort("invoice_due_date", 1).limit(limit)

    items = []
    total_amount = 0.0
    overdue_count = 0

    for doc in cursor:
        due_date = doc.get("invoice_due_date")
        days_overdue = None
        if due_date:
            delta = (today - due_date).days
            if delta > 0:
                days_overdue = delta
                overdue_count += 1
        amount = float(doc.get("total_amount") or 0)
        total_amount += amount
        items.append({
            "id": str(doc["_id"]),
            "invoice_number": doc.get("invoice_number", "—"),
            "vendor_name": doc.get("vendor_name", "—"),
            "total_amount": amount,
            "currency": doc.get("currency", "MAD"),
            "due_date": due_date,
            "days_overdue": days_overdue,
        })

    return {
        "items": items,
        "total_amount": round(total_amount, 2),
        "count": len(items),
        "overdue_count": overdue_count,
    }


def get_pme_kpis(company_id: str | None = None):
    """PME KPIs: CA Ventes ce mois, Dépenses Achats ce mois, Ventes brouillons, Achats à valider."""
    now = datetime.now()
    this_month = datetime(now.year, now.month, 1)
    next_month = datetime(now.year + (now.month == 12), (now.month % 12) + 1, 1)
    base_filter: dict = {"is_archived": {"$ne": True}}
    if company_id:
        base_filter["company_id"] = company_id

    pipeline_ventes = [
        {"$match": {
            **base_filter,
            "direction": "outgoing",
            "status": {"$nin": ["draft"]},
            "invoice_date": {"$gte": this_month, "$lt": next_month},
            "total_amount": {"$ne": None},
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    result = list(invoice_collection.aggregate(pipeline_ventes))
    ca_ventes = round(float(result[0]["total"]) if result else 0.0, 2)

    pipeline_achats = [
        {"$match": {
            **base_filter,
            "direction": "incoming",
            "invoice_date": {"$gte": this_month, "$lt": next_month},
            "total_amount": {"$ne": None},
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    result = list(invoice_collection.aggregate(pipeline_achats))
    depenses_achats = round(float(result[0]["total"]) if result else 0.0, 2)

    ventes_brouillons = invoice_collection.count_documents({
        **base_filter,
        "direction": "outgoing",
        "status": "draft",
    })

    achats_a_valider = invoice_collection.count_documents({
        **base_filter,
        "direction": "incoming",
        "status": "extracted",
    })

    non_exportees = invoice_collection.count_documents({
        **base_filter,
        "status": {"$in": ["validated", "sent", "paid"]},
        "is_exported": {"$ne": True},
    })

    return {
        "ca_ventes_ce_mois": ca_ventes,
        "depenses_achats_ce_mois": depenses_achats,
        "ventes_brouillons": ventes_brouillons,
        "achats_a_valider": achats_a_valider,
        "non_exportees": non_exportees,
    }


def get_tva_balance(year: int | None = None, quarter: int | None = None, company_id: str | None = None):
    """TVA collectée (Ventes) vs TVA déductible (Achats).

    - year + quarter (0-based): single quarter
    - year only: full year
    - no params: current quarter
    """
    today = datetime.now()
    if year is None:
        year = today.year
        if quarter is None:
            quarter = (today.month - 1) // 3

    if quarter is not None:
        quarter_start = datetime(year, quarter * 3 + 1, 1)
        # End of this quarter = start of next quarter
        next_quarter_month = (quarter * 3 + 4) % 12 or 12
        next_quarter_year = year + (1 if quarter == 3 else 0)
        quarter_end = datetime(next_quarter_year, next_quarter_month, 1)
        period_label = f"T{quarter + 1} {year}"
    else:
        quarter_start = datetime(year, 1, 1)
        quarter_end = datetime(year + 1, 1, 1)
        period_label = f"Année {year}"

    def sum_tva(direction, statuses):
        match: dict = {
            "direction": direction,
            "status": {"$in": statuses},
            "invoice_date": {"$gte": quarter_start, "$lt": quarter_end},
            "amount_tva": {"$ne": None},
        }
        if company_id:
            match["company_id"] = company_id
        pipeline = [
            {"$match": match},
            {"$group": {"_id": None, "total": {"$sum": "$amount_tva"}}},
        ]
        result = list(invoice_collection.aggregate(pipeline))
        return round(float(result[0]["total"]) if result else 0.0, 2)

    collectee = sum_tva("outgoing", ["validated", "sent", "paid"])
    deductible = sum_tva("incoming", ["validated", "paid"])
    net = round(collectee - deductible, 2)

    return {
        "collectee": collectee,
        "deductible": deductible,
        "net": net,
        "quarter_label": period_label,
    }


def get_weekly_pattern(currency: Literal["MAD", "USD", "EUR"] = "MAD", period: str = "8weeks", start_date: datetime = None, end_date: datetime = None):
    """
    Get weekly activity pattern showing average invoices and amounts per day of week
    """
    from datetime import datetime, timedelta

    if currency not in EXCHANGE_RATES:
        raise ValueError(f"Unsupported currency: {currency}")

    # Use provided dates or calculate from period
    if start_date and end_date:
        query_start_date, query_end_date = start_date, end_date
    else:
        # Calculate date range based on period
        query_end_date = datetime.now()
        if period == "4weeks":
            query_start_date = query_end_date - timedelta(weeks=4)
        elif period == "8weeks":
            query_start_date = query_end_date - timedelta(weeks=8)
        elif period == "3months":
            query_start_date = query_end_date - timedelta(days=90)
        elif period == "6months":
            query_start_date = query_end_date - timedelta(days=180)
        else:
            query_start_date = query_end_date - timedelta(weeks=8)  # Default to 8 weeks

    # Initialize day counters
    day_data = {
        0: {"day": "Mon", "total_invoices": 0, "total_amount": 0, "weeks_count": 0},
        1: {"day": "Tue", "total_invoices": 0, "total_amount": 0, "weeks_count": 0},
        2: {"day": "Wed", "total_invoices": 0, "total_amount": 0, "weeks_count": 0},
        3: {"day": "Thu", "total_invoices": 0, "total_amount": 0, "weeks_count": 0},
        4: {"day": "Fri", "total_invoices": 0, "total_amount": 0, "weeks_count": 0},
        5: {"day": "Sat", "total_invoices": 0, "total_amount": 0, "weeks_count": 0},
        6: {"day": "Sun", "total_invoices": 0, "total_amount": 0, "weeks_count": 0},
    }

    # Find all invoices in the date range
    invoices = invoice_collection.find({
        "invoice_date": {"$gte": query_start_date, "$lt": query_end_date},
        "total_amount": {"$ne": None},
        "currency": {"$in": list(EXCHANGE_RATES.keys())}
    })

    # Track which weeks we have data for each day
    weeks_seen = set()

    for invoice in invoices:
        invoice_date = invoice["invoice_date"]
        day_of_week = invoice_date.weekday()  # 0 = Monday, 6 = Sunday
        week_key = invoice_date.strftime("%Y-W%U")  # Year-Week identifier
        weeks_seen.add(week_key)

        # Convert amount to target currency
        amount = float(invoice["total_amount"])
        invoice_currency = invoice["currency"]
        invoice_rate = EXCHANGE_RATES[invoice_currency]
        output_rate = EXCHANGE_RATES[currency]
        amount_in_output_currency = amount * invoice_rate / output_rate

        day_data[day_of_week]["total_invoices"] += 1
        day_data[day_of_week]["total_amount"] += amount_in_output_currency

    # Calculate weeks count (use actual weeks that had data)
    weeks_count = max(len(weeks_seen), 1)  # Avoid division by zero

    # For longer periods, adjust the divisor to show realistic averages
    if period == "3months":
        period_weeks = 12  # ~3 months
    elif period == "6months":
        period_weeks = 24  # ~6 months
    else:
        # For 4weeks and 8weeks, use actual weeks count
        period_weeks = weeks_count

    # Use the actual weeks count or period weeks, whichever is smaller
    divisor = min(weeks_count, period_weeks) if weeks_count > 0 else 1

    # Calculate averages and prepare response
    result = []
    for day_info in day_data.values():
        avg_invoices = round(day_info["total_invoices"] / divisor)
        avg_amount = round(day_info["total_amount"] / divisor, 2)

        result.append({
            "day": day_info["day"],
            "invoices": avg_invoices,
            "amount": avg_amount,
            "currency": currency
        })

    return result


def get_ca_evolution(company_id: str | None = None):
    """Monthly CA (Ventes) vs Achats totals for the past 12 months."""
    now = datetime.now()
    MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    result = []
    for i in range(11, -1, -1):
        month = now.month - i
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        month_start = datetime(year, month, 1)
        month_end = datetime(year + (month == 12), month % 12 + 1, 1)

        def month_total(direction, extra=None):
            match: dict = {
                "direction": direction,
                "invoice_date": {"$gte": month_start, "$lt": month_end},
                "total_amount": {"$ne": None},
                "is_archived": {"$ne": True},
            }
            if extra:
                match.update(extra)
            if company_id:
                match["company_id"] = company_id
            res = list(invoice_collection.aggregate([
                {"$match": match},
                {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
            ]))
            return round(float(res[0]["total"]) if res else 0.0, 2)

        result.append({
            "month": f"{MONTHS_FR[month - 1]} {year}",
            "ventes": month_total("outgoing", {"status": {"$nin": ["draft"]}}),
            "achats": month_total("incoming"),
        })
    return result


def get_delai_paiement(company_id: str | None = None):
    """Average payment delay in days: encaissement (ventes) and règlement (achats)."""
    base: dict = {"status": "paid", "paid_at": {"$ne": None}, "invoice_date": {"$ne": None}}
    if company_id:
        base["company_id"] = company_id

    def avg_days(direction):
        docs = list(invoice_collection.find(
            {**base, "direction": direction},
            {"invoice_date": 1, "paid_at": 1},
        ))
        days_list = [
            (doc["paid_at"] - doc["invoice_date"]).days
            for doc in docs
            if doc.get("paid_at") and doc.get("invoice_date")
            and (doc["paid_at"] - doc["invoice_date"]).days >= 0
        ]
        return round(sum(days_list) / len(days_list)) if days_list else None

    return {
        "delai_encaissement": avg_days("outgoing"),
        "delai_reglement": avg_days("incoming"),
    }


def get_tresorerie_prevision(company_id: str | None = None):
    """Projected inflows and outflows for the next 30, 60, 90 days."""
    now = datetime.now()

    def window_total(direction, days):
        match: dict = {
            "direction": direction,
            "invoice_due_date": {"$gte": now, "$lte": now + timedelta(days=days)},
            "status": {"$nin": ["draft", "paid"]},
            "is_archived": {"$ne": True},
            "total_amount": {"$ne": None},
        }
        if company_id:
            match["company_id"] = company_id
        res = list(invoice_collection.aggregate([
            {"$match": match},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}},
        ]))
        return {
            "total": round(float(res[0]["total"]) if res else 0.0, 2),
            "count": int(res[0]["count"]) if res else 0,
        }

    return {
        "30j": {"encaissements": window_total("outgoing", 30), "decaissements": window_total("incoming", 30)},
        "60j": {"encaissements": window_total("outgoing", 60), "decaissements": window_total("incoming", 60)},
        "90j": {"encaissements": window_total("outgoing", 90), "decaissements": window_total("incoming", 90)},
    }


def get_factures_retard(company_id: str | None = None):
    """Overdue invoices grouped by delay bucket: 1-30d, 31-60d, 60+d."""
    now = datetime.now()
    match: dict = {
        "is_archived": {"$ne": True},
        "invoice_due_date": {"$lt": now},
        "status": {"$nin": ["draft", "paid"]},
    }
    if company_id:
        match["company_id"] = company_id
    docs = list(invoice_collection.find(match, {"invoice_due_date": 1, "total_amount": 1}))

    buckets = {
        "1_30":  {"label": "1 – 30 jours",  "count": 0, "total": 0.0},
        "31_60": {"label": "31 – 60 jours", "count": 0, "total": 0.0},
        "60p":   {"label": "60+ jours",     "count": 0, "total": 0.0},
    }
    for doc in docs:
        days = (now - doc["invoice_due_date"]).days
        amount = float(doc.get("total_amount") or 0)
        key = "1_30" if days <= 30 else "31_60" if days <= 60 else "60p"
        buckets[key]["count"] += 1
        buckets[key]["total"] += amount

    for b in buckets.values():
        b["total"] = round(b["total"], 2)

    return {
        "buckets": list(buckets.values()),
        "total_count": len(docs),
        "total_amount": round(sum(float(d.get("total_amount") or 0) for d in docs), 2),
    }


def get_echeances_proches(company_id: str | None = None):
    """Invoices due within 7 and 15 days (not yet overdue, not paid)."""
    now = datetime.now()

    def due_in(days):
        match: dict = {
            "is_archived": {"$ne": True},
            "invoice_due_date": {"$gte": now, "$lte": now + timedelta(days=days)},
            "status": {"$nin": ["draft", "paid"]},
            "total_amount": {"$ne": None},
        }
        if company_id:
            match["company_id"] = company_id
        res = list(invoice_collection.aggregate([
            {"$match": match},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}},
        ]))
        return {
            "total": round(float(res[0]["total"]) if res else 0.0, 2),
            "count": int(res[0]["count"]) if res else 0,
        }

    return {"7j": due_in(7), "15j": due_in(15)}


def get_category_breakdown(company_id: str | None = None, direction: str | None = None):
    """Amount by category for the current year, sorted by total descending."""
    now = datetime.now()
    match: dict = {
        "invoice_date": {"$gte": datetime(now.year, 1, 1)},
        "total_amount": {"$ne": None},
        "is_archived": {"$ne": True},
        "status": {"$nin": ["draft"]},
    }
    if direction:
        match["direction"] = direction
    if company_id:
        match["company_id"] = company_id

    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$category", "total": {"$sum": "$total_amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    results = list(invoice_collection.aggregate(pipeline))
    grand_total = sum(r["total"] for r in results)
    return [
        {
            "category": r["_id"] or "Non catégorisé",
            "total": round(float(r["total"]), 2),
            "count": r["count"],
            "percentage": round(float(r["total"]) / grand_total * 100, 1) if grand_total else 0.0,
        }
        for r in results
    ]


_OBJECTID_RE = __import__("re").compile(r"^[a-f0-9]{24}$")


def get_recent_activity(limit: int = 15, company_id: str | None = None) -> list:
    """
    Return the most recent audit-trail events across all invoices by
    unwinding each invoice's history array and sorting newest-first.
    ObjectId user values (from entries recorded before username was added
    to the JWT) are resolved to emails via a batch users lookup.
    """
    match: dict = {"is_archived": {"$ne": True}, "history": {"$exists": True, "$ne": []}}
    if company_id:
        match["company_id"] = company_id
    pipeline = [
        {"$match": match},
        {"$project": {
            "invoice_number": 1,
            "vendor_name": 1,
            "client_name": 1,
            "direction": 1,
            "history": 1,
        }},
        {"$unwind": "$history"},
        {"$sort": {"history.timestamp": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "invoice_id": {"$toString": "$_id"},
            "invoice_number": 1,
            "vendor_name": 1,
            "client_name": 1,
            "direction": 1,
            "action": "$history.action",
            "status_from": "$history.status_from",
            "status_to": "$history.status_to",
            "user": "$history.user",
            "timestamp": "$history.timestamp",
        }},
    ]
    try:
        results = list(invoice_collection.aggregate(pipeline))

        # Resolve any legacy ObjectId user values to email/full_name
        raw_ids = {r["user"] for r in results if _OBJECTID_RE.match(r.get("user") or "")}
        if raw_ids:
            from bson import ObjectId

            from app.database import get_database
            users_col = get_database()["users"]
            user_map = {
                str(u["_id"]): u.get("email") or u.get("full_name") or str(u["_id"])
                for u in users_col.find({"_id": {"$in": [ObjectId(uid) for uid in raw_ids]}})
            }
            for r in results:
                if r.get("user") in user_map:
                    r["user"] = user_map[r["user"]]

        return results
    except Exception as e:
        logger.exception("get_recent_activity failed: %s", e)
        return []
