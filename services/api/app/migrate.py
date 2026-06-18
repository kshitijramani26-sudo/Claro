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
    # 005 — untracked catalogue items.
    "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tracked boolean NOT NULL DEFAULT true",
    # 006 — team access: members + attribution.
    """CREATE TABLE IF NOT EXISTS business_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        phone text NOT NULL,
        name text NOT NULL DEFAULT '',
        role text NOT NULL CHECK (role IN ('owner','co_owner','staff')),
        linked_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active')),
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    "CREATE INDEX IF NOT EXISTS business_members_biz_idx ON business_members(business_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS business_members_biz_phone_idx ON business_members(business_id, phone)",
    "CREATE INDEX IF NOT EXISTS business_members_phone_idx ON business_members(phone)",
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS performed_by_member_id uuid REFERENCES business_members(id) ON DELETE SET NULL",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS performed_by_member_id uuid REFERENCES business_members(id) ON DELETE SET NULL",
    "ALTER TABLE khata_entries ADD COLUMN IF NOT EXISTS performed_by_member_id uuid REFERENCES business_members(id) ON DELETE SET NULL",
    "ALTER TABLE khata_entries ADD COLUMN IF NOT EXISTS created_by_member_id uuid REFERENCES business_members(id) ON DELETE SET NULL",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by_member_id uuid REFERENCES business_members(id) ON DELETE SET NULL",
    # RLS tenant isolation for the new table (same pattern as schema.sql).
    """DO $$ BEGIN
        EXECUTE 'ALTER TABLE business_members ENABLE ROW LEVEL SECURITY';
        EXECUTE 'ALTER TABLE business_members FORCE ROW LEVEL SECURITY';
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_members' AND policyname='business_members_tenant') THEN
          EXECUTE $p$CREATE POLICY business_members_tenant ON business_members
            USING (current_setting('app.rls_bypass', true) = 'on'
                   OR business_id = NULLIF(current_setting('app.business_id', true), '')::uuid)
            WITH CHECK (current_setting('app.rls_bypass', true) = 'on'
                   OR business_id = NULLIF(current_setting('app.business_id', true), '')::uuid)$p$;
        END IF;
    END $$""",
]


async def run_startup_migrations() -> None:
    async with pool().acquire() as conn:
        for stmt in _STATEMENTS:
            try:
                await conn.execute(stmt)
            except Exception as exc:  # never block boot on a migration hiccup
                logger.warning("startup migration skipped (%s...): %s", stmt[:50], exc)
