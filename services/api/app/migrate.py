"""Idempotent additive startup migrations.

Each statement must be safe to run on every boot (IF NOT EXISTS / guarded) and
strictly additive — never destructive. This lets a fresh deploy self-heal the
live schema even when out-of-band migration tooling isn't available, and
guarantees new columns exist before the app starts serving requests that read
them. Failures are logged, not fatal (the app still boots).
"""
import logging

from .db import pool

logger = logging.getLogger(__name__)

# Mirror of database/migrations/*.sql — additive, idempotent statements only.
_STATEMENTS = [
    "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tracked boolean NOT NULL DEFAULT true",
]


async def run_startup_migrations() -> None:
    async with pool().acquire() as conn:
        for stmt in _STATEMENTS:
            try:
                await conn.execute(stmt)
            except Exception as exc:  # never block boot on a migration hiccup
                logger.warning("startup migration skipped (%s...): %s", stmt[:50], exc)
