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
    PrescriptionCreate,
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


# Regression: customer upsert with a phone must match the PARTIAL unique index
# (business_id, phone) WHERE phone IS NOT NULL — previously 500'd in prod.
async def test_add_credit_with_phone_upserts(biz):
    from app.routers.khata import add_credit
    c1 = await add_credit(KhataCreditCreate(name="Ravi", phone="98765 11111", amount_paise=10000), biz)
    assert c1.outstanding_paise == 10000
    c2 = await add_credit(KhataCreditCreate(name="Ravi K", phone="98765 11111", amount_paise=5000), biz)
    assert c2.id == c1.id          # same customer (upserted on phone)
    assert c2.outstanding_paise == 15000


async def test_confirm_bill_with_customer_phone(biz):
    item = await add_item(biz, "X", 10000, 5)
    bill = await confirm_bill(biz, bill_payload(
        items=[BillLineCreate(inventory_item_id=item, name="-", qty=1, unit_price_paise=10000)],
        payment_mode="CREDIT", customer_name="Sita", customer_phone="98765 22222", gst_mode="non_gst",
    ))
    assert bill.grand_total_paise == 10000  # no 500 on the phone-upsert path


# #6 — stock value is cost basis (qty × cost), not selling price.
async def test_inventory_stats_cost_basis(biz):
    from app.routers.inventory import inventory_stats
    await add_item(biz, "Cost1", price_paise=10000, qty=4, cost_paise=6000)
    s = await inventory_stats(biz)
    assert s.total_value_paise == 24000  # 4 × 6000 cost, not 4 × 10000 price


# #7 — void a bill: restores stock, removes revenue rows + invoice.
async def test_void_cash_bill_reverses(biz):
    from app.services.bills import void_bill
    item = await add_item(biz, "Y", 5000, 10)
    bill = await confirm_bill(biz, bill_payload(
        items=[BillLineCreate(inventory_item_id=item, name="-", qty=3, unit_price_paise=5000)],
        payment_mode="CASH", gst_mode="non_gst",
    ))
    assert await _fetch(biz, "SELECT qty_on_hand FROM inventory_items WHERE id=$1", item) == 7
    await void_bill(biz, bill.id)
    assert await _fetch(biz, "SELECT qty_on_hand FROM inventory_items WHERE id=$1", item) == 10
    assert await _fetch(biz, "SELECT count(*) FROM bills WHERE id=$1", bill.id) == 0
    assert await _fetch(biz, "SELECT count(*) FROM payments WHERE bill_id=$1", bill.id) == 0


async def test_void_credit_bill_reverses_balance(biz):
    from app.services.bills import void_bill
    from .conftest import add_customer
    cust = await add_customer(biz, "Bal")
    item = await add_item(biz, "Z", 20000, 5)
    bill = await confirm_bill(biz, bill_payload(
        items=[BillLineCreate(inventory_item_id=item, name="-", qty=1, unit_price_paise=20000)],
        payment_mode="CREDIT", customer_id=cust, gst_mode="non_gst",
    ))
    assert await _fetch(biz, "SELECT outstanding_balance_paise FROM customers WHERE id=$1", cust) == 20000
    await void_bill(biz, bill.id)
    assert await _fetch(biz, "SELECT outstanding_balance_paise FROM customers WHERE id=$1", cust) == 0
    assert await _fetch(biz, "SELECT count(*) FROM khata_entries WHERE bill_id=$1", bill.id) == 0


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


# Step 3 — Beta auth endpoint tests
async def test_beta_auth_flow():
    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.config import get_settings
    
    settings = get_settings()
    original_beta_auth = settings.beta_auth
    original_code = settings.beta_login_code
    
    settings.beta_auth = True
    settings.beta_login_code = "123456"
    
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Login
            resp = await ac.post("/auth/login", json={"phone": "+919876543210"})
            assert resp.status_code == 200
            assert resp.json()["status"] == "otp_sent"
            
            # 2. Verify with invalid code
            resp = await ac.post("/auth/verify", json={"phone": "+919876543210", "code": "654321"})
            assert resp.status_code == 401
            
            # 3. Verify with valid code
            resp = await ac.post("/auth/verify", json={"phone": "+919876543210", "code": "123456"})
            assert resp.status_code == 200
            data = resp.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"
            assert data["user"]["phone"] == "+919876543210"
            
            # 4. Rate limiting test
            # Let's clean up rate limiting state
            from app.routers.auth import verify_attempts_ip, verify_attempts_phone
            verify_attempts_ip.clear()
            verify_attempts_phone.clear()
            
            # Make 5 requests (which is the limit)
            for _ in range(5):
                await ac.post("/auth/verify", json={"phone": "+919876543211", "code": "123456"})
            # The 6th request must trigger 429 Too Many Requests
            resp = await ac.post("/auth/verify", json={"phone": "+919876543211", "code": "123456"})
            assert resp.status_code == 429
    finally:
        settings.beta_auth = original_beta_auth
        settings.beta_login_code = original_code


