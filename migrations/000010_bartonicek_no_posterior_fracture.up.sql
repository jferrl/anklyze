-- 000010_bartonicek_no_posterior_fracture.up.sql
-- Widen bartonicek_type from varchar(20) to varchar(30) to accommodate "no_posterior_fracture" (21 chars).

ALTER TABLE case_responses ALTER COLUMN bartonicek_type TYPE VARCHAR(30);
