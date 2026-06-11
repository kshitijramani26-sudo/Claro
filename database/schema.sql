-- schema.sql — current schema snapshot (generated from database/migrations/*.sql).
-- Do not edit directly; edit migrations and regenerate.
-- Money = INTEGER PAISE everywhere. See docs/billing_rules.md for invariants.

-- 001_init.sql â€” Claro initial schema
-- All money columns are INTEGER PAISE (BIGINT). Quantities are integers.
-- Timestamps are UTC (timestamptz). Display conversion happens at the edge.
--
-- Multi-tenancy: every business-scoped table carries business_id (denormalized
-- onto child tables so RLS stays one-hop). The API sets
--   SET LOCAL app.business_id = '<uuid>'
-- inside each transaction; RLS policies enforce it as defense-in-depth.
-- Seeds/tests/admin set app.rls_bypass = 'on'.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- One row per authenticated phone. supabase_uid links to Supabase auth.users.
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_uid  uuid UNIQUE,
    phone         text NOT NULL UNIQUE,          -- E.164, e.g. +919876543210
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ businesses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE businesses (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name               text NOT NULL,
    owner_name         text NOT NULL,
    industry           text NOT NULL DEFAULT 'Other',
    state_code         text NOT NULL DEFAULT '27',          -- GST state code, place-of-supply origin
    address            text NOT NULL DEFAULT '',
    gst_registered     boolean NOT NULL DEFAULT false,
    gstin              text NOT NULL DEFAULT '',
    gst_default_mode   text NOT NULL DEFAULT 'non_gst' CHECK (gst_default_mode IN ('gst','non_gst')),
    price_includes_tax boolean NOT NULL DEFAULT true,        -- default for new inventory items
    invoice_prefix     text NOT NULL DEFAULT 'INV-',
    next_invoice_seq   bigint NOT NULL DEFAULT 1001,
    low_stock_default  integer NOT NULL DEFAULT 10,
    allow_negative_stock boolean NOT NULL DEFAULT false,
    email              text NOT NULL DEFAULT '',
    created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX businesses_user_idx ON businesses(user_id);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ payment_methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE payment_methods (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type          text NOT NULL DEFAULT 'upi' CHECK (type IN ('upi')),
    upi_id        text NOT NULL DEFAULT '',
    qr_image_url  text,                                      -- uploaded QR image, else QR generated from upi_id
    label         text NOT NULL DEFAULT '',
    is_default    boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_methods_biz_idx ON payment_methods(business_id);
CREATE UNIQUE INDEX payment_methods_one_default_idx
    ON payment_methods(business_id) WHERE is_default;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ customers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE customers (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id               uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name                      text NOT NULL,
    phone                     text,                          -- E.164 when known
    state_code                text,                          -- NULL â‡’ defaults to business state
    outstanding_balance_paise bigint NOT NULL DEFAULT 0,
    created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_biz_idx ON customers(business_id);
CREATE UNIQUE INDEX customers_biz_phone_idx ON customers(business_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX customers_biz_name_idx ON customers(business_id, lower(name) text_pattern_ops);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ inventory_items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE inventory_items (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id            uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name                   text NOT NULL,
    hsn_code               text NOT NULL DEFAULT '',
    tax_rate_bps           integer NOT NULL DEFAULT 0 CHECK (tax_rate_bps IN (0,500,1200,1800,2800)),
    price_paise            bigint NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
    price_is_tax_inclusive boolean NOT NULL DEFAULT true,
    cost_paise             bigint NOT NULL DEFAULT 0 CHECK (cost_paise >= 0),
    qty_on_hand            integer NOT NULL DEFAULT 0,
    low_stock_threshold    integer NOT NULL DEFAULT 10,
    created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_items_biz_idx ON inventory_items(business_id);
CREATE INDEX inventory_items_biz_name_idx ON inventory_items(business_id, lower(name) text_pattern_ops);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ staff â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE staff (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id               uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name                      text NOT NULL,
    role                      text NOT NULL DEFAULT '',
    phone                     text,
    salary_paise              bigint NOT NULL DEFAULT 0,
    advance_outstanding_paise bigint NOT NULL DEFAULT 0,
    created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_biz_idx ON staff(business_id);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ bills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- GST snapshot persisted on the row: invoices are immutable history.
CREATE TABLE bills (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id           uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id           uuid REFERENCES customers(id),
    staff_id              uuid REFERENCES staff(id),
    gst_mode              text NOT NULL DEFAULT 'non_gst' CHECK (gst_mode IN ('gst','non_gst')),
    place_of_supply_state text NOT NULL DEFAULT '',
    tax_kind              text NOT NULL DEFAULT 'none' CHECK (tax_kind IN ('intra','inter','none')),
    subtotal_paise        bigint NOT NULL,
    discount_paise        bigint NOT NULL DEFAULT 0,
    taxable_paise         bigint NOT NULL,
    cgst_paise            bigint NOT NULL DEFAULT 0,
    sgst_paise            bigint NOT NULL DEFAULT 0,
    igst_paise            bigint NOT NULL DEFAULT 0,
    tax_total_paise       bigint NOT NULL DEFAULT 0,
    grand_total_paise     bigint NOT NULL CHECK (grand_total_paise >= 0),
    payment_mode          text NOT NULL CHECK (payment_mode IN ('CASH','UPI','CREDIT')),
    payment_method_id     uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
    invoice_no            text NOT NULL,
    note                  text,
    pdf_url               text,
    request_id            uuid NOT NULL,
    created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bills_idempotency_idx ON bills(business_id, request_id);
CREATE UNIQUE INDEX bills_invoice_no_idx  ON bills(business_id, invoice_no);
CREATE INDEX bills_biz_created_idx        ON bills(business_id, created_at DESC);
CREATE INDEX bills_staff_idx              ON bills(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX bills_customer_idx           ON bills(customer_id) WHERE customer_id IS NOT NULL;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ bill_items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE bill_items (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id           uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    business_id       uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    inventory_item_id uuid REFERENCES inventory_items(id),
    name              text NOT NULL,
    hsn_code          text NOT NULL DEFAULT '',
    qty               integer NOT NULL CHECK (qty > 0),
    unit_price_paise  bigint NOT NULL CHECK (unit_price_paise >= 0),
    tax_rate_bps      integer NOT NULL DEFAULT 0,
    taxable_paise     bigint NOT NULL,
    tax_paise         bigint NOT NULL DEFAULT 0,
    line_total_paise  bigint NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bill_items_bill_idx ON bill_items(bill_id);
CREATE INDEX bill_items_biz_item_idx ON bill_items(business_id, inventory_item_id) WHERE inventory_item_id IS NOT NULL;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ khata_entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- The ledger is truth; customers.outstanding_balance_paise is a cached projection.
CREATE TABLE khata_entries (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    bill_id      uuid REFERENCES bills(id),
    type         text NOT NULL CHECK (type IN ('credit','payment')),
    amount_paise bigint NOT NULL CHECK (amount_paise > 0),
    note         text NOT NULL DEFAULT '',
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX khata_entries_cust_idx ON khata_entries(business_id, customer_id, created_at DESC);
CREATE INDEX khata_entries_biz_created_idx ON khata_entries(business_id, created_at DESC);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Settled (CASH/UPI) revenue records.
CREATE TABLE payments (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    bill_id      uuid REFERENCES bills(id),
    customer_id  uuid REFERENCES customers(id),
    mode         text NOT NULL CHECK (mode IN ('CASH','UPI')),
    amount_paise bigint NOT NULL CHECK (amount_paise > 0),
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_biz_created_idx ON payments(business_id, created_at DESC);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ stock_ledger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE stock_ledger (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    item_id     uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    bill_id     uuid REFERENCES bills(id),
    delta_qty   integer NOT NULL,
    reason      text NOT NULL CHECK (reason IN ('SALE','VOID','ADJUST','INIT','RESTOCK')),
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_ledger_item_idx ON stock_ledger(item_id, created_at DESC);
CREATE INDEX stock_ledger_biz_idx  ON stock_ledger(business_id, created_at DESC);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ staff_ledger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE staff_ledger (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    staff_id     uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    bill_id      uuid REFERENCES bills(id),
    type         text NOT NULL CHECK (type IN ('advance','repayment','sale_attrib','salary_payment')),
    amount_paise bigint NOT NULL CHECK (amount_paise > 0),
    note         text NOT NULL DEFAULT '',
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_ledger_staff_idx ON staff_ledger(staff_id, created_at DESC);
CREATE INDEX staff_ledger_biz_type_idx ON staff_ledger(business_id, type, created_at DESC);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ attendance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE attendance (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    staff_id    uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date        date NOT NULL,
    status      text NOT NULL CHECK (status IN ('present','absent')),
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX attendance_staff_date_idx ON attendance(staff_id, date);
CREATE INDEX attendance_biz_idx ON attendance(business_id, date DESC);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ RLS (defense-in-depth) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- The API runs every request inside a transaction that first executes
--   SET LOCAL app.business_id = '<business uuid>'
-- Owner/superuser connections bypass unless FORCE'd; we FORCE so the
-- policy applies even to the table owner. Maintenance scripts set
--   SET app.rls_bypass = 'on'.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payment_methods','customers','inventory_items','staff','bills','bill_items',
    'khata_entries','payments','stock_ledger','staff_ledger','attendance'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY %I_tenant ON %I
      USING (
        current_setting('app.rls_bypass', true) = 'on'
        OR business_id = NULLIF(current_setting('app.business_id', true), '')::uuid
      )
      WITH CHECK (
        current_setting('app.rls_bypass', true) = 'on'
        OR business_id = NULLIF(current_setting('app.business_id', true), '')::uuid
      )$p$, t, t);
  END LOOP;
END $$;

