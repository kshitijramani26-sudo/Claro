"""Staff — CRUD, attendance, advances/repayments, performance detail."""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..errors import DomainError, NotFoundError
from ..schemas import (
    AdvanceCreate,
    AttendanceCreate,
    StaffAdvanceRead,
    StaffCreate,
    StaffDetailRead,
    StaffPatch,
    StaffRead,
)
from ..util import ist_today, normalize_phone

router = APIRouter(prefix="/staff", tags=["staff"])

_COLS = "id, name, role, COALESCE(phone, '') AS phone, salary_paise, advance_outstanding_paise"


@router.get("", response_model=list[StaffRead])
async def list_staff(biz: CurrentBusiness = Depends(get_current_business)) -> list[StaffRead]:
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            f"""SELECT {_COLS},
                       COALESCE((SELECT a.status = 'present' FROM attendance a
                                 WHERE a.staff_id = staff.id AND a.date = $2), true) AS present_today
                FROM staff WHERE business_id = $1 ORDER BY created_at""",
            biz.id, ist_today(),
        )
    return [StaffRead(**dict(r)) for r in rows]


@router.post("", response_model=StaffRead)
async def create_staff(payload: StaffCreate, biz: CurrentBusiness = Depends(get_current_business)) -> StaffRead:
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            f"""INSERT INTO staff (business_id, name, role, phone, salary_paise)
                VALUES ($1, $2, $3, NULLIF($4, ''), $5)
                RETURNING {_COLS}""",
            biz.id, payload.name, payload.role, normalize_phone(payload.phone), payload.salary_paise,
        )
    return StaffRead(**dict(row), present_today=True)


@router.patch("/{staff_id}", response_model=StaffRead)
async def patch_staff(staff_id: UUID, payload: StaffPatch, biz: CurrentBusiness = Depends(get_current_business)) -> StaffRead:
    updates = payload.model_dump(exclude_none=True)
    if "phone" in updates:
        updates["phone"] = normalize_phone(updates["phone"]) or None
    if not updates:
        raise DomainError("Nothing to update")
    cols = ", ".join(f"{k} = ${i + 3}" for i, k in enumerate(updates))
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            f"UPDATE staff SET {cols} WHERE id = $1 AND business_id = $2 RETURNING {_COLS}",
            staff_id, biz.id, *updates.values(),
        )
        if row is None:
            raise NotFoundError("Staff member not found")
        present = await conn.fetchval(
            "SELECT status = 'present' FROM attendance WHERE staff_id = $1 AND date = $2", staff_id, ist_today()
        )
    return StaffRead(**dict(row), present_today=present if present is not None else True)


@router.delete("/{staff_id}")
async def delete_staff(staff_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> dict:
    async with biz_txn(biz.id) as conn:
        deleted = await conn.fetchval(
            "DELETE FROM staff WHERE id = $1 AND business_id = $2 RETURNING id", staff_id, biz.id
        )
    if deleted is None:
        raise NotFoundError("Staff member not found")
    return {"ok": True}


@router.post("/{staff_id}/attendance")
async def mark_attendance(staff_id: UUID, payload: AttendanceCreate, biz: CurrentBusiness = Depends(get_current_business)) -> dict:
    day = date.fromisoformat(payload.date) if payload.date else ist_today()
    async with biz_txn(biz.id) as conn:
        ok = await conn.fetchval("SELECT 1 FROM staff WHERE id = $1 AND business_id = $2", staff_id, biz.id)
        if ok is None:
            raise NotFoundError("Staff member not found")
        await conn.execute(
            """INSERT INTO attendance (business_id, staff_id, date, status) VALUES ($1, $2, $3, $4)
               ON CONFLICT (staff_id, date) DO UPDATE SET status = EXCLUDED.status""",
            biz.id, staff_id, day, payload.status,
        )
    return {"ok": True, "date": day.isoformat(), "status": payload.status}


async def _ledger_mutation(biz: CurrentBusiness, staff_id: UUID, kind: str, payload: AdvanceCreate) -> StaffRead:
    sign = 1 if kind == "advance" else -1
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            "SELECT advance_outstanding_paise FROM staff WHERE id = $1 AND business_id = $2 FOR UPDATE",
            staff_id, biz.id,
        )
        if row is None:
            raise NotFoundError("Staff member not found")
        if kind == "repayment" and payload.amount_paise > row["advance_outstanding_paise"]:
            raise DomainError("Repayment exceeds outstanding advance")
        await conn.execute(
            """INSERT INTO staff_ledger (business_id, staff_id, type, amount_paise, note)
               VALUES ($1, $2, $3, $4, $5)""",
            biz.id, staff_id, kind, payload.amount_paise,
            payload.note or ("Advance" if kind == "advance" else "Repayment"),
        )
        updated = await conn.fetchrow(
            f"""UPDATE staff SET advance_outstanding_paise = advance_outstanding_paise + $3
                WHERE id = $1 AND business_id = $2 RETURNING {_COLS}""",
            staff_id, biz.id, sign * payload.amount_paise,
        )
        present = await conn.fetchval(
            "SELECT status = 'present' FROM attendance WHERE staff_id = $1 AND date = $2", staff_id, ist_today()
        )
    return StaffRead(**dict(updated), present_today=present if present is not None else True)


