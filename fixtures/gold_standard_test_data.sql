-- =============================================================================
-- Gold Standard Accuracy Test Fixtures
-- =============================================================================
-- Run AFTER app startup (migrations must have run to add gold_standard column).
--
-- Usage:
--   make db-gold-standard
--   -- or manually:
--   docker compose exec postgres psql -U postgres -d anklyze -f /fixtures/gold_standard_test_data.sql
--
-- This creates:
--   1. Gold standard on existing study cases (from study_test_data_auto.sql)
--   2. A new "Gold Standard Accuracy Study" with 5 standalone cases
--   3. 6 raters with varying accuracy levels
--   4. 30 responses designed for predictable accuracy patterns
--
-- Expected accuracy results:
--   GS Case 1: 100% all systems (perfect agreement with gold)
--   GS Case 2: ~60% DW, ~40% LH, ~60% AO (hard case - <50% LH)
--   GS Case 3: ~80% all systems (high accuracy with one outlier)
--   GS Case 4: impossible/not_classifiable gold standard
--   GS Case 5: No gold standard (control - inter-rater only)
-- =============================================================================

DO $$
DECLARE
    admin_user_id UUID;

    -- Raters for gold standard study
    gs_rater1_id UUID := gen_random_uuid();
    gs_rater2_id UUID := gen_random_uuid();
    gs_rater3_id UUID := gen_random_uuid();
    gs_rater4_id UUID := gen_random_uuid();
    gs_rater5_id UUID := gen_random_uuid();

    -- Gold Standard Accuracy Study
    gs_study_id UUID := gen_random_uuid();

    -- Cases for the gold standard study
    gs_case_perfect_id UUID := gen_random_uuid();
    gs_case_hard_id UUID := gen_random_uuid();
    gs_case_high_id UUID := gen_random_uuid();
    gs_case_impossible_id UUID := gen_random_uuid();
    gs_case_no_gold_id UUID := gen_random_uuid();

