# UBL.md — UBL 2.1 Invoice Generation Technical Guide

## What is UBL 2.1?

Universal Business Language (UBL) 2.1 is an OASIS standard XML format for business documents. Morocco's DGI has adopted UBL 2.1 as the mandatory format for electronic invoices under the clearance model.

A UBL invoice is an XML file where every field (supplier, client, amounts, line items, taxes) is structured in a machine-readable format — no OCR, no parsing, no ambiguity.

## Moroccan E-Invoice Requirements

Per DGI mandate, each electronic invoice must include:
- Supplier identity: name, ICE, IF, RC, address
- Client identity: name, ICE (mandatory for B2B)
- Invoice number (strictly sequential, chronological)
- Invoice date
- Line items with description, quantity, unit price
- TVA rate and amount per line or globally
- Total HT, Total TVA, Total TTC
- Currency (MAD by default)
- Qualified electronic signature
- DGI-assigned UUID (post-clearance)

## UBL 2.1 Invoice XML Structure

### Minimal Example (Moroccan context)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>FAC-2026-001</cbc:ID>
  <cbc:IssueDate>2026-04-15</cbc:IssueDate>
  <cbc:DueDate>2026-05-15</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>MAD</cbc:DocumentCurrencyCode>

  <!-- Supplier (my company) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="ICE">001234567000089</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="IF">12345678</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyIdentification>
        <cbc:ID schemeID="RC">123456</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>Mon Entreprise SARL</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>123 Bd Mohammed V</cbc:StreetName>
        <cbc:CityName>Casablanca</cbc:CityName>
        <cbc:PostalZone>20000</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>MA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>001234567000089</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Client -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="ICE">009876543000021</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>Client SA</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>456 Rue Hassan II</cbc:StreetName>
        <cbc:CityName>Rabat</cbc:CityName>
        <cac:Country>
          <cbc:IdentificationCode>MA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Tax Summary -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="MAD">3000.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="MAD">15000.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="MAD">3000.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>20</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Totals -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="MAD">15000.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="MAD">15000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="MAD">18000.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="MAD">18000.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Line Items -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="MAD">15000.00</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="MAD">3000.00</cbc:TaxAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>Prestation de conseil pour projet X</cbc:Description>
      <cbc:Name>Service de conseil technique</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>20</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="MAD">1500.00</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="C62">1</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>

</Invoice>
```

## Field Mapping: Invoice Model → UBL XML

| Invoice Model Field | UBL Path |
|---------------------|----------|
| `invoice_number` | `cbc:ID` |
| `invoice_date` | `cbc:IssueDate` (format: YYYY-MM-DD) |
| `invoice_due_date` | `cbc:DueDate` |
| `currency` | `cbc:DocumentCurrencyCode` |
| `vendor_name` (from profile) | `cac:AccountingSupplierParty/cac:Party/cac:PartyName/cbc:Name` |
| `vendor_ice` (from profile) | `cac:AccountingSupplierParty/.../cbc:ID[@schemeID='ICE']` |
| `client_name` | `cac:AccountingCustomerParty/cac:Party/cac:PartyName/cbc:Name` |
| `client_ice` | `cac:AccountingCustomerParty/.../cbc:ID[@schemeID='ICE']` |
| `subtotal_ht` | `cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount` (and`cbc:LineExtensionAmount`) |
| `amount_tva` | `cac:TaxTotal/cbc:TaxAmount` |
| `total_amount` | `cac:LegalMonetaryTotal/cbc:PayableAmount` (and `cbc:TaxInclusiveAmount`) |
| `items[].name` | `cac:InvoiceLine/cac:Item/cbc:Name` |
| `items[].description` | `cac:InvoiceLine/cac:Item/cbc:Description` |
| `items[].quantity` | `cac:InvoiceLine/cbc:InvoicedQuantity` |
| `items[].unit_price` | `cac:InvoiceLine/cac:Price/cbc:PriceAmount` |
| `items[].quantity × items[].unit_price` (HT) | `cac:InvoiceLine/cbc:LineExtensionAmount` |

## Python Implementation Notes

### XML Generation with `lxml`

```python
from lxml import etree

NAMESPACES = {
    None: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
}

def generate_ubl_invoice(invoice, company_profile) -> str:
    """Generate UBL 2.1 Invoice XML from invoice and company profile."""
    root = etree.Element("Invoice", nsmap=NAMESPACES)

    # Helper to create sub-elements
    def cbc(parent, tag, text, **attribs):
        el = etree.SubElement(parent, f"{{{NAMESPACES['cbc']}}}{tag}", **attribs)
        el.text = str(text)
        return el

    def cac(parent, tag):
        return etree.SubElement(parent, f"{{{NAMESPACES['cac']}}}{tag}")

    cbc(root, "UBLVersionID", "2.1")
    cbc(root, "ID", invoice.invoice_number)
    cbc(root, "IssueDate", invoice.invoice_date.strftime("%Y-%m-%d"))
    if invoice.invoice_due_date:
        cbc(root, "DueDate", invoice.invoice_due_date.strftime("%Y-%m-%d"))
    cbc(root, "InvoiceTypeCode", "380")
    cbc(root, "DocumentCurrencyCode", invoice.currency)

    # ... build supplier, customer, tax, totals, lines ...

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True).decode()
```

### Dependencies to Add

```toml
# Add to pyproject.toml
"lxml>=5.0.0",
```

### XSD Validation (Optional but Recommended)

Download UBL 2.1 XSD schemas from OASIS and validate:

```python
def validate_ubl(xml_string: str) -> bool:
    schema = etree.XMLSchema(etree.parse("schemas/UBL-Invoice-2.1.xsd"))
    doc = etree.fromstring(xml_string.encode())
    return schema.validate(doc)
```

## Moroccan TVA Rates

| Rate | Description |
|------|-------------|
| 20% | Standard rate (most goods and services) |
| 14% | Transport, energy, some food products |
| 10% | Tourism, restaurants, some professional services |
| 7% | Water, electricity, basic food products |
| 0% | Exports, some agricultural products |

## UBL Invoice Type Codes

| Code | Meaning |
|------|---------|
| 380 | Commercial Invoice (standard) |
| 381 | Credit Note |
| 383 | Debit Note |
| 386 | Prepayment Invoice |

## Common Unit Codes

| Code | Meaning |
|------|---------|
| C62 | Unit (piece) |
| HUR | Hour |
| DAY | Day |
| MON | Month |
| KGM | Kilogram |
| MTR | Meter |
| LTR | Litre |
