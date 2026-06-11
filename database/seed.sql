-- seed.sql — dev demo data mirroring docs/design/claro-data.js
-- Money in PAISE. Ledger entries are constructed so cached balances == ledger sums
-- (billing_rules §5 audit holds on seeded data).
-- Run after migrations:  psql ... -f database/seed.sql
--
-- Fixed-UUID scheme (last byte group):  0a user · 0b business · c* payment methods
-- e1–e8 inventory · f1–f6 customers · a1–a4 staff · d2–d7 bills

SET app.rls_bypass = 'on';

BEGIN;

-- Demo login: +91 98765 43210 (dev-bypass token "dev:+919876543210")
INSERT INTO users (id, supabase_uid, phone) VALUES
  ('00000000-0000-4000-8000-00000000000a', NULL, '+919876543210');

INSERT INTO businesses (id, user_id, name, owner_name, industry, state_code, gst_registered, gstin,
                        gst_default_mode, price_includes_tax, invoice_prefix, next_invoice_seq, low_stock_default, email)
VALUES ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a',
        'Sharma General Store', 'Rajesh Sharma', 'Grocery / Kirana', '27', true, '27ABCDE1234F1Z5',
        'gst', true, 'INV-', 1043, 10, 'rajesh@example.com');

INSERT INTO payment_methods (id, business_id, type, upi_id, label, is_default) VALUES
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000000b', 'upi', 'rajesh@oksbi',    'SBI Personal',     true),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-00000000000b', 'upi', 'sharmastore@ybl', 'PhonePe Business', false);

-- ── Inventory (claro-data.js, prices → paise, HSN + GST slabs, MRP-inclusive) ──
INSERT INTO inventory_items (id, business_id, name, hsn_code, tax_rate_bps, price_paise, price_is_tax_inclusive, cost_paise, qty_on_hand, low_stock_threshold) VALUES
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000b', 'Aashirvaad Atta 5kg', '1101', 500,  25000, true, 21500, 6,   10),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000000b', 'Maggi Noodles 70g',   '1902', 1200, 1400,  true, 1100,  4,   24),
  ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000000b', 'Surf Excel 1kg',      '3402', 1800, 12000, true, 9800,  3,   12),
  ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000000b', 'Tata Salt 1kg',       '2501', 0,    2800,  true, 2200,  48,  20),
  ('00000000-0000-4000-8000-0000000000e5', '00000000-0000-4000-8000-00000000000b', 'Amul Butter 100g',    '0405', 1200, 5600,  true, 4700,  24,  12),
  ('00000000-0000-4000-8000-0000000000e6', '00000000-0000-4000-8000-00000000000b', 'Parle-G Biscuit',     '1905', 1800, 1000,  true, 800,   120, 40),
  ('00000000-0000-4000-8000-0000000000e7', '00000000-0000-4000-8000-00000000000b', 'Fortune Oil 1L',      '1512', 500,  14000, true, 12200, 18,  10),
  ('00000000-0000-4000-8000-0000000000e8', '00000000-0000-4000-8000-00000000000b', 'Colgate 100g',        '3306', 1800, 5500,  true, 4300,  30,  15);

-- ── Customers (outstanding == ledger sum below) ──
INSERT INTO customers (id, business_id, name, phone, outstanding_balance_paise) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000b', 'Mohan Lal',     '+919820111223', 4850000),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-00000000000b', 'Vijay Singh',   '+919930044556', 3200000),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-00000000000b', 'Suresh Kumar',  '+919899077881', 2480000),
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-00000000000b', 'Priya Verma',   '+919811233445', 1650000),
  ('00000000-0000-4000-8000-0000000000f5', '00000000-0000-4000-8000-00000000000b', 'Fatima Sheikh', '+919701122556', 1200000),
  ('00000000-0000-4000-8000-0000000000f6', '00000000-0000-4000-8000-00000000000b', 'Anita Desai',   '+919650099001', 850000);

-- Mohan Lal timeline (oldest → newest): 42500 −1500 +6000 −2000 +3500 = 48500 ✓
INSERT INTO khata_entries (business_id, customer_id, type, amount_paise, note, created_at) VALUES
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f1', 'credit',  4250000, 'Opening balance',     now() - interval '22 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f1', 'payment',  150000, 'Cash received',       now() - interval '14 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f1', 'credit',   600000, 'Monthly supplies',    now() - interval '9 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f1', 'payment',  200000, 'Part payment',        now() - interval '3 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f1', 'credit',   350000, 'Groceries on credit', now() - interval '18 minutes');

-- Vijay Singh: 27800 (3d ago) + 4200 (4h ago) = 32000 ✓
INSERT INTO khata_entries (business_id, customer_id, type, amount_paise, note, created_at) VALUES
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f2', 'credit', 2780000, 'Opening balance', now() - interval '3 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f2', 'credit',  420000, 'Credit added',    now() - interval '4 hours');

-- Suresh Kumar: 27800 − settled 3000 (yesterday) = 24800 ✓
INSERT INTO khata_entries (business_id, customer_id, type, amount_paise, note, created_at) VALUES
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f3', 'credit',  2780000, 'Opening balance', now() - interval '12 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f3', 'payment',  300000, 'Settled up',      now() - interval '1 day');

