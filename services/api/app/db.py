"""asyncpg pool + business-scoped transactions.

Every request handler runs its queries inside `biz_txn(business_id)`, which
opens a transaction and executes `SET LOCAL app.business_id = $1` so the
Postgres RLS policies (defense-in-depth) line up with the app-level scoping.
"""
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import UUID

import asyncpg

from .config import get_settings

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    if _pool is None:
        dsn = get_settings().database_url
        # Supabase poolers (pgbouncer) don't support prepared statements in txn mode.
        _pool = await asyncpg.create_pool(dsn, min_size=1, max_size=10, statement_cache_size=0)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool() -> asyncpg.Pool:
    assert _pool is not None, "DB pool not initialised"
    return _pool


@asynccontextmanager
async def biz_txn(business_id: UUID) -> AsyncIterator[asyncpg.Connection]:
    """One transaction, scoped to a business via the RLS GUC."""
    async with pool().acquire() as conn:
        async with conn.transaction():
            await conn.execute("SELECT set_config('app.business_id', $1, true)", str(business_id))
            yield conn


@asynccontextmanager
async def admin_txn() -> AsyncIterator[asyncpg.Connection]:
    """Unscoped transaction for user/business resolution (auth) only."""
    async with pool().acquire() as conn:
        async with conn.transaction():
            await conn.execute("SELECT set_config('app.rls_bypass', 'on', true)")
            yield conn
