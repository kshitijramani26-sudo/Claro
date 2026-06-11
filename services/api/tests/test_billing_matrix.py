"""billing_rules.md §9 test matrix + GST variants — against a real Postgres."""
import asyncio
import uuid

import pytest

from app.errors import InsufficientStockError, MissingCustomerForCreditError
from app.schemas import BillCreate, BillLineCreate
from app.services.bills import confirm_bill

from .conftest import add_customer, add_item, add_staff, fetchval


def bill_payload(**kw) -> BillCreate:
    return BillCreate(request_id=uuid.uuid4(), **kw)


def inv_line(item_id, qty=1, price=10000) -> BillLineCreate:
    return BillLineCreate(inventory_item_id=item_id, name="-", qty=qty, unit_price_paise=price)


# 1. CASH bill, 2 inventory lines → stock drops exactly, one Payment, no Khata, no staff entry.
async def test_cash_bill_two_lines(biz):
    a = await add_item(biz, "A", 10000, 10)
    b = await add_item(biz, "B", 5000, 8)
    bill = await confirm_bill(biz, bill_payload(
        items=[inv_line(a, qty=3, price=10000), inv_line(b, qty=2, price=5000)],
        payment_mode="CASH",
    ))
    assert await fetchval(biz, "SELECT qty_on_hand FROM inventory_items WHERE id = $1", a) == 7
    assert await fetchval(biz, "SELECT qty_on_hand FROM inventory_items WHERE id = $1", b) == 6
    assert await fetchval(biz, "SELECT count(*) FROM payments WHERE bill_id = $1", bill.id) == 1
    assert await fetchval(biz, "SELECT count(*) FROM khata_entries WHERE bill_id = $1", bill.id) == 0
    assert await fetchval(biz, "SELECT count(*) FROM staff_ledger WHERE bill_id = $1", bill.id) == 0
    ledger = await fetchval(biz, "SELECT sum(delta_qty) FROM stock_ledger WHERE bill_id = $1", bill.id)
    assert ledger == -5


# 2. CREDIT bill → KhataEntry(credit) + outstanding rises by grand_total; no Payment.
async def test_credit_bill(biz):
    cust = await add_customer(biz)
    item = await add_item(biz, "C", 11800, 5, tax_rate_bps=1800)
    bill = await confirm_bill(biz, bill_payload(
        items=[inv_line(item, qty=1, price=11800)], payment_mode="CREDIT", customer_id=cust,
    ))
    assert await fetchval(biz, "SELECT count(*) FROM payments WHERE bill_id = $1", bill.id) == 0
    entry = await fetchval(biz, "SELECT amount_paise FROM khata_entries WHERE bill_id = $1 AND type = 'credit'", bill.id)
    assert entry == bill.grand_total_paise
    outstanding = await fetchval(biz, "SELECT outstanding_balance_paise FROM customers WHERE id = $1", cust)
    assert outstanding == bill.grand_total_paise


# CREDIT without a customer → typed 422.
async def test_credit_without_customer_rejected(biz):
    item = await add_item(biz, "D", 1000, 5)
    with pytest.raises(MissingCustomerForCreditError):
        await confirm_bill(biz, bill_payload(items=[inv_line(item)], payment_mode="CREDIT"))


# 3. Staff attributed → one StaffLedger(sale_attrib); unattributed → none.
async def test_staff_attribution(biz):
    item = await add_item(biz, "E", 1000, 10)
    staff = await add_staff(biz)
    with_staff = await confirm_bill(biz, bill_payload(items=[inv_line(item)], payment_mode="CASH", staff_id=staff))
    without = await confirm_bill(biz, bill_payload(items=[inv_line(item)], payment_mode="CASH"))
    assert await fetchval(biz, "SELECT count(*) FROM staff_ledger WHERE bill_id = $1 AND type = 'sale_attrib'", with_staff.id) == 1
    assert await fetchval(biz, "SELECT count(*) FROM staff_ledger WHERE bill_id = $1", without.id) == 0


# 4. GST business → cgst+sgst == tax_total exactly; non-GST → all tax 0.
async def test_gst_split_exact(biz):
    item = await add_item(biz, "F", 10100, 5, tax_rate_bps=500, inclusive=False)
    bill = await confirm_bill(biz, bill_payload(items=[inv_line(item, price=10100)], payment_mode="CASH"))
    assert bill.cgst_paise + bill.sgst_paise == bill.tax_total_paise
    assert bill.tax_kind == "intra"
    assert bill.gst_mode == "gst"


async def test_per_bill_non_gst_on_gst_shop(biz):
    item = await add_item(biz, "G", 11800, 5, tax_rate_bps=1800)
    bill = await confirm_bill(biz, bill_payload(
        items=[inv_line(item, price=11800)], payment_mode="CASH", gst_mode="non_gst",
    ))
    assert bill.gst_mode == "non_gst"
    assert bill.tax_kind == "none"
    assert bill.tax_total_paise == bill.cgst_paise == bill.sgst_paise == bill.igst_paise == 0
    assert bill.grand_total_paise == 11800


