"""Analytics — period KPIs, sparkline, best-sellers, CA CSV export."""
import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Response

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..schemas import AnalyticsRead, BestSellingRead, Period
from ..util import IST, ist_day_start_utc, ist_month_start_utc, ist_now, ist_today

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _window(period: Period) -> datetime:
    if period == "today":
        return ist_day_start_utc()
    if period == "week":
        return ist_day_start_utc(ist_today() - timedelta(days=6))
    return ist_month_start_utc()


@router.get("", response_model=AnalyticsRead)
async def analytics(period: Period = "today", biz: CurrentBusiness = Depends(get_current_business)) -> AnalyticsRead:
    start = _window(period)
    async with biz_txn(biz.id) as conn:
        kpi = await conn.fetchrow(
            """
            SELECT
              COALESCE((SELECT sum(grand_total_paise) FROM bills
                        WHERE business_id = $1 AND created_at >= $2), 0) AS sales,
              -- P&L: revenue minus known cost of goods (inventory lines); ad-hoc lines
              -- have no recorded cost and contribute their full amount.
              COALESCE((SELECT sum(bi.line_total_paise - COALESCE(bi.qty * ii.cost_paise, 0))
                        FROM bill_items bi
                        JOIN bills b ON b.id = bi.bill_id
                        LEFT JOIN inventory_items ii ON ii.id = bi.inventory_item_id
                        WHERE bi.business_id = $1 AND b.created_at >= $2), 0) AS net_pnl,
              COALESCE((SELECT sum(outstanding_balance_paise) FROM customers
                        WHERE business_id = $1 AND outstanding_balance_paise > 0), 0) AS credit_out,
              COALESCE((SELECT sum(qty_on_hand::bigint * price_paise) FROM inventory_items
                        WHERE business_id = $1), 0) AS inventory_value,
              COALESCE((SELECT s.name FROM staff_ledger l JOIN staff s ON s.id = l.staff_id
                        WHERE l.business_id = $1 AND l.type = 'sale_attrib' AND l.created_at >= $2
                        GROUP BY s.name ORDER BY sum(l.amount_paise) DESC LIMIT 1), '') AS top_staff
            """,
            biz.id, start,
        )
        if period == "today":
            buckets = await conn.fetch(
                """SELECT extract(hour FROM created_at AT TIME ZONE 'Asia/Kolkata')::int AS b,
                          sum(grand_total_paise) AS v
                   FROM bills WHERE business_id = $1 AND created_at >= $2 GROUP BY 1""",
                biz.id, start,
            )
            spark = [0] * 24
            for r in buckets:
                spark[r["b"]] = int(r["v"])
            spark = spark[: max(ist_now().hour + 1, 6)]
        else:
            buckets = await conn.fetch(
                """SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS b, sum(grand_total_paise) AS v
                   FROM bills WHERE business_id = $1 AND created_at >= $2 GROUP BY 1""",
                biz.id, start,
            )
            vals = {r["b"]: int(r["v"]) for r in buckets}
            days = 7 if period == "week" else ist_today().day
            first = ist_today() - timedelta(days=days - 1)
            spark = [vals.get(first + timedelta(days=i), 0) for i in range(days)]

    return AnalyticsRead(
        net_pnl_paise=kpi["net_pnl"], sales_paise=kpi["sales"],
        credit_outstanding_paise=kpi["credit_out"], inventory_value_paise=kpi["inventory_value"],
        top_staff=kpi["top_staff"], spark=spark,
    )


@router.get("/best-selling", response_model=list[BestSellingRead])
async def best_selling(period: Period = "month", limit: int = 4, biz: CurrentBusiness = Depends(get_current_business)) -> list[BestSellingRead]:
    start = _window(period)
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """SELECT bi.inventory_item_id AS id, min(bi.name) AS name,
                      sum(bi.qty)::int AS units, sum(bi.line_total_paise) AS revenue
               FROM bill_items bi JOIN bills b ON b.id = bi.bill_id
               WHERE bi.business_id = $1 AND b.created_at >= $2 AND bi.inventory_item_id IS NOT NULL
               GROUP BY bi.inventory_item_id
               ORDER BY units DESC LIMIT $3""",
            biz.id, start, max(1, min(limit, 20)),
        )
    return [BestSellingRead(id=r["id"], name=r["name"], units=r["units"], revenue_paise=r["revenue"]) for r in rows]


@router.get("/export")
async def export_csv(period: Period = "month", biz: CurrentBusiness = Depends(get_current_business)) -> Response:
    start = _window(period)
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """SELECT b.invoice_no, b.created_at, COALESCE(c.name, '') AS customer, b.payment_mode,
                      b.gst_mode, b.tax_kind, b.subtotal_paise, b.discount_paise, b.taxable_paise,
                      b.cgst_paise, b.sgst_paise, b.igst_paise, b.tax_total_paise, b.grand_total_paise
               FROM bills b LEFT JOIN customers c ON c.id = b.customer_id
               WHERE b.business_id = $1 AND b.created_at >= $2
               ORDER BY b.created_at""",
            biz.id, start,
        )
        tax_rows = await conn.fetch(
            """SELECT bi.tax_rate_bps, sum(bi.taxable_paise) AS taxable, sum(bi.tax_paise) AS tax
               FROM bill_items bi JOIN bills b ON b.id = bi.bill_id
               WHERE bi.business_id = $1 AND b.created_at >= $2 AND bi.tax_paise > 0
               GROUP BY bi.tax_rate_bps ORDER BY bi.tax_rate_bps""",
            biz.id, start,
        )

    def rupees(paise: int) -> str:
        return f"{paise / 100:.2f}"

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Invoice", "Date (IST)", "Customer", "Mode", "GST mode", "Tax kind",
                     "Subtotal", "Discount", "Taxable", "CGST", "SGST", "IGST", "Tax total", "Grand total"])
    for r in rows:
        writer.writerow([
            r["invoice_no"], r["created_at"].astimezone(IST).strftime("%Y-%m-%d %H:%M"),
            r["customer"], r["payment_mode"], r["gst_mode"], r["tax_kind"],
            rupees(r["subtotal_paise"]), rupees(r["discount_paise"]), rupees(r["taxable_paise"]),
            rupees(r["cgst_paise"]), rupees(r["sgst_paise"]), rupees(r["igst_paise"]),
            rupees(r["tax_total_paise"]), rupees(r["grand_total_paise"]),
        ])
    writer.writerow([])
    writer.writerow(["Tax summary by rate"])
    writer.writerow(["Rate %", "Taxable", "Tax"])
    for r in tax_rows:
        writer.writerow([f"{r['tax_rate_bps'] / 100:g}", rupees(r["taxable"]), rupees(r["tax"])])

    return Response(
        content=buf.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="claro-{period}.csv"'},
    )
