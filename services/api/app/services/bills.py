"""confirm_bill — the triple-entry atomic transaction (docs/billing_rules.md).

ONE transaction: bill+items → guarded stock decrement (+stock_ledger) →
khata credit XOR payment → staff sale attribution. All-or-nothing.
Idempotent on (business_id, request_id).
"""
from uuid import UUID

import asyncpg

from ..auth import CurrentBusiness
from ..db import biz_txn
from ..errors import (
    CrossBusinessReferenceError,
    InsufficientStockError,
    MissingCustomerForCreditError,
    NotFoundError,
)
from ..schemas import BillCreate, BillItemRead, BillRead
from ..util import normalize_phone
from .gst import LineIn, compute_bill

_BILL_COLS = """
    b.id, b.invoice_no, b.gst_mode, b.tax_kind, b.place_of_supply_state,
    b.subtotal_paise, b.discount_paise, b.taxable_paise, b.cgst_paise, b.sgst_paise,
    b.igst_paise, b.tax_total_paise, b.grand_total_paise, b.payment_mode,
    b.payment_method_id, b.customer_id, b.staff_id, b.note,
    b.amount_received_paise, b.balance_due_paise, b.created_at,
    COALESCE(c.name, '') AS customer_name, COALESCE(c.phone, '') AS customer_phone,
    COALESCE(bm.name, '') AS billed_by_name, b.performed_by_member_id
"""


async def _read_bill(conn: asyncpg.Connection, bill_id: UUID) -> BillRead:
    bill = await conn.fetchrow(
        f"""SELECT {_BILL_COLS}, b.order_status, b.delivery_date FROM bills b
            LEFT JOIN customers c ON c.id = b.customer_id
            LEFT JOIN business_members bm ON bm.id = b.performed_by_member_id
            WHERE b.id = $1""",
        bill_id,
    )
    if bill is None:
        raise NotFoundError("Bill not found")
    items = await conn.fetch(
        """SELECT name, hsn_code, qty, unit_price_paise, tax_rate_bps, taxable_paise, tax_paise, line_total_paise, item_kind
           FROM bill_items WHERE bill_id = $1 ORDER BY id""",
        bill_id,
    )
    
    rx_row = await conn.fetchrow(
        "SELECT * FROM prescriptions WHERE bill_id = $1", bill_id
    )
    prescription = None
    if rx_row:
        from ..schemas import PrescriptionRead
        prescription = PrescriptionRead(**dict(rx_row))

    return BillRead(**dict(bill), items=[BillItemRead(**dict(i)) for i in items], prescription=prescription)


async def get_bill(biz: CurrentBusiness, bill_id: UUID) -> BillRead:
    async with biz_txn(biz.id) as conn:
        bill = await _read_bill(conn, bill_id)
        # Staff may only open their own bills (server-enforced).
        if biz.is_staff and bill.performed_by_member_id != biz.member_id:
            raise NotFoundError("Bill not found")
        return bill


async def void_bill(biz: CurrentBusiness, bill_id: UUID) -> None:
    """Delete a bill created by mistake, fully reversing its side effects in one
    transaction: restore stock, undo the customer's credit balance, and remove the
    revenue/stock/staff ledger rows. bill_items cascade with the bill."""
    async with biz_txn(biz.id) as conn:
        bill = await conn.fetchrow(
            "SELECT payment_mode, customer_id, grand_total_paise, balance_due_paise FROM bills WHERE id = $1 AND business_id = $2 FOR UPDATE",
            bill_id, biz.id,
        )
        if bill is None:
            raise NotFoundError("Bill not found")
        # Restore stock for inventory-linked lines.
        lines = await conn.fetch(
            "SELECT inventory_item_id, qty FROM bill_items WHERE bill_id = $1 AND inventory_item_id IS NOT NULL",
            bill_id,
        )
        for line in lines:
            await conn.execute(
                "UPDATE inventory_items SET qty_on_hand = qty_on_hand + $3 WHERE id = $1 AND business_id = $2",
                line["inventory_item_id"], biz.id, line["qty"],
            )
        # Undo the customer's outstanding balance (credit bills); clamp at 0.
        # Only the balance_due hit the customer's balance (advance is a payment row).
        if bill["payment_mode"] == "CREDIT" and bill["customer_id"] is not None and bill["balance_due_paise"] > 0:
            await conn.execute(
                """UPDATE customers SET outstanding_balance_paise = GREATEST(0, outstanding_balance_paise - $3)
                   WHERE id = $1 AND business_id = $2""",
                bill["customer_id"], biz.id, bill["balance_due_paise"],
            )
        # Remove child ledger rows that FK the bill without ON DELETE CASCADE.
        for table in ("stock_ledger", "khata_entries", "payments", "staff_ledger", "prescriptions"):
            await conn.execute(f"DELETE FROM {table} WHERE bill_id = $1 AND business_id = $2", bill_id, biz.id)
        await conn.execute("DELETE FROM bills WHERE id = $1 AND business_id = $2", bill_id, biz.id)


