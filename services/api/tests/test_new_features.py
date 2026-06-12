"""Tests for the new billing/khata/staff features (discount, partial settle, salary)."""
import uuid

import pytest

from app.errors import DiscountExceedsSubtotalError, DomainError
from app.routers.khata import add_credit, settle
from app.routers.staff import add_advance, create_staff, pay_salary, staff_detail
from app.schemas import (
    AdvanceCreate,
    BillCreate,
    BillLineCreate,
    KhataCreditCreate,
    SalaryPayCreate,
    SettleCreate,
    StaffCreate,
)
from app.services.bills import confirm_bill

from .conftest import add_item


def bill_payload(**kw) -> BillCreate:
    return BillCreate(request_id=uuid.uuid4(), **kw)


# A7 — discount is applied pre-tax; GST computed on the discounted base.
async def test_discount_pre_tax_on_gst_bill(biz):
    item = await add_item(biz, "Atta", 11800, 10, tax_rate_bps=1800, inclusive=True)
    bill = await confirm_bill(biz, bill_payload(
        items=[BillLineCreate(inventory_item_id=item, name="-", qty=1, unit_price_paise=11800)],
        payment_mode="CASH", discount_paise=1000,
    ))
    assert bill.subtotal_paise == 11800
    assert bill.discount_paise == 1000
    # inclusive: line total == discounted base; taxable + tax == base
    assert bill.grand_total_paise == 10800
    assert bill.taxable_paise + bill.tax_total_paise == 10800
    assert bill.tax_total_paise > 0
    assert bill.cgst_paise + bill.sgst_paise == bill.tax_total_paise


# A7 — discount greater than subtotal is rejected.
async def test_discount_exceeds_subtotal_rejected(biz):
    item = await add_item(biz, "Salt", 2800, 5)
    with pytest.raises(DiscountExceedsSubtotalError):
        await confirm_bill(biz, bill_payload(
            items=[BillLineCreate(inventory_item_id=item, name="-", qty=1, unit_price_paise=2800)],
            payment_mode="CASH", discount_paise=5000,
        ))


# E1 — partial settlement reduces the balance by exactly the amount paid.
async def test_partial_settlement(biz):
    cust = await add_credit(KhataCreditCreate(name="Mohan", amount_paise=50000), biz)
    assert cust.outstanding_paise == 50000
    after = await settle(cust.id, SettleCreate(amount_paise=20000), biz)
    assert after.outstanding_paise == 30000
    # paying more than outstanding is rejected
    with pytest.raises(DomainError):
        await settle(cust.id, SettleCreate(amount_paise=99999), biz)
    # a second partial clears the rest
    final = await settle(cust.id, SettleCreate(amount_paise=30000), biz)
    assert final.outstanding_paise == 0


# B1 — Pay Salary records a salary_payment of the remaining, clears the advance,
# and the next month starts fresh (remaining == full salary).
async def test_pay_salary_cycle(biz):
    staff = await create_staff(StaffCreate(name="Amit", salary_paise=1_800_000), biz)
    await add_advance(staff.id, AdvanceCreate(amount_paise=200_000), biz)

    before = await staff_detail(staff.id, 14, biz)
    assert before.remaining_salary_paise == 1_600_000
    assert before.salary_paid_this_month is False

    paid = await pay_salary(staff.id, SalaryPayCreate(), biz)
    assert paid.advance_outstanding_paise == 0

    amount = await _fetch(biz, "SELECT amount_paise FROM staff_ledger WHERE staff_id = $1 AND type = 'salary_payment'", staff.id)
    assert amount == 1_600_000

    after = await staff_detail(staff.id, 14, biz)
    assert after.salary_paid_this_month is True
    assert after.remaining_salary_paise == 1_800_000  # advance cleared → fresh month


async def _fetch(biz, sql, *args):
    from app import db as appdb
    async with appdb.biz_txn(biz.id) as conn:
        return await conn.fetchval(sql, *args)


# Analytics extended sections — top customers, averages, payment mix, busiest.
async def test_analytics_sections(biz):
    from app.routers.analytics import analytics
    from .conftest import add_customer

    cust = await add_customer(biz, "Ramesh")
    # 3 today bills: CASH 100, UPI 200, CREDIT 300 (to Ramesh) — non_gst so grand == subtotal
    def adhoc(amount):
        return BillLineCreate(inventory_item_id=None, name="Misc", qty=1, unit_price_paise=amount)
    await confirm_bill(biz, bill_payload(items=[adhoc(10000)], payment_mode="CASH", gst_mode="non_gst"))
    await confirm_bill(biz, bill_payload(items=[adhoc(20000)], payment_mode="UPI", gst_mode="non_gst"))
    await confirm_bill(biz, bill_payload(items=[adhoc(30000)], payment_mode="CREDIT", customer_id=cust, gst_mode="non_gst"))

    a = await analytics("today", biz)
    # §3 averages
    assert a.sales_paise == 60000
    assert a.bill_count == 3
    assert a.avg_bill_paise == 20000  # 60000 // 3
    assert a.bills_per_day == 3.0
    # §4 payment mix sums to sales
    assert a.pay_cash_paise == 10000
    assert a.pay_upi_paise == 20000
    assert a.pay_credit_paise == 30000
    assert a.pay_cash_paise + a.pay_upi_paise + a.pay_credit_paise == a.sales_paise
    # §1 top customers + new/repeat (Ramesh's first-ever bill is today → new)
    assert a.top_customers[0].name == "Ramesh"
    assert a.top_customers[0].total_paise == 30000
    assert a.top_customers[0].bills == 1
    assert a.new_customers == 1
    assert a.repeat_customers == 0
    # §2 weekday histogram shape
    assert len(a.weekday_totals) == 7
    assert sum(a.weekday_totals) == 60000
