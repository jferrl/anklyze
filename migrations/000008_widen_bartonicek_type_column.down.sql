-- 000008_widen_bartonicek_type_column.down.sql

ALTER TABLE case_responses ALTER COLUMN bartonicek_type TYPE VARCHAR(15);
