"""Bills — confirm (the §7 endpoint), read, PDF, UPI QR."""
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..errors import NotFoundError
from ..schemas import BillCreate, BillRead, UpiRead, BillStatusUpdate
from ..services import bills as billsvc
from ..services.pdfgen import render_invoice_pdf
from ..services.storage import upload_invoice_pdf
from ..services.upi import qr_png_base64, upi_deeplink

router = APIRouter(prefix="/bills", tags=["bills"])


@router.post("", response_model=BillRead)
async def confirm_bill(payload: BillCreate, biz: CurrentBusiness = Depends(get_current_business)) -> BillRead:
    return await billsvc.confirm_bill(biz, payload)


@router.get("/{bill_id}", response_model=BillRead)
async def get_bill(bill_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> BillRead:
    return await billsvc.get_bill(biz, bill_id)


@router.delete("/{bill_id}")
async def delete_bill(bill_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> dict:
    """Void a bill created by mistake (reverses stock + revenue, removes the invoice)."""
    await billsvc.void_bill(biz, bill_id)
    return {"ok": True}


@router.patch("/{bill_id}/status", response_model=BillRead)
async def update_bill_status(bill_id: UUID, payload: BillStatusUpdate, biz: CurrentBusiness = Depends(get_current_business)) -> BillRead:
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            "UPDATE bills SET order_status = $1 WHERE id = $2 AND business_id = $3 RETURNING id",
            payload.order_status, bill_id, biz.id,
        )
        if row is None:
            raise NotFoundError("Bill not found")
        return await billsvc._read_bill(conn, bill_id)


async def _bill_vpa(biz: CurrentBusiness, bill: BillRead) -> tuple[str, str]:
    """(vpa, label) for the bill's chosen method, falling back to the default."""
    async with biz_txn(biz.id) as conn:
        row = None
        if bill.payment_method_id is not None:
            row = await conn.fetchrow(
                "SELECT upi_id, label FROM payment_methods WHERE id = $1 AND business_id = $2",
                bill.payment_method_id, biz.id,
            )
        if row is None:
            row = await conn.fetchrow(
                "SELECT upi_id, label FROM payment_methods WHERE business_id = $1 ORDER BY is_default DESC, created_at LIMIT 1",
                biz.id,
            )
    if row is None or not row["upi_id"]:
        raise NotFoundError("No UPI payment method configured")
    return row["upi_id"], row["label"]


@router.get("/{bill_id}/pdf")
async def bill_pdf(bill_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> Response:
    bill = await billsvc.get_bill(biz, bill_id)
    vpa: str | None = None
    try:
        vpa, _ = await _bill_vpa(biz, bill)
    except NotFoundError:
        pass
    pdf = render_invoice_pdf(bill, biz.row, vpa)
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{bill.invoice_no}.pdf"'},
    )


@router.post("/{bill_id}/share-link")
async def bill_share_link(bill_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> dict:
    """Render + host the invoice PDF for a WhatsApp link. Returns {url:null} when
    storage isn't configured — the app then attaches the file via the share sheet."""
    bill = await billsvc.get_bill(biz, bill_id)
    vpa: str | None = None
    try:
        vpa, _ = await _bill_vpa(biz, bill)
    except NotFoundError:
        pass
    pdf = render_invoice_pdf(bill, biz.row, vpa)
    path = f"{biz.id}/{bill.invoice_no}.pdf"
    url, reason = await upload_invoice_pdf(path, pdf)
    if url is not None:
        async with biz_txn(biz.id) as conn:
            await conn.execute("UPDATE bills SET pdf_url = $1 WHERE id = $2 AND business_id = $3", url, bill_id, biz.id)
    return {"url": url, "reason": reason}


@router.get("/{bill_id}/upi", response_model=UpiRead)
async def bill_upi(bill_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> UpiRead:
    bill = await billsvc.get_bill(biz, bill_id)
    vpa, label = await _bill_vpa(biz, bill)
    link = upi_deeplink(vpa, biz.row["name"], bill.grand_total_paise, bill.invoice_no)
    return UpiRead(upi_id=vpa, label=label, deeplink=link, qr_png_base64=qr_png_base64(link))
