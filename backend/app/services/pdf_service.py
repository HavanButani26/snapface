import io
import json
import qrcode
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER


BLUE = HexColor("#2563EB")
LIGHT_BLUE = HexColor("#EFF6FF")
DARK = HexColor("#0F172A")
GRAY = HexColor("#64748B")
LIGHT_GRAY = HexColor("#F8FAFC")
BORDER = HexColor("#E2E8F0")
GREEN = HexColor("#16A34A")
RED = HexColor("#DC2626")
AMBER = HexColor("#D97706")


def generate_upi_qr(upi_id: str, amount: float, name: str, note: str) -> io.BytesIO:
    upi_url = f"upi://pay?pa={upi_id}&pn={name}&am={amount:.2f}&cu=INR&tn={note}"
    qr = qrcode.QRCode(box_size=4, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(upi_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2563EB", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def generate_invoice_pdf(invoice_data: dict, user_data: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ──
    header_data = [[
        # Left: studio info
        Paragraph(
            f'<font size="20" color="#2563EB"><b>{user_data.get("studio_name") or user_data.get("name", "Photography Studio")}</b></font><br/>'
            f'<font size="9" color="#64748B">{user_data.get("studio_address") or ""}</font><br/>'
            f'<font size="9" color="#64748B">📞 {user_data.get("studio_phone") or ""}</font><br/>'
            f'<font size="9" color="#64748B">✉ {user_data.get("email") or ""}</font>'
            + (f'<br/><font size="9" color="#64748B">GSTIN: {user_data.get("studio_gstin")}</font>' if user_data.get("studio_gstin") else ""),
            ParagraphStyle("left", fontName="Helvetica", leading=14)
        ),
        # Right: INVOICE label + details
        Paragraph(
            f'<font size="28" color="#2563EB"><b>INVOICE</b></font><br/>'
            f'<font size="9" color="#64748B">Invoice No: </font><font size="9" color="#0F172A"><b>{invoice_data["invoice_number"]}</b></font><br/>'
            f'<font size="9" color="#64748B">Date: </font><font size="9" color="#0F172A">{invoice_data["invoice_date"]}</font><br/>'
            + (f'<font size="9" color="#64748B">Due: </font><font size="9" color="#0F172A">{invoice_data.get("due_date", "")}</font>' if invoice_data.get("due_date") else ""),
            ParagraphStyle("right", fontName="Helvetica", alignment=TA_RIGHT, leading=16)
        ),
    ]]

    header_table = Table(header_data, colWidths=[90*mm, 85*mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), white),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6*mm))

    # Status badge
    status = invoice_data.get("status", "pending")
    status_color = {"paid": "#16A34A", "pending": "#D97706", "overdue": "#DC2626", "cancelled": "#64748B"}.get(status, "#D97706")
    story.append(Paragraph(
        f'<font size="10" color="{status_color}"><b>● {status.upper()}</b></font>',
        ParagraphStyle("status", fontName="Helvetica", leading=14)
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=4*mm, spaceBefore=2*mm))

    # ── Bill To ──
    bill_to_data = [[
        Paragraph(
            f'<font size="9" color="#64748B"><b>BILL TO</b></font><br/>'
            f'<font size="11" color="#0F172A"><b>{invoice_data["client_name"]}</b></font><br/>'
            + (f'<font size="9" color="#64748B">{invoice_data.get("client_address", "")}</font><br/>' if invoice_data.get("client_address") else "")
            + (f'<font size="9" color="#64748B">📞 {invoice_data.get("client_phone", "")}</font><br/>' if invoice_data.get("client_phone") else "")
            + (f'<font size="9" color="#64748B">✉ {invoice_data.get("client_email", "")}</font>' if invoice_data.get("client_email") else ""),
            ParagraphStyle("billto", fontName="Helvetica", leading=13)
        ),
        Paragraph(
            f'<font size="9" color="#64748B"><b>EVENT DETAILS</b></font><br/>'
            + (f'<font size="11" color="#0F172A"><b>{invoice_data.get("event_name", "")}</b></font><br/>' if invoice_data.get("event_name") else "")
            + (f'<font size="9" color="#64748B">Date: {invoice_data.get("event_date", "")}</font>' if invoice_data.get("event_date") else ""),
            ParagraphStyle("event", fontName="Helvetica", leading=13)
        ),
    ]]

    bill_table = Table(bill_to_data, colWidths=[90*mm, 85*mm])
    bill_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), LIGHT_BLUE),
        ("BACKGROUND", (1, 0), (1, 0), LIGHT_GRAY),
        ("BOX", (0, 0), (0, 0), 0.5, BORDER),
        ("BOX", (1, 0), (1, 0), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    story.append(bill_table)
    story.append(Spacer(1, 6*mm))

    # ── Line Items Table ──
    items = json.loads(invoice_data.get("items", "[]"))

    item_header = ["#", "Description", "Qty", "Rate (₹)", "Amount (₹)"]
    item_rows = [item_header]
    for i, item in enumerate(items, 1):
        item_rows.append([
            str(i),
            item.get("description", ""),
            str(item.get("quantity", 1)),
            f"₹{item.get('rate', 0):,.2f}",
            f"₹{item.get('amount', 0):,.2f}",
        ])

    col_widths = [10*mm, 80*mm, 15*mm, 30*mm, 35*mm]
    items_table = Table(item_rows, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        # Rows
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("LEFTPADDING", (1, 1), (1, -1), 6),
        # Alternating rows
        *[("BACKGROUND", (0, i), (-1, i), LIGHT_GRAY) for i in range(2, len(item_rows), 2)],
        # Border
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, BORDER),
        ("LINEBEFORE", (0, 0), (0, -1), 0.5, BORDER),
        ("LINEAFTER", (-1, 0), (-1, -1), 0.5, BORDER),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4*mm))

    # ── Totals ──
    subtotal = invoice_data.get("subtotal", 0)
    discount = invoice_data.get("discount_amount", 0)
    tax_pct = invoice_data.get("tax_percent", 18)
    tax_amt = invoice_data.get("tax_amount", 0)
    total = invoice_data.get("total_amount", 0)

    totals_data = []
    if discount > 0:
        totals_data.append(["Subtotal", f"₹{subtotal:,.2f}"])
        totals_data.append([f"Discount", f"-₹{discount:,.2f}"])
    totals_data.append([f"GST ({tax_pct}%)", f"₹{tax_amt:,.2f}"])
    totals_data.append(["TOTAL", f"₹{total:,.2f}"])

    totals_table_data = [[
        "",  # left spacer
        Table(
            totals_data,
            colWidths=[50*mm, 35*mm],
            style=TableStyle([
                ("FONTNAME", (0, 0), (-1, -2), "Helvetica"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -2), 9),
                ("FONTSIZE", (0, -1), (-1, -1), 11),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("TEXTCOLOR", (0, -1), (-1, -1), BLUE),
                ("BACKGROUND", (0, -1), (-1, -1), LIGHT_BLUE),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LINEABOVE", (0, -1), (-1, -1), 1, BLUE),
                ("BOX", (0, -1), (-1, -1), 0.5, BLUE),
            ])
        )
    ]]
    totals_outer = Table(totals_table_data, colWidths=[90*mm, 85*mm])
    story.append(totals_outer)
    story.append(Spacer(1, 6*mm))

    # ── QR + Payment ──
    upi_id = user_data.get("studio_upi_id")
    payment_url = invoice_data.get("razorpay_payment_link_url")

    qr_section_data = [[]]
    left_content = []
    right_content = []

    # Left: QR code
    if upi_id:
        try:
            qr_buf = generate_upi_qr(
                upi_id,
                total,
                user_data.get("studio_name") or user_data.get("name", "Studio"),
                f"Invoice {invoice_data['invoice_number']}"
            )
            qr_img = Image(qr_buf, width=35*mm, height=35*mm)
            left_content = [
                Paragraph('<font size="9" color="#64748B"><b>PAY VIA UPI</b></font>', ParagraphStyle("c", alignment=TA_CENTER, fontName="Helvetica")),
                Spacer(1, 2*mm),
                qr_img,
                Spacer(1, 1*mm),
                Paragraph(f'<font size="8" color="#2563EB">{upi_id}</font>', ParagraphStyle("c", alignment=TA_CENTER, fontName="Helvetica")),
                Paragraph('<font size="7" color="#64748B">Scan with any UPI app</font>', ParagraphStyle("c", alignment=TA_CENTER, fontName="Helvetica")),
            ]
        except Exception:
            pass

    # Right: Payment link + notes
    right_parts = ['<font size="9" color="#64748B"><b>PAYMENT DETAILS</b></font><br/>']
    if payment_url:
        right_parts.append(f'<font size="8" color="#2563EB">Online: {payment_url[:50]}...</font><br/>')
    if invoice_data.get("notes"):
        right_parts.append(f'<br/><font size="9" color="#64748B"><b>Notes:</b></font><br/><font size="8" color="#0F172A">{invoice_data["notes"]}</font>')
    right_parts.append(f'<br/><font size="8" color="#64748B">Thank you for your business!</font>')

    right_content = [Paragraph("".join(right_parts), ParagraphStyle("notes", fontName="Helvetica", leading=12))]

    if left_content:
        from reportlab.platypus import KeepInFrame
        qr_col = Table([[item] for item in left_content], colWidths=[45*mm])
        qr_col.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        bottom_data = [[qr_col, Table([[item] for item in right_content], colWidths=[120*mm])]]
    else:
        bottom_data = [[Table([[item] for item in right_content], colWidths=[175*mm])]]

    bottom_table = Table(bottom_data, colWidths=[50*mm, 125*mm] if left_content else [175*mm])
    bottom_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(bottom_table)

    # ── Footer ──
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f'<font size="8" color="#94A3B8">Generated by SnapFace · {user_data.get("studio_name") or user_data.get("name")} · This is a computer-generated invoice</font>',
        ParagraphStyle("footer", fontName="Helvetica", alignment=TA_CENTER)
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()