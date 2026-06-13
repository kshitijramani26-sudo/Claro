"""Customer autocomplete search (saved customers; device contacts merge client-side)."""
from uuid import UUID

from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..schemas import ActivityRead, CustomerRead, PrescriptionCreate, PrescriptionRead

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


@router.post("/{customer_id}/prescriptions", response_model=PrescriptionRead)
async def create_prescription(customer_id: UUID, payload: PrescriptionCreate, biz: CurrentBusiness = Depends(get_current_business)) -> PrescriptionRead:
    async with biz_txn(biz.id) as conn:
        cust_id = await conn.fetchval(
            "SELECT id FROM customers WHERE id = $1 AND business_id = $2", customer_id, biz.id
        )
        if cust_id is None:
            from ..errors import NotFoundError
            raise NotFoundError("Customer not found")
        row = await conn.fetchrow(
            """INSERT INTO prescriptions (business_id, customer_id, date,
                                         r_dist_sph, r_dist_cyl, r_dist_axis, r_dist_vn,
                                         r_near_sph, r_near_cyl, r_near_axis, r_near_vn,
                                         l_dist_sph, l_dist_cyl, l_dist_axis, l_dist_vn,
                                         l_near_sph, l_near_cyl, l_near_axis, l_near_vn,
                                         add_r, add_l, pd, lens_types, remarks)
               VALUES ($1,$2,COALESCE($3, CURRENT_DATE),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
               RETURNING *""",
            biz.id, customer_id, payload.date,
            payload.r_dist_sph, payload.r_dist_cyl, payload.r_dist_axis, payload.r_dist_vn,
            payload.r_near_sph, payload.r_near_cyl, payload.r_near_axis, payload.r_near_vn,
            payload.l_dist_sph, payload.l_dist_cyl, payload.l_dist_axis, payload.l_dist_vn,
            payload.l_near_sph, payload.l_near_cyl, payload.l_near_axis, payload.l_near_vn,
            payload.add_r, payload.add_l, payload.pd, payload.lens_types, payload.remarks
        )
    return PrescriptionRead(**dict(row))