-- Priya Verma: 17700 − settled 1200 (1h ago) = 16500 ✓
INSERT INTO khata_entries (business_id, customer_id, type, amount_paise, note, created_at) VALUES
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f4', 'credit',  1770000, 'Opening balance', now() - interval '2 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f4', 'payment',  120000, 'Settled up',      now() - interval '1 hour');

INSERT INTO khata_entries (business_id, customer_id, type, amount_paise, note, created_at) VALUES
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f5', 'credit', 1200000, 'Opening balance', now() - interval '7 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000f6', 'credit',  850000, 'Opening balance', now() - interval '5 days');

-- ── Staff (advance_outstanding == ledger: advances − repayments) ──
INSERT INTO staff (id, business_id, name, role, phone, salary_paise, advance_outstanding_paise) VALUES
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000b', 'Amit Kumar',    'Cashier',   '+919876510001', 1800000, 200000),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000b', 'Sunita Devi',   'Helper',    '+919876510002', 1200000, 0),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-00000000000b', 'Ravi Patel',    'Stock Boy', '+919876510003', 1400000, 500000),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-00000000000b', 'Deepak Sharma', 'Delivery',  '+919876510004', 1500000, 150000);

INSERT INTO staff_ledger (business_id, staff_id, type, amount_paise, note, created_at) VALUES
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a1', 'advance',   200000, 'Festival advance', now() - interval '10 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a1', 'advance',   300000, 'Salary advance',   now() - interval '30 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a1', 'repayment', 300000, 'Repaid',           now() - interval '20 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a3', 'advance',   500000, 'Advance',          now() - interval '15 days'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a4', 'advance',   150000, 'Advance',          now() - interval '8 days');

-- Attendance: today for all four (matches present flags) + 13 prior days for Amit
INSERT INTO attendance (business_id, staff_id, date, status) VALUES
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a1', CURRENT_DATE, 'present'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a2', CURRENT_DATE, 'present'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a3', CURRENT_DATE, 'absent'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a4', CURRENT_DATE, 'present');
INSERT INTO attendance (business_id, staff_id, date, status)
SELECT '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a1',
       CURRENT_DATE - n, CASE WHEN n IN (3, 10) THEN 'absent' ELSE 'present' END
FROM generate_series(1, 13) AS n;

-- ── Bills #1037–#1042 (non_gst snapshots, ad-hoc lines → no stock effect) ──
WITH seedbills(id, inv, total, mode, staff_id, age) AS (
  VALUES
    ('00000000-0000-4000-8000-0000000000d2'::uuid, 'INV-1042', 124000::bigint, 'CASH', '00000000-0000-4000-8000-0000000000a1'::uuid, interval '2 minutes'),
    ('00000000-0000-4000-8000-0000000000d3'::uuid, 'INV-1041',  86000::bigint, 'UPI',  '00000000-0000-4000-8000-0000000000a2'::uuid, interval '41 minutes'),
    ('00000000-0000-4000-8000-0000000000d4'::uuid, 'INV-1040',  43000::bigint, 'CASH', '00000000-0000-4000-8000-0000000000a1'::uuid, interval '2 hours'),
    ('00000000-0000-4000-8000-0000000000d5'::uuid, 'INV-1039', 215000::bigint, 'UPI',  '00000000-0000-4000-8000-0000000000a4'::uuid, interval '3 hours'),
    ('00000000-0000-4000-8000-0000000000d6'::uuid, 'INV-1038',  68000::bigint, 'CASH', '00000000-0000-4000-8000-0000000000a1'::uuid, interval '5 hours'),
    ('00000000-0000-4000-8000-0000000000d7'::uuid, 'INV-1037', 154000::bigint, 'UPI',  '00000000-0000-4000-8000-0000000000a2'::uuid, interval '1 day 2 hours')
)
INSERT INTO bills (id, business_id, staff_id, gst_mode, tax_kind, subtotal_paise, taxable_paise,
                   grand_total_paise, payment_mode, invoice_no, request_id, created_at)
SELECT id, '00000000-0000-4000-8000-00000000000b', staff_id, 'non_gst', 'none', total, total,
       total, mode, inv, gen_random_uuid(), now() - age
FROM seedbills;

INSERT INTO bill_items (bill_id, business_id, name, qty, unit_price_paise, taxable_paise, line_total_paise)
SELECT b.id, b.business_id, 'Assorted items', 1, b.grand_total_paise, b.grand_total_paise, b.grand_total_paise
FROM bills b WHERE b.business_id = '00000000-0000-4000-8000-00000000000b';

INSERT INTO payments (business_id, bill_id, mode, amount_paise, created_at)
SELECT business_id, id, payment_mode, grand_total_paise, created_at
FROM bills WHERE business_id = '00000000-0000-4000-8000-00000000000b' AND payment_mode IN ('CASH','UPI');

INSERT INTO staff_ledger (business_id, staff_id, bill_id, type, amount_paise, created_at)
SELECT business_id, staff_id, id, 'sale_attrib', grand_total_paise, created_at
FROM bills WHERE business_id = '00000000-0000-4000-8000-00000000000b' AND staff_id IS NOT NULL;

COMMIT;
