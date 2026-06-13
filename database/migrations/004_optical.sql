-- 004_optical.sql — Optical features (prescriptions table, item type split, order status)

CREATE TABLE IF NOT EXISTS prescriptions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    bill_id       uuid REFERENCES bills(id) ON DELETE SET NULL,
    date          date NOT NULL DEFAULT CURRENT_DATE,
    
    -- Right eye distance
    r_dist_sph    text NOT NULL DEFAULT '',
    r_dist_cyl    text NOT NULL DEFAULT '',
    r_dist_axis   integer,
    r_dist_vn     text NOT NULL DEFAULT '',
    
    -- Right eye near
    r_near_sph    text NOT NULL DEFAULT '',
    r_near_cyl    text NOT NULL DEFAULT '',
    r_near_axis   integer,
    r_near_vn     text NOT NULL DEFAULT '',
    
    -- Left eye distance
    l_dist_sph    text NOT NULL DEFAULT '',
    l_dist_cyl    text NOT NULL DEFAULT '',
    l_dist_axis   integer,
    l_dist_vn     text NOT NULL DEFAULT '',
    
    -- Left eye near
    l_near_sph    text NOT NULL DEFAULT '',
    l_near_cyl    text NOT NULL DEFAULT '',
    l_near_axis   integer,
    l_near_vn     text NOT NULL DEFAULT '',
    
    add_r         text NOT NULL DEFAULT '',
    add_l         text NOT NULL DEFAULT '',
    pd            text NOT NULL DEFAULT '',
    
    lens_types    text[] NOT NULL DEFAULT '{}',
    remarks       text NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prescriptions_biz_cust_idx ON prescriptions(business_id, customer_id);
CREATE INDEX IF NOT EXISTS prescriptions_bill_idx ON prescriptions(bill_id) WHERE bill_id IS NOT NULL;

-- Enable RLS for prescriptions
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prescriptions_tenant ON prescriptions;
CREATE POLICY prescriptions_tenant ON prescriptions
USING (
  current_setting('app.rls_bypass', true) = 'on'
  OR business_id = NULLIF(current_setting('app.business_id', true), '')::uuid
)
WITH CHECK (
  current_setting('app.rls_bypass', true) = 'on'
  OR business_id = NULLIF(current_setting('app.business_id', true), '')::uuid
);

-- Add optical fields to bill_items & bills
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS item_kind text NOT NULL DEFAULT 'other';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS order_status text DEFAULT 'delivered';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS delivery_date date;
