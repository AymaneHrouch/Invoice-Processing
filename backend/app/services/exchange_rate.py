from datetime import datetime, timezone, timedelta
import logging
import os
from dotenv import load_dotenv
import requests
from requests.exceptions import ConnectionError, Timeout

from app.database import get_exchange_rate_collection
load_dotenv()

logger = logging.getLogger(__name__)

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


def _get_preceding_friday(date: datetime) -> datetime:
    """Return the most recent Friday on or before the given date."""
    # weekday(): Monday=0, ..., Friday=4, Saturday=5, Sunday=6
    days_since_friday = (date.weekday() - 4) % 7
    return date - timedelta(days=days_since_friday)


def _fetch_from_api(date: datetime) -> dict[str, float]:
    """Call Bank Al-Maghrib API and return normalized rates {currency: MAD_per_unit}."""
    headers = {"Ocp-Apim-Subscription-Key": BAM_API_KEY}
    params = {"date": date.strftime("%Y-%m-%dT00:00:00.000Z")}
    response = requests.get(BAM_API_URL, headers=headers, params=params, timeout=4)
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
    2. Weekend/holiday → fetch the Friday of that week from API (or DB), store it, return
    3. Regular weekday missing → fetch from API, store in DB, return
    4. If API is unreachable → return the most recent rate in DB as a fallback
    """
    collection = get_exchange_rate_collection()

    # Normalize to start of day for consistent querying
    date = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)

    # 1. Exact match in DB
    record = collection.find_one({"date": date})
    if record:
        return record

    # 2. Weekend or holiday → use the Friday of that week
    if _is_unavailable_day(date):
        friday = _get_preceding_friday(date)

        # Check if Friday's rate is already in DB
        friday_record = collection.find_one({"date": friday})
        if friday_record:
            return friday_record

        # Not in DB either — fetch Friday's rate from API
        fetch_date = friday
    else:
        # 3. Regular weekday — fetch this exact date from API
        fetch_date = date

    try:
        rates = _fetch_from_api(fetch_date)
        if not rates:
            raise ValueError(f"Exchange rates for {fetch_date.date()} are not yet published.")

        doc = {
            "date": fetch_date,
            "rates": rates,
            "created_at": datetime.now(timezone.utc),
        }
        collection.insert_one(doc)
        return doc

    except (ConnectionError, Timeout) as e:
        # API is unreachable — graceful fallback to most recent rate in DB
        logger.warning(f"BAM API unreachable ({e}). Falling back to most recent cached rate.")
        fallback = collection.find_one(sort=[("date", -1)])
        if fallback:
            fallback["is_fallback"] = True  # Signal to the frontend that this is a fallback
            return fallback
        raise ValueError("Exchange rate service is unavailable and no cached rates exist.")

    except Exception as e:
        logger.error(f"Unexpected error fetching exchange rate: {e}")
        raise
