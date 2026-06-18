"""Team members — owner/co-owner manage co-owners & staff (server-enforced).

Rules:
- Owner: add/remove co-owners and staff; cannot remove self/owner.
- Co-owner: add/remove staff only; cannot touch owner or other co-owners.
- Staff: no access (require_manager → 403).
"""
from uuid import UUID

from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness
from ..db import biz_txn
from ..errors import ForbiddenError, NotFoundError, DomainError
from ..permissions import require_manager
from ..schemas import ActivityRead, MemberCreate, MemberRead
from .auth import toE164

router = APIRouter(prefix="/team", tags=["team"])


@router.get("/activity", response_model=list[ActivityRead])
async def team_activity(limit: int = 40, biz: CurrentBusiness = Depends(require_manager)) -> list[ActivityRead]:
    """Owner/co-owner audit: who billed / who collected what (member-attributed)."""
    limit = max(1, min(limit, 100))
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """
            (SELECT 'bill-' || b.id AS id, b.invoice_no AS title,
                    'Billed by ' || COALESCE(NULLIF(bm.name, ''), 'someone') AS sub,
                    b.grand_total_paise AS amount, 'sale' AS kind, b.created_at AS at, b.id::text AS bill_id
             FROM bills b LEFT JOIN business_members bm ON bm.id = b.performed_by_member_id
             WHERE b.business_id = $1)
            UNION ALL
            (SELECT 'khata-' || k.id, c.name,
                    CASE WHEN k.type = 'payment' THEN 'Collected by ' ELSE 'Credit by ' END
                      || COALESCE(NULLIF(bm.name, ''), 'someone'),
                    k.amount_paise, CASE WHEN k.type = 'payment' THEN 'settle' ELSE 'credit' END,
                    k.created_at, k.bill_id::text
             FROM khata_entries k JOIN customers c ON c.id = k.customer_id
             LEFT JOIN business_members bm ON bm.id = COALESCE(k.performed_by_member_id, k.created_by_member_id)
             WHERE k.business_id = $1)
            ORDER BY at DESC LIMIT $2
            """,
            biz.id, limit,
        )
    return [
        ActivityRead(id=r["id"], title=r["title"] or "Entry", sub=r["sub"], amount_paise=r["amount"],
                     kind=r["kind"], at=r["at"], bill_id=r["bill_id"])
        for r in rows
    ]


def _read(row: dict, self_member_id: UUID | None) -> MemberRead:
    return MemberRead(
        id=row["id"], name=row["name"], phone=row["phone"], role=row["role"],
        status=row["status"], linked_staff_id=row["linked_staff_id"],
        is_self=(row["id"] == self_member_id),
    )


@router.get("", response_model=list[MemberRead])
async def list_members(biz: CurrentBusiness = Depends(require_manager)) -> list[MemberRead]:
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """SELECT id, name, phone, role, status, linked_staff_id FROM business_members
               WHERE business_id = $1
               ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'co_owner' THEN 1 ELSE 2 END, created_at""",
            biz.id,
        )
    return [_read(dict(r), biz.member_id) for r in rows]


@router.post("", response_model=MemberRead)
async def add_member(payload: MemberCreate, biz: CurrentBusiness = Depends(require_manager)) -> MemberRead:
    # Co-owner can only add staff; only the owner can add a co-owner.
    if payload.role == "co_owner" and biz.role != "owner":
        raise ForbiddenError("Only the owner can add a co-owner")
    phone = toE164(payload.phone)
    if not phone or len(phone) < 8:
        raise DomainError("Invalid phone number")
    async with biz_txn(biz.id) as conn:
        dup = await conn.fetchrow(
            "SELECT 1 FROM business_members WHERE business_id = $1 AND phone = $2", biz.id, phone
        )
        if dup is not None:
            raise DomainError("This phone is already a member")
        linked_staff_id = None
        if payload.role == "staff":
            # Staff members map to a staff record so their bills feed staff performance.
            linked_staff_id = await conn.fetchval(
                "INSERT INTO staff (business_id, name, role, phone) VALUES ($1,$2,'Staff',$3) RETURNING id",
                biz.id, payload.name.strip(), phone,
            )
        row = await conn.fetchrow(
            """INSERT INTO business_members (business_id, phone, name, role, linked_staff_id, status)
               VALUES ($1,$2,$3,$4,$5,'invited')
               RETURNING id, name, phone, role, status, linked_staff_id""",
            biz.id, phone, payload.name.strip(), payload.role, linked_staff_id,
        )
    return _read(dict(row), biz.member_id)


@router.delete("/{member_id}")
async def remove_member(member_id: UUID, biz: CurrentBusiness = Depends(require_manager)) -> dict:
    async with biz_txn(biz.id) as conn:
        target = await conn.fetchrow(
            "SELECT id, role FROM business_members WHERE id = $1 AND business_id = $2", member_id, biz.id
        )
        if target is None:
            raise NotFoundError("Member not found")
        if target["role"] == "owner":
            raise ForbiddenError("The owner cannot be removed")
        if biz.role == "co_owner" and target["role"] != "staff":
            raise ForbiddenError("Co-owners can only remove staff")
        if target["id"] == biz.member_id:
            raise ForbiddenError("You cannot remove yourself")
        await conn.execute("DELETE FROM business_members WHERE id = $1 AND business_id = $2", member_id, biz.id)
    return {"ok": True}