async def _resolve_customer(
    conn: asyncpg.Connection, biz: CurrentBusiness, payload: BillCreate
) -> UUID | None:
    """Return a customer id — given id (validated) or upsert-by-phone/insert-by-name."""
    if payload.customer_id is not None:
        row = await conn.fetchrow(
            "SELECT id FROM customers WHERE id = $1 AND business_id = $2",
            payload.customer_id, biz.id,
        )
        if row is None:
            raise CrossBusinessReferenceError("customer", payload.customer_id)
        return row["id"]

    name = payload.customer_name.strip()
    phone = normalize_phone(payload.customer_phone)
    if not name and not phone:
        return None
    if phone:
        row = await conn.fetchrow(
            """INSERT INTO customers (business_id, name, phone, state_code, created_by_member_id)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (business_id, phone) WHERE phone IS NOT NULL DO UPDATE
                 SET name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE customers.name END
               RETURNING id""",
            biz.id, name or phone, phone, payload.customer_state_code, biz.member_id,
        )
    else:
        row = await conn.fetchrow(
            """INSERT INTO customers (business_id, name, state_code, created_by_member_id) VALUES ($1, $2, $3, $4) RETURNING id""",
            biz.id, name, payload.customer_state_code, biz.member_id,
        )
    return row["id"]


async def confirm_bill(biz: CurrentBusiness, payload: BillCreate) -> BillRead:
    try:
        return await _confirm_bill_txn(biz, payload)
    except asyncpg.UniqueViolationError:
        # Lost an idempotency race — the other request created the bill; return it.
        async with biz_txn(biz.id) as conn:
            row = await conn.fetchrow(
                "SELECT id FROM bills WHERE business_id = $1 AND request_id = $2",
                biz.id, payload.request_id,
            )
            if row is None:
                raise
            return await _read_bill(conn, row["id"])


