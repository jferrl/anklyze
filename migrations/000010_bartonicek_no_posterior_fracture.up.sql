-- 000010_bartonicek_no_posterior_fracture.up.sql
-- Widen bartonicek_type from varchar(20) to varchar(30) to accommodate "no_posterior_fracture" (21 chars).
-- Migrate existing responses: not_classifiable → no_posterior_fracture for non-posterior fracture types.

-- 1. Widen column
ALTER TABLE case_responses ALTER COLUMN bartonicek_type TYPE VARCHAR(30);

-- 2. Update denormalized column
UPDATE case_responses
SET bartonicek_type = 'no_posterior_fracture'
WHERE bartonicek_type = 'not_classifiable'
  AND classification->>'fracture_type' IN (
    'unimaleolar_lateral',
    'unimaleolar_medial',
    'bimaleolar_lateral_medial',
    'distal_tibia'
  );

-- 3. Update classification JSONB
UPDATE case_responses
SET classification = jsonb_set(
      classification,
      '{bartonicek,type}',
      '"no_posterior_fracture"'
    )
WHERE classification->'bartonicek'->>'type' = 'not_classifiable'
  AND classification->>'fracture_type' IN (
    'unimaleolar_lateral',
    'unimaleolar_medial',
    'bimaleolar_lateral_medial',
    'distal_tibia'
  );
