from decimal import Decimal
import os

from pymongo import MongoClient

_AMOUNT_TOLERANCE = Decimal("0.01")


def get_cache():
    client = MongoClient(os.getenv("MONGO_URL"))
    db = client["invoice_processing"]
    return list(db.cache.find())


def get_invoices():
    client = MongoClient(os.getenv("MONGO_URL"))
    db = client["invoice_processing"]
    return list(db.invoices.find())


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

import re


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

def run_amount_checks(invoice, all_info) -> list[str]:
    """
    Run amount verification checks. Returns warnings for extracted invoices only.
    - Check 1: For each line item, quantity * unit_price should equal item.total (within tolerance).
    - Check 2: Sum of item totals should equal invoice total_amount (within tolerance).
    """
    warnings: list[str] = []
    status = invoice["status"]
    archived = invoice["is_archived"]
    if status != "extracted" or archived:
        return warnings

    vendor = invoice["vendor_name"]
    items = invoice["items"] or []
    total_amount = _to_decimal(invoice["total_amount"])
    currency = invoice["currency"]

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
            info = all_info[vendor]["extractedText"]
            diff = abs(sum_items - total_rounded)
            amount_tva = get_amount_tva(info)
            print(diff, amount_tva)
            warnings.append(
                f"Sum of lines ({float(sum_items):.2f} {currency}) ≠ Total amount ({float(total_rounded):.2f} {currency})"
            )

    return warnings



if __name__ == "__main__":
    text = """
Montant HT :
373.34
Montant TVA ( Taux de 20% ) :
74.67
Montant TTC :
448.01
"""
    print(get_amount_tva(text))
