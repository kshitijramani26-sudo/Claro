"""Khata — outstanding list, timeline, add credit, settle, WhatsApp reminder."""
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..errors import DomainError, NotFoundError
from ..schemas import (
    KhataCreditCreate,
    KhataCustomerRead,
    KhataDetailRead,
    KhataEntryRead,
    KhataListRead,
    ReminderRead,
    SettleCreate,
)
from ..util import normalize_phone

router = APIRouter(prefix="/khata", tags=["khata"])


@router.get("", response_model=KhataListRead)
async def khata_list(biz: CurrentBusiness = Depends(get_current_business)) -> KhataListRead:
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """SELECT c.id, c.name, COALESCE(c.phone, '') AS phone, c.outstanding_balance_paise,
                      COALESCE((SELECT max(k.created_at) FROM khata_entries k WHERE k.customer_id = c.id),
                               c.created_at) AS updated_at
               FROM customers c
               WHERE c.business_id = $1 AND c.outstanding_balance_paise > 0
               ORDER BY c.outstanding_balance_paise DESC""",
            biz.id,
        )
    customers = [
        KhataCustomerRead(id=r["id"], name=r["name"], phone=r["phone"],
                          outstanding_paise=r["outstanding_balance_paise"], updated_at=r["updated_at"])
        for r in rows
    ]
    return KhataListRead(total_outstanding_paise=sum(c.outstanding_paise for c in customers), customers=customers)


