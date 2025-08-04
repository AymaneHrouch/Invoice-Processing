import mimetypes
import re
from decimal import Decimal, InvalidOperation

from google.cloud import documentai_v1 as documentai

from app.services.ocr.invoice_parser import InvoiceParser


class GoogleCloudDocumentAIInvoiceParser(InvoiceParser):
    def __init__(self, project_id: str, location: str, processor_id: str):
        self.project_id = project_id
        self.location = location
        self.processor_id = processor_id
        self.client = documentai.DocumentProcessorServiceClient()
        self.name = self.client.processor_path(project_id, location, processor_id)

    def extract_fields(self, file_path: str | None, *, file_bytes_source: bytes = None, file_mime_type = None, test = None) -> dict:
        if file_path is None:
            if file_bytes_source is None:
                raise ValueError("Either file_path or file_bytes_source must be provided.")
            if file_mime_type is None:
                raise ValueError("file_mime_type must be provided if file_bytes_source is used.")
            mime_type = file_mime_type
            document = {"content": file_bytes_source, "mime_type": mime_type}
        else:
            mime_type, _ = mimetypes.guess_type(file_path)
            with open(file_path, "rb") as file:
                document = {"content": file.read(), "mime_type": mime_type}
        request = {
            "name": self.name,
            "raw_document": document,
        }
        response = self.client.process_document(request=request)
        doc = response.document
        invoice_data = {"items": [], "others": []}
        for entity in doc.entities:
            invoice_data = map_fields_to_invoice(invoice_data, entity)
        if invoice_data["currency"]:
            for item in invoice_data["items"]:
                if "currency" not in item["total"] or item["total"]["currency"] != invoice_data["currency"] :
                    item["total"]["currency"] = invoice_data["currency"]
                if "currency" not in item["unit_price"] or item["unit_price"]["currency"] != invoice_data["currency"]:
                    item["unit_price"]["currency"] = invoice_data["currency"]
        return invoice_data


def map_fields_to_invoice(invoice_data: dict, entity: documentai.Document.Entity) -> dict:
    entity_type = entity.type_
    value = entity.mention_text

    if "normalized_value" in entity:
        value = entity.normalized_value.text

    if entity_type == "invoice_id":
        invoice_data["id"] = value
    elif entity_type == "invoice_date":
        invoice_data["invoice_date"] = value
    elif entity_type == "due_date":
        invoice_data["due_date"] = value
    elif entity_type == "delivery_date":
        invoice_data["delivery_date"] = value
    elif entity_type == "purchase_order":
        invoice_data["purchase_order"] = value
    elif entity_type == "payment_terms":
        invoice_data["payment_terms"] = value
    elif entity_type == "net_amount":
        invoice_data["net_amount"] = get_with_currency(value)
    elif entity_type == "total_amount":
        invoice_data["total_amount"] = get_with_currency(value)
    elif entity_type == "total_tax_amount":
        invoice_data["total_tax_amount"] = get_with_currency(value)
    elif entity_type == "amount_paid_since_last_invoice":
        invoice_data["amount_paid"] = get_with_currency(value)

    # Supplier fields
    elif entity_type == "supplier_name":
        invoice_data["supplier_name"] = value
    elif entity_type == "supplier_address":
        invoice_data["supplier_address"] = value
    elif entity_type == "supplier_email":
        invoice_data["supplier_email"] = value
    elif entity_type == "supplier_phone":
        invoice_data["supplier_phone"] = value
    elif entity_type == "supplier_website":
        invoice_data["supplier_website"] = value
    elif entity_type == "supplier_iban":
        invoice_data["supplier_iban"] = value
    elif entity_type == "supplier_payment_ref":
        invoice_data["supplier_payment_ref"] = value
    elif entity_type == "supplier_tax_id":
        invoice_data["supplier_tax_id"] = value
    elif entity_type == "supplier_registration":
        invoice_data["supplier_registration"] = value

    # Receiver fields
    elif entity_type == "receiver_name":
        invoice_data["receiver_name"] = value
    elif entity_type == "receiver_address":
        invoice_data["receiver_address"] = value
    elif entity_type == "receiver_email":
        invoice_data["receiver_email"] = value
    elif entity_type == "receiver_phone":
        invoice_data["receiver_phone"] = value
    elif entity_type == "receiver_tax_id":
        invoice_data["receiver_tax_id"] = value
    elif entity_type == "receiver_website":
        invoice_data["receiver_website"] = value

    # Shipping and Remit
    elif entity_type == "ship_from_address":
        invoice_data["ship_from_address"] = value
    elif entity_type == "ship_from_name":
        invoice_data["ship_from_name"] = value
    elif entity_type == "ship_to_address":
        invoice_data["ship_to_address"] = value
    elif entity_type == "ship_to_name":
        invoice_data["ship_to_name"] = value
    elif entity_type == "remit_to_address":
        invoice_data["remit_to_address"] = value
    elif entity_type == "remit_to_name":
        invoice_data["remit_to_name"] = value

    # Currency and exchange
    elif entity_type == "currency":
        invoice_data["currency"] = value
    elif entity_type == "currency_exchange_rate":
        invoice_data["currency_exchange_rate"] = value
    elif entity_type == "freight_amount":
        invoice_data["freight_amount"] = get_with_currency(value)

    # Line Items
    elif entity_type == "line_item":
        item = extract_line_item(entity)
        invoice_data["items"].append(item)

    # Catch-all for unrecognized fields
    else:
        invoice_data["others"].append({
            "type": entity_type,
            "value": value
        })

    return invoice_data


def extract_line_item(entity: documentai.Document.Entity) -> dict:
    item = {
        "name": "",
        "description": "",
        "quantity": 1,
        "unit_price": {},
        "total": {},
        "currency": None,
        "product_code": "",
        "purchase_order": "",
        "unit": "",
        "others": []
    }

    for prop in entity.properties:
        prop_type = prop.type_
        value = prop.mention_text
        if "normalized_value" in prop:
            value = prop.normalized_value.text

        if prop_type == "line_item/description":
            item["name"] = value
            item["description"] = value
        elif prop_type == "line_item/quantity":
            try:
                item["quantity"] = int(float(value))
            except ValueError:
                pass
        elif prop_type == "line_item/unit_price":
            item["unit_price"] = get_with_currency(value)
        elif prop_type == "line_item/amount":
            item["total"] = get_with_currency(value)
        elif prop_type == "line_item/currency":
            item["currency"] = value
        elif prop_type == "line_item/product_code":
            item["product_code"] = value
        elif prop_type == "line_item/purchase_order":
            item["purchase_order"] = value
        elif prop_type == "line_item/unit":
            item["unit"] = value
        # Handle other properties
        else:
            item["others"].append({
                "type": prop_type,
                "value": value
            })

    return item


def sanitize_decimal(value: str) -> Decimal:
    cleaned = re.sub(r'[^\d.]', '', value)
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return Decimal('0.0')


def extract_currency(value: str) -> str | None:
    currency_map = {
        '$': 'USD',
        '€': 'EUR',
        'MAD': 'MAD',
        'USD': 'USD',
        'EUR': 'EUR'
    }

    # This regex looks for symbols or codes in a readable way
    pattern = r'(?:\$|€|\bUSD\b|\bEUR\b|\bMAD\b)'
    match = re.search(pattern, value, re.IGNORECASE)

    if match:
        found = match.group(0).upper()
        return currency_map.get(found, found)

    return None


def get_with_currency(value: str) -> dict:
    currency = extract_currency(value) or "USD"
    return {"value": sanitize_decimal(value), "currency": currency}
