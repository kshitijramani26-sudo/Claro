-- 002_staff_salary.sql — add the 'salary_payment' staff_ledger type.
-- Pay Salary records a dated salary_payment entry; the monthly cycle is derived
-- from these entries (a month is "paid" once it has one). Advances are adjusted
-- against salary at pay time, so the next month starts fresh.

ALTER TABLE staff_ledger DROP CONSTRAINT IF EXISTS staff_ledger_type_check;
ALTER TABLE staff_ledger
    ADD CONSTRAINT staff_ledger_type_check
    CHECK (type IN ('advance', 'repayment', 'sale_attrib', 'salary_payment'));
