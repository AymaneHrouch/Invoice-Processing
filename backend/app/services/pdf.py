"""PDF generation service — weasyprint + Jinja2 HTML template."""
from datetime import UTC, datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
import weasyprint

_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _fmt_amount(value) -> str:
    try:
        return f"{float(value):,.2f}"
    except (TypeError, ValueError):
        return "—"


_jinja_env.filters["fmt_amount"] = _fmt_amount


def _fmt_date(dt) -> str:
    if not dt:
        return "—"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return dt
    return dt.strftime("%d/%m/%Y")


_STATUS_LABELS = {
    "draft": "Brouillon",
    "extracted": "Extrait",
    "validated": "Validé",
    "sent": "Envoyé",
    "paid": "Payé",
}


def generate_invoice_pdf(invoice, company: dict) -> bytes:
    """Return PDF bytes for the given invoice (incoming or outgoing)."""
    direction = getattr(invoice, "direction", "outgoing") or "outgoing"
    currency = invoice.currency or "MAD"
    tva_rate = float(invoice.tva or 0)
    tva_amount = float(invoice.amount_tva or 0)
    subtotal_ht = float(invoice.subtotal_ht or 0) if invoice.subtotal_ht is not None else None
    total_amount = float(invoice.total_amount or 0)

    # Build emetteur dict from company profile (outgoing) or invoice vendor fields (incoming)
    if direction == "outgoing":
        emetteur = {
            "name": company.get("company_name") or "—",
            "legal_form": company.get("legal_form"),
            "address": company.get("address"),
            "postal_code": company.get("postal_code"),
            "city": company.get("city"),
            "phone": company.get("phone"),
            "email": company.get("email"),
            "ice": company.get("ice"),
            "identifiant_fiscal": company.get("identifiant_fiscal"),
            "rc": company.get("rc"),
            "patente": company.get("patente"),
            "cnss": company.get("cnss"),
        }
        destinataire = {
            "name": invoice.client_name or "—",
            "ice": invoice.client_ice,
            "address": getattr(invoice, "client_address", None),
            "city": getattr(invoice, "client_city", None),
            "phone": getattr(invoice, "client_phone", None),
            "email": getattr(invoice, "client_email", None),
        }
        bank_name = company.get("bank_name")
        bank_account = company.get("bank_account")
        legal_parts = []
        for key, label in [("ice", "ICE"), ("rc", "RC"),
                            ("identifiant_fiscal", "IF"), ("capital", "Capital")]:
            if company.get(key):
                legal_parts.append(f"{label} : {company[key]}")
        legal_line = " — ".join(legal_parts) if legal_parts else ""
    else:
        # Incoming: emetteur is the supplier
        emetteur = {
            "name": invoice.vendor_name or "—",
            "ice": invoice.vendor_ice,
        }
        destinataire = {
            "name": company.get("company_name") or "—",
            "ice": company.get("ice"),
        }
        bank_name = None
        bank_account = None
        legal_line = ""

    items = []
    for item in (invoice.items or []):
        items.append({
            "name": item.name,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price or 0),
            "total": float(item.total or 0),
        })

    status = invoice.status or "draft"
    context = {
        "primary": "#2563EB",
        "direction": direction,
        "invoice_number": invoice.invoice_number or "—",
        "invoice_date": _fmt_date(invoice.invoice_date),
        "invoice_due_date": _fmt_date(invoice.invoice_due_date) if invoice.invoice_due_date else None,
        "status": status,
        "status_label": _STATUS_LABELS.get(status, status),
        "emetteur": emetteur,
        "destinataire": destinataire,
        "items": items,
        "currency": currency,
        "subtotal_ht": subtotal_ht,
        "tva_rate": tva_rate,
        "tva_amount": tva_amount,
        "total_amount": total_amount,
        "bank_name": bank_name,
        "bank_account": bank_account,
        "legal_line": legal_line,
        "generated_at": datetime.now(UTC).strftime("%d/%m/%Y à %H:%M"),
    }

    template = _jinja_env.get_template("invoice.html")
    html_content = template.render(**context)

    return weasyprint.HTML(string=html_content).write_pdf()