BEGIN
    -- Find an admin user
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users LIMIT 1;
    END IF;
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Please run the base fixtures or login first.';
    END IF;

    RAISE NOTICE 'Using admin user: %', admin_user_id;

    -- =========================================================================
    -- PART 1: Set gold_standard on existing study cases
    -- =========================================================================
    -- Note: The existing fixture responses use abbreviated denormalized values
    -- (e.g., 'B' instead of 'Weber B'). Gold standard uses full domain types.
    -- This means accuracy will show 0% for DW/BT on those cases, which
    -- demonstrates the system correctly detecting mismatches.
    --
    -- The standalone cases below use proper domain-type values.
    -- =========================================================================

    -- Active study cases
    UPDATE cases SET gold_standard = '{"fracture_type": "result.lateral_only.transindesmal.spiral", "danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb
    WHERE title = 'Case A1: Weber B Fracture';

    UPDATE cases SET gold_standard = '{"fracture_type": "result.lateral_medial.transverse.transindesmal.spiral", "danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "Bartonicek 2"}}'::jsonb
    WHERE title = 'Case A2: Bimalleolar Fracture';

    UPDATE cases SET gold_standard = '{"fracture_type": "result.lateral_only.suprasindesmal.multifragmentary", "danis_weber": {"type": "Weber C"}, "lauge_hansen": {"type": "PER"}, "ao_ota": {"code": "44-C2"}}'::jsonb
    WHERE title = 'Case A3: Weber C High Fibula';

    UPDATE cases SET gold_standard = '{"fracture_type": "result.medial_only.vertical", "lauge_hansen": {"type": "PA"}, "ao_ota": {"code": "44-A1"}}'::jsonb
    WHERE title = 'Case A4: Isolated Medial Malleolus';

    UPDATE cases SET gold_standard = '{"fracture_type": "result.lateral_medial_posterior.transverse.transindesmal.spiral.type_3", "danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "Bartonicek 3"}}'::jsonb
    WHERE title = 'Case A5: Trimalleolar Fracture';

    -- Closed study cases
    UPDATE cases SET gold_standard = '{"fracture_type": "result.lateral_only.transindesmal.spiral", "danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb
    WHERE title = 'Validation Case 1: Classic SER';

    UPDATE cases SET gold_standard = '{"fracture_type": "result.lateral_medial.transverse.transindesmal.oblique", "danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "PA"}, "ao_ota": {"code": "44-B2"}}'::jsonb
    WHERE title = 'Validation Case 2: PAB Pattern';

    UPDATE cases SET gold_standard = '{"fracture_type": "result.lateral_only.suprasindesmal.simple", "danis_weber": {"type": "Weber C"}, "lauge_hansen": {"type": "PER"}, "ao_ota": {"code": "44-C1"}}'::jsonb
    WHERE title = 'Validation Case 3: High Fibula PER';

    RAISE NOTICE 'Set gold_standard on 8 existing study cases';

    -- =========================================================================
    -- PART 2: Create raters for gold standard study
    -- =========================================================================

    INSERT INTO users (id, email, role, display_name, years_experience, specialty, training_level, institution, created_at, updated_at)
    VALUES
        (gs_rater1_id, 'gs.expert1@hospital.test', 'user', 'Dr. Elena Ruiz', 15, 'traumatology', 'attending', 'Hospital La Paz', NOW(), NOW()),
        (gs_rater2_id, 'gs.expert2@hospital.test', 'user', 'Dr. Miguel Torres', 10, 'traumatology', 'attending', 'Hospital Clínic', NOW(), NOW()),
        (gs_rater3_id, 'gs.resident1@hospital.test', 'user', 'Dr. Isabel Moreno', 4, 'orthopedics', 'resident', 'Hospital Gregorio Marañón', NOW(), NOW()),
        (gs_rater4_id, 'gs.resident2@hospital.test', 'user', 'Dr. Javier Díaz', 2, 'emergency', 'resident', 'Hospital 12 de Octubre', NOW(), NOW()),
        (gs_rater5_id, 'gs.fellow@hospital.test', 'user', 'Dr. Carmen Vega', 6, 'orthopedics', 'fellow', 'Hospital Vall d''Hebron', NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW();

    -- =========================================================================
    -- PART 3: Create gold standard accuracy study
    -- =========================================================================

    INSERT INTO studies (id, created_at, updated_at, created_by, title, description, status, case_count, total_responses, unique_raters, complete_raters)
    VALUES (
        gs_study_id,
        NOW() - INTERVAL '7 days', NOW(), admin_user_id,
        'Gold Standard Accuracy Validation',
        'Study designed to validate gold standard accuracy metrics. Contains cases with varying agreement levels for testing accuracy calculations, consensus analysis, and hard case detection.',
        'active',
        5, 25, 5, 5
    );

    -- =========================================================================
    -- PART 4: Create cases with gold_standard (using proper domain-type values)
    -- =========================================================================

    -- Case 1: PERFECT AGREEMENT — All raters match gold standard
    -- Gold: Weber A / SA / 44-A1
    INSERT INTO cases (id, created_at, updated_at, published_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order, gold_standard)
    VALUES (
        gs_case_perfect_id,
        NOW() - INTERVAL '7 days', NOW(), NOW() - INTERVAL '5 days', admin_user_id,
        'GS Case 1: Perfect Agreement (Weber A)',
        'Simple infrasyndesmotic fracture. All raters should agree. Tests 100% accuracy scenario.',
        'published', false, 5, 5, gs_study_id, 1,
        '{"fracture_type": "result.lateral_only.infrasindesmal.transverse", "danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb
    );

    -- Case 2: HARD CASE — Low accuracy, <50% on some systems
    -- Gold: Weber B / SER / 44-B1
    INSERT INTO cases (id, created_at, updated_at, published_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order, gold_standard)
    VALUES (
        gs_case_hard_id,
        NOW() - INTERVAL '7 days', NOW(), NOW() - INTERVAL '5 days', admin_user_id,
        'GS Case 2: Hard Case (Ambiguous Fracture Level)',
        'Borderline fracture level where experienced raters disagree. Tests hard case detection (<50% accuracy).',
        'published', false, 5, 5, gs_study_id, 2,
        '{"fracture_type": "result.lateral_only.transindesmal.spiral", "danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb
    );

    -- Case 3: HIGH ACCURACY — 4/5 raters correct, one outlier
    -- Gold: Weber C / PER / 44-C1
    INSERT INTO cases (id, created_at, updated_at, published_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order, gold_standard)
    VALUES (
        gs_case_high_id,
        NOW() - INTERVAL '7 days', NOW(), NOW() - INTERVAL '5 days', admin_user_id,
        'GS Case 3: High Accuracy (Weber C)',
        'Clear suprasyndesmotic fracture. One resident misclassifies. Tests high accuracy with outlier.',
        'published', true, 5, 5, gs_study_id, 3,
        '{"fracture_type": "result.lateral_only.suprasindesmal.simple", "danis_weber": {"type": "Weber C"}, "lauge_hansen": {"type": "PER"}, "ao_ota": {"code": "44-C1"}}'::jsonb
    );

    -- Case 4: IMPOSSIBLE / NOT CLASSIFIABLE gold standard
    -- Gold: impossible = true, DW = not_classifiable
    INSERT INTO cases (id, created_at, updated_at, published_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order, gold_standard)
    VALUES (
        gs_case_impossible_id,
        NOW() - INTERVAL '7 days', NOW(), NOW() - INTERVAL '5 days', admin_user_id,
        'GS Case 4: Not Classifiable',
        'Poor quality images that cannot be classified. Tests impossible/not_classifiable handling.',
        'published', false, 5, 5, gs_study_id, 4,
        '{"fracture_type": "not_classifiable", "danis_weber": {"type": "not_classifiable"}, "lauge_hansen": {"type": "not_classifiable"}, "impossible": true}'::jsonb
    );

    -- Case 5: NO GOLD STANDARD — control case
    INSERT INTO cases (id, created_at, updated_at, published_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order)
    VALUES (
        gs_case_no_gold_id,
        NOW() - INTERVAL '7 days', NOW(), NOW() - INTERVAL '5 days', admin_user_id,
        'GS Case 5: No Gold Standard (Control)',
        'Case without gold standard. Only inter-rater reliability metrics apply.',
        'published', false, 5, 5, gs_study_id, 5
    );

    -- =========================================================================
    -- PART 5: Rater assignments
    -- =========================================================================

    INSERT INTO study_raters (id, study_id, user_id, user_email, cases_completed, last_response_at, created_at)
    VALUES
        (gen_random_uuid(), gs_study_id, gs_rater1_id, 'gs.expert1@hospital.test', 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 days'),
        (gen_random_uuid(), gs_study_id, gs_rater2_id, 'gs.expert2@hospital.test', 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 days'),
        (gen_random_uuid(), gs_study_id, gs_rater3_id, 'gs.resident1@hospital.test', 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days'),
        (gen_random_uuid(), gs_study_id, gs_rater4_id, 'gs.resident2@hospital.test', 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days'),
        (gen_random_uuid(), gs_study_id, gs_rater5_id, 'gs.fellow@hospital.test', 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days');

    -- =========================================================================
    -- PART 6: Responses with proper domain-type denormalized values
    -- =========================================================================

    -- -------------------------------------------------------------------------
    -- GS Case 1: PERFECT AGREEMENT (100% accuracy all systems)
    -- Gold: Weber A / SA / 44-A1
    -- All 5 raters match gold standard exactly
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms,
        danis_weber_type, lauge_hansen_type, ao_ota_code,
        answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), gs_case_perfect_id, gs_rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         32000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 15000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 28000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 4000, "fibular_level": 11000, "lateral_morphology": 13000}'::jsonb, 0),

        (gen_random_uuid(), gs_case_perfect_id, gs_rater2_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         28000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 3000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 12000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 24000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 3000, "fibular_level": 9000, "lateral_morphology": 12000}'::jsonb, 0),

        (gen_random_uuid(), gs_case_perfect_id, gs_rater3_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         45000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 8000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 22000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 40000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 8000, "fibular_level": 14000, "lateral_morphology": 18000}'::jsonb, 1),

        (gen_random_uuid(), gs_case_perfect_id, gs_rater4_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         52000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 10000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 28000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 48000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 10000, "fibular_level": 18000, "lateral_morphology": 20000}'::jsonb, 2),

        (gen_random_uuid(), gs_case_perfect_id, gs_rater5_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         35000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 16000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 30000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 5000, "fibular_level": 11000, "lateral_morphology": 14000}'::jsonb, 0);

    -- -------------------------------------------------------------------------
    -- GS Case 2: HARD CASE (<50% accuracy on Lauge-Hansen)
    -- Gold: Weber B / SER / 44-B1
    -- DW: 3/5 correct (60%), LH: 2/5 correct (40% — HARD), AO: 3/5 correct (60%)
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms,
        danis_weber_type, lauge_hansen_type, ao_ota_code,
        answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Rater 1 (expert): CORRECT all systems
        (gen_random_uuid(), gs_case_hard_id, gs_rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         55000, 'Weber B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 22000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 48000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 5000, "fibular_level": 17000, "lateral_morphology": 26000}'::jsonb, 0),

        -- Rater 2 (expert): CORRECT all systems
        (gen_random_uuid(), gs_case_hard_id, gs_rater2_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         48000, 'Weber B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 18000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 42000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 4000, "fibular_level": 14000, "lateral_morphology": 24000}'::jsonb, 0),

        -- Rater 3 (resident): WRONG DW (Weber C), WRONG LH (PER), CORRECT AO
        (gen_random_uuid(), gs_case_hard_id, gs_rater3_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber C"}, "lauge_hansen": {"type": "PER"}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         85000, 'Weber C', 'PER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 10000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 40000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 78000}]'::jsonb,
         'lateral_only→suprasindesmal→simple',
         '{"involved_malleoli": 10000, "fibular_level": 30000, "suprasindesmal_type": 38000}'::jsonb, 3),

        -- Rater 4 (resident): CORRECT DW, WRONG LH (PA), WRONG AO (44-B2)
        (gen_random_uuid(), gs_case_hard_id, gs_rater4_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "PA"}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         95000, 'Weber B', 'PA', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 12000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 45000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 88000}]'::jsonb,
         'lateral_only→transindesmal→oblique',
         '{"involved_malleoli": 12000, "fibular_level": 33000, "lateral_morphology": 43000}'::jsonb, 4),

        -- Rater 5 (fellow): WRONG DW (Weber A), WRONG LH (SA), WRONG AO (44-A1)
        (gen_random_uuid(), gs_case_hard_id, gs_rater5_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         72000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 8000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 30000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 65000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 8000, "fibular_level": 22000, "lateral_morphology": 35000}'::jsonb, 2);

    -- -------------------------------------------------------------------------
    -- GS Case 3: HIGH ACCURACY (80% — 4/5 correct, one outlier)
    -- Gold: Weber C / PER / 44-C1
    -- DW: 4/5=80%, LH: 4/5=80%, AO: 4/5=80%
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms,
        danis_weber_type, lauge_hansen_type, ao_ota_code,
        answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Rater 1: CORRECT
        (gen_random_uuid(), gs_case_high_id, gs_rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "Weber C"}, "lauge_hansen": {"type": "PER"}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         42000, 'Weber C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 18000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 36000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 4000, "fibular_level": 14000, "suprasindesmal_type": 18000}'::jsonb, 0),

        -- Rater 2: CORRECT
        (gen_random_uuid(), gs_case_high_id, gs_rater2_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "Weber C"}, "lauge_hansen": {"type": "PER"}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         38000, 'Weber C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 3000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 15000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 32000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 3000, "fibular_level": 12000, "suprasindesmal_type": 17000}'::jsonb, 0),

        -- Rater 3: CORRECT
        (gen_random_uuid(), gs_case_high_id, gs_rater3_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber C"}, "lauge_hansen": {"type": "PER"}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         58000, 'Weber C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 8000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 28000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 52000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 8000, "fibular_level": 20000, "suprasindesmal_type": 24000}'::jsonb, 1),

        -- Rater 4 (outlier): WRONG all systems — classified as Weber B/SER/44-B2
        (gen_random_uuid(), gs_case_high_id, gs_rater4_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         102000, 'Weber B', 'SER', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 15000}, {"question": "medial_morphology", "answer": "transverse_oblique", "timestamp": 42000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 68000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 95000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 15000, "medial_morphology": 27000, "fibular_level_for_transverse": 26000, "lateral_morphology": 27000}'::jsonb, 5),

        -- Rater 5: CORRECT
        (gen_random_uuid(), gs_case_high_id, gs_rater5_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber C"}, "lauge_hansen": {"type": "PER"}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         44000, 'Weber C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 20000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 38000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 5000, "fibular_level": 15000, "suprasindesmal_type": 18000}'::jsonb, 0);

    -- -------------------------------------------------------------------------
    -- GS Case 4: NOT CLASSIFIABLE gold standard
    -- Gold: impossible=true, DW=not_classifiable, LH=not_classifiable
    -- Tests how accuracy handles impossible classifications
    -- 2/5 raters correctly say not_classifiable, 3/5 attempt classification
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms,
        danis_weber_type, lauge_hansen_type, ao_ota_code,
        answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Rater 1 (expert): CORRECT — not classifiable
        (gen_random_uuid(), gs_case_impossible_id, gs_rater1_id, NOW() - INTERVAL '1 day',
         '{"impossible": true, "danis_weber": {"type": "not_classifiable"}, "lauge_hansen": {"type": "not_classifiable"}}'::jsonb,
         18000, 'not_classifiable', 'not_classifiable', NULL,
         '[]'::jsonb, 'impossible', '{}'::jsonb, 0),

        -- Rater 2 (expert): CORRECT — not classifiable
        (gen_random_uuid(), gs_case_impossible_id, gs_rater2_id, NOW() - INTERVAL '1 day',
         '{"impossible": true, "danis_weber": {"type": "not_classifiable"}, "lauge_hansen": {"type": "not_classifiable"}}'::jsonb,
         22000, 'not_classifiable', 'not_classifiable', NULL,
         '[]'::jsonb, 'impossible', '{}'::jsonb, 0),

        -- Rater 3: WRONG — classified as Weber A / SA
        (gen_random_uuid(), gs_case_impossible_id, gs_rater3_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         65000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 10000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 30000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 58000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 10000, "fibular_level": 20000, "lateral_morphology": 28000}'::jsonb, 3),

        -- Rater 4: WRONG — classified as Weber B / SER
        (gen_random_uuid(), gs_case_impossible_id, gs_rater4_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         78000, 'Weber B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 12000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 38000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 72000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 12000, "fibular_level": 26000, "lateral_morphology": 34000}'::jsonb, 4),

        -- Rater 5: WRONG — classified as Weber A / SA
        (gen_random_uuid(), gs_case_impossible_id, gs_rater5_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         55000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 8000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 25000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 48000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 8000, "fibular_level": 17000, "lateral_morphology": 23000}'::jsonb, 1);

    -- -------------------------------------------------------------------------
    -- GS Case 5: NO GOLD STANDARD (control — inter-rater metrics only)
    -- No gold_standard set. Responses show moderate agreement.
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms,
        danis_weber_type, lauge_hansen_type, ao_ota_code,
        answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), gs_case_no_gold_id, gs_rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         40000, 'Weber B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 18000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 35000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 5000, "fibular_level": 13000, "lateral_morphology": 17000}'::jsonb, 0),

        (gen_random_uuid(), gs_case_no_gold_id, gs_rater2_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         36000, 'Weber B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 15000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 30000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 4000, "fibular_level": 11000, "lateral_morphology": 15000}'::jsonb, 0),

        (gen_random_uuid(), gs_case_no_gold_id, gs_rater3_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "PA"}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         62000, 'Weber B', 'PA', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 10000}, {"question": "medial_morphology", "answer": "transverse_oblique", "timestamp": 28000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 42000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 55000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→oblique',
         '{"involved_malleoli": 10000, "medial_morphology": 18000, "fibular_level_for_transverse": 14000, "lateral_morphology": 13000}'::jsonb, 2),

        (gen_random_uuid(), gs_case_no_gold_id, gs_rater4_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "Weber A"}, "lauge_hansen": {"type": "SA"}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         88000, 'Weber A', 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 15000}, {"question": "fibular_level", "answer": "infrasindesmal", "timestamp": 45000}, {"question": "lateral_morphology", "answer": "transverse", "timestamp": 82000}]'::jsonb,
         'lateral_only→infrasindesmal→transverse',
         '{"involved_malleoli": 15000, "fibular_level": 30000, "lateral_morphology": 37000}'::jsonb, 3),

        (gen_random_uuid(), gs_case_no_gold_id, gs_rater5_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "Weber B"}, "lauge_hansen": {"type": "SER"}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         42000, 'Weber B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 18000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 36000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 5000, "fibular_level": 13000, "lateral_morphology": 18000}'::jsonb, 0);

    -- =========================================================================
    -- Summary
    -- =========================================================================
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Gold standard fixtures created!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated:';
    RAISE NOTICE '  • 8 existing study cases now have gold_standard set';
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  • 5 raters (gs.*.@hospital.test)';
    RAISE NOTICE '  • 1 study: Gold Standard Accuracy Validation (ID: %)', gs_study_id;
    RAISE NOTICE '  • 5 cases with designed accuracy patterns:';
    RAISE NOTICE '    1. Perfect Agreement (100%% all systems)';
    RAISE NOTICE '    2. Hard Case (<50%% LH accuracy)';
    RAISE NOTICE '    3. High Accuracy (80%% with 1 outlier)';
    RAISE NOTICE '    4. Not Classifiable (impossible gold standard)';
    RAISE NOTICE '    5. No Gold Standard (control case)';
    RAISE NOTICE '  • 25 responses with full divergence tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'Test these endpoints:';
    RAISE NOTICE '  GET /api/admin/cases/<id>/accuracy     — Per-case accuracy vs gold standard';
    RAISE NOTICE '  PUT /api/admin/cases/<id>/gold-standard — Set/update gold standard';
    RAISE NOTICE '  DELETE /api/admin/cases/<id>/gold-standard — Clear gold standard';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected accuracy (Gold Standard Accuracy Study):';
    RAISE NOTICE '  Case 1: DW=100%% LH=100%% AO=100%%';
    RAISE NOTICE '  Case 2: DW=60%%  LH=40%%  AO=60%%  (HARD CASE)';
    RAISE NOTICE '  Case 3: DW=80%%  LH=80%%  AO=80%%';
    RAISE NOTICE '  Case 4: DW=40%%  LH=40%%           (not_classifiable)';
    RAISE NOTICE '  Case 5: No gold standard — inter-rater only';

END $$;
