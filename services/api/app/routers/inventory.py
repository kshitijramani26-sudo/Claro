"""Inventory CRUD + stats. Stock changes outside sales go through the ledger too."""
from uuid import UUID

from fastapi import APIRouter, Depends

from ..auth import CurrentBusiness, get_current_business
from ..db import biz_txn
from ..errors import NotFoundError
from ..schemas import InventoryCreate, InventoryPatch, InventoryRead, InventoryStatsRead

router = APIRouter(prefix="/inventory", tags=["inventory"])

# Untracked (catalogue-only) items are never "low" — they have no managed stock.
_COLS = """id, name, hsn_code, tax_rate_bps, price_paise, price_is_tax_inclusive,
           cost_paise, qty_on_hand, low_stock_threshold, tracked,
           (tracked AND qty_on_hand <= low_stock_threshold) AS low"""


@router.get("", response_model=list[InventoryRead])
async def list_inventory(biz: CurrentBusiness = Depends(get_current_business)) -> list[InventoryRead]:
    async with biz_txn(biz.id) as conn:
        rows = await conn.fetch(
            f"""SELECT {_COLS} FROM inventory_items WHERE business_id = $1
                ORDER BY (tracked AND qty_on_hand <= low_stock_threshold) DESC, name""",
            biz.id,
        )
    # Staff may see item name, availability and selling price — never cost price.
    items = [InventoryRead(**dict(r)) for r in rows]
    if biz.is_staff:
        for it in items:
            it.cost_paise = 0
    return items


@router.get("/stats", response_model=InventoryStatsRead)
async def inventory_stats(biz: CurrentBusiness = Depends(get_current_business)) -> InventoryStatsRead:
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            # Stock value = what the owner PAID for on-hand stock (cost × qty), not its
            # selling price — shows the capital tied up in inventory.
            """SELECT COALESCE(sum(qty_on_hand::bigint * cost_paise), 0) AS total_value,
                      count(*) AS skus,
                      count(*) FILTER (WHERE tracked AND qty_on_hand <= low_stock_threshold) AS low_count
               FROM inventory_items WHERE business_id = $1""",
            biz.id,
        )
    # Staff must not see total stock value (cost/capital) — return 0 for them.
    total_value = 0 if biz.is_staff else row["total_value"]
    return InventoryStatsRead(total_value_paise=total_value, skus=row["skus"], low_count=row["low_count"])


@router.post("", response_model=InventoryRead)
async def create_item(payload: InventoryCreate, biz: CurrentBusiness = Depends(get_current_business)) -> InventoryRead:
    inclusive = payload.price_is_tax_inclusive if payload.price_is_tax_inclusive is not None else biz.row["price_includes_tax"]
    threshold = payload.low_stock_threshold if payload.low_stock_threshold is not None else biz.row["low_stock_default"]
    async with biz_txn(biz.id) as conn:
        row = await conn.fetchrow(
            f"""INSERT INTO inventory_items (business_id, name, hsn_code, tax_rate_bps, price_paise,
                                             price_is_tax_inclusive, cost_paise, qty_on_hand, low_stock_threshold, tracked)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                RETURNING {_COLS}""",
            biz.id, payload.name, payload.hsn_code, payload.tax_rate_bps, payload.price_paise,
            inclusive, payload.cost_paise, payload.qty_on_hand, threshold, payload.tracked,
        )
        if payload.qty_on_hand > 0:
            await conn.execute(
                """INSERT INTO stock_ledger (business_id, item_id, delta_qty, reason)
                   VALUES ($1, $2, $3, 'INIT')""",
                biz.id, row["id"], payload.qty_on_hand,
            )
    return InventoryRead(**dict(row))


@router.patch("/{item_id}", response_model=InventoryRead)
async def patch_item(item_id: UUID, payload: InventoryPatch, biz: CurrentBusiness = Depends(get_current_business)) -> InventoryRead:
    updates = payload.model_dump(exclude_none=True)
    # Adding a quantity to a catalogue-only item promotes it to a stock-managed item.
    if "qty_on_hand" in updates:
        updates["tracked"] = True
    async with biz_txn(biz.id) as conn:
        if "qty_on_hand" in updates:
            old = await conn.fetchval(
                "SELECT qty_on_hand FROM inventory_items WHERE id = $1 AND business_id = $2", item_id, biz.id
            )
            if old is None:
                raise NotFoundError("Item not found")
            delta = updates["qty_on_hand"] - old
            if delta != 0:
                await conn.execute(
                    """INSERT INTO stock_ledger (business_id, item_id, delta_qty, reason)
                       VALUES ($1, $2, $3, 'ADJUST')""",
                    biz.id, item_id, delta,
                )
        if not updates:
            row = await conn.fetchrow(
                f"SELECT {_COLS} FROM inventory_items WHERE id = $1 AND business_id = $2", item_id, biz.id
            )
        else:
            cols = ", ".join(f"{k} = ${i + 3}" for i, k in enumerate(updates))
            row = await conn.fetchrow(
                f"""UPDATE inventory_items SET {cols} WHERE id = $1 AND business_id = $2
                    RETURNING {_COLS}""",
                item_id, biz.id, *updates.values(),
            )
        if row is None:
            raise NotFoundError("Item not found")
    return InventoryRead(**dict(row))


@router.delete("/{item_id}")
async def delete_item(item_id: UUID, biz: CurrentBusiness = Depends(get_current_business)) -> dict:
    async with biz_txn(biz.id) as conn:
        # Past bills snapshot the name/price, so detach (don't block delete) any
        # historical references before removing the item. stock_ledger cascades.
        await conn.execute(
            "UPDATE bill_items SET inventory_item_id = NULL WHERE inventory_item_id = $1 AND business_id = $2",
            item_id, biz.id,
        )
        deleted = await conn.fetchval(
            "DELETE FROM inventory_items WHERE id = $1 AND business_id = $2 RETURNING id", item_id, biz.id
        )
    if deleted is None:
        raise NotFoundError("Item not found")
    return {"ok": True}
