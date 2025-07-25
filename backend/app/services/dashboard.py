from datetime import datetime, timedelta
from typing import Literal

from app.database import get_invoices_collection
from app.models.invoice import Invoice

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
def get_top_vendors(limit=5, currency: Literal["MAD", "USD", "EUR"] = "MAD"):
    if currency not in EXCHANGE_RATES:
        raise ValueError(f"Unsupported currency: {currency}")

    invoices = invoice_collection.find({
        "total_amount": {"$ne": None},
        "currency": {"$in": list(EXCHANGE_RATES.keys())}
    })

    vendor_data = {}

    for invoice in invoices:
        vendor = invoice.get("vendor_name")
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
            "currency":currency
        }
        for vendor, data in sorted_vendors[:limit]
    ]

def get_top_categories(limit=5, currency: Literal["MAD", "USD", "EUR"] = "MAD", period: str = "1year"):
    if currency not in EXCHANGE_RATES:
        raise ValueError(f"Unsupported currency: {currency}")

    start_date, end_date = get_period_dates(period)

    invoices = invoice_collection.find({
        "total_amount": {"$ne": None},
        "currency": {"$in": list(EXCHANGE_RATES.keys())},
        "category": {"$exists": True},
        "invoice_date": {"$gte": start_date, "$lt": end_date}
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
    cursor = invoice_collection.find({}).sort("invoice_date", -1).limit(limit)
    invoices = [Invoice(**doc) for doc in cursor]
    return invoices

def get_overdue_invoices():
    today = datetime.today()

    return invoice_collection.count_documents({
        "invoice_due_date": {"$lt": today},
        "status": {"$ne": "paid"}
    })
def get_pending_invoices():
    return invoice_collection.count_documents({
        "status": "pending",
    })

def get_monthly_chart_data(currency: Literal["MAD", "USD", "EUR"] = "MAD", period: str = "1year"):
    """
    Get monthly data for chart showing both invoice count and expenses
    Returns data based on the specified period
    """
    from datetime import datetime, timedelta
    from calendar import month_abbr
    
    now = datetime.now()
    months_data = []
    
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
    
    # Get data for the specified number of months
    for i in range(num_months - 1, -1, -1):
        # Calculate the month and year
        target_date = now.replace(day=1) - timedelta(days=32 * i)
        month_start = target_date.replace(day=1)
        
        # Calculate next month for range
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)
        
        # Get invoice count for this month
        invoice_count = invoice_collection.count_documents({
            "invoice_date": {"$gte": month_start, "$lt": month_end}
        })
        
        # Get total expenses for this month
        invoices = invoice_collection.find({
            "invoice_date": {"$gte": month_start, "$lt": month_end},
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
            "month": month_abbr[month_start.month],
            "year": month_start.year,
            "invoices": invoice_count,
            "expenses": round(total_expenses, 2),
            "currency": currency
        })
    
    return months_data

def get_weekly_pattern(currency: Literal["MAD", "USD", "EUR"] = "MAD", period: str = "8weeks"):
    """
    Get weekly activity pattern showing average invoices and amounts per day of week
    """
    from datetime import datetime, timedelta
    
    if currency not in EXCHANGE_RATES:
        raise ValueError(f"Unsupported currency: {currency}")
    
    # Calculate date range based on period
    end_date = datetime.now()
    if period == "4weeks":
        start_date = end_date - timedelta(weeks=4)
    elif period == "8weeks":
        start_date = end_date - timedelta(weeks=8)
    elif period == "3months":
        start_date = end_date - timedelta(days=90)
    elif period == "6months":
        start_date = end_date - timedelta(days=180)
    else:
        start_date = end_date - timedelta(weeks=8)  # Default to 8 weeks
    
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
        "invoice_date": {"$gte": start_date, "$lt": end_date},
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