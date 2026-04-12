-- 000010_bartonicek_no_posterior_fracture.down.sql
-- Revert no_posterior_fracture back to not_classifiable and shrink column.

-- 1. Revert classification JSONB
UPDATE case_responses
SET classification = jsonb_set(
      classification,
      '{bartonicek,type}',
      '"not_classifiable"'
    )
WHERE classification->'bartonicek'->>'type' = 'no_posterior_fracture';

-- 2. Revert denormalized column
UPDATE case_responses
SET bartonicek_type = 'not_classifiable'
WHERE bartonicek_type = 'no_posterior_fracture';

-- 3. Shrink column back
ALTER TABLE case_responses ALTER COLUMN bartonicek_type TYPE VARCHAR(20);