@router.get("/{customer_id}", response_model=KhataDetailRead)
async def khata_detail(customer_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> KhataDetailRead:
    async with biz_txn(biz.id) as conn:
        cust = await conn.fetchrow(
            """SELECT c.id, c.name, COALESCE(c.phone, '') AS phone, c.outstanding_balance_paise,
                      COALESCE((SELECT max(k.created_at) FROM khata_entries k WHERE k.customer_id = c.id),
                               c.created_at) AS updated_at
               FROM customers c WHERE c.id = $1 AND c.business_id = $2""",
            customer_id, biz.id,
        )
        if cust is None:
            raise NotFoundError("Customer not found")
        entries = await conn.fetch(
            """SELECT id, COALESCE(NULLIF(note, ''), CASE WHEN type='credit' THEN 'Credit' ELSE 'Payment' END) AS label,
                      CASE WHEN type = 'credit' THEN amount_paise ELSE 0 END AS debit_paise,
                      CASE WHEN type = 'payment' THEN amount_paise ELSE 0 END AS credit_paise,
                      created_at AS at, bill_id
               FROM khata_entries WHERE business_id = $1 AND customer_id = $2
               ORDER BY created_at DESC, id DESC""",
            biz.id, customer_id,
        )
    return KhataDetailRead(
        customer=KhataCustomerRead(
            id=cust["id"], name=cust["name"], phone=cust["phone"],
            outstanding_paise=cust["outstanding_balance_paise"], updated_at=cust["updated_at"],
        ),
        entries=[KhataEntryRead(**dict(e)) for e in entries],
    )


@router.post("", response_model=KhataCustomerRead)
async def add_credit(payload: KhataCreditCreate, biz: CurrentBusiness = Depends(get_current_business)) -> KhataCustomerRead:
    async with biz_txn(biz.id) as conn:
        if payload.customer_id is not None:
            cust_id = await conn.fetchval(
                "SELECT id FROM customers WHERE id = $1 AND business_id = $2", payload.customer_id, biz.id
            )
            if cust_id is None:
                raise NotFoundError("Customer not found")
        else:
            name = payload.name.strip()
            phone = normalize_phone(payload.phone)
            if not name:
                raise DomainError("Customer name is required")
            if phone:
                cust_id = await conn.fetchval(
                    """INSERT INTO customers (business_id, name, phone) VALUES ($1, $2, $3)
                       ON CONFLICT (business_id, phone) WHERE phone IS NOT NULL DO UPDATE SET name = EXCLUDED.name
                       RETURNING id""",
                    biz.id, name, phone,
                )
            else:
                cust_id = await conn.fetchval(
                    "INSERT INTO customers (business_id, name) VALUES ($1, $2) RETURNING id", biz.id, name
                )
        await conn.execute(
            """INSERT INTO khata_entries (business_id, customer_id, type, amount_paise, note)
               VALUES ($1, $2, 'credit', $3, $4)""",
            biz.id, cust_id, payload.amount_paise, payload.note or "Credit added",
        )
        row = await conn.fetchrow(
            """UPDATE customers SET outstanding_balance_paise = outstanding_balance_paise + $3
               WHERE id = $1 AND business_id = $2
               RETURNING id, name, COALESCE(phone, '') AS phone, outstanding_balance_paise, created_at""",
            cust_id, biz.id, payload.amount_paise,
        )
    return KhataCustomerRead(id=row["id"], name=row["name"], phone=row["phone"],
                             outstanding_paise=row["outstanding_balance_paise"], updated_at=row["created_at"])


@router.post("/{customer_id}/settle", response_model=KhataCustomerRead)
async def settle(customer_id: UUID, payload: SettleCreate, biz: CurrentBusiness = Depends(get_current_business)) -> KhataCustomerRead:
    async with biz_txn(biz.id) as conn:
        cust = await conn.fetchrow(
            "SELECT id, outstanding_balance_paise FROM customers WHERE id = $1 AND business_id = $2 FOR UPDATE",
            customer_id, biz.id,
        )
        if cust is None:
            raise NotFoundError("Customer not found")
        outstanding = cust["outstanding_balance_paise"]
        amount = payload.amount_paise if payload.amount_paise is not None else outstanding
        if amount <= 0 or outstanding <= 0:
            raise DomainError("Nothing to settle")
        if amount > outstanding:
            raise DomainError("Settle amount exceeds outstanding balance")
        note = payload.note + (f" · {payload.mode}" if payload.mode else "")
        await conn.execute(
            """INSERT INTO khata_entries (business_id, customer_id, type, amount_paise, note)
               VALUES ($1, $2, 'payment', $3, $4)""",
            biz.id, customer_id, amount, note,
        )
        row = await conn.fetchrow(
            """UPDATE customers SET outstanding_balance_paise = outstanding_balance_paise - $3
               WHERE id = $1 AND business_id = $2
               RETURNING id, name, COALESCE(phone, '') AS phone, outstanding_balance_paise, created_at""",
            customer_id, biz.id, amount,
        )
        # Apply the collection FIFO to this customer's unpaid bills so each bill's
        # balance_due (and thus its paid/partial status) updates correctly.
        await conn.execute(
            """WITH ranked AS (
                 SELECT id, balance_due_paise,
                        sum(balance_due_paise) OVER (ORDER BY created_at, id) - balance_due_paise AS before_paise
                 FROM bills
                 WHERE business_id = $1 AND customer_id = $2 AND balance_due_paise > 0
               )
               UPDATE bills b
               SET balance_due_paise   = b.balance_due_paise - GREATEST(0, LEAST(r.balance_due_paise, $3 - r.before_paise)),
                   amount_received_paise = b.amount_received_paise + GREATEST(0, LEAST(r.balance_due_paise, $3 - r.before_paise))
               FROM ranked r
               WHERE b.id = r.id AND r.before_paise < $3""",
            biz.id, customer_id, amount,
        )
    return KhataCustomerRead(id=row["id"], name=row["name"], phone=row["phone"],
                             outstanding_paise=row["outstanding_balance_paise"], updated_at=row["created_at"])


@router.get("/{customer_id}/reminder", response_model=ReminderRead)
async def reminder(customer_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> ReminderRead:
    async with biz_txn(biz.id) as conn:
        cust = await conn.fetchrow(
            "SELECT name, phone, outstanding_balance_paise FROM customers WHERE id = $1 AND business_id = $2",
            customer_id, biz.id,
        )
    if cust is None:
        raise NotFoundError("Customer not found")
    rupees = cust["outstanding_balance_paise"] // 100
    text = (
        f"Namaste {cust['name']} ji! This is a gentle reminder from {biz.row['name']}: "
        f"your outstanding balance is Rs.{rupees:,}. "
        f"Kindly settle at your convenience. Thank you! 🙏"
    )
    phone_digits = (cust["phone"] or "").removeprefix("+")
    wa = f"https://wa.me/{phone_digits}?text={quote(text)}" if phone_digits else f"https://wa.me/?text={quote(text)}"
    return ReminderRead(text=text, wa_url=wa)
