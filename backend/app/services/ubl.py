"""UBL 2.1 Invoice XML generation """
from datetime import datetime

from lxml import etree

_INVOICE_NS = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
_CAC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
_CBC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

NSMAP = {None: _INVOICE_NS, "cac": _CAC_NS, "cbc": _CBC_NS}


def _fmt(value) -> str:
    try:
        return f"{float(value or 0):.2f}"
    except (TypeError, ValueError):
        return "0.00"


def _fmt_date(dt) -> str | None:
    if not dt:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return dt
    return dt.strftime("%Y-%m-%d")


def _cbc(parent, tag, text, **attribs):
    el = etree.SubElement(parent, f"{{{_CBC_NS}}}{tag}", **attribs)
    if text is not None:
        el.text = str(text)
    return el


def _cac(parent, tag):
    return etree.SubElement(parent, f"{{{_CAC_NS}}}{tag}")


def _tax_category_code(rate: float) -> str:
    return "S" if rate > 0 else "Z"


def _party(parent, tag, *, name, ice=None, identifiant_fiscal=None, rc=None,
           address=None, city=None, postal_code=None, country="MA"):
    wrapper = _cac(parent, tag)
    party = _cac(wrapper, "Party")

    party_name = _cac(party, "PartyName")
    _cbc(party_name, "Name", name or "—")

    for scheme, value in (("ICE", ice), ("IF", identifiant_fiscal), ("RC", rc)):
        if value:
            pid = _cac(party, "PartyIdentification")
            _cbc(pid, "ID", value, schemeID=scheme)

    if address or city or postal_code:
        addr = _cac(party, "PostalAddress")
        if address:
            _cbc(addr, "StreetName", address)
        if city:
            _cbc(addr, "CityName", city)
        if postal_code:
            _cbc(addr, "PostalZone", postal_code)
        _cbc(_cac(addr, "Country"), "IdentificationCode", country)

    if ice:
        tax_scheme_wrap = _cac(party, "PartyTaxScheme")
        _cbc(tax_scheme_wrap, "CompanyID", ice)
        _cbc(_cac(tax_scheme_wrap, "TaxScheme"), "ID", "VAT")

    return wrapper


def generate_ubl_invoice(invoice, company: dict) -> str:
    currency = invoice.currency or "MAD"
    root = etree.Element(f"{{{_INVOICE_NS}}}Invoice", nsmap=NSMAP)

    # Header
    _cbc(root, "UBLVersionID", "2.1")
    _cbc(root, "ID", invoice.invoice_number or "—")
    issue = _fmt_date(invoice.invoice_date)
    if issue:
        _cbc(root, "IssueDate", issue)
    due = _fmt_date(invoice.invoice_due_date)
    if due:
        _cbc(root, "DueDate", due)
    _cbc(root, "InvoiceTypeCode", "380")
    _cbc(root, "DocumentCurrencyCode", currency)

    # Supplier
    _party(
        root, "AccountingSupplierParty",
        name=company.get("company_name"),
        ice=company.get("ice"),
        identifiant_fiscal=company.get("identifiant_fiscal"),
        rc=company.get("rc"),
        address=company.get("address"),
        city=company.get("city"),
        postal_code=company.get("postal_code"),
    )

    # Client
    _party(
        root, "AccountingCustomerParty",
        name=invoice.client_name,
        ice=invoice.client_ice,
        address=getattr(invoice, "client_address", None),
        city=getattr(invoice, "client_city", None),
    )

    # Build lines and group TVA per rate
    invoice_tva_rate = float(invoice.tva or 0)
    tax_groups: dict[int, dict] = {}
    lines = []
    for idx, item in enumerate(invoice.items or [], start=1):
        unit_price = float(item.unit_price or 0)
        line_ht = round(float(item.quantity or 0) * unit_price, 2)
        rate = float(getattr(item, "tva", None) or 0) or invoice_tva_rate
        line_tax = float(getattr(item, "tva_amount", None) or 0)
        lines.append({
            "idx": idx, "item": item, "unit_price": unit_price,
            "line_ht": line_ht, "rate": rate, "line_tax": line_tax,
        })
        group = tax_groups.setdefault(round(rate), {"taxable": 0.0, "tax": 0.0})
        group["taxable"] = round(group["taxable"] + line_ht, 2)
        group["tax"] = round(group["tax"] + line_tax, 2)

    subtotal_ht = (
        float(invoice.subtotal_ht) if invoice.subtotal_ht is not None
        else round(sum(line["line_ht"] for line in lines), 2)
    )
    total_tax = (
        float(invoice.amount_tva) if invoice.amount_tva is not None
        else round(sum(line["line_tax"] for line in lines), 2)
    )
    total_amount = float(invoice.total_amount or 0)

    if not tax_groups and total_tax > 0:
        tax_groups = {round(invoice_tva_rate): {"taxable": subtotal_ht, "tax": total_tax}}

    # Tax Summary
    tax_total = _cac(root, "TaxTotal")
    _cbc(tax_total, "TaxAmount", _fmt(total_tax), currencyID=currency)
    for rate in sorted(tax_groups):
        group = tax_groups[rate]
        subtotal = _cac(tax_total, "TaxSubtotal")
        _cbc(subtotal, "TaxableAmount", _fmt(group["taxable"]), currencyID=currency)
        _cbc(subtotal, "TaxAmount", _fmt(group["tax"]), currencyID=currency)
        category = _cac(subtotal, "TaxCategory")
        _cbc(category, "ID", _tax_category_code(rate))
        _cbc(category, "Percent", _fmt(rate))
        _cbc(_cac(category, "TaxScheme"), "ID", "VAT")

    # Totals
    totals = _cac(root, "LegalMonetaryTotal")
    _cbc(totals, "LineExtensionAmount", _fmt(subtotal_ht), currencyID=currency)
    _cbc(totals, "TaxExclusiveAmount", _fmt(subtotal_ht), currencyID=currency)
    _cbc(totals, "TaxInclusiveAmount", _fmt(total_amount), currencyID=currency)
    _cbc(totals, "PayableAmount", _fmt(total_amount), currencyID=currency)

    # Invoice lines
    for line in lines:
        item = line["item"]
        line_el = _cac(root, "InvoiceLine")
        _cbc(line_el, "ID", line["idx"])
        _cbc(line_el, "InvoicedQuantity", item.quantity, unitCode="C62")
        _cbc(line_el, "LineExtensionAmount", _fmt(line["line_ht"]), currencyID=currency)
        _cbc(_cac(line_el, "TaxTotal"), "TaxAmount", _fmt(line["line_tax"]), currencyID=currency)
        item_el = _cac(line_el, "Item")
        _cbc(item_el, "Name", item.name or item.description or "—")
        if item.description:
            _cbc(item_el, "Description", item.description)
        category = _cac(item_el, "ClassifiedTaxCategory")
        _cbc(category, "ID", _tax_category_code(line["rate"]))
        _cbc(category, "Percent", _fmt(line["rate"]))
        _cbc(_cac(category, "TaxScheme"), "ID", "VAT")
        price = _cac(line_el, "Price")
        _cbc(price, "PriceAmount", _fmt(line["unit_price"]), currencyID=currency)
        _cbc(price, "BaseQuantity", "1", unitCode="C62")

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True).decode()
