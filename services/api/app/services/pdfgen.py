"""Invoice PDF via reportlab. GST template (GSTIN, HSN column, CGST/SGST or IGST
rows, tax summary by rate) vs simple template, chosen by the bill's gst_mode
snapshot. Rendered on demand — no object storage."""
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from ..schemas import BillRead


def _inr(paise: int) -> str:
    sign = "-" if paise < 0 else ""
    paise = abs(paise)
    rupees, p = divmod(paise, 100)
    s = str(rupees)
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        s = ",".join(groups) + "," + last3
    return f"{sign}Rs.{s}" + (f".{p:02d}" if p else "")


def render_invoice_pdf(bill: BillRead, business: dict, upi_vpa: str | None) -> bytes:
    buf = io.BytesIO()
    w, h = A5
    c = canvas.Canvas(buf, pagesize=A5)
    is_gst = bill.gst_mode == "gst"
    x0, y = 14 * mm, h - 16 * mm

    c.setFont("Helvetica-Bold", 15)
    c.drawString(x0, y, business["name"])
    c.setFont("Helvetica", 8)
    y -= 5 * mm
    if is_gst and business.get("gstin"):
        c.drawString(x0, y, f"GSTIN: {business['gstin']}")
        y -= 4 * mm
    if business.get("address"):
        c.drawString(x0, y, business["address"][:70])
        y -= 4 * mm

    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(w - 14 * mm, h - 16 * mm, ("TAX INVOICE" if is_gst else "INVOICE"))
    c.setFont("Helvetica", 9)
    c.drawRightString(w - 14 * mm, h - 21 * mm, bill.invoice_no)
    c.drawRightString(w - 14 * mm, h - 25 * mm, bill.created_at.strftime("%d-%m-%Y"))
    if bill.delivery_date:
        d_str = bill.delivery_date.strftime("%d-%m-%Y") if hasattr(bill.delivery_date, "strftime") else str(bill.delivery_date)
        c.drawRightString(w - 14 * mm, h - 29 * mm, f"Delivery: {d_str}")

    # Status badge
    is_partial = bill.payment_mode == "CREDIT" and bill.amount_received_paise > 0
    is_unpaid = bill.payment_mode == "CREDIT" and bill.amount_received_paise == 0

    if is_partial:
        status_text = "PARTIALLY PAID"
        bg_color = colors.HexColor("#FEF3E2")
        text_color = colors.HexColor("#C2700A")
    elif is_unpaid:
        status_text = "UNPAID"
        bg_color = colors.HexColor("#FDECF2")
        text_color = colors.HexColor("#E5484D")
    else:
        status_text = "PAID"
        bg_color = colors.HexColor("#E8F7F0")
        text_color = colors.HexColor("#16A34A")

    badge_w = c.stringWidth(status_text, "Helvetica-Bold", 7) + 6
    badge_h = 12
    badge_x = w - 14 * mm - badge_w
    badge_y = h - 35 * mm
    c.setFillColor(bg_color)
    c.roundRect(badge_x, badge_y, badge_w, badge_h, 2, stroke=0, fill=1)
    c.setFillColor(text_color)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(badge_x + badge_w / 2.0, badge_y + 3, status_text)
    c.setFillColor(colors.black)

    if bill.customer_name:
        y -= 2 * mm
        c.setFont("Helvetica", 9)
        c.drawString(x0, y, f"Billed to: {bill.customer_name}")
        y -= 5 * mm

    # Table header
    y -= 3 * mm
    c.setStrokeColor(colors.HexColor("#888888"))
    c.setDash(2, 2)
    c.line(x0, y, w - 14 * mm, y)
    c.setDash()
    y -= 5 * mm
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x0, y, "Item")
    if is_gst:
        c.drawString(x0 + 52 * mm, y, "HSN")
        c.drawRightString(x0 + 78 * mm, y, "Qty")
        c.drawRightString(x0 + 98 * mm, y, "Rate")
        c.drawRightString(w - 14 * mm, y, "Amount")
    else:
        c.drawRightString(x0 + 78 * mm, y, "Qty")
        c.drawRightString(w - 14 * mm, y, "Amount")
    y -= 4 * mm

    c.setFont("Helvetica", 8)
    for item in bill.items:
        # Amount = original gross (qty x unit price). Any discount is shown once as
        # a single line in the totals block, never spread across item rows.
        gross = item.qty * item.unit_price_paise
        c.drawString(x0, y, item.name[:34])
        if is_gst:
            c.drawString(x0 + 52 * mm, y, item.hsn_code[:8])
            c.drawRightString(x0 + 78 * mm, y, str(item.qty))
            c.drawRightString(x0 + 98 * mm, y, _inr(item.unit_price_paise))
            c.drawRightString(w - 14 * mm, y, _inr(gross))
        else:
            c.drawRightString(x0 + 78 * mm, y, str(item.qty))
            c.drawRightString(w - 14 * mm, y, _inr(gross))
        y -= 4.2 * mm
        if y < 40 * mm:
            c.showPage()
            y = h - 16 * mm
            c.setFont("Helvetica", 8)

    c.setStrokeColor(colors.HexColor("#bbbbbb"))
    c.line(x0, y, w - 14 * mm, y)
    y -= 5 * mm

    def total_row(label: str, paise: int, bold: bool = False) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 9 if bold else 8)
        c.drawString(x0 + 50 * mm, y, label)
        c.drawRightString(w - 14 * mm, y, _inr(paise))
        y -= 4.5 * mm

    total_row("Subtotal", bill.subtotal_paise)
    if bill.discount_paise:
        total_row("Discount", -bill.discount_paise)
    if is_gst:
        if bill.tax_kind == "intra":
            total_row("CGST", bill.cgst_paise)
            total_row("SGST", bill.sgst_paise)
        elif bill.tax_kind == "inter":
            total_row("IGST", bill.igst_paise)
    total_row("TOTAL", bill.grand_total_paise, bold=True)
    if bill.balance_due_paise > 0:
        total_row("Paid (Advance)", bill.amount_received_paise)
        total_row("Balance Due", bill.balance_due_paise, bold=True)

    # Tax summary by rate (GST invoices)
    if is_gst and bill.tax_total_paise > 0:
        by_rate: dict[int, list[int]] = {}
        for item in bill.items:
            if item.tax_paise > 0:
                entry = by_rate.setdefault(item.tax_rate_bps, [0, 0])
                entry[0] += item.taxable_paise
                entry[1] += item.tax_paise
        y -= 2 * mm
        c.setFont("Helvetica-Bold", 7)
        c.drawString(x0, y, "Tax summary")
        y -= 4 * mm
        c.setFont("Helvetica", 7)
        for rate, (taxable, tax) in sorted(by_rate.items()):
            c.drawString(x0, y, f"GST {rate / 100:g}%  on {_inr(taxable)}  =  {_inr(tax)}")
            y -= 3.6 * mm

    # Eye Prescription (Rx) Table
    if bill.prescription:
        rx = bill.prescription
        y -= 4 * mm
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x0, y, "EYE PRESCRIPTION (Rx)")
        y -= 4 * mm
        c.setFont("Helvetica-Bold", 7)
        c.drawString(x0 + 24 * mm, y, "SPH")
        c.drawString(x0 + 38 * mm, y, "CYL")
        c.drawString(x0 + 52 * mm, y, "AXIS")
        c.drawString(x0 + 66 * mm, y, "V.N")
        y -= 3.5 * mm
        c.setFont("Helvetica", 7)
        
        def draw_rx_row(label, sph, cyl, axis, vn):
            nonlocal y
            c.drawString(x0, y, label)
            c.drawString(x0 + 24 * mm, y, sph or "-")
            c.drawString(x0 + 38 * mm, y, cyl or "-")
            c.drawString(x0 + 52 * mm, y, str(axis) if axis is not None else "-")
            c.drawString(x0 + 66 * mm, y, vn or "-")
            y -= 3.5 * mm

        draw_rx_row("R (Dist)", rx.r_dist_sph, rx.r_dist_cyl, rx.r_dist_axis, rx.r_dist_vn)
        draw_rx_row("R (Near)", rx.r_near_sph, rx.r_near_cyl, rx.r_near_axis, rx.r_near_vn)
        draw_rx_row("L (Dist)", rx.l_dist_sph, rx.l_dist_cyl, rx.l_dist_axis, rx.l_dist_vn)
        draw_rx_row("L (Near)", rx.l_near_sph, rx.l_near_cyl, rx.l_near_axis, rx.l_near_vn)
        
        y -= 1 * mm
        c.drawString(x0, y, f"Add R: {rx.add_r or '-'}")
        c.drawString(x0 + 25 * mm, y, f"Add L: {rx.add_l or '-'}")
        c.drawString(x0 + 50 * mm, y, f"PD: {rx.pd or '-'}")
        y -= 4 * mm
        
        if rx.lens_types:
            c.drawString(x0, y, f"Lens: {', '.join(rx.lens_types)}")
            y -= 3.6 * mm
        if rx.remarks:
            c.drawString(x0, y, f"Remarks: {rx.remarks}")
            y -= 3.6 * mm

    if upi_vpa:
        y -= 3 * mm
        c.setFont("Helvetica", 8)
        c.drawString(x0, y, f"Pay via UPI: {upi_vpa}")

    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.HexColor("#6B7280"))
    c.drawCentredString(w / 2, 13 * mm, "This is a digitally generated invoice and does not require a signature.")
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.HexColor("#2D1150"))
    c.drawCentredString(w / 2, 9 * mm, "Generated by Claro")
    c.setFillColor(colors.black)
    c.showPage()
    c.save()
    return buf.getvalue()
