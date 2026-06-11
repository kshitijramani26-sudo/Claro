"""Billing home — today summary (single aggregate round trip) + activity feed."""
from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..schemas import ActivityRead, SummaryRead
from ..util import ist_day_start_utc, ist_month_start_utc, month_label

router = APIRouter(tags=["home"])


@router.get("/summary/today", response_model=SummaryRead)
async def summary_today(biz: CurrentBusiness = Depends(get_current_business)) -> SummaryRead:
    day0 = ist_day_start_utc()
    month0 = ist_month_start_utc()
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            """
            SELECT
              COALESCE((SELECT sum(grand_total_paise) FROM bills
                        WHERE business_id = $1 AND created_at >= $2), 0)            AS todays_sales,
              (SELECT count(*) FROM bills
               WHERE business_id = $1 AND created_at >= $2)                          AS todays_bills,
              COALESCE((SELECT sum(outstanding_balance_paise) FROM customers
                        WHERE business_id = $1 AND outstanding_balance_paise > 0), 0) AS pending_khata,
              (SELECT count(*) FROM inventory_items
               WHERE business_id = $1 AND qty_on_hand <= low_stock_threshold)        AS low_stock,
              COALESCE((SELECT sum(grand_total_paise) FROM bills
                        WHERE business_id = $1 AND created_at >= $3), 0)             AS month_sales,
              COALESCE((SELECT s.name FROM staff_ledger l JOIN staff s ON s.id = l.staff_id
                        WHERE l.business_id = $1 AND l.type = 'sale_attrib' AND l.created_at >= $3
                        GROUP BY s.name ORDER BY sum(l.amount_paise) DESC LIMIT 1), '') AS top_staff
            """,
            biz.id, day0, month0,
        )
    return SummaryRead(
        todays_sales_paise=row["todays_sales"], todays_bills=row["todays_bills"],
        pending_khata_paise=row["pending_khata"], low_stock=row["low_stock"],
        month_sales_paise=row["month_sales"], month_label=month_label(), top_staff=row["top_staff"],
    )


@router.get("/activity", response_model=list[ActivityRead])
async def activity(limit: int = 20, biz: CurrentBusiness = Depends(get_current_business)) -> list[ActivityRead]:
    limit = max(1, min(limit, 100))
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """
            (SELECT 'bill-' || b.id AS id, b.invoice_no AS title,
                    b.payment_mode || CASE WHEN s.name IS NOT NULL THEN ' · ' || s.name ELSE '' END AS sub,
                    b.grand_total_paise AS amount, 'sale' AS kind, b.created_at AS at
             FROM bills b LEFT JOIN staff s ON s.id = b.staff_id
             WHERE b.business_id = $1 AND b.payment_mode IN ('CASH','UPI'))
            UNION ALL
            (SELECT 'khata-' || k.id, c.name,
                    CASE WHEN k.type = 'credit' THEN 'Credit added · Khata' ELSE 'Settled up' END,
                    k.amount_paise,
                    CASE WHEN k.type = 'credit' THEN 'credit' ELSE 'settle' END, k.created_at
             FROM khata_entries k JOIN customers c ON c.id = k.customer_id
             WHERE k.business_id = $1)
            ORDER BY at DESC LIMIT $2
            """,
            biz.id, limit,
        )
    return [
        ActivityRead(id=r["id"], title=r["title"], sub=r["sub"], amount_paise=r["amount"],
                     kind=r["kind"], at=r["at"])
        for r in rows
    ]
