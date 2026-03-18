from datetime import date, datetime
from decimal import Decimal
import hashlib
import logging
import re

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
    if extracted_currency not in text:
        return "MAD"
    return extracted_currency


def clean_vendor_name(name: str) -> str:
    # Remove Arabic characters and diacritics
    name = re.sub(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+", "", name)
    # Remove newlines and extra whitespace
    name = re.sub(r"\s+", " ", name).strip()
    return name


def get_amount_tva(text: str) -> float | None:
    patterns = [
        # Handles "Montant TVA DH ( 20% )\n83.33"
        # Handles "Montant TVA ( Taux de 20% ) : \n74.67"
        # Handles "Montant TVA : 83.33"
        r"MONTANT\s+TVA\b(?:[^(\n]*)?(?:\([^)]*\))?\s*[:\-]?\s*\n?\s*([\d]+[.,]\d+)",
        # "T.V.A 381,67"
        r"T\.V\.A\.?\s*[:\-]?\s*([\d,.]+)",
        # "TVA 20% 381,67"
        r"TVA\s*[\(\d%\)]*\s*[:\-]?\s*([\d,.]+)",
        # "Taxes 131.89" — ONEE style
        r"(?:^|\n)\s*Taxes?\s*[:\-]?\s*([\d,.]+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            raw = match.group(1).strip()
            normalized = raw.replace(" ", "").replace(",", ".")
            try:
                return float(normalized)
            except ValueError:
                continue

    return None

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
    amount_tva = get_amount_tva(invoice_data.get("extracted_text", ""))

    result = {
        "extractedText": invoice_data.get("extracted_text", ""),
        "supplier": vendor_name,
        "date": invoice_data.get("invoice_date", ""),
        "due_date": invoice_data.get("due_date", ""),
        "amount": amount["value"],
        "currency": currency,
        "tva": tva,
        "ice": ice,
        "amount_tva": amount_tva,
        "invoice_number": invoice_data.get("invoice_number", ""),
        "category": "",
        "items": items,
        "tags": [],
    }

    result = _to_mongo_serializable(result)
    cache.insert_one({"_id": file_hash, **result})
    return result


# ----- Amount verification (for extracted invoices) -----
# Tolerance for float comparison (same as frontend)
_AMOUNT_TOLERANCE = Decimal("0.01")


def _to_decimal(value) -> Decimal:
    """Convert to Decimal safely."""
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


def run_amount_checks(invoice) -> list[str]:
    """
    Run amount verification checks. Returns warnings for extracted invoices only.
    - Check 1: For each line item, quantity * unit_price should equal item.total (within tolerance).
    - Check 2: Sum of item totals should equal invoice total_amount (within tolerance).
    """
    warnings: list[str] = []
    status = getattr(invoice, "status", None) if hasattr(invoice, "status") else (invoice.get("status") if isinstance(invoice, dict) else None)
    if status != "extracted":
        return warnings

    items = getattr(invoice, "items", None) if hasattr(invoice, "items") else (invoice.get("items") if isinstance(invoice, dict) else [])
    items = items or []
    total_amount = _to_decimal(
        getattr(invoice, "total_amount", None) if hasattr(invoice, "total_amount") else (invoice.get("total_amount") if isinstance(invoice, dict) else None)
    )
    currency = getattr(invoice, "currency", "MAD") if hasattr(invoice, "currency") else (invoice.get("currency") or "MAD")

    # Check 1 — line item math: quantity * unit_price vs item.total
    #for idx, item in enumerate(items):
    #    if isinstance(item, dict):
    #        qty = _to_decimal(item.get("quantity"))
    #        unit_price = _to_decimal(item.get("unit_price"))
    #        found = _to_decimal(item.get("total"))
    #        desc = item.get("description") or item.get("name") or f"Item {idx + 1}"
    #    else:
    #        qty = _to_decimal(getattr(item, "quantity", None))
    #        unit_price = _to_decimal(getattr(item, "unit_price", None))
    #        found = _to_decimal(getattr(item, "total", None))
    #        desc = getattr(item, "description", None) or getattr(item, "name", None) or f"Item {idx + 1}"
    #    expected = (qty * unit_price).quantize(Decimal("0.01"))
    #    found_rounded = found.quantize(Decimal("0.01"))
    #    if abs(expected - found_rounded) > _AMOUNT_TOLERANCE:
    #        warnings.append(
    #            f"Line '{desc}': expected {float(expected):.2f}, found {float(found_rounded):.2f}"
    #        )

    # Check 2 — sum of items vs total_amount
    if items:
        sum_items = Decimal("0")
        for item in items:
            if isinstance(item, dict):
                sum_items += _to_decimal(item.get("total"))
            else:
                sum_items += _to_decimal(getattr(item, "total", None))
        sum_items = sum_items.quantize(Decimal("0.01"))
        total_rounded = total_amount.quantize(Decimal("0.01"))
        if abs(sum_items - total_rounded) > _AMOUNT_TOLERANCE:
            sum_items += _to_decimal(getattr(invoice, "amount_tva", None))
            if abs(sum_items - total_rounded) > _AMOUNT_TOLERANCE:
                warnings.append(
                    f"Sum of lines ({float(sum_items):.2f} {currency}) ≠ Total amount ({float(total_rounded):.2f} {currency})"
                )

    return warnings
