"""Customer autocomplete search (saved customers; device contacts merge client-side)."""
from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..schemas import CustomerRead

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/search", response_model=list[CustomerRead])
async def search(q: str = "", limit: int = 8, biz: CurrentBusiness = Depends(get_current_business)) -> list[CustomerRead]:
    q = q.strip()
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            """SELECT id, name, COALESCE(phone, '') AS phone, state_code, outstanding_balance_paise
               FROM customers
               WHERE business_id = $1 AND ($2 = '' OR lower(name) LIKE lower($2) || '%'
                                           OR phone LIKE '%' || $2 || '%')
               ORDER BY name LIMIT $3""",
            biz.id, q, max(1, min(limit, 25)),
        )
    return [
        CustomerRead(id=r["id"], name=r["name"], phone=r["phone"], state_code=r["state_code"],
                     outstanding_paise=r["outstanding_balance_paise"])
        for r in rows
    ]
