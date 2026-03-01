from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, AnalyzedDocument

from app.services.ocr.invoice_parser import InvoiceParser


class AzureDocumentIntelligenceInvoiceParser(InvoiceParser):
    def __init__(self, endpoint: str, key: str):
        self.client = DocumentIntelligenceClient(
            endpoint=endpoint, credential=AzureKeyCredential(key)
        )

    def extract_fields(self, file_path: str, *, file_bytes_source: bytes = None ) -> dict:
        if file_bytes_source is None:
            with open(file_path, "rb") as file:
                file_bytes_source = file.read()

        poller = self.client.begin_analyze_document("prebuilt-invoice", AnalyzeDocumentRequest(bytes_source=file_bytes_source))

        result = poller.result()
        invoice_data = {"extracted_text": result.content}
        for invoice in result.documents:

            invoice_data = map_fields_to_invoice(invoice_data, invoice)

        return invoice_data


def map_fields_to_invoice(invoice_data: dict, invoice: AnalyzedDocument) -> dict:
    fields = invoice.fields

    # Helper function to safely extract field values
    def get_field_value(obj: dict, field_name: str):
        field = obj.get(field_name)
        if not field:
            return None

        try:
            if field.type == 'currency':
                return {
                    "value": field.value_currency.amount,
                    "currency": field.value_currency.currency_code
                }
            elif field.type == 'string':
                return field.value_string.strip()
            elif field.type == "date":
                return field.value_date
            elif field.type == "number":
                return field.value_number
            elif field.type == "address":
                return {
                    "content": field.content,
                    "city": field.value_address.city,
                    "country_region": field.value_address.country_region,
                    "house_number": field.value_address.house_number,
                    "po_box": field.value_address.po_box,
                    "postal_code": field.value_address.postal_code,
                    "road": field.value_address.road,
                    "state": field.value_address.state,
                    "street_address": field.value_address.street_address,
                }

        except AttributeError:
            return None

    def get_tax_details(tax_field):
        if not tax_field:
            return []
        tax_details = []
        for tax_detail in tax_field.value_array:
            obj = tax_detail.value_object
            tax_detail_obj = {
                "amount": get_field_value(obj, "Amount"),
                "tax_rate": get_field_value(obj, "Rate")
            }
            tax_details.append(tax_detail_obj)
        return tax_details

    # Helper function to safely extract items
    def get_items(items_field):
        if not items_field:
            return []
        items = []
        for obj in items_field.value_array:
            item = {
                "amount": get_field_value(obj.value_object, 'Amount'),
                "date": get_field_value(obj.value_object, 'Date'),
                "description": get_field_value(obj.value_object, 'Description'),
                "product_code": get_field_value(obj.value_object, 'ProductCode'),
                "quantity": get_field_value(obj.value_object, 'Quantity'),
                "tax": get_field_value(obj.value_object, 'Tax'),
                "tax_rate": get_field_value(obj.value_object, 'TaxRate'),
                "unit": get_field_value(obj.value_object, 'Unit'),
                "unit_price": get_field_value(obj.value_object, 'UnitPrice')
            }
            items.append(item)
        return items

    invoice_data.update({
        # Vendor Information
        'vendor_name': get_field_value(fields, 'VendorName'),
        'vendor_address': get_field_value(fields, 'VendorAddress'),
        'vendor_address_recipient': get_field_value(fields, 'VendorAddressRecipient'),

        # Customer Information
        'customer_name': get_field_value(fields, 'CustomerName'),
        'customer_id': get_field_value(fields, 'CustomerId'),
        'customer_address': get_field_value(fields, 'CustomerAddress'),
        'customer_address_recipient': get_field_value(fields, 'CustomerAddressRecipient'),

        # Invoice Details
        'invoice_number': get_field_value(fields, 'InvoiceId'),
        'invoice_date': get_field_value(fields, 'InvoiceDate'),
        'due_date': get_field_value(fields, 'DueDate'),
        'purchase_order': get_field_value(fields, 'PurchaseOrder'),

        # Financial Information
        'subtotal': get_field_value(fields, 'SubTotal'),
        'total_tax': get_field_value(fields, 'TotalTax'),
        'total_amount': get_field_value(fields, 'InvoiceTotal'),
        'amount_due': get_field_value(fields, 'AmountDue'),
        'previous_unpaid_balance': get_field_value(fields, 'PreviousUnpaidBalance'),

        # Address Information
        'billing_address': get_field_value(fields, 'BillingAddress'),
        'billing_address_recipient': get_field_value(fields, 'BillingAddressRecipient'),
        'shipping_address': get_field_value(fields, 'ShippingAddress'),
        'shipping_address_recipient': get_field_value(fields, 'ShippingAddressRecipient'),
        'service_address': get_field_value(fields, 'ServiceAddress'),
        'service_address_recipient': get_field_value(fields, 'ServiceAddressRecipient'),
        'remittance_address': get_field_value(fields, 'RemittanceAddress'),
        'remittance_address_recipient': get_field_value(fields, 'RemittanceAddressRecipient'),

        # Service Dates
        'service_start_date': get_field_value(fields, 'ServiceStartDate'),
        'service_end_date': get_field_value(fields, 'ServiceEndDate'),
        'payment_terms': get_field_value(fields, 'PaymentTerms'),
        # Tax Details
        "tax_details": get_tax_details(fields.get('TaxDetails')),
        # Line Items
        'items': get_items(fields.get("Items"))
    })

    return invoice_data

