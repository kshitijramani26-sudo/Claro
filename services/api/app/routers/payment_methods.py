"""Payment methods — saved UPI IDs / QR images; one default per business."""
from uuid import UUID

from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, get_current_business
from ..permissions import require_manager
from ..db import biz_txn
from ..errors import DomainError, NotFoundError
from ..schemas import PaymentMethodCreate, PaymentMethodPatch, PaymentMethodRead

router = APIRouter(prefix="/payment-methods", tags=["payments"])

_COLS = "id, type, upi_id, qr_image_url, label, is_default"


@router.get("", response_model=list[PaymentMethodRead])
async def list_methods(biz: CurrentBusiness = Depends(get_current_business)) -> list[PaymentMethodRead]:
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            f"SELECT {_COLS} FROM payment_methods WHERE business_id = $1 ORDER BY is_default DESC, created_at",
            biz.id,
        )
    return [PaymentMethodRead(**dict(r)) for r in rows]


@router.post("", response_model=PaymentMethodRead)
async def create_method(payload: PaymentMethodCreate, biz: CurrentBusiness = Depends(require_manager)) -> PaymentMethodRead:
    if not payload.upi_id and not payload.qr_image_url:
        raise DomainError("Provide a UPI ID or a QR image")
    async with biz_txn(biz.id) as conn:
        count = await conn.fetchval("SELECT count(*) FROM payment_methods WHERE business_id = $1", biz.id)
        make_default = payload.is_default or count == 0
        if make_default:
            await conn.execute("UPDATE payment_methods SET is_default = false WHERE business_id = $1", biz.id)
        row = await conn.fetchrow(
            f"""INSERT INTO payment_methods (business_id, upi_id, label, qr_image_url, is_default)
                VALUES ($1, $2, $3, $4, $5) RETURNING {_COLS}""",
            biz.id, payload.upi_id.strip(), payload.label.strip(), payload.qr_image_url, make_default,
        )
    return PaymentMethodRead(**dict(row))


@router.patch("/{method_id}", response_model=PaymentMethodRead)
async def patch_method(method_id: UUID, payload: PaymentMethodPatch, biz: CurrentBusiness = Depends(require_manager)) -> PaymentMethodRead:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise DomainError("Nothing to update")
    cols = ", ".join(f"{k} = ${i + 3}" for i, k in enumerate(updates))
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            f"UPDATE payment_methods SET {cols} WHERE id = $1 AND business_id = $2 RETURNING {_COLS}",
            method_id, biz.id, *updates.values(),
        )
    if row is None:
        raise NotFoundError("Payment method not found")
    return PaymentMethodRead(**dict(row))


@router.patch("/{method_id}/set-default", response_model=PaymentMethodRead)
async def set_default(method_id: UUID, biz: CurrentBusiness = Depends(require_manager)) -> PaymentMethodRead:
    async with biz_txn(biz.id) as conn:
        ok = await conn.fetchval(
            "SELECT 1 FROM payment_methods WHERE id = $1 AND business_id = $2", method_id, biz.id
        )
        if ok is None:
            raise NotFoundError("Payment method not found")
        await conn.execute("UPDATE payment_methods SET is_default = false WHERE business_id = $1", biz.id)
        row = await conn.fetchrow(
            f"UPDATE payment_methods SET is_default = true WHERE id = $1 RETURNING {_COLS}", method_id
        )
    return PaymentMethodRead(**dict(row))


@router.delete("/{method_id}")
async def delete_method(method_id: UUID, biz: CurrentBusiness = Depends(require_manager)) -> dict:
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            "DELETE FROM payment_methods WHERE id = $1 AND business_id = $2 RETURNING is_default", method_id, biz.id
        )
        if row is None:
            raise NotFoundError("Payment method not found")
        if row["is_default"]:
            await conn.execute(
                """UPDATE payment_methods SET is_default = true
                   WHERE id = (SELECT id FROM payment_methods WHERE business_id = $1 ORDER BY created_at LIMIT 1)""",
                biz.id,
            )
    return {"ok": True}