async def test_gst_inter_state_igst(biz):
    item = await add_item(biz, "H", 11800, 5, tax_rate_bps=1800)
    bill = await confirm_bill(biz, bill_payload(
        items=[inv_line(item, price=11800)], payment_mode="CASH", customer_state_code="07",
    ))
    assert bill.tax_kind == "inter"
    assert bill.igst_paise == bill.tax_total_paise > 0
    assert bill.cgst_paise == bill.sgst_paise == 0


# 5. Oversell → InsufficientStockError, nothing persists.
async def test_oversell_aborts_everything(biz):
    item = await add_item(biz, "I", 1000, 2)
    payload = bill_payload(items=[inv_line(item, qty=3)], payment_mode="CASH")
    with pytest.raises(InsufficientStockError):
        await confirm_bill(biz, payload)
    assert await fetchval(biz, "SELECT qty_on_hand FROM inventory_items WHERE id = $1", item) == 2
    assert await fetchval(biz, "SELECT count(*) FROM bills WHERE business_id = $1 AND request_id = $2",
                          biz.id, payload.request_id) == 0
    assert await fetchval(biz, "SELECT count(*) FROM stock_ledger WHERE item_id = $1", item) == 0


# 6. Ad-hoc line (no inventory_item_id) → bill + revenue, no StockLedger.
async def test_adhoc_line_no_stock_effect(biz):
    bill = await confirm_bill(biz, bill_payload(
        items=[BillLineCreate(name="Service charge", qty=1, unit_price_paise=5000)],
        payment_mode="UPI",
    ))
    assert bill.grand_total_paise > 0
    assert await fetchval(biz, "SELECT count(*) FROM stock_ledger WHERE bill_id = $1", bill.id) == 0
    assert await fetchval(biz, "SELECT count(*) FROM payments WHERE bill_id = $1", bill.id) == 1


# 7. Idempotency: same request_id twice → identical bill once, effects once.
async def test_idempotent_replay(biz):
    item = await add_item(biz, "J", 1000, 10)
    payload = bill_payload(items=[inv_line(item, qty=2)], payment_mode="CASH")
    first = await confirm_bill(biz, payload)
    second = await confirm_bill(biz, payload)
    assert first.id == second.id
    assert await fetchval(biz, "SELECT qty_on_hand FROM inventory_items WHERE id = $1", item) == 8
    assert await fetchval(biz, "SELECT count(*) FROM payments WHERE bill_id = $1", first.id) == 1


# 8. Concurrency: two bills for the last unit → exactly one succeeds.
async def test_concurrent_last_unit(biz):
    item = await add_item(biz, "K", 1000, 1)
    p1 = bill_payload(items=[inv_line(item, qty=1)], payment_mode="CASH")
    p2 = bill_payload(items=[inv_line(item, qty=1)], payment_mode="CASH")
    results = await asyncio.gather(
        confirm_bill(biz, p1), confirm_bill(biz, p2), return_exceptions=True,
    )
    winners = [r for r in results if not isinstance(r, Exception)]
    losers = [r for r in results if isinstance(r, InsufficientStockError)]
    assert len(winners) == 1 and len(losers) == 1
    assert await fetchval(biz, "SELECT qty_on_hand FROM inventory_items WHERE id = $1", item) == 0


# 9. Audit: balance rebuilt from the KhataEntry ledger == cached outstanding.
async def test_ledger_equals_balance_audit(biz):
    cust = await add_customer(biz, "Audit")
    item = await add_item(biz, "L", 10000, 50)
    for _ in range(3):
        await confirm_bill(biz, bill_payload(
            items=[inv_line(item, qty=1)], payment_mode="CREDIT", customer_id=cust,
        ))
    rebuilt = await fetchval(
        biz,
        """SELECT COALESCE(sum(CASE WHEN type = 'credit' THEN amount_paise ELSE -amount_paise END), 0)
           FROM khata_entries WHERE customer_id = $1""",
        cust,
    )
    cached = await fetchval(biz, "SELECT outstanding_balance_paise FROM customers WHERE id = $1", cust)
    assert rebuilt == cached > 0


# Totals on the saved bill equal a recomputation from its own line items (§5).
async def test_persisted_totals_consistent(biz):
    a = await add_item(biz, "M", 11800, 5, tax_rate_bps=1800)
    b = await add_item(biz, "N", 1400, 5, tax_rate_bps=1200)
    bill = await confirm_bill(biz, bill_payload(
        items=[inv_line(a, qty=2, price=11800), inv_line(b, qty=1, price=1400)],
        payment_mode="CASH",
    ))
    assert bill.subtotal_paise == sum(i.qty * i.unit_price_paise for i in bill.items)
    assert bill.taxable_paise == sum(i.taxable_paise for i in bill.items)
    assert bill.tax_total_paise == sum(i.tax_paise for i in bill.items)
    assert bill.grand_total_paise == bill.taxable_paise + bill.tax_total_paise
