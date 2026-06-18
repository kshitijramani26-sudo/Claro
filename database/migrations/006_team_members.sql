-- 006 — Team access: multiple members per business with roles.
-- A business now has members (owner / co_owner / staff). The owner is also
-- represented as a member row (role 'owner'). Every bill/payment/khata records
-- who performed it (performed_by_member_id) and customers/credits record who
-- created them (created_by_member_id) — powering staff scoping + the owner audit.
CREATE TABLE IF NOT EXISTS business_members (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id         uuid REFERENCES users(id) ON DELETE SET NULL,  -- NULL until they first log in
    phone           text NOT NULL,                                 -- E.164
    name            text NOT NULL DEFAULT '',
    role            text NOT NULL CHECK (role IN ('owner','co_owner','staff')),
    linked_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,  -- staff members map to a staff record
    status          text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active')),
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_members_biz_idx ON business_members(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS business_members_biz_phone_idx ON business_members(business_id, phone);
CREATE INDEX IF NOT EXISTS business_members_phone_idx ON business_members(phone);

ALTER TABLE bills          ADD COLUMN IF NOT EXISTS performed_by_member_id uuid REFERENCES business_members(id) ON DELETE SET NULL;
ALTER TABLE payments       ADD COLUMN IF NOT EXISTS performed_by_member_id uuid REFERENCES business_members(id) ON DELETE SET NULL;
ALTER TABLE khata_entries  ADD COLUMN IF NOT EXISTS performed_by_member_id uuid REFERENCES business_members(id) ON DELETE SET NULL;
ALTER TABLE khata_entries  ADD COLUMN IF NOT EXISTS created_by_member_id   uuid REFERENCES business_members(id) ON DELETE SET NULL;
ALTER TABLE customers      ADD COLUMN IF NOT EXISTS created_by_member_id   uuid REFERENCES business_members(id) ON DELETE SET NULL;

-- RLS tenant isolation (same pattern as the other tables in schema.sql).
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_members' AND policyname='business_members_tenant') THEN
    CREATE POLICY business_members_tenant ON business_members
      USING (current_setting('app.rls_bypass', true) = 'on'
             OR business_id = NULLIF(current_setting('app.business_id', true), '')::uuid)
      WITH CHECK (current_setting('app.rls_bypass', true) = 'on'
             OR business_id = NULLIF(current_setting('app.business_id', true), '')::uuid);
  END IF;
END $$;