async def _confirm_bill_txn(biz: CurrentBusiness, payload: BillCreate) -> BillRead:
    b = biz.row
    async with biz_txn(biz.id) as conn:
        # Idempotency guard (§6): replay returns the existing bill, zero repeated effects.
        existing = await conn.fetchrow(
            "SELECT id FROM bills WHERE business_id = $1 AND request_id = $2",
            biz.id, payload.request_id,
        )
        if existing is not None:
            return await _read_bill(conn, existing["id"])

        # ── Preconditions (§2): validate BEFORE any write ──
        inv_ids = [l.inventory_item_id for l in payload.items if l.inventory_item_id is not None]
        inv: dict[UUID, asyncpg.Record] = {}
        untracked_ids: set[UUID] = set()  # catalogue-only items: sellable, no managed stock
        if inv_ids:
            rows = await conn.fetch(
                """SELECT id, name, hsn_code, tax_rate_bps, price_is_tax_inclusive, qty_on_hand, tracked
                   FROM inventory_items
                   WHERE business_id = $1 AND id = ANY($2::uuid[])
                   FOR UPDATE""",
                biz.id, inv_ids,
            )
            inv = {r["id"]: r for r in rows}
            for iid in inv_ids:
                if iid not in inv:
                    raise CrossBusinessReferenceError("inventory_item", iid)
            untracked_ids = {iid for iid, r in inv.items() if not r["tracked"]}
            if not b["allow_negative_stock"]:
                want: dict[UUID, int] = {}
                for line in payload.items:
                    if line.inventory_item_id is not None and line.inventory_item_id not in untracked_ids:
                        want[line.inventory_item_id] = want.get(line.inventory_item_id, 0) + line.qty
                for iid, qty in want.items():
                    if inv[iid]["qty_on_hand"] < qty:
                        raise InsufficientStockError(iid, qty, inv[iid]["qty_on_hand"])

        if payload.staff_id is not None:
            ok = await conn.fetchrow(
                "SELECT 1 FROM staff WHERE id = $1 AND business_id = $2", payload.staff_id, biz.id
            )
            if ok is None:
                raise CrossBusinessReferenceError("staff", payload.staff_id)

        customer_id = await _resolve_customer(conn, biz, payload)
        if payload.payment_mode == "CREDIT" and customer_id is None:
            raise MissingCustomerForCreditError()

        # ── Money (§3 + GST engine §6): server recomputes; client totals ignored ──
        gst_mode = payload.gst_mode or b["gst_default_mode"]
        if not b["gst_registered"]:
            gst_mode = "non_gst"
        place = payload.customer_state_code or b["state_code"]
        if customer_id is not None and not payload.customer_state_code:
            cust_state = await conn.fetchval("SELECT state_code FROM customers WHERE id = $1", customer_id)
            place = cust_state or b["state_code"]

        lines = [
            LineIn(
                name=(inv[l.inventory_item_id]["name"] if l.inventory_item_id is not None else l.name),
                qty=l.qty,
                unit_price_paise=l.unit_price_paise,
                tax_rate_bps=(inv[l.inventory_item_id]["tax_rate_bps"] if l.inventory_item_id is not None else l.tax_rate_bps),
                inclusive=(
                    inv[l.inventory_item_id]["price_is_tax_inclusive"]
                    if l.inventory_item_id is not None
                    else (l.price_is_tax_inclusive if l.price_is_tax_inclusive is not None else b["price_includes_tax"])
                ),
                hsn_code=(inv[l.inventory_item_id]["hsn_code"] if l.inventory_item_id is not None else ""),
                inventory_item_id=l.inventory_item_id,
            )
            for l in payload.items
        ]
        totals = compute_bill(
            lines, gst_mode=gst_mode, business_state=b["state_code"],
            place_of_supply=place if gst_mode == "gst" else "",
            discount_paise=payload.discount_paise,
        )

        if payload.payment_method_id is not None:
            ok = await conn.fetchrow(
                "SELECT 1 FROM payment_methods WHERE id = $1 AND business_id = $2",
                payload.payment_method_id, biz.id,
            )
            if ok is None:
                raise CrossBusinessReferenceError("payment_method", payload.payment_method_id)

        # Advance / part payment split: CASH/UPI fully settled now; CREDIT may carry
        # an advance (received now, via received_mode) + a balance (the customer's).
        grand = totals.grand_total_paise
        if payload.payment_mode == "CREDIT":
            received = max(0, min(payload.amount_received_paise, grand))
            balance = grand - received
            received_mode = payload.received_mode or "CASH"
        else:
            received, balance, received_mode = grand, 0, payload.payment_mode

        from datetime import date
        delivery_dt = None
        if payload.delivery_date:
            try:
                delivery_dt = date.fromisoformat(payload.delivery_date)
            except ValueError:
                pass

        # ── ENTRY 0: bill header + lines ──
        seq = await conn.fetchrow(
            """UPDATE businesses SET next_invoice_seq = next_invoice_seq + 1
               WHERE id = $1 RETURNING invoice_prefix, next_invoice_seq - 1 AS seq""",
            biz.id,
        )
        invoice_no = f"{seq['invoice_prefix']}{seq['seq']}"

        # A staff member's own bills attribute to their linked staff record (feeds
        # staff performance) and record who performed it (audit + staff scoping).
        effective_staff_id = payload.staff_id or biz.linked_staff_id
        bill_id = await conn.fetchval(
            """INSERT INTO bills (business_id, customer_id, staff_id, gst_mode, place_of_supply_state,
                                  tax_kind, subtotal_paise, discount_paise, taxable_paise, cgst_paise,
                                  sgst_paise, igst_paise, tax_total_paise, grand_total_paise,
                                  payment_mode, payment_method_id, invoice_no, note, request_id,
                                  amount_received_paise, balance_due_paise, order_status, delivery_date,
                                  performed_by_member_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
               RETURNING id""",
            biz.id, customer_id, effective_staff_id, totals.gst_mode,
            place if totals.gst_mode == "gst" else "",
            totals.tax_kind, totals.subtotal_paise, totals.discount_paise, totals.taxable_paise,
            totals.cgst_paise, totals.sgst_paise, totals.igst_paise, totals.tax_total_paise,
            totals.grand_total_paise, payload.payment_mode, payload.payment_method_id,
            invoice_no, payload.note, payload.request_id, received, balance,
            payload.order_status, delivery_dt, biz.member_id,
        )
        await conn.executemany(
            """INSERT INTO bill_items (bill_id, business_id, inventory_item_id, name, hsn_code, qty,
                                       unit_price_paise, tax_rate_bps, taxable_paise, tax_paise, line_total_paise, item_kind)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)""",
            [
                (bill_id, biz.id, line.inventory_item_id, line.name, line.hsn_code, line.qty,
                 line.unit_price_paise, line.tax_rate_bps, line.taxable_paise, line.tax_paise,
                 line.line_total_paise, payload_item.item_kind)
                for payload_item, line in zip(payload.items, totals.lines)
            ],
        )

        # ── ENTRY 0.5: prescription ──
        if payload.prescription is not None:
            rx = payload.prescription
            rx_date = None
            if rx.date:
                from datetime import date as dt_date
                if isinstance(rx.date, dt_date):
                    rx_date = rx.date
                else:
                    try:
                        rx_date = dt_date.fromisoformat(str(rx.date))
                    except (ValueError, TypeError):
                        pass
            await conn.execute(
                """INSERT INTO prescriptions (business_id, customer_id, bill_id, date,
                                             r_dist_sph, r_dist_cyl, r_dist_axis, r_dist_vn,
                                             r_near_sph, r_near_cyl, r_near_axis, r_near_vn,
                                             l_dist_sph, l_dist_cyl, l_dist_axis, l_dist_vn,
                                             l_near_sph, l_near_cyl, l_near_axis, l_near_vn,
                                             add_r, add_l, pd, lens_types, remarks)
                   VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)""",
                biz.id, customer_id, bill_id, rx_date,
                rx.r_dist_sph, rx.r_dist_cyl, rx.r_dist_axis, rx.r_dist_vn,
                rx.r_near_sph, rx.r_near_cyl, rx.r_near_axis, rx.r_near_vn,
                rx.l_dist_sph, rx.l_dist_cyl, rx.l_dist_axis, rx.l_dist_vn,
                rx.l_near_sph, rx.l_near_cyl, rx.l_near_axis, rx.l_near_vn,
                rx.add_r, rx.add_l, rx.pd, rx.lens_types, rx.remarks
            )

        # ── ENTRY 1: guarded stock reduction (race-safe; never below 0) ──
        # Untracked (catalogue-only) lines never touch stock — treated like ad-hoc
        # lines for inventory, even though they are real catalogue items.
        for line in totals.lines:
            if line.inventory_item_id is None or line.inventory_item_id in untracked_ids:
                continue
            updated = await conn.fetchrow(
                """UPDATE inventory_items SET qty_on_hand = qty_on_hand - $3
                   WHERE id = $1 AND business_id = $2 AND ($4 OR qty_on_hand >= $3)
                   RETURNING id""",
                line.inventory_item_id, biz.id, line.qty, b["allow_negative_stock"],
            )
            if updated is None:  # lost the race → abort the whole transaction
                avail = await conn.fetchval(
                    "SELECT qty_on_hand FROM inventory_items WHERE id = $1", line.inventory_item_id
                )
                raise InsufficientStockError(line.inventory_item_id, line.qty, avail or 0)
            await conn.execute(
                """INSERT INTO stock_ledger (business_id, item_id, bill_id, delta_qty, reason)
                   VALUES ($1, $2, $3, $4, 'SALE')""",
                biz.id, line.inventory_item_id, bill_id, -line.qty,
            )

        # ── ENTRY 2: revenue. CASH/UPI → one payment. CREDIT → the advance (if any)
        # is a payment row, the balance (if any) is a khata credit + customer balance.
        # The customer balance == Σ khata credits, so the §5 audit still holds.
        if payload.payment_mode == "CREDIT":
            if received > 0:
                await conn.execute(
                    """INSERT INTO payments (business_id, bill_id, customer_id, mode, amount_paise, performed_by_member_id)
                       VALUES ($1, $2, $3, $4, $5, $6)""",
                    biz.id, bill_id, customer_id, received_mode, received, biz.member_id,
                )
            if balance > 0:
                await conn.execute(
                    """INSERT INTO khata_entries (business_id, customer_id, bill_id, type, amount_paise, note,
                                                  created_by_member_id, performed_by_member_id)
                       VALUES ($1, $2, $3, 'credit', $4, $5, $6, $6)""",
                    biz.id, customer_id, bill_id, balance, payload.note or invoice_no, biz.member_id,
                )
                await conn.execute(
                    "UPDATE customers SET outstanding_balance_paise = outstanding_balance_paise + $3 WHERE id = $1 AND business_id = $2",
                    customer_id, biz.id, balance,
                )
        else:
            await conn.execute(
                """INSERT INTO payments (business_id, bill_id, customer_id, mode, amount_paise, performed_by_member_id)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                biz.id, bill_id, customer_id, payload.payment_mode, grand, biz.member_id,
            )

        # ── ENTRY 3: staff attribution ──
        if payload.staff_id is not None:
            await conn.execute(
                """INSERT INTO staff_ledger (business_id, staff_id, bill_id, type, amount_paise)
                   VALUES ($1, $2, $3, 'sale_attrib', $4)""",
                biz.id, payload.staff_id, bill_id, totals.grand_total_paise,
            )

        return await _read_bill(conn, bill_id)
