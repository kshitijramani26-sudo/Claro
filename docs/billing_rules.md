# billing_rules.md — The Bill Confirmation Contract

> Authoritative spec for the single most important operation in Claro: confirming a bill. It is a **triple-entry atomic transaction** — (1) stock reduction, (2) revenue/Khata entry, (3) staff attribution — that must succeed or fail as one unit. Implement `confirm_bill()` exactly to this contract. UI tools may change; this logic must not.

## 0. Money & types
- Store all money as **integer paise** (`amount_paise: int`). Never floats for money. Convert to rupees only at the display edge.
- Quantities are integers (MVP = integer units).
- Timestamps UTC; display IST at the edge.

## 1. Signature
```python
def confirm_bill(db: Session, business_id: UUID, payload: BillCreate, request_id: str) -> BillRead:
    """Atomically create a bill and apply its three side effects.
    Raises a typed domain error on any violation; commits all-or-nothing."""
```
`BillCreate`:
```
customer_id:   UUID | None        # required iff payment_mode == CREDIT
staff_id:      UUID | None        # optional attribution
payment_mode:  "CASH" | "UPI" | "CREDIT"
items: [ { inventory_item_id: UUID | None,   # None => ad-hoc line, no stock effect
           name: str, qty: int, unit_price_paise: int } ]
discount_paise: int = 0
note: str | None
```
`request_id` = client idempotency key (UUID). See §6.

## 2. Preconditions (validate BEFORE any write; fail fast)
1. `items` non-empty; every `qty > 0`; every `unit_price_paise >= 0`.
2. `payment_mode == CREDIT` ⇒ `customer_id` present and belongs to `business_id`.
3. Every `inventory_item_id` (when not None) exists and belongs to `business_id`.
4. `staff_id` (when present) exists and belongs to `business_id`.
5. For each inventory line: `item.qty_on_hand >= line.qty` (**no overselling**) → else `InsufficientStockError(item_id, requested, available)`.
6. `discount_paise <= subtotal`.

> If `business.allow_negative_stock` (default **false**), precondition 5 is skipped.

## 3. Money computation (server is source of truth — never trust client totals)
```
subtotal_paise   = Σ (line.qty * line.unit_price_paise)
taxable_paise    = subtotal_paise - discount_paise
if business.is_gst_registered:
    tax_total_paise = round_half_even(taxable_paise * business.default_tax_rate)
    cgst_paise = sgst_paise = tax_total_paise // 2
    cgst_paise += tax_total_paise - (cgst_paise + sgst_paise)   # absorb odd paise
else:
    tax_total_paise = cgst_paise = sgst_paise = 0
grand_total_paise = taxable_paise + tax_total_paise
```
Assert `grand_total_paise >= 0`. Persist a snapshot of `is_gst`, rate, and split on the bill row — an invoice is an immutable historical record.

## 4. The atomic transaction (single DB transaction, SERIALIZABLE or row-locked)
```
BEGIN
# Idempotency guard (§6)
existing = SELECT bill WHERE business_id AND request_id
if existing: ROLLBACK; return existing

# ENTRY 0: Bill header + line items
bill = INSERT Bill(... totals from §3 ..., is_gst, request_id, created_at=now())
for line in items: INSERT BillItem(bill_id, inventory_item_id, name, qty, unit_price_paise, line_total)

# ENTRY 1: STOCK REDUCTION (inventory-linked lines only)
for line where inventory_item_id is not None:
    rows = UPDATE InventoryItem SET qty_on_hand = qty_on_hand - line.qty
           WHERE id = line.inventory_item_id
             AND (business.allow_negative_stock OR qty_on_hand >= line.qty)
    if rows == 0: raise InsufficientStockError          # lost the race -> abort txn
    INSERT StockLedger(item_id, bill_id, delta=-line.qty, reason="SALE")

# ENTRY 2: REVENUE / KHATA
if payment_mode == CREDIT:
    INSERT KhataEntry(business_id, customer_id, bill_id, type="credit", amount=grand_total, note)
    UPDATE Customer SET outstanding_balance += grand_total WHERE id = customer_id   # row-locked
else:  # CASH / UPI settled now
    INSERT Payment(business_id, bill_id, customer_id?, mode=payment_mode, amount=grand_total)

# ENTRY 3: STAFF ATTRIBUTION
if staff_id is not None:
    INSERT StaffLedger(staff_id, bill_id, type="sale_attrib", amount=grand_total)

COMMIT
return BillRead(bill)
```
**Why coupled:** a sale isn't "done" until inventory, money, and accountability are all recorded. Recording one without the others corrupts a downstream tab. One transaction is the invariant that keeps Tabs 1–5 consistent.

## 5. Post-conditions (must all hold after COMMIT)
- Each inventory line: `new qty == old qty - qty`, with a matching `StockLedger(-qty)`.
- Σ customer `KhataEntry(credit) - KhataEntry(payment)` **==** `Customer.outstanding_balance` (balance is a cached projection; the ledger is truth).
- Exactly one revenue record: `KhataEntry(credit)` (CREDIT) **xor** `Payment` (CASH/UPI). Never both/neither.
- `staff_id` present ⇒ exactly one `StaffLedger(sale_attrib)`.
- Bill totals equal a §3 recomputation from its line items.

## 6. Idempotency & concurrency
- **Idempotency:** unique `(business_id, request_id)` on Bill. Retried request returns the existing bill with zero repeated effects.
- **Race safety:** guarded `UPDATE ... WHERE qty_on_hand >= qty` — two simultaneous bills for the last unit can't both succeed; loser updates 0 rows → abort.
- **Isolation:** SERIALIZABLE or `SELECT ... FOR UPDATE` on touched InventoryItem/Customer rows. On serialization failure, auto-retry once (idempotency makes it safe).

## 7. Reversal (void / return) — design now, build post-MVP
Bills are immutable. To cancel, write **compensating** entries in one transaction referencing the original `bill_id`: `StockLedger(+qty, "VOID")` per line, a payment/negative-Payment to unwind revenue, `StaffLedger(sale_attrib, -amount)`. Same all-or-nothing rule.

## 8. Typed errors (clean 4xx, never 500)
```
InsufficientStockError(item_id, requested, available) -> 409
MissingCustomerForCreditError                          -> 422
CrossBusinessReferenceError(entity, id)                -> 403
EmptyBillError / InvalidLineError                       -> 422
DiscountExceedsSubtotalError                            -> 422
```

## 9. Test matrix (must pass)
1. CASH bill, 2 inventory lines → stock drops exactly, one Payment, no Khata, no staff entry.
2. CREDIT bill → KhataEntry(credit) + outstanding rises by grand_total; no Payment.
3. Staff attributed → one StaffLedger(sale_attrib); unattributed → none.
4. GST business → cgst+sgst == tax_total exactly; non-GST → all tax 0.
5. Oversell → InsufficientStockError, nothing persists.
6. Ad-hoc line (no inventory_item_id) → bill + revenue, no StockLedger.
7. Idempotency: same request_id twice → identical bill once, effects once.
8. Concurrency: two bills for last unit → exactly one succeeds.
9. Audit: balance rebuilt from KhataEntry ledger == Customer.outstanding_balance.
