-- 000006_drop_gold_standard_columns.down.sql
-- Re-add divergence analysis / gold standard columns and allow_multiple_responses.

ALTER TABLE cases
    ADD COLUMN IF NOT EXISTS reference_classification    JSONB,
    ADD COLUMN IF NOT EXISTS show_reference_after_submit BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reference_input             JSONB,
    ADD COLUMN IF NOT EXISTS allow_multiple_responses    BOOLEAN NOT NULL DEFAULT FALSE;
