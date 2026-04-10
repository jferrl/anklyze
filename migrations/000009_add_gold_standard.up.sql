-- 000009_add_gold_standard.up.sql
-- Add gold_standard JSONB column to cases for storing the reference classification.
-- Admins can set this at any case status (draft, published, closed).

ALTER TABLE cases
    ADD COLUMN IF NOT EXISTS gold_standard JSONB;
