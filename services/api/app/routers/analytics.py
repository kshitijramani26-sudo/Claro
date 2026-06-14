"""Analytics — period KPIs, sparkline, best-sellers, CA CSV export."""
import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Response

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..schemas import AnalyticsRead, BestSellingRead, Period, TopCustomerRead
from ..util import IST, ist_day_start_utc, ist_month_start_utc, ist_now, ist_today

router = APIRouter(prefix="/analytics", tags=["analytics"])

_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _hour_label(h: int) -> str:
    """24h hour bucket → '6–7 PM' style label."""
    def fmt(x: int) -> tuple[int, str]:
        ap = "AM" if x < 12 else "PM"
        hr = x % 12
        return (12 if hr == 0 else hr), ap
    h1, ap1 = fmt(h)
    h2, ap2 = fmt((h + 1) % 24)
    return f"{h1}–{h2} {ap1}" if ap1 == ap2 else f"{h1} {ap1}–{h2} {ap2}"


def _period_days(period: Period) -> int:
    if period == "today":
        return 1
    if period == "week":
        return 7
    return ist_today().day


def _window(period: Period) -> datetime:
    if period == "today":
        return ist_day_start_utc()
    if period == "week":
        return ist_day_start_utc(ist_today() - timedelta(days=6))
    return ist_month_start_utc()


def _prev_window(period: Period) -> tuple[datetime, datetime]:
    """Return (prev_start, prev_end) — the immediately prior same-length window."""
    today = ist_today()
    if period == "today":
        prev_start = ist_day_start_utc(today - timedelta(days=1))
        prev_end = ist_day_start_utc(today)
    elif period == "week":
        prev_start = ist_day_start_utc(today - timedelta(days=13))
        prev_end = ist_day_start_utc(today - timedelta(days=6))
    else:  # month — previous calendar month
        first_of_this = today.replace(day=1)
        last_of_prev = first_of_this - timedelta(days=1)
        prev_start = ist_day_start_utc(last_of_prev.replace(day=1))
        prev_end = ist_day_start_utc(first_of_this)
    return prev_start, prev_end


