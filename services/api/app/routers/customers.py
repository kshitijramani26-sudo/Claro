"""Customer autocomplete search (saved customers; device contacts merge client-side)."""
from uuid import UUID

from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..schemas import ActivityRead, CustomerRead, PrescriptionRead

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/search", response_model=list[CustomerRead])
async def search(q: str = "", limit: int = 8, biz: CurrentBusiness = Depends(get_current_business)) -> list[CustomerRead]:
    q = q.strip()
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """SELECT id, name, COALESCE(phone, '') AS phone, state_code, outstanding_balance_paise
               FROM customers
               WHERE business_id = $1 AND ($2 = '' OR lower(name) LIKE lower($2) || '%'
                                           OR phone LIKE '%' || $2 || '%')
               ORDER BY name LIMIT $3""",
            biz.id, q, max(1, min(limit, 25)),
        )
    return [
        CustomerRead(id=r["id"], name=r["name"], phone=r["phone"], state_code=r["state_code"],
                     outstanding_paise=r["outstanding_balance_paise"])
        for r in rows
    ]


@router.get("/{customer_id}/activity", response_model=list[ActivityRead])
async def customer_activity(customer_id: UUID, limit: int = 50, biz: CurrentBusiness = Depends(get_current_business)) -> list[ActivityRead]:
    """A customer's full history — their cash/UPI bills + khata credits/payments."""
    limit = max(1, min(limit, 200))
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """
            (SELECT 'bill-' || b.id AS id, b.invoice_no AS title, b.payment_mode AS sub,
                    b.grand_total_paise AS amount, 'sale' AS kind, b.created_at AS at, b.id::text AS bill_id
             FROM bills b
             WHERE b.business_id = $1 AND b.customer_id = $2 AND b.payment_mode IN ('CASH','UPI'))
            UNION ALL
            (SELECT 'khata-' || k.id, COALESCE(b.invoice_no, k.note),
                    CASE WHEN k.type = 'credit' THEN 'Credit · Khata' ELSE 'Payment received' END,
                    k.amount_paise,
                    CASE WHEN k.type = 'credit' THEN 'credit' ELSE 'settle' END, k.created_at, k.bill_id::text
             FROM khata_entries k LEFT JOIN bills b ON b.id = k.bill_id
             WHERE k.business_id = $1 AND k.customer_id = $2)
            ORDER BY at DESC LIMIT $3
            """,
            biz.id, customer_id, limit,
        )
    return [
        ActivityRead(id=r["id"], title=r["title"] or "Entry", sub=r["sub"], amount_paise=r["amount"],
                     kind=r["kind"], at=r["at"], bill_id=r["bill_id"])
        for r in rows
    ]


@router.get("/{customer_id}/prescriptions", response_model=list[PrescriptionRead])
async def get_prescriptions(customer_id: UUID, limit: int = 50, biz: CurrentBusiness = Depends(get_current_business)) -> list[PrescriptionRead]:
    limit = max(1, min(limit, 100))
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """SELECT * FROM prescriptions
               WHERE business_id = $1 AND customer_id = $2
               ORDER BY date DESC, created_at DESC LIMIT $3""",
            biz.id, customer_id, limit,
        )
    return [PrescriptionRead(**dict(r)) for r in rows]


@router.get("/{customer_id}/prescriptions/latest", response_model=PrescriptionRead | None)
async def get_latest_prescription(customer_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> PrescriptionRead | None:
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            """SELECT * FROM prescriptions
               WHERE business_id = $1 AND customer_id = $2
               ORDER BY date DESC, created_at DESC LIMIT 1""",
            biz.id, customer_id,
        )
    if row is None:
        return None
    return PrescriptionRead(**dict(row))
