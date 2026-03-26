-- 000008_widen_bartonicek_type_column.up.sql
-- Widen bartonicek_type from varchar(15) to varchar(20) to accommodate "not_classifiable" (16 chars).

ALTER TABLE case_responses ALTER COLUMN bartonicek_type TYPE VARCHAR(20);
