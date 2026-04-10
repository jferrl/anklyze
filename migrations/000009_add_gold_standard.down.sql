-- 000009_add_gold_standard.down.sql
-- Remove gold_standard column from cases.

ALTER TABLE cases
    DROP COLUMN IF EXISTS gold_standard;