@router.post("/{staff_id}/advance", response_model=StaffRead)
async def add_advance(staff_id: UUID, payload: AdvanceCreate, biz: CurrentBusiness = Depends(get_current_business)) -> StaffRead:
    return await _ledger_mutation(biz, staff_id, "advance", payload)


@router.post("/{staff_id}/repayment", response_model=StaffRead)
async def add_repayment(staff_id: UUID, payload: AdvanceCreate, biz: CurrentBusiness = Depends(get_current_business)) -> StaffRead:
    return await _ledger_mutation(biz, staff_id, "repayment", payload)


@router.get("/{staff_id}", response_model=StaffDetailRead)
async def staff_detail(staff_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> StaffDetailRead:
    today = ist_today()
    async with biz_txn(biz.id) as conn:
        srow = await conn.fetchrow(
            f"""SELECT {_COLS},
                       COALESCE((SELECT a.status = 'present' FROM attendance a
                                 WHERE a.staff_id = staff.id AND a.date = $3), true) AS present_today
                FROM staff WHERE id = $1 AND business_id = $2""",
            staff_id, biz.id, today,
        )
        if srow is None:
            raise NotFoundError("Staff member not found")
        perf = await conn.fetchrow(
            """SELECT COALESCE(sum(amount_paise), 0) AS sales, count(*) AS bills
               FROM staff_ledger WHERE staff_id = $1 AND business_id = $2 AND type = 'sale_attrib'""",
            staff_id, biz.id,
        )
        att = await conn.fetch(
            "SELECT date, status FROM attendance WHERE staff_id = $1 AND date > $2 - 14 AND date <= $2",
            staff_id, today,
        )
        ledger = await conn.fetch(
            """SELECT id, type, amount_paise, note, created_at
               FROM staff_ledger
               WHERE staff_id = $1 AND business_id = $2 AND type IN ('advance','repayment')
               ORDER BY created_at, id""",
            staff_id, biz.id,
        )

    att_map = {r["date"]: r["status"] == "present" for r in att}
    attendance14 = [att_map.get(today.fromordinal(today.toordinal() - offset), True) for offset in range(13, -1, -1)]

    # FIFO: repayments retire the oldest advances first → per-advance repaid status.
    advances = [dict(r) for r in ledger if r["type"] == "advance"]
    repaid_pool = sum(r["amount_paise"] for r in ledger if r["type"] == "repayment")
    advance_rows: list[StaffAdvanceRead] = []
    for adv in advances:
        repaid = repaid_pool >= adv["amount_paise"]
        if repaid:
            repaid_pool -= adv["amount_paise"]
        advance_rows.append(StaffAdvanceRead(
            id=adv["id"], label=adv["note"] or "Advance", amount_paise=adv["amount_paise"],
            repaid=repaid, at=adv["created_at"],
        ))
    advance_rows.reverse()  # newest first

    sales = perf["sales"]
    bills = perf["bills"]
    return StaffDetailRead(
        staff=StaffRead(**dict(srow)),
        sales_paise=sales, bills=bills,
        avg_bill_paise=(sales // bills) if bills else 0,
        attendance14=attendance14, advances=advance_rows,
    )
