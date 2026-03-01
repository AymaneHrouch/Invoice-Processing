import logging

from app.services.ocr.factory import get_invoice_parser

logger = logging.getLogger(__name__)

invoice_parser = get_invoice_parser("azure_document_intelligence")


def extract_invoice_data(file: bytes):
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
    amount = invoice_data.get("total_amount") or invoice_data.get("amount_due") or {"value": 0, "currency": "USD"}
    return {
        "extractedText": invoice_data.get("extracted_text", ""),
        "supplier": invoice_data.get("vendor_name", ""),
        "date": invoice_data.get("invoice_date", ""),
        "due_date": invoice_data.get("due_date", ""),
        "amount": amount["value"],
        "currency": amount["currency"],
        "invoice_number": invoice_data.get("invoice_number", ""),
        "category": "",
        "items": items,
        "tags": [],
    }