# Part B/C/D — advance payments, prescriptions, order details
async def test_partial_payment_credit_bill(biz):
    from .conftest import add_customer
    cust = await add_customer(biz, "PartPay")
    item = await add_item(biz, "Glass Frame", 50000, 5) # 500.00
    
    # CREDIT bill of 500.00 with 150.00 advance received in UPI
    bill = await confirm_bill(biz, bill_payload(
        items=[BillLineCreate(inventory_item_id=item, name="-", qty=1, unit_price_paise=50000, item_kind="frame")],
        payment_mode="CREDIT", customer_id=cust,
        amount_received_paise=15000, received_mode="UPI",
        order_status="pending"
    ))
    
    assert bill.amount_received_paise == 15000
    assert bill.balance_due_paise == 35000
    assert bill.order_status == "pending"
    assert bill.items[0].item_kind == "frame"
    
    # Verify Payment row created for the advance
    pay_amt = await _fetch(biz, "SELECT amount_paise FROM payments WHERE bill_id = $1 AND mode = 'UPI'", bill.id)
    assert pay_amt == 15000
    
    # Verify Khata entry created for the balance
    khata_amt = await _fetch(biz, "SELECT amount_paise FROM khata_entries WHERE bill_id = $1 AND type = 'credit'", bill.id)
    assert khata_amt == 35000
    
    # Verify customer outstanding balance increased by the balance due
    bal = await _fetch(biz, "SELECT outstanding_balance_paise FROM customers WHERE id = $1", cust)
    assert bal == 35000


async def test_prescription_and_recall_latest(biz):
    from .conftest import add_customer
    from app.routers.customers import get_prescriptions, get_latest_prescription
    cust = await add_customer(biz, "RxUser")
    
    # Create bill with prescription
    rx_payload = PrescriptionCreate(
        r_dist_sph="+0.25", r_dist_cyl="-1.00", r_dist_axis=90, r_dist_vn="6/6",
        remarks="Test Rx", lens_types=["CR-39", "Anti-reflection"]
    )
    
    bill = await confirm_bill(biz, bill_payload(
        items=[BillLineCreate(name="Lens", qty=2, unit_price_paise=10000, item_kind="lens")],
        payment_mode="CASH", customer_name="RxUser", customer_id=cust,
        prescription=rx_payload
    ))
    
    # Retrieve prescriptions
    rx_list = await get_prescriptions(cust, biz=biz)
    assert len(rx_list) == 1
    assert rx_list[0].r_dist_sph == "+0.25"
    assert rx_list[0].remarks == "Test Rx"
    assert "CR-39" in rx_list[0].lens_types
    assert rx_list[0].bill_id == bill.id
    
    latest_rx = await get_latest_prescription(cust, biz=biz)
    assert latest_rx is not None
    assert latest_rx.r_dist_sph == "+0.25"
    
    # Verify voiding bill deletes the prescription
    from app.services.bills import void_bill
    await void_bill(biz, bill.id)
    assert await _fetch(biz, "SELECT count(*) FROM prescriptions WHERE id = $1", latest_rx.id) == 0


async def test_update_bill_status(biz):
    from app.routers.bills import update_bill_status
    from app.schemas import BillStatusUpdate
    item = await add_item(biz, "Lens", 15000, 10)
    bill = await confirm_bill(biz, bill_payload(
        items=[BillLineCreate(inventory_item_id=item, name="-", qty=1, unit_price_paise=15000)],
        payment_mode="CASH", order_status="pending"
    ))
    assert bill.order_status == "pending"
    
    updated = await update_bill_status(bill.id, BillStatusUpdate(order_status="ready"), biz=biz)
    assert updated.order_status == "ready"
    
    updated2 = await update_bill_status(bill.id, BillStatusUpdate(order_status="delivered"), biz=biz)
    assert updated2.order_status == "delivered"


