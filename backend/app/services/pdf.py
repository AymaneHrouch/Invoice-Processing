"""PDF generation service for outgoing invoices (Ventes)."""
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Brand colours ──────────────────────────────────────────────────────────────
BLUE = colors.HexColor("#2563EB")
LIGHT_BLUE = colors.HexColor("#EFF6FF")
DARK = colors.HexColor("#111827")
GREY = colors.HexColor("#6B7280")
LIGHT_GREY = colors.HexColor("#F9FAFB")
BORDER = colors.HexColor("#E5E7EB")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm


def _fmt_date(dt) -> str:
    if not dt:
        return "—"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return dt
    return dt.strftime("%d/%m/%Y")


def _fmt_amount(value, currency: str = "MAD") -> str:
    try:
        return f"{float(value):,.2f} {currency}"
    except (TypeError, ValueError):
        return f"— {currency}"


def generate_invoice_pdf(invoice, company: dict) -> bytes:
    """Return PDF bytes for the given outgoing invoice."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
    )

    styles = getSampleStyleSheet()

    def style(name, **kwargs) -> ParagraphStyle:
        base = styles["Normal"]
        return ParagraphStyle(name, parent=base, **kwargs)

    s = {
        "title": style("title", fontSize=22, textColor=BLUE, fontName="Helvetica-Bold"),
        "invoice_num": style("invoice_num", fontSize=11, textColor=GREY),
        "section_head": style("section_head", fontSize=8, textColor=GREY,
                              fontName="Helvetica-Bold", spaceAfter=2,
                              textTransform="uppercase", letterSpacing=0.5),
        "company_name": style("company_name", fontSize=13, textColor=DARK,
                               fontName="Helvetica-Bold"),
        "body": style("body", fontSize=9, textColor=DARK, leading=13),
        "body_grey": style("body_grey", fontSize=9, textColor=GREY, leading=13),
        "total_label": style("total_label", fontSize=9, textColor=GREY,
                              alignment=TA_RIGHT),
        "total_value": style("total_value", fontSize=9, textColor=DARK,
                              alignment=TA_RIGHT),
        "grand_label": style("grand_label", fontSize=11, textColor=BLUE,
                              fontName="Helvetica-Bold", alignment=TA_RIGHT),
        "grand_value": style("grand_value", fontSize=11, textColor=BLUE,
                              fontName="Helvetica-Bold", alignment=TA_RIGHT),
        "th": style("th", fontSize=8, textColor=colors.white,
                    fontName="Helvetica-Bold", alignment=TA_CENTER),
        "td": style("td", fontSize=8, textColor=DARK, leading=11),
        "td_r": style("td_r", fontSize=8, textColor=DARK, leading=11,
                      alignment=TA_RIGHT),
        "td_c": style("td_c", fontSize=8, textColor=DARK, leading=11,
                      alignment=TA_CENTER),
        "footer": style("footer", fontSize=7, textColor=GREY, alignment=TA_CENTER),
    }

    usable_w = PAGE_W - 2 * MARGIN
    story = []

    # ── Header: FACTURE title + invoice meta ──────────────────────────────────
    inv_num = invoice.invoice_number or "—"
    inv_date = _fmt_date(invoice.invoice_date)
    due_date = _fmt_date(invoice.invoice_due_date)

    header_data = [
        [
            Paragraph("FACTURE", s["title"]),
            Table(
                [
                    [Paragraph("N°", s["body_grey"]),
                     Paragraph(inv_num, style("num", fontSize=11, textColor=DARK,
                                              fontName="Helvetica-Bold", alignment=TA_RIGHT))],
                    [Paragraph("Date", s["body_grey"]),
                     Paragraph(inv_date, style("dv", fontSize=9, textColor=DARK,
                                               alignment=TA_RIGHT))],
                    [Paragraph("Échéance", s["body_grey"]),
                     Paragraph(due_date, style("dv2", fontSize=9, textColor=DARK,
                                               alignment=TA_RIGHT))],
                ],
                colWidths=[28 * mm, 45 * mm],
                style=TableStyle([
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]),
            ),
        ]
    ]
    header_table = Table(
        header_data,
        colWidths=[usable_w - 73 * mm, 73 * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ]),
    )
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=6 * mm))

    # ── Emetteur / Client side-by-side ────────────────────────────────────────
    def company_block() -> list:
        lines = [Paragraph("Émetteur", s["section_head"])]
        lines.append(Paragraph(company.get("company_name", ""), s["company_name"]))
        if company.get("legal_form"):
            lines.append(Paragraph(company["legal_form"], s["body_grey"]))
        if company.get("address"):
            lines.append(Paragraph(company["address"], s["body"]))
        city_line = " ".join(filter(None, [
            company.get("postal_code"), company.get("city")
        ]))
        if city_line:
            lines.append(Paragraph(city_line, s["body"]))
        if company.get("phone"):
            lines.append(Paragraph(f"Tél : {company['phone']}", s["body"]))
        if company.get("email"):
            lines.append(Paragraph(company["email"], s["body"]))
        lines.append(Spacer(1, 3 * mm))
        for key, label in [("ice", "ICE"), ("identifiant_fiscal", "IF"),
                            ("rc", "RC"), ("patente", "Patente"), ("cnss", "CNSS")]:
            if company.get(key):
                lines.append(Paragraph(f"{label} : {company[key]}", s["body_grey"]))
        return lines

    def client_block() -> list:
        lines = [Paragraph("Client", s["section_head"])]
        client_name = invoice.client_name or "—"
        lines.append(Paragraph(client_name,
                                style("cn", fontSize=13, textColor=DARK,
                                      fontName="Helvetica-Bold")))
        if invoice.client_ice:
            lines.append(Paragraph(f"ICE : {invoice.client_ice}", s["body_grey"]))
        return lines

    party_table = Table(
        [[company_block(), client_block()]],
        colWidths=[usable_w / 2 - 5 * mm, usable_w / 2 - 5 * mm],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("BACKGROUND", (0, 0), (0, 0), LIGHT_BLUE),
            ("BACKGROUND", (1, 0), (1, 0), LIGHT_GREY),
            ("BOX", (0, 0), (0, 0), 0.5, BORDER),
            ("BOX", (1, 0), (1, 0), 0.5, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
        hAlign="LEFT",
    )
    story.append(party_table)
    story.append(Spacer(1, 6 * mm))

    # ── Line items table ──────────────────────────────────────────────────────
    currency = invoice.currency or "MAD"
    items = invoice.items or []

    col_widths = [8 * mm, 55 * mm, 30 * mm, 15 * mm, 30 * mm, 30 * mm]

    head_row = [
        Paragraph("N°", s["th"]),
        Paragraph("Désignation", s["th"]),
        Paragraph("Description", s["th"]),
        Paragraph("Qté", s["th"]),
        Paragraph(f"PU HT ({currency})", s["th"]),
        Paragraph(f"Total HT ({currency})", s["th"]),
    ]
    rows = [head_row]
    for i, item in enumerate(items):
        rows.append([
            Paragraph(str(i + 1), s["td_c"]),
            Paragraph(str(item.name or ""), s["td"]),
            Paragraph(str(item.description or ""), s["td"]),
            Paragraph(str(item.quantity or 1), s["td_c"]),
            Paragraph(_fmt_amount(item.unit_price, ""), s["td_r"]),
            Paragraph(_fmt_amount(item.total, ""), s["td_r"]),
        ])

    if not items:
        rows.append([
            Paragraph("", s["td"]),
            Paragraph("—", s["td"]),
            Paragraph("", s["td"]),
            Paragraph("", s["td_c"]),
            Paragraph("", s["td_r"]),
            Paragraph("", s["td_r"]),
        ])

    item_table_style = TableStyle([
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        # Body alternating rows
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREY]),
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.25, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ])

    items_tbl = Table(rows, colWidths=col_widths, style=item_table_style,
                      repeatRows=1, hAlign="LEFT")
    story.append(items_tbl)
    story.append(Spacer(1, 4 * mm))

    # ── Totals ────────────────────────────────────────────────────────────────
    tva_rate = invoice.tva or 0
    subtotal = float(invoice.subtotal_ht or 0)
    tva_amount = float(invoice.amount_tva or 0)
    total = float(invoice.total_amount or 0)

    totals_data = [
        [Paragraph("Sous-total HT", s["total_label"]),
         Paragraph(_fmt_amount(subtotal, currency), s["total_value"])],
        [Paragraph(f"TVA ({tva_rate:.0f}%)", s["total_label"]),
         Paragraph(_fmt_amount(tva_amount, currency), s["total_value"])],
        [Paragraph("TOTAL TTC", s["grand_label"]),
         Paragraph(_fmt_amount(total, currency), s["grand_value"])],
    ]
    totals_tbl = Table(
        totals_data,
        colWidths=[usable_w - 65 * mm, 65 * mm],
        style=TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LINEABOVE", (0, 2), (-1, 2), 1, BLUE),
            ("BACKGROUND", (0, 2), (-1, 2), LIGHT_BLUE),
            ("BOX", (0, 2), (-1, 2), 0.5, BLUE),
        ]),
        hAlign="RIGHT",
    )
    story.append(totals_tbl)
    story.append(Spacer(1, 6 * mm))

    # ── Bank details + footer ─────────────────────────────────────────────────
    bank_lines = []
    if company.get("bank_name") or company.get("bank_account"):
        bank_lines.append(Paragraph("Coordonnées bancaires", s["section_head"]))
        if company.get("bank_name"):
            bank_lines.append(Paragraph(f"Banque : {company['bank_name']}", s["body"]))
        if company.get("bank_account"):
            bank_lines.append(Paragraph(f"RIB : {company['bank_account']}", s["body"]))

    legal_parts = []
    for key, label in [("ice", "ICE"), ("rc", "RC"),
                        ("identifiant_fiscal", "IF"), ("capital", "Capital")]:
        if company.get(key):
            legal_parts.append(f"{label} : {company[key]}")
    legal_line = " — ".join(legal_parts) if legal_parts else ""

    if bank_lines or legal_line:
        story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER,
                                 spaceBefore=2 * mm, spaceAfter=4 * mm))

    if bank_lines:
        for b in bank_lines:
            story.append(b)
        story.append(Spacer(1, 3 * mm))

    if legal_line:
        story.append(Paragraph(legal_line, s["footer"]))

    generated = datetime.now().strftime("%d/%m/%Y à %H:%M")
    story.append(Paragraph(f"Document généré le {generated}", s["footer"]))

    doc.build(story)
    return buf.getvalue()
