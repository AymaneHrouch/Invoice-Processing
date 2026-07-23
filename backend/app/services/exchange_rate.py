from datetime import datetime, timezone
import os
from dotenv import load_dotenv
import requests

from app.database import get_exchange_rate_collection
load_dotenv()

BAM_API_URL = os.getenv("BAM_API_URL")
BAM_API_KEY = os.getenv("BAM_API_KEY")

# Days when Bank Al-Maghrib does not publish rates
HOLIDAYS = {(12, 25), (12, 26)}  # (month, day)


def _is_unavailable_day(date: datetime) -> bool:
    """Returns True if exchange rates are not published for this day."""
    if date.weekday() in (5, 6):  # Saturday=5, Sunday=6
        return True
    if (date.month, date.day) in HOLIDAYS:
        return True
    return False


def _fetch_from_api(date: datetime) -> dict[str, float]:
    """Call Bank Al-Maghrib API and return normalized rates {currency: MAD_per_unit}."""
    headers = {"Ocp-Apim-Subscription-Key": BAM_API_KEY}
    params = {"date": date.strftime("%Y-%m-%dT00:00:00.000Z")}
    response = requests.get(BAM_API_URL, headers=headers, params=params, timeout=10)
    response.raise_for_status()
    rates = {}
    for item in response.json():
        currency = item["libDevise"]
        rates[currency] = item["moyen"] / item["uniteDevise"]
    return rates


def get_exchange_rate(date: datetime) -> dict:
    """
    Return the full exchange rate document for a given date.

    Logic:
    1. Check DB for exact date → return if found
    2. Weekend/holiday → carry forward last available rate from DB
    3. Regular weekday missing → fetch from API, store in DB, return
    """
    collection = get_exchange_rate_collection()

    # Normalize to start of day for consistent querying
    date = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)

    # 1. Exact match in DB
    record = collection.find_one({"date": date})
    if record:
        return record

    # 2. Weekend or holiday → use last known rate
    if _is_unavailable_day(date):
        record = collection.find_one(
            {"date": {"$lt": date}},
            sort=[("date", -1)],
        )
        if record:
            return record

    # 3. Regular weekday not in DB → fetch from API, store, return
    rates = _fetch_from_api(date)
    if not rates:
        raise ValueError(f"Exchange rates for {date.date()} are not yet published.")
    doc = {
        "date": date,
        "rates": rates,
        "created_at": datetime.now(timezone.utc),
    }
    collection.insert_one(doc)
    return doc
