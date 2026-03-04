import re
import hashlib
import logging
from datetime import date, datetime
from decimal import Decimal

from app.database import get_cache_collection
from app.services.ocr.factory import get_invoice_parser

logger = logging.getLogger(__name__)

invoice_parser = get_invoice_parser("azure_document_intelligence")


def _to_mongo_serializable(obj):
    """Convert date/datetime/Decimal to MongoDB-serializable types."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _to_mongo_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_mongo_serializable(v) for v in obj]
    return obj


def get_tva(text):
    match = re.search(r"TVA.{0,50}?(\d+[,.]?\d*)\s*%", text, re.DOTALL)
    if match:
        tva_rate = float(match.group(1).replace(",", "."))
        return tva_rate
    return None


def get_ice(text: str) -> str | None:
    match = re.search(r"ICE\s*[:.]?\s*(\d{15})", text, re.DOTALL)
    return match.group(1) if match else None


def get_currency(extracted_currency, text: str) -> str | None:
    if extracted_currency == "EUR" and extracted_currency not in text:
        return "MAD"
    return extracted_currency


def clean_vendor_name(name: str) -> str:
    # Remove Arabic characters and diacritics
    name = re.sub(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+", "", name)
    # Remove newlines and extra whitespace
    name = re.sub(r"\s+", " ", name).strip()
    return name


def extract_invoice_data(file: bytes):
    file_hash = hashlib.md5(file).hexdigest()
    cache = get_cache_collection()

    cached = cache.find_one({"_id": file_hash})
    if cached:
        logger.info("Cache hit for file hash %s", file_hash)
        result = dict(cached)
        result.pop("_id", None)
        return result

    logger.info("Cache miss – calling Azure Document Intelligence")
    invoice_data = invoice_parser.extract_fields(file_path=None, file_bytes_source=file)
    logger.info("Extracted invoice data: vendor=%s, number=%s",
                invoice_data.get("vendor_name"), invoice_data.get("invoice_number"))

    items = []
    for item in invoice_data.get("items", []):
        raw_description = item.get("description") or ""
        lines = raw_description.split("\n")
        name = lines[0]
        description = "\n".join(lines[1:]).strip() if len(lines) > 1 else lines[0].strip()

        items.append({
            "name": name,
            "description": description,
            "quantity": item.get("quantity") or 1,
            "unit_price": (item.get("unit_price") or {}).get("value", 0),
            "total": (item.get("amount") or {}).get("value", 0),
        })
    amount = invoice_data.get("total_amount") or invoice_data.get("amount_due") or {"value": 0, "currency": "MAD"}
    tva = get_tva(invoice_data.get("extracted_text", ""))
    ice = get_ice(invoice_data.get("extracted_text", ""))
    currency = get_currency(amount["currency"], invoice_data.get("extracted_text", ""))
    vendor_name = clean_vendor_name(invoice_data.get("vendor_name", ""))

    result = {
        "extractedText": invoice_data.get("extracted_text", ""),
        "supplier": vendor_name,
        "date": invoice_data.get("invoice_date", ""),
        "due_date": invoice_data.get("due_date", ""),
        "amount": amount["value"],
        "currency": currency,
        "tva": tva,
        "ice": ice,
        "invoice_number": invoice_data.get("invoice_number", ""),
        "category": "",
        "items": items,
        "tags": [],
    }

    result = _to_mongo_serializable(result)
    cache.insert_one({"_id": file_hash, **result})
    return result
