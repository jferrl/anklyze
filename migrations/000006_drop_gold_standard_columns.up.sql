-- 000006_drop_gold_standard_columns.up.sql
-- Remove divergence analysis / gold standard columns and allow_multiple_responses.
-- Cases now only allow one response per user (enforced in application logic).

ALTER TABLE cases
    DROP COLUMN IF EXISTS reference_classification,
    DROP COLUMN IF EXISTS show_reference_after_submit,
    DROP COLUMN IF EXISTS reference_input,
    DROP COLUMN IF EXISTS allow_multiple_responses;
