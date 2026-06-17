-- 005 — untracked catalogue items.
-- A custom line typed during billing is saved to the catalogue as an *untracked*
-- item: it has a name + selling price but no managed stock. Untracked items are
-- always sellable (no oversell guard, no stock decrement) and never flagged low.
-- Editing one to add a quantity flips tracked=true and it becomes stock-managed.
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tracked boolean NOT NULL DEFAULT true;
