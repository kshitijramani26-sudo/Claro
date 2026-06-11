"""UPI deep link + QR PNG (base64) for a bill's chosen payment method."""
import base64
import io
from urllib.parse import quote

import qrcode


def upi_deeplink(vpa: str, payee_name: str, amount_paise: int, note: str) -> str:
    rupees = f"{amount_paise // 100}.{amount_paise % 100:02d}"
    return (
        f"upi://pay?pa={quote(vpa)}&pn={quote(payee_name)}"
        f"&am={rupees}&cu=INR&tn={quote(note[:50])}"
    )


def qr_png_base64(data: str) -> str:
    qr = qrcode.QRCode(border=1, box_size=8)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
