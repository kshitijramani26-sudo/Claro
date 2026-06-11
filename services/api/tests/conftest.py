"""Test harness: throwaway claro_test database + a fresh business per test.

DSN via CLARO_TEST_DSN (default: the portable dev cluster on :5544).
"""
import os
import pathlib
import uuid

import asyncpg
import pytest_asyncio

os.environ.setdefault("DATABASE_URL", "postgresql://postgres@localhost:5544/claro_test")
os.environ.setdefault("AUTH_DEV_BYPASS", "true")

from app import db as appdb  # noqa: E402
from app.auth import CurrentBusiness, CurrentUser  # noqa: E402

ADMIN_DSN = os.environ.get("CLARO_TEST_ADMIN_DSN", "postgresql://postgres@localhost:5544/postgres")
TEST_DSN = os.environ["DATABASE_URL"]
MIGRATIONS_DIR = pathlib.Path(__file__).resolve().parents[3] / "database" / "migrations"


@pytest_asyncio.fixture(scope="session", autouse=True)
async def database():
    admin = await asyncpg.connect(ADMIN_DSN)
    await admin.execute("DROP DATABASE IF EXISTS claro_test")
    await admin.execute("CREATE DATABASE claro_test")
    await admin.close()

    conn = await asyncpg.connect(TEST_DSN)
    for migration in sorted(MIGRATIONS_DIR.glob("*.sql")):
        await conn.execute(migration.read_text(encoding="utf-8"))
    await conn.close()

    await appdb.init_pool()
    yield
    await appdb.close_pool()


@pytest_asyncio.fixture
async def biz() -> CurrentBusiness:
    """A fresh GST-registered business (state 27) with inventory, staff, customer."""
    async with appdb.admin_txn() as conn:
        phone = "+91" + str(uuid.uuid4().int)[:10]
        user_id = await conn.fetchval(
            "INSERT INTO users (phone) VALUES ($1) RETURNING id", phone
        )
        row = await conn.fetchrow(
            """INSERT INTO businesses (user_id, name, owner_name, state_code, gst_registered, gstin,
                                       gst_default_mode, price_includes_tax)
               VALUES ($1, 'Test Store', 'Tester', '27', true, '27TEST1234A1Z5', 'gst', true)
               RETURNING *""",
            user_id,
        )
    user = CurrentUser(id=user_id, phone=phone, supabase_uid=None)
    return CurrentBusiness(id=row["id"], user=user, row=dict(row))


async def add_item(biz: CurrentBusiness, name: str, price_paise: int, qty: int,
                   tax_rate_bps: int = 0, inclusive: bool = True, cost_paise: int = 0) -> uuid.UUID:
    async with appdb.biz_txn(biz.id) as conn:
        return await conn.fetchval(
            """INSERT INTO inventory_items (business_id, name, price_paise, qty_on_hand, tax_rate_bps,
                                            price_is_tax_inclusive, cost_paise)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id""",
            biz.id, name, price_paise, qty, tax_rate_bps, inclusive, cost_paise,
        )


async def add_customer(biz: CurrentBusiness, name: str = "Cust", phone: str = "") -> uuid.UUID:
    async with appdb.biz_txn(biz.id) as conn:
        return await conn.fetchval(
            "INSERT INTO customers (business_id, name, phone) VALUES ($1, $2, NULLIF($3, '')) RETURNING id",
            biz.id, name, phone,
        )


async def add_staff(biz: CurrentBusiness, name: str = "Staff") -> uuid.UUID:
    async with appdb.biz_txn(biz.id) as conn:
        return await conn.fetchval(
            "INSERT INTO staff (business_id, name) VALUES ($1, $2) RETURNING id", biz.id, name
        )


async def fetchval(biz: CurrentBusiness, sql: str, *args):
    async with appdb.biz_txn(biz.id) as conn:
        return await conn.fetchval(sql, *args)