@router.get("", response_model=AnalyticsRead)
async def analytics(period: Period = "today", biz: CurrentBusiness = Depends(get_current_business)) -> AnalyticsRead:
    start = _window(period)
    prev_start, prev_end = _prev_window(period)
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
                        GROUP BY s.name ORDER BY sum(l.amount_paise) DESC LIMIT 1), '') AS top_staff,
              -- prior period for % change chips
              COALESCE((SELECT sum(grand_total_paise) FROM bills
                        WHERE business_id = $1 AND created_at >= $3 AND created_at < $4), 0) AS prev_sales,
              COALESCE((SELECT sum(bi.line_total_paise - COALESCE(bi.qty * ii.cost_paise, 0))
                        FROM bill_items bi
                        JOIN bills b ON b.id = bi.bill_id
                        LEFT JOIN inventory_items ii ON ii.id = bi.inventory_item_id
                        WHERE bi.business_id = $1 AND b.created_at >= $3 AND b.created_at < $4), 0) AS prev_net_pnl,
              -- bill volume (this + prior period) for avg-bill / bills-per-day
              (SELECT count(*) FROM bills WHERE business_id = $1 AND created_at >= $2) AS bill_count,
              (SELECT count(*) FROM bills WHERE business_id = $1 AND created_at >= $3 AND created_at < $4) AS prev_bill_count,
              COALESCE((SELECT sum(grand_total_paise) FROM bills
                        WHERE business_id = $1 AND created_at >= $3 AND created_at < $4), 0) AS prev_sales2,
              -- payment mix (this period)
              COALESCE((SELECT sum(amount_paise) FROM payments
                        WHERE business_id = $1 AND created_at >= $2 AND mode = 'CASH'), 0) AS pay_cash,
              COALESCE((SELECT sum(amount_paise) FROM payments
                        WHERE business_id = $1 AND created_at >= $2 AND mode = 'UPI'), 0) AS pay_upi,
              COALESCE((SELECT sum(amount_paise) FROM khata_entries
                        WHERE business_id = $1 AND created_at >= $2 AND type = 'credit'), 0) AS pay_credit
            """,
            biz.id, start, prev_start, prev_end,
        )
        # §1 top customers + new/repeat
        top_rows = await conn.fetch(
            """SELECT c.name, sum(b.grand_total_paise) AS total, count(*)::int AS bills
               FROM bills b JOIN customers c ON c.id = b.customer_id
               WHERE b.business_id = $1 AND b.created_at >= $2
               GROUP BY c.id, c.name ORDER BY total DESC, bills DESC LIMIT 5""",
            biz.id, start,
        )
        nr = await conn.fetchrow(
            """SELECT
                 count(*) FILTER (WHERE first_bill >= $2) AS new_count,
                 count(*) FILTER (WHERE first_bill <  $2) AS repeat_count
               FROM (
                 SELECT b.customer_id, min(b.created_at) AS first_bill
                 FROM bills b
                 WHERE b.business_id = $1 AND b.customer_id IS NOT NULL
                   AND b.customer_id IN (SELECT customer_id FROM bills
                                         WHERE business_id = $1 AND created_at >= $2 AND customer_id IS NOT NULL)
                 GROUP BY b.customer_id
               ) t""",
            biz.id, start,
        )
        # §2 busiest weekday (ISO 1=Mon..7=Sun) + peak hour (IST)
        dow_rows = await conn.fetch(
            """SELECT extract(isodow FROM created_at AT TIME ZONE 'Asia/Kolkata')::int AS d,
                      sum(grand_total_paise) AS v
               FROM bills WHERE business_id = $1 AND created_at >= $2 GROUP BY 1""",
            biz.id, start,
        )
        hour_rows = await conn.fetch(
            """SELECT extract(hour FROM created_at AT TIME ZONE 'Asia/Kolkata')::int AS h,
                      sum(grand_total_paise) AS v
               FROM bills WHERE business_id = $1 AND created_at >= $2 GROUP BY 1""",
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

    # §2 weekday totals (Mon→Sun) + headline picks
    weekday_totals = [0] * 7
    for r in dow_rows:
        weekday_totals[r["d"] - 1] = int(r["v"])
    busiest_weekday = _WEEKDAYS[weekday_totals.index(max(weekday_totals))] if any(weekday_totals) else ""
    peak_hour_label = ""
    if hour_rows:
        peak = max(hour_rows, key=lambda r: r["v"])
        if peak["v"]:
            peak_hour_label = _hour_label(int(peak["h"]))

    # §3 averages + per-day rates (this + prior period)
    bill_count = int(kpi["bill_count"])
    prev_bill_count = int(kpi["prev_bill_count"])
    avg_bill = (kpi["sales"] // bill_count) if bill_count else 0
    prev_avg_bill = (kpi["prev_sales2"] // prev_bill_count) if prev_bill_count else 0
    days = _period_days(period)
    prev_days = max(1, (prev_end - prev_start).days)
    bills_per_day = round(bill_count / days, 2)
    prev_bills_per_day = round(prev_bill_count / prev_days, 2)

    return AnalyticsRead(
        net_pnl_paise=kpi["net_pnl"], sales_paise=kpi["sales"],
        credit_outstanding_paise=kpi["credit_out"], inventory_value_paise=kpi["inventory_value"],
        top_staff=kpi["top_staff"], spark=spark,
        prev_net_pnl_paise=kpi["prev_net_pnl"], prev_sales_paise=kpi["prev_sales"],
        bill_count=bill_count, avg_bill_paise=avg_bill, prev_avg_bill_paise=prev_avg_bill,
        bills_per_day=bills_per_day, prev_bills_per_day=prev_bills_per_day,
        top_customers=[TopCustomerRead(name=r["name"], total_paise=int(r["total"]), bills=r["bills"]) for r in top_rows],
        new_customers=int(nr["new_count"] or 0), repeat_customers=int(nr["repeat_count"] or 0),
        busiest_weekday=busiest_weekday, peak_hour_label=peak_hour_label, weekday_totals=weekday_totals,
        pay_cash_paise=kpi["pay_cash"], pay_upi_paise=kpi["pay_upi"], pay_credit_paise=kpi["pay_credit"],
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
