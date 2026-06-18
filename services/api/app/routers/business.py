"""Business profile — onboarding create + settings patch."""
from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, CurrentUser, get_current_business, get_current_user
from ..db import admin_txn
from ..errors import DomainError
from ..permissions import require_manager
from ..schemas import BusinessCreate, BusinessPatch, BusinessRead

router = APIRouter(prefix="/business", tags=["business"])


def _read(row: dict, phone: str, role: str = "owner") -> BusinessRead:
    return BusinessRead(
        id=row["id"], name=row["name"], owner_name=row["owner_name"], industry=row["industry"],
        state_code=row["state_code"], address=row["address"], gst_registered=row["gst_registered"],
        gstin=row["gstin"], gst_default_mode=row["gst_default_mode"],
        price_includes_tax=row["price_includes_tax"], invoice_prefix=row["invoice_prefix"],
        low_stock_default=row["low_stock_default"], email=row["email"], phone=phone, role=role,
    )


@router.get("", response_model=BusinessRead)
async def get_business(biz: CurrentBusiness = Depends(get_current_business)) -> BusinessRead:
    return _read(biz.row, biz.user.phone, biz.role)


@router.post("", response_model=BusinessRead)
async def create_business(payload: BusinessCreate, user: CurrentUser = Depends(get_current_user)) -> BusinessRead:
    mode = payload.gst_default_mode or ("gst" if payload.gst_registered else "non_gst")
    if not payload.gst_registered:
        mode = "non_gst"
    async with admin_txn() as conn:
        existing = await conn.fetchrow("SELECT id FROM businesses WHERE user_id = $1", user.id)
        if existing is not None:
            raise DomainError("Business already exists; use PATCH /business")
        row = await conn.fetchrow(
            """INSERT INTO businesses (user_id, name, owner_name, industry, state_code, address,
                                       gst_registered, gstin, gst_default_mode, price_includes_tax,
                                       invoice_prefix, email)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *""",
            user.id, payload.name, payload.owner_name, payload.industry, payload.state_code,
            payload.address, payload.gst_registered, payload.gstin, mode,
            payload.price_includes_tax, payload.invoice_prefix, payload.email,
        )
    return _read(dict(row), user.phone)


@router.patch("", response_model=BusinessRead)
async def patch_business(payload: BusinessPatch, biz: CurrentBusiness = Depends(require_manager)) -> BusinessRead:
    # Owner/co-owner only — staff cannot edit business settings (server-enforced).
    updates = payload.model_dump(exclude_none=True)
    if updates.get("gst_registered") is False:
        updates["gst_default_mode"] = "non_gst"
    if not updates:
        return _read(biz.row, biz.user.phone, biz.role)
    cols = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(updates))
    async with admin_txn() as conn:
        row = await conn.fetchrow(
            f"UPDATE businesses SET {cols} WHERE id = $1 RETURNING *",
            biz.id, *updates.values(),
        )
    return _read(dict(row), biz.user.phone, biz.role)
