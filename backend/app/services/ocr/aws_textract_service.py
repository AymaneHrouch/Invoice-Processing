from decimal import Decimal, InvalidOperation
import re

import boto3

from app.services.ocr.invoice_parser import InvoiceParser


class AWSTextractInvoiceParser(InvoiceParser):
    def __init__(self, profile_name, region_name="us-east-1"):
        self.session = boto3.Session(profile_name=profile_name)
        self.client = self.session.client(service_name="textract", region_name=region_name)

    def extract_fields(self, file_path: str | None, *, file_bytes_source: bytes = None, bucket: str = None, key: str = None) -> dict:
        if file_path is not None:
            with open(file_path, "rb") as file:
                document = {"Bytes": file.read()}

        elif file_bytes_source is not None:
            document = {"Bytes": file_bytes_source}
        else:
            if bucket is None or key in None:
                raise ValueError("Either file_path or file_bytes_source or both bucket and key must be provided.")
            document = {
                "S3Object": {
                    "Bucket": bucket,
                    "Name": key
                }
            }
        response = self.client.analyze_expense(Document=document)
        invoice_data = {"items": []}
        for expense_document in response.get("ExpenseDocuments", []):
            for summary_field in expense_document.get("SummaryFields", []):
                invoice_data = map_fields_to_invoice(invoice_data, summary_field)
            for line_item_group in expense_document.get("LineItemGroups", []):
                for line_item in line_item_group.get("LineItems", []):
                    invoice_data["items"].append(get_item_data(line_item))

        return invoice_data


def map_fields_to_invoice(invoice_data: dict, summary_field: dict) -> dict:
    field_type = summary_field.get("Type", {}).get("Text")
    value_detection = summary_field.get("ValueDetection", {})
    label = summary_field.get("LabelDetection", {}).get("Text")
    value = value_detection.get("Text")

    if not field_type or not value:
        return invoice_data

    def set(field_name, val=value):
        invoice_data[field_name] = val

    def set_with_currency(field_name, val=value):
        invoice_data[field_name] = {
            "value": sanitize_decimal(val),
        }
        if "Currency" in value_detection:
            invoice_data[field_name]["currency"] = value_detection["Currency"].get("Code")
        else:
            invoice_data[field_name]["currency"] = extract_currency(val) or "USD"

    match field_type:
        case "INVOICE_RECEIPT_DATE":
            set("invoice_date")
        case "INVOICE_RECEIPT_ID":
            set("id")
        case "TAX_PAYER_ID":
            set("tax_payer_id")
        case "CUSTOMER_NUMBER":
            set("customer_number")
        case "ACCOUNT_NUMBER":
            set("account_number")
        case "VENDOR_NAME":
            set("vendor_name")
        case "RECEIVER_NAME":
            set("receiver_name")
        case "VENDOR_ADDRESS":
            set("vendor_address")
        case "RECEIVER_ADDRESS":
            set("receiver_address")
        case "ORDER_DATE":
            set("order_date")
        case "DUE_DATE":
            set("due_date")
        case "DELIVERY_DATE":
            set("delivery_date")
        case "PO_NUMBER":
            set("po_number")
        case "PAYMENT_TERMS":
            set("payment_terms")
        case "TOTAL":
            set_with_currency("total_amount")

        case "AMOUNT_DUE":
            set_with_currency("amount_due")
        case "AMOUNT_PAID":
            set_with_currency("amount_paid")
        case "SUBTOTAL":
            set_with_currency("subtotal")
        case "TAX":
            set_with_currency("tax")
        case "SERVICE_CHARGE":
            set_with_currency("service_charge")
        case "GRATUITY":
            set_with_currency("gratuity")
        case "PRIOR_BALANCE":
            set_with_currency("prior_balance")
        case "DISCOUNT":
            set_with_currency("discount")
        case "SHIPPING_HANDLING_CHARGE":
            set_with_currency("shipping_handling")
        case "VENDOR_ABN_NUMBER":
            set("vendor_abn")
        case "VENDOR_GST_NUMBER":
            set("vendor_gst")
        case "VENDOR_PAN_NUMBER":
            set("vendor_pan")
        case "VENDOR_VAT_NUMBER":
            set("vendor_vat")
        case "RECEIVER_ABN_NUMBER":
            set("receiver_abn")
        case "RECEIVER_GST_NUMBER":
            set("receiver_gst")
        case "RECEIVER_PAN_NUMBER":
            set("receiver_pan")
        case "RECEIVER_VAT_NUMBER":
            set("receiver_vat")
        case "VENDOR_PHONE":
            set("vendor_phone")
        case "RECEIVER_PHONE":
            set("receiver_phone")
        case "VENDOR_URL":
            set("vendor_url")
        case "OTHER":
            invoice_data.setdefault("other", []).append({"label": label, "value": value})
    return invoice_data


def get_item_data(line_item: dict) -> dict:
    item = {
        "name": "",
        "description": "",
        "quantity": 1,
        "unit_price": {},
        "total": {},
        "others": []  # to collect OTHER fields
    }

    for field in line_item.get("LineItemExpenseFields", []):
        field_type = field.get("Type", {}).get("Text")
        value_detection = field.get("ValueDetection", {})
        label = field.get("LabelDetection", {}).get("Text")
        value = value_detection.get("Text")
        if not field_type or not value:
            continue


        match field_type:
            case "ITEM":
                item["name"] = value
                item["description"] = value
            case "QUANTITY":
                item["quantity"] = int(float(value))
            case "UNIT_PRICE":
                if "Currency" in value_detection:
                    item["unit_price"] = {
                        "value": sanitize_decimal(value),
                        "currency": value_detection["Currency"].get("Code")
                    }
                else :
                    item["unit_price"]={
                        "value": sanitize_decimal(value),
                        "currency": extract_currency(value) or "USD"
                    }

            case "PRICE":
                item["total"]["value"] = sanitize_decimal(value)
                if "Currency" in value_detection:
                    item["total"]["currency"] = value_detection["Currency"].get("Code")
                else:
                    item["total"]["currency"] = extract_currency(value) or "USD"
            case "PRODUCT_CODE":
                item["product_code"] = value
            case "OTHER":
                item["others"].append({"label": label, "value": value})

    return item


def sanitize_decimal(value: str) -> Decimal:
    cleaned = re.sub(r"[^\d.]", "", value)
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return Decimal("0.0")


def extract_currency(value: str) -> str | None:
    currency_map = {
        "$": "USD",
        "€": "EUR",
        "MAD": "MAD",
        "USD": "USD",
        "EUR": "EUR"
    }

    # This regex looks for symbols or codes in a readable way
    pattern = r"(?:\$|€|\bUSD\b|\bEUR\b|\bMAD\b)"
    match = re.search(pattern, value, re.IGNORECASE)

    if match:
        found = match.group(0).upper()
        return currency_map.get(found, found)

    return None
