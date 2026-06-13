-- 003_partial_payment.sql — advance / part payment on a bill.
-- A bill may now be partly paid now (a `payment` for the received amount) and
-- carry the rest as the customer's outstanding (a khata credit). The customer
-- balance still equals Σ khata credits (the advance is a payment row, not a
-- khata payment), so the ledger==balance audit (billing_rules §5) holds.

ALTER TABLE bills ADD COLUMN IF NOT EXISTS amount_received_paise bigint NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS balance_due_paise     bigint NOT NULL DEFAULT 0;

-- Backfill existing rows from their payment mode.
UPDATE bills SET
    amount_received_paise = CASE WHEN payment_mode IN ('CASH','UPI') THEN grand_total_paise ELSE 0 END,
    balance_due_paise     = CASE WHEN payment_mode = 'CREDIT'        THEN grand_total_paise ELSE 0 END
WHERE amount_received_paise = 0 AND balance_due_paise = 0;
